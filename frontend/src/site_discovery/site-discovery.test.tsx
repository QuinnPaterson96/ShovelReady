import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { DiscoveryFlow } from './flow'
import type { Address, Confirmed, Observation, Parcel, SearchResult, Transport } from './flow'
import { SiteDiscovery } from './SiteDiscovery'
import { CandidateChoices, leadingAddressIndex, leadingParcelIndex } from './CandidateChoices'
import { liveTransport, parseAddresses, parseObservation, parseParcels } from './transport'
import saanichResponse from './address-api.fixture.json'
import cityAddress from './address_87.json'
import cityParcelSearch from './parcel_search_87.json'
import cityParcelObserve from './parcel_observe_87.json'
import cityRoofs from './buildings_87.json'
import municipalApi from './municipal-api.fixture.json'
import { placementCase } from './placement'

const source = { provider: 'Public source', record: 'test record', capturedAt: '2026-09-28', sourceDate: null, url: null, review: 'unreviewed' }
const address: Address = { id: 'a', label: 'Corrected address', locality: 'Victoria', precision: 'CIVIC_NUMBER', issues: [], point: [-123, 48], crs: 'EPSG:4326', source, raw: { original: 'record' } }
const parcel: Parcel = { id: 'p', label: 'Parcel option', match: 'Address point lead, identity unverified', source, raw: { original: 'parcel' } }
const polygon = { type: 'Polygon' as const, coordinates: [[[500000, 5000000], [500010, 5000000], [500010, 5000010], [500000, 5000000]]] }
const observation: Observation = { parcel: { geometry: polygon, areaM2: 49.987 }, roofs: [], crs: 'EPSG:3157', buildingsState: 'partial', issues: ['roofline_fetch_failed'], source, roofSource: null, raw: { complete: true } }

test('actual API replay passes through the consumer into an attributed placement site', () => {
  // Python CI compares this same fixture against actual mounted HTTP responses.
  const parcel = parseParcels(municipalApi.search).candidates[0]
  const observation = parseObservation(municipalApi.observation, parcel)
  const confirmed: Confirmed = { schema_version: 'site-discovery.confirmed.v1', address, parcel, observation, review: 'unreviewed', screening: 'not_performed' }
  const site = placementCase(confirmed)
  assert.deepEqual(site.site.parcel.shape.geometry, municipalApi.observation.parcel.planar_geometry)
  assert.equal(site.site.buildings[0].basis, 'roofline')
  assert.equal(site.site.parcel.source.review_status, 'unreviewed')
  assert.equal(site.site.parcel.source.reference, municipalApi.observation.evidence[0].source_url)
  assert.doesNotMatch(site.case_id, /VIC-087/)
  assert.equal(placementCase({ ...confirmed, observation: { ...observation, buildingsState: 'partial', roofs: [] } }).site.capture.completeness, 'partial')
  const multipart = { type: 'MultiPolygon', coordinates: [municipalApi.observation.parcel.planar_geometry.coordinates] }
  const multi = parseObservation({ ...municipalApi.observation, parcel: { ...municipalApi.observation.parcel, planar_geometry: multipart } }, parcel)
  assert.deepEqual(multi.parcel.geometry, multipart)
  assert.match(multi.issues.join(' '), /cannot measure multipart/)
})
function deferred<T>() { let resolve!: (value: T) => void; return { promise: new Promise<T>(r => { resolve = r }), resolve } }

test('selection requires distinct address, parcel and property confirmation; edits invalidate it', async () => {
  const confirmed: unknown[] = []
  const transport: Transport = { async addresses() { return { status: 'ok', candidates: [address] } }, async parcels() { return { status: 'ok', candidates: [parcel] } }, async observe() { return observation } }
  const flow = new DiscoveryFlow(transport, () => {}, value => confirmed.push(value))
  flow.edit('525 Superior St, Victoria')
  await flow.search()
  assert.equal(flow.state.address, null)
  assert.equal(flow.state.confirmed, null)
  await flow.chooseAddress('a')
  assert.equal(flow.state.parcel, null)
  await flow.chooseParcel('p')
  assert.equal(flow.state.confirmed, null)
  flow.confirm()
  assert.equal(confirmed.length, 1)
  assert.equal((flow.state.confirmed as Confirmed | null)?.observation, observation)
  flow.edit('527 Superior St, Victoria')
  assert.equal(flow.state.confirmed, null)
  assert.equal(confirmed.at(-1), null)
})

test('late address and parcel replies cannot revive an old choice', async () => {
  const oldAddresses = deferred<SearchResult<Address>>()
  const oldParcels = deferred<SearchResult<Parcel>>()
  let addressCalls = 0
  const transport: Transport = {
    addresses() { addressCalls++; return addressCalls === 1 ? oldAddresses.promise : Promise.resolve({ status: 'no_match', candidates: [] }) },
    parcels() { return oldParcels.promise }, observe() { return Promise.resolve(observation) },
  }
  const flow = new DiscoveryFlow(transport, () => {}, () => {})
  flow.edit('old search'); const pending = flow.search()
  flow.edit('new search'); await flow.search()
  oldAddresses.resolve({ status: 'ok', candidates: [address] }); await pending
  assert.deepEqual(flow.state.addresses, [])
  assert.match(flow.state.message, /No address match/)
  const second = new DiscoveryFlow({ ...transport, addresses: async () => ({ status: 'ok', candidates: [address] }) }, () => {}, () => {})
  second.edit('first address'); await second.search()
  const parcelPending = second.chooseAddress('a')
  second.edit('different address')
  oldParcels.resolve({ status: 'ok', candidates: [parcel] }); await parcelPending
  assert.deepEqual(second.state.parcels, [])
  const lateObservation = deferred<Observation>()
  const third = new DiscoveryFlow({ addresses: async () => ({ status: 'ok', candidates: [address] }),
    parcels: async () => ({ status: 'ok', candidates: [parcel] }), observe: () => lateObservation.promise }, () => {}, () => {})
  third.edit('first address'); await third.search(); await third.chooseAddress('a')
  const observationPending = third.chooseParcel('p')
  third.edit('corrected address')
  lateObservation.resolve(observation); await observationPending
  assert.equal(third.state.observation, null)
  third.confirm(); assert.equal(third.state.confirmed, null)
})

test('failed and partial observation retry clears confirmation and ignores the older response', async () => {
  const late = deferred<Observation>()
  const confirmed: (Confirmed | null)[] = []
  let calls = 0
  const full = { ...observation, buildingsState: 'available', issues: [], roofs: [{ id: 'roof', geometry: polygon }] }
  const transport: Transport = {
    async addresses() { return { status: 'ok', candidates: [address] } },
    async parcels() { return { status: 'ok', candidates: [parcel] } },
    observe() { calls++; if (calls === 1) return Promise.reject(Error('provider')); if (calls === 2) return Promise.resolve(observation); if (calls === 3) return late.promise; return Promise.resolve(full) },
  }
  const flow = new DiscoveryFlow(transport, () => {}, value => confirmed.push(value))
  flow.edit('1144 May St'); await flow.search(); await flow.chooseAddress('a')
  await flow.chooseParcel('p')
  assert.match(flow.state.message, /response invalid/i)
  assert.equal(flow.state.observation, null)
  await flow.chooseParcel('p'); flow.confirm()
  assert.equal(flow.state.confirmed?.observation.buildingsState, 'partial')
  const pending = flow.chooseParcel('p')
  assert.equal(confirmed.at(-1), null)
  await flow.chooseParcel('p')
  late.resolve(observation); await pending
  assert.equal((flow.state.observation as Observation | null)?.buildingsState, 'available')
  assert.equal(flow.state.confirmed, null)
  assert.equal((flow.state.observation as Observation | null)?.roofs.length, 1)
})

test('service failure and no-match keep manual continuation visible', async () => {
  const transport: Transport = { async addresses() { throw Error('offline') }, async parcels() { throw Error('offline') }, async observe() { throw Error('offline') } }
  const flow = new DiscoveryFlow(transport, () => {}, () => {})
  flow.edit('525 Superior St'); await flow.search()
  assert.match(flow.state.message, /continue manually/i)
  const html = renderToStaticMarkup(createElement(SiteDiscovery, { transport, onConfirm() {} }))
  assert.match(html, /retained lookup or <a href="#manual-address">manual site details below<\/a>/)
  assert.match(html, /Search for a property/)
  assert.doesNotMatch(html, /fit result/i)
})

test('municipal network outage is identified as source unavailability', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => { throw new TypeError('network down') }
  try {
    const victoria = { ...address, raw: { candidate: { address: { streetAddress: '1144 May St' } } } }
    await assert.rejects(liveTransport.parcels(victoria, new AbortController().signal), /City source temporarily unavailable/)
  } finally { globalThis.fetch = originalFetch }
})

test('provider evidence controls the leading suggestion and keeps alternatives selectable', () => {
  const first = { ...address, id: 'first', label: 'First', providerScore: 92 }
  const second = { ...address, id: 'second', label: 'Second', providerScore: 88 }
  const ranked = [second, first]
  assert.equal(leadingAddressIndex(ranked), 1)
  const html = renderToStaticMarkup(createElement(CandidateChoices, { candidates: ranked, selectedId: second.id,
    leadingIndex: leadingAddressIndex(ranked), kind: 'address', render: (candidate, label) => createElement('button', { type: 'button', 'aria-pressed': candidate.id === second.id }, `${label}: ${candidate.id}`) }))
  assert.match(html, /Leading address suggestion: first/)
  assert.match(html, /<details[^>]*open=""[^>]*>/)
  assert.match(html, /Other match: second/)
  assert.match(html, /aria-pressed="true"/)
  assert.equal(leadingAddressIndex([first, { ...second, providerScore: 92 }]), null)
  assert.equal(leadingAddressIndex([{ ...first, issues: ['provider correction'] }, second]), null)
  assert.equal(leadingAddressIndex([first, { ...second, locality: 'Saanich' }]), null)
  assert.equal(leadingAddressIndex([first, { ...second, precision: 'STREET' }]), null)
  assert.equal(leadingAddressIndex([address, second]), null)
})

test('multiple parcel joins stay unresolved while a sole source join can be shown first', () => {
  const join = { ...parcel, id: 'join', relation: 'gislink_join' as const }
  const otherJoin = { ...parcel, id: 'join2', relation: 'gislink_join' as const }
  const nearby = { ...parcel, id: 'nearby', relation: 'spatial_lead' as const }
  assert.equal(leadingParcelIndex([nearby, join]), 1)
  assert.equal(leadingParcelIndex([join, otherJoin, nearby]), null)
  assert.equal(leadingParcelIndex([parcel, nearby]), null)
  const html = renderToStaticMarkup(createElement(CandidateChoices, { candidates: [join, otherJoin, nearby], selectedId: otherJoin.id,
    leadingIndex: leadingParcelIndex([join, otherJoin, nearby]), kind: 'parcel', render: (candidate, label) => createElement('button', { type: 'button' }, `${label}: ${candidate.id}`) }))
  assert.doesNotMatch(html, /Other matches/)
  assert.match(html, /join2/)
  assert.match(html, /nearby/)
})

test('alternate parcel choice invalidates a prior confirmation', async () => {
  const alternate = { ...parcel, id: 'alternate', label: 'Other parcel' }
  const notices: (Confirmed | null)[] = []
  const transport: Transport = { async addresses() { return { status: 'ok', candidates: [address] } },
    async parcels() { return { status: 'ok', candidates: [parcel, alternate] } }, async observe() { return observation } }
  const flow = new DiscoveryFlow(transport, () => {}, value => notices.push(value))
  flow.edit('1144 May St'); await flow.search(); await flow.chooseAddress('a'); await flow.chooseParcel('p'); flow.confirm()
  assert.equal(flow.state.confirmed?.parcel.id, 'p')
  await flow.chooseParcel('alternate')
  assert.equal(flow.state.parcel?.id, 'alternate')
  assert.equal(flow.state.confirmed, null)
  assert.equal(notices.at(-1), null)
})

test('published BC address contract preserves correction, coordinate CRS and source record', async () => {
  // This is #166's saved public Saanich API response, copied without modification.
  const api = saanichResponse
  const parsed = parseAddresses(api)
  assert.equal((parsed.candidates[0] as { providerScore?: number }).providerScore, api.candidates[0].score)
  assert.equal(parsed.candidates[0].locality, 'Saanich')
  assert.equal(parsed.candidates[0].source.sourceDate, '2026-07-07')
  assert.deepEqual(parsed.candidates[0].point, [-123.3965421, 48.4474531])
  assert.equal((parsed.candidates[0].raw as { candidate: { providerSiteId: string } }).candidate.providerSiteId, api.candidates[0].providerSiteId)
  assert.throws(() => parseAddresses({ ...api, candidates: [{ ...api.candidates[0], point: { ...api.candidates[0].point, crs: 'EPSG:3157' } }] }))
  const originalFetch = globalThis.fetch
  try {
    globalThis.fetch = async (input, init) => {
      assert.equal(input, '/api/address-search')
      assert.equal(init?.method, 'POST')
      assert.deepEqual(JSON.parse(String(init?.body)), { schemaVersion: 'sr-address-search.v1', query: api.query, maxResults: 5 })
      return { ok: true, json: async () => api } as Response
    }
    const response = await liveTransport.addresses(api.query, new AbortController().signal)
    assert.equal(response.candidates.length, api.candidates.length)
  } finally { globalThis.fetch = originalFetch }
})

test('municipal contracts keep joined identity, projected geometry and partial roofline uncertainty', async () => {
  // The City feature bodies are exact #167 saved provider bytes. The response
  // envelope follows its api.py output because #167 has no saved normalized JSON.
  const receipt = (record: string, raw: unknown) => ({ provider: 'City of Victoria Open Data', record_label: record,
    source_url: 'https://maps.victoria.ca/server/rest/services/OpenData/OpenData_Land/MapServer/11/query',
    captured_at_utc: '2026-09-29T02:53:00Z', review_status: 'unreviewed_live_observation',
    source_date_limit: 'Feature update date and positional accuracy not supplied.', raw_response: raw })
  const ref = { source: 'city-of-victoria-pid-parcels', object_id: 87 }
  const search = { schema_version: 'municipal-sites.v1', status: 'candidates', note: 'Select explicitly',
    candidates: [{ parcel_ref: ref, pid: '001-328-107', gislink: '03229041', address: '1144 MAY ST', address_object_id: 9209,
      relation: 'gislink_join', identity_status: 'source_join_unreviewed', attributes: cityParcelSearch.features[0].attributes }],
    evidence: [receipt('Address MapServer response', cityAddress), receipt('Parcel MapServer response', cityParcelSearch)] }
  const parcel = parseParcels(search).candidates[0]
  assert.equal((parcel as { relation?: string }).relation, 'gislink_join')
  assert.equal(parcel.label, '1144 MAY ST')
  assert.match(parcel.match, /unreviewed/)
  const feature = (row: { attributes: object; geometry?: object }, area: number) => ({ attributes: row.attributes, geometry: row.geometry, planar_geometry: { type: 'Polygon', coordinates: (row.geometry as { rings: number[][][] }).rings.map(ring => ring.map(point => point.slice(0, 2))) },
    horizontal_crs: 'EPSG:3157', area_m2: area, geometry_issue: null })
  const observed = { schema_version: 'municipal-sites.v1', status: 'available', parcel_ref: ref,
    parcel: feature(cityParcelObserve.features[0], 642.0220911965725),
    rooflines: [{ ...feature(cityRoofs.features[0], 195.44367200018118), intersection_area_m2: 195.4,
      relationship: 'spatial_intersection_not_ownership' }], issues: [],
    evidence: [receipt('Parcel MapServer response', cityParcelObserve), receipt('Building MapServer response', cityRoofs)] }
  const parsed = parseObservation(observed, parcel)
  assert.equal(parsed.crs, 'EPSG:3157')
  assert.equal(parsed.parcel.areaM2, 642.0220911965725)
  assert.equal(parsed.roofs.length, 1)
  assert.equal(parsed.roofs[0].geometry.coordinates[0][0][0], cityRoofs.features[0].geometry.rings[0][0][0])
  const partial = parseObservation({ ...observed, status: 'partial', rooflines: [], issues: ['roofline_fetch_failed'], evidence: observed.evidence.slice(0, 1) }, parcel)
  assert.equal(partial.buildingsState, 'partial')
  assert.match(partial.issues.join(' '), /roofline_fetch_failed/)
  assert.throws(() => parseObservation({ ...observed, status: 'stale', parcel: null }, parcel), /changed at the source/)
  const originalFetch = globalThis.fetch
  try {
    const calls: unknown[] = []
    globalThis.fetch = async (input, init) => {
      calls.push([input, JSON.parse(String(init?.body))])
      return { ok: true, json: async () => calls.length === 1 ? search : observed } as Response
    }
    const victoria = { ...address, label: '1144 May St, Victoria, BC', raw: { candidate: { address: { streetAddress: '1144 May St' } } } }
    const found = await liveTransport.parcels(victoria, new AbortController().signal)
    await liveTransport.observe(found.candidates[0], new AbortController().signal)
    assert.deepEqual(calls[0], ['/api/municipal-sites/search', { schema_version: 'municipal-sites.v1', address: '1144 May St' }])
    assert.deepEqual(calls[1], ['/api/municipal-sites/observe', { schema_version: 'municipal-sites.v1', parcel_ref: ref, expected_pid: '001-328-107' }])
    assert.equal((await liveTransport.parcels({ ...victoria, locality: 'Saanich' }, new AbortController().signal)).status, 'outside_coverage')
  } finally { globalThis.fetch = originalFetch }
})
