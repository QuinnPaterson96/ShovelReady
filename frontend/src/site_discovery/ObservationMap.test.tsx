import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ObservationMap } from './ObservationMap'
import { parseObservation, parseParcels } from './transport'
import type { Address, Observation, Polygon } from './flow'
import municipalApi from './municipal-api.fixture.json'

const source = { provider: 'City of Victoria', record: 'Test parcel', capturedAt: '2026-09-29', sourceDate: null, url: null, review: 'unreviewed' }
const address: Address = { id: 'a', label: 'Address lead', locality: 'Victoria', precision: 'CIVIC_NUMBER', issues: [], point: [-123, 48], crs: 'EPSG:4326', source, raw: {} }

test('retained municipal observation renders its source context, measured scale and unmapped address lead', () => {
  const parcel = parseParcels(municipalApi.search).candidates[0]
  const observation = parseObservation(municipalApi.observation, parcel)
  const html = renderToStaticMarkup(createElement(ObservationMap, { observation, address, parcel }))
  assert.match(html, /Observed property/)
  assert.match(html, /City of Victoria Open Data/)
  assert.match(html, /captured 2000-01-01/)
  assert.match(html, /R1/)
  assert.match(html, /m<\/text>/)
  assert.match(html, /Address marker unavailable: the address point uses EPSG:4326/)
  assert.doesNotMatch(html, /Partial building observation/)
})

test('multipart parcel and hole retain separate SVG subpaths; partial rooflines remain unresolved', () => {
  // Three known square rings, including an interior void and a disjoint component.
  // Their independently counted M commands protect the actual drawing topology.
  const geometry: Polygon = { type: 'MultiPolygon', coordinates: [
    [[[0, 0], [20, 0], [20, 20], [0, 20], [0, 0]], [[5, 5], [5, 10], [10, 10], [10, 5], [5, 5]]],
    [[[30, 0], [40, 0], [40, 10], [30, 10], [30, 0]]],
  ] }
  const observation: Observation = { parcel: { geometry, areaM2: 475 }, roofs: [], crs: 'EPSG:3157', buildingsState: 'partial', issues: ['roofline_fetch_failed'], source, roofSource: null, raw: {} }
  const html = renderToStaticMarkup(createElement(ObservationMap, { observation, address }))
  const parcelPath = html.match(/class="observation-map__parcel" d="([^"]+)"/)
  assert.ok(parcelPath)
  assert.equal((parcelPath[1].match(/M/g) ?? []).length, 3)
  assert.match(html, /fill-rule="evenodd"/)
  assert.match(html, /10 m<\/text>/) // 40 m width: the nice scale below one quarter is 10 m.
  assert.match(html, /Partial building observation: partial/)
  assert.match(html, /No rooflines shown does not mean no buildings exist/)
  assert.match(html, /none returned/)
})
