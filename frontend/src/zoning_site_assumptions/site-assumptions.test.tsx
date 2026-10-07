import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Case } from '../occupied_lots/contract'
import { SiteAssumptionsEditor } from './SiteAssumptions'
import { assumedMainBuilding, assumptionsKey, initialAssumptions, inferBoundaryRoles, ordinaryFourEdgeBoundary, suggestedBoundaryRoles, withPlacementRevision } from './model'

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

test('rendered component offers labelled controls without another map', () => {
  const html = renderToStaticMarkup(createElement(SiteAssumptionsEditor, { site: site('ordinary', [[0, 0], [10, 0], [10, 20], [0, 20], [0, 0]]), geometryRevision: 'capture-a', placementRevision: 'placement-a', onChange: () => {} }))
  assert.match(html, /Parcel edge roles/)
  assert.match(html, /Edge 1 role/)
  assert.match(html, /Use my measurement/)
  assert.doesNotMatch(html, /<svg/)
  assert.match(html, /Rooflines are mapped outlines, not walls/)
})

test('opposite-edge suggestion is display-only and scoped to a simple single-street lot', () => {
  const ordinary = initialAssumptions(site('ordinary', [[0, 0], [10, 0], [10, 20], [0, 20], [0, 0]]), 'capture-a', 'placement-a')
  const [front, side, rear, other] = ordinary.edges
  assert.deepEqual(suggestedBoundaryRoles(ordinary.edges, front.id, null, 'single'), {
    [front.id]: 'front', [side.id]: 'side', [rear.id]: 'rear', [other.id]: 'side',
  })
  assert.deepEqual(suggestedBoundaryRoles(ordinary.edges, null, rear.id, 'single'),
    suggestedBoundaryRoles(ordinary.edges, front.id, null, 'single'))
  assert.deepEqual(suggestedBoundaryRoles(ordinary.edges, front.id, null, 'corner_or_multiple'), {})
  assert.equal(ordinaryFourEdgeBoundary(ordinary.edges), true)
  const irregular = initialAssumptions(site('irregular', [[0, 0], [10, 0], [12, 8], [10, 20], [0, 20], [0, 0]]), 'capture-b', 'placement-a')
  assert.equal(ordinaryFourEdgeBoundary(irregular.edges), false)
  assert.deepEqual(suggestedBoundaryRoles(irregular.edges, irregular.edges[0].id, null, 'single'), {})
  assert.ok(ordinary.edges.every(edge => edge.role.value === 'unknown'))
})

// Independently specified clockwise rectangle: edge 0 opposite 2, edge 1 opposite 3.
// Guards unknown propagation, explicit overrides and misleading corner frontage.
test('front/rear anchors infer editable corner roles without overwriting explicit marks', () => {
  const value = initialAssumptions(site('rectangle', [[0, 0], [10, 0], [10, 20], [0, 20], [0, 0]]), 'capture', 'placement')
  const [a, b, c, d] = value.edges
  const streets = { edge_ids: [a.id, b.id], all_marked: true, origin: 'user' as const }
  assert.deepEqual(inferBoundaryRoles(value.edges, streets).roles, {})
  a.role.value = 'front'
  assert.deepEqual(inferBoundaryRoles(value.edges, streets).roles, { [b.id]: 'flanking_street', [c.id]: 'rear', [d.id]: 'side' })
  assert.deepEqual(inferBoundaryRoles(value.edges, { ...streets, all_marked: false }).roles, { [b.id]: 'flanking_street', [c.id]: 'rear' })
  a.role.value = 'unknown'; c.role.value = 'rear'
  assert.deepEqual(inferBoundaryRoles(value.edges, streets).roles, { [a.id]: 'front', [b.id]: 'flanking_street', [d.id]: 'side' })
  b.role.value = 'side'
  assert.equal(inferBoundaryRoles(value.edges, streets).roles[b.id], undefined)
  assert.match(inferBoundaryRoles(value.edges, streets).conflicts.join(' '), /your side mark differs/)
  assert.equal(b.role.value, 'side')
  b.role.value = 'front'
  assert.deepEqual(inferBoundaryRoles(value.edges, streets).roles, {})
  assert.match(inferBoundaryRoles(value.edges, streets).conflicts.join(' '), /not opposite/)
  b.role.value = c.role.value = 'unknown'
  assert.deepEqual(inferBoundaryRoles(value.edges, { ...streets, edge_ids: [a.id] }).roles, { [a.id]: 'front', [b.id]: 'side', [c.id]: 'rear', [d.id]: 'side' })
  assert.deepEqual(inferBoundaryRoles(value.edges, { ...streets, edge_ids: [a.id], all_marked: false }).roles, {})
})


// Independent 2x2 and 3x3 outlines guard selection by area, ties and provenance.
test('main-building and planning defaults remain correctable assumptions', () => {
  const example = site('main', [[0, 0], [10, 0], [10, 20], [0, 20], [0, 0]])
  const initial = initialAssumptions(example, 'capture', 'placement', true)
  assert.equal(initial.principal_building_id.value, 'roof-1')
  assert.equal(initial.principal_building_id.origin, 'journey_default')
  assert.deepEqual(Object.values(initial.planning_buffers_m!), [1, 1, 1, 1])
  assert.deepEqual(initial.measurements.boundary, {})
  assert.deepEqual([initial.waterfront.value, initial.waterfront.origin, initial.waterfront.evidence_state], [false, 'journey_default', 'assumed'])
  initial.waterfront = { value: true, origin: 'user', evidence_state: 'user_confirmed', note: null }
  initial.waterfront_edge_ids = [initial.edges[0].id]
  const moved = withPlacementRevision(initial, 'new-placement')
  assert.deepEqual(moved.planning_buffers_m, initial.planning_buffers_m)
  assert.deepEqual(moved.waterfront_edge_ids, initial.waterfront_edge_ids)
  example.site.buildings.push({ ...example.site.buildings[0], id: 'larger', shape: { crs: 'EPSG:3157', geometry: { type: 'Polygon', coordinates: [[[5, 5], [8, 5], [8, 8], [5, 8], [5, 5]]] } } })
  assert.equal(assumedMainBuilding(example), 'larger')
  example.site.buildings.push({ ...example.site.buildings[1], id: 'tie' })
  assert.equal(assumedMainBuilding(example), null)
  example.site.buildings.pop()
  example.site.buildings[1].basis = 'unknown'
  assert.equal(assumedMainBuilding(example), 'roof-1')
})
