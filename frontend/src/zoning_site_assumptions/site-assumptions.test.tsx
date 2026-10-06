import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Case } from '../occupied_lots/contract'
import { SiteAssumptionsEditor } from './SiteAssumptions'
import { assumptionsKey, initialAssumptions, withPlacementRevision } from './model'

const source = { provider: 'Constructed example', record_label: 'Parcel sketch', capture_date: null, review_status: 'unreviewed', reference: null }
const site = (id: string, coordinates: number[][]): Case => ({ case_id: id, label: id, site: {
  projected_metre_crs: 'EPSG:3157', parcel: { id, source, shape: { crs: 'EPSG:3157', geometry: { type: 'Polygon', coordinates: [coordinates] } } },
  buildings: [{ id: 'roof-1', source, basis: 'roofline', shape: { crs: 'EPSG:3157', geometry: { type: 'Polygon', coordinates: [[[2, 2], [4, 2], [4, 4], [2, 4], [2, 2]]] } } }],
  named_boundaries: [], capture: { completeness: 'partial', scope: 'Constructed example', limitations: [] },
} })

test('ordinary and corner parcel edges remain unknown until explicitly classified', () => {
  const ordinary = initialAssumptions(site('ordinary', [[0, 0], [10, 0], [10, 20], [0, 20], [0, 0]]), 'capture-a', 'placement-a')
  const corner = initialAssumptions(site('corner', [[0, 0], [10, 0], [12, 8], [10, 20], [0, 20], [0, 0]]), 'capture-b', 'placement-a')
  assert.equal(ordinary.edges.length, 4)
  assert.equal(corner.edges.length, 5)
  assert.ok([...ordinary.edges, ...corner.edges].every(edge => edge.role.value === 'unknown'))
  assert.equal(ordinary.observed_buildings[0].basis, 'roofline')
  assert.notEqual(assumptionsKey(site('ordinary', [[0, 0], [10, 0], [10, 20], [0, 20], [0, 0]]), 'capture-a', ''), assumptionsKey(site('replacement', [[0, 0], [10, 0], [10, 20], [0, 20], [0, 0]]), 'capture-a', ''))
  assert.notEqual(ordinary.edges[0].id, initialAssumptions(site('ordinary', [[0, 0], [10, 0], [10, 20], [0, 20], [0, 0]]), 'capture-c', 'placement-a').edges[0].id)
})

test('placement edits clear user measurements while keeping boundary roles', () => {
  const original = initialAssumptions(site('ordinary', [[0, 0], [10, 0], [10, 20], [0, 20], [0, 0]]), 'capture-a', 'placement-a')
  original.edges[0].role.value = 'front'
  original.measurements.boundary[original.edges[0].id] = { value: 1.3, unit: 'm', basis: 'proposed_wall_to_lot_line', origin: 'user', note: null, placement_revision: 'placement-a' }
  const changed = withPlacementRevision(original, 'placement-b')
  assert.equal(changed.edges[0].role.value, 'front')
  assert.deepEqual(changed.measurements.boundary, {})
  assert.equal(changed.placement_revision, 'placement-b')
})

test('rendered component offers labelled controls and a keyboard alternative to map edges', () => {
  const html = renderToStaticMarkup(createElement(SiteAssumptionsEditor, { site: site('ordinary', [[0, 0], [10, 0], [10, 20], [0, 20], [0, 0]]), geometryRevision: 'capture-a', placementRevision: 'placement-a', onChange: () => {} }))
  assert.match(html, /Parcel edge roles/)
  assert.match(html, /Edge 1 role/)
  assert.match(html, /keyboard access/)
  assert.match(html, /Rooflines are mapped outlines, not walls/)
})
