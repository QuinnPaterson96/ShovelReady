import { register } from 'node:module'
register('../../tools/css-test-loader.mjs', import.meta.url)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { JSDOM } from 'jsdom'
import { renderToStaticMarkup } from 'react-dom/server'
import suit from './suit-live.fixture.json'
import { DiscoveryFlow } from './flow'
import type { Confirmed, Observation, Parcel } from './flow'
import { compareParcels, geometryKey, parcelDescription, roofParcelDetails } from './parcelComparison'
import { parseAddresses, parseObservation, parseParcels, liveTransport } from './transport'
import { SelectedProperty } from './SelectedProperty'
import { SiteDiscovery } from './SiteDiscovery'
import { placementCase } from './placement'

const address = parseAddresses(suit.address).candidates[0]
const parcels = parseParcels(suit.search).candidates.map((parcel, i) => ({ ...parcel, inspection: parseObservation(suit.observations[i], parcel) }))
const selected = (parcel: Parcel, observation: Observation): Confirmed => ({ schema_version: 'site-discovery.selected.v1',
  selection_basis: 'user_choice', identity_attestation: 'not_confirmed', address, parcel, observation, review: 'unreviewed', screening: 'not_performed' })

test('captured 601 Su’it source replay retains materially distinct parcels and shared roof evidence', async () => {
  // October 7 public adapter capture: different source PIDs/municipal identifiers,
  // different actual outlines; the same house roof intersects both. Equal address
  // text/near-equal areas must not establish equivalence or legal ownership.
  const compared = compareParcels(parcels)
  assert.equal(compared.length, 2)
  assert.match(parcelDescription(compared[0]), /008-094-764.*756/)
  assert.match(parcelDescription(compared[1]), /008-094-772.*755\.6/)
  assert.notEqual(geometryKey(compared[0].inspection!.parcel.geometry), geometryKey(compared[1].inspection!.parcel.geometry))
  assert.match(compared[0].identityConcern!, /roof spans more than one/)
  assert.equal(compared[0].inspection!.roofs[0].id, compared[1].inspection!.roofs[0].id)
  assert.match(roofParcelDetails(compared[0].inspection!).join(' '), /159\.3 m²/)
  const flow = new DiscoveryFlow({ async addresses() { return { status: 'ok', candidates: [address] } },
    async parcels() { return { status: 'ok', candidates: compared } }, async observe(parcel) { return parcel.inspection! } }, () => {}, () => {}, true)
  flow.edit('601 Su’it Street'); await flow.search(); await flow.chooseAddress(address.id)
  assert.equal(flow.state.confirmed, null)
  await flow.chooseParcel(compared[1].id)
  assert.match(placementCase(flow.state.confirmed!).site.capture.limitations.join(' '), /different mapped parcels/)
  const html = renderToStaticMarkup(createElement(SelectedProperty, { value: flow.state.confirmed!, onChangeProperty() {}, onInspectAlternatives() {} }))
  assert.match(html, /Change property/)
  assert.match(html, /Inspect another parcel candidate/)
  assert.match(html, /<details><summary>Property source and outline help/)
  assert.match(html, /008-094-772/)
  flow.changeProperty()
  assert.equal(flow.state.confirmed, null)
  assert.match(flow.state.message, /Choose the property/)
  assert.doesNotMatch(flow.state.message, /rejected/)
})

test('potential duplicate identities are observed before grouping; every joined record remains recoverable', async () => {
  const duplicate = { ...suit.search.candidates[0], address_object_id: 99999 }
  const search = { ...suit.search, candidates: [suit.search.candidates[0], duplicate] }
  const originalFetch = globalThis.fetch
  const calls: string[] = []
  try {
    globalThis.fetch = async (path) => {
      calls.push(String(path))
      return { ok: true, json: async () => String(path).endsWith('/search') ? search : suit.observations[0] } as Response
    }
    const found = await liveTransport.parcels(address, new AbortController().signal)
    assert.equal(found.candidates.length, 1)
    assert.equal(calls.filter(path => path.endsWith('/observe')).length, 1)
    const raw = found.candidates[0].raw as { candidate: { address_object_id: number }; equivalentRecords: { candidateRecord: { candidate: { address_object_id: number } }; observation: unknown }[] }
    assert.equal(raw.candidate.address_object_id, 8675)
    assert.equal(raw.equivalentRecords[0].candidateRecord.candidate.address_object_id, 99999)
    assert.deepEqual(raw.equivalentRecords[0].observation, suit.observations[0])
    globalThis.fetch = async path => ({ ok: true, json: async () => String(path).endsWith('/search') ? search : { ...suit.observations[0], status: 'missing', parcel: null } } as Response)
    assert.equal((await liveTransport.parcels(address, new AbortController().signal)).candidates.length, 2, 'failed geometry must not silently collapse candidates')
  } finally { globalThis.fetch = originalFetch }
})

test('same identity but different geometry, unknown attributes and differing status never collapse', () => {
  const first = parcels[0]
  const duplicate = { ...first, id: 'copy' }
  assert.equal(compareParcels([first, duplicate]).length, 1)
  assert.equal(compareParcels([first, { ...duplicate, inspection: parcels[1].inspection }]).length, 2)
  assert.equal(compareParcels([first, { ...duplicate, raw: {} }]).length, 2)
  assert.equal(compareParcels([first, { ...duplicate, raw: {}, inspection: undefined }])[0].identityConcern, undefined, 'missing identity attributes alone are not a concrete conflict')
  const raw = first.raw as { candidate: { attributes: object } }
  assert.equal(compareParcels([first, { ...duplicate, raw: { ...raw, candidate: { ...raw.candidate, attributes: { ...raw.candidate.attributes, ParcelStatus: null } } } }]).length, 2)
  assert.equal(compareParcels([first, { ...duplicate, raw: { ...raw, candidate: { ...raw.candidate, attributes: { ...raw.candidate.attributes, ParcelStatus: 'HISTORICAL' } } } }]).length, 2)
  // Independent geometry property: winding and starting corner do not change a
  // square, but a hole or a shifted edge changes the polygon represented.
  const square = { type: 'Polygon' as const, coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] }
  const reversed = { ...square, coordinates: [[[1, 1], [1, 0], [0, 0], [0, 1], [1, 1]]] }
  assert.equal(geometryKey(square), geometryKey(reversed))
  assert.notEqual(geometryKey(square), geometryKey({ ...square, coordinates: [...square.coordinates, [[.1, .1], [.2, .1], [.2, .2], [.1, .1]]] }))
})

test('tiny roof outline differences stay in accessible help and retain nonzero evidence', () => {
  const minor = { ...parcels[0].inspection!, raw: { rooflines: [{ area_m2: 10, intersection_area_m2: 9.999 }] } }
  const value = selected({ ...parcels[0], identityConcern: undefined }, minor)
  const html = renderToStaticMarkup(createElement(SelectedProperty, { value, onChangeProperty() {} }))
  assert.match(html, /&lt; 0\.1 m²/)
  assert.doesNotMatch(html, /sd-notice|Inspect another/)
  assert.match(html, /overhangs/)
})

test('address search, parcel inspection, compact summary and deliberate change remain usable together', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' })
  Object.assign(dom.window.HTMLElement.prototype, { attachEvent: () => {}, detachEvent: () => {} })
  const originals = new Map<string, PropertyDescriptor | undefined>()
  for (const [name, value] of Object.entries({ window: dom.window, document: dom.window.document, navigator: dom.window.navigator, IS_REACT_ACT_ENVIRONMENT: true })) {
    originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name))
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value })
  }
  const compared = compareParcels(parcels)
  const notices: (Confirmed | null)[] = []
  const originalCallbackNotices: (Confirmed | null)[] = []
  const root = createRoot(dom.window.document.getElementById('root')!)
  const buttons = () => [...dom.window.document.querySelectorAll<HTMLButtonElement>('button')]
  const click = async (label: string) => act(async () => { const button = buttons().find(button => button.textContent?.includes(label)); assert.ok(button, label); button.click() })
  try {
    const transport = {
      async addresses() { return { status: 'ok', candidates: [address] } }, async parcels() { return { status: 'ok', candidates: compared } }, async observe(parcel) { return parcel.inspection! },
    } satisfies import('./flow').Transport
    await act(async () => root.render(createElement(SiteDiscovery, { autoProceed: true, onConfirm: value => originalCallbackNotices.push(value), transport })))
    // Model/intended-use edits can replace the host callback after mount while
    // keeping the discovery flow alive. Selection must use current host context.
    await act(async () => root.render(createElement(SiteDiscovery, { autoProceed: true, onConfirm: value => notices.push(value), transport })))
    await act(async () => {
      const input = dom.window.document.querySelector<HTMLInputElement>('#sd-address')!
      input.focus()
      Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value')!.set!.call(input, '601 Su’it Street')
      input.dispatchEvent(new dom.window.KeyboardEvent('keyup', { key: 't', bubbles: true }))
    })
    await click('Search')
    await click(address.label)
    assert.equal(notices.length, 0, 'two parcels require a choice')
    await click('008-094-764')
    assert.ok(dom.window.document.querySelector('[aria-label="Selected property"]'))
    assert.equal(dom.window.document.querySelector('[aria-label="Parcel choices"]'), null)
    await click('Inspect another parcel candidate')
    assert.ok(dom.window.document.querySelector('[aria-label="Parcel choices"]'))
    assert.equal(dom.window.document.activeElement?.id, 'sd-parcels')
    assert.equal(notices.at(-1)?.parcel.id, compared[0].id, 'opening choices alone does not invalidate current evidence')
    await click('008-094-772')
    assert.equal(notices.at(-1)?.parcel.id, compared[1].id)
    await click('Change property')
    assert.equal(notices.at(-1), null)
    assert.equal(originalCallbackNotices.length, 0, 'confirmation and deliberate change use the latest host callback')
    assert.ok(dom.window.document.querySelector('#sd-address'))
    assert.doesNotMatch(dom.window.document.body.textContent!, /Observation rejected/)
  } finally {
    await act(async () => root.unmount())
    dom.window.close()
    for (const [name, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name) }
  }
})
