import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { emptyPathway, expectedPropertyRevision } from '../conditional_screening/model'
import type { ScenarioResult } from '../conditional_screening/scenarios'
import type { Case } from '../occupied_lots/contract'
import { initialAssumptions } from '../zoning_site_assumptions/model'
import { buildSetbackDrawing, setbackScenarioKey, type SetbackContext } from './geometry'
import { SetbackLayer, SetbackLegend, useSetbackMap } from './SetbackMap'

function context({ reverse = false, origin = 0 } = {}): SetbackContext {
  const source = { provider: 'Synthetic geometry fixture', record_label: 'Analytic 20 m by 30 m rectangle', capture_date: null, review_status: 'synthetic', reference: null }
  const ring = [[0, 0], [20, 0], [20, 30], [0, 30], [0, 0]].map(([x, y]) => [x + origin, y + origin])
  if (reverse) ring.reverse()
  const site: Case = { case_id: 'test', label: 'Synthetic parcel', site: { projected_metre_crs: 'LOCAL:METRE',
    parcel: { id: 'parcel', source, shape: { crs: 'LOCAL:METRE', geometry: { type: 'Polygon', coordinates: [ring] } } },
    buildings: [], named_boundaries: [], capture: { completeness: 'complete_for_declared_scope', scope: 'Synthetic rectangle only', limitations: [] } } }
  const assumptions = initialAssumptions(site, 'geometry', 'placement')
  const byDirection = (axis: 0 | 1, coordinate: number) => assumptions.edges.find(edge => edge.start[axis] === coordinate + origin && edge.end[axis] === coordinate + origin)!
  const south = byDirection(1, 0), east = byDirection(0, 20), north = byDirection(1, 30), west = byDirection(0, 0)
  assumptions.planning_buffers_m = Object.fromEntries(assumptions.edges.map(edge => [edge.id, 1]))
  const distances = { [south.id]: 13, [east.id]: 8, [north.id]: 13, [west.id]: 8 }
  const check = (id: string, role: 'side' | 'rear' | 'flanking_street'): ScenarioResult['scenarios'][number]['checks'][number] => ({ edge_id: id, role,
    distance_m: distances[id], basis: 'captured_nominal', minimum_m: role === 'flanking_street' ? 3 : 2, meets: true, rule_id: 'synthetic-distance',
    planning_buffer_m: 1, planning_distance_m: distances[id] - 1, planning_meets: true })
  return {
    request: { schema_version: 'placement-scenarios.request.v1', geometry: { parcel: site.site.parcel, projected_metre_crs: 'LOCAL:METRE', placement: { centre_xy: [10 + origin, 15 + origin], width_m: 4, depth_m: 4, angle_degrees: 0 } },
      assumptions, model_revision: 'synthetic-model', proposal: emptyPathway(),
      street_edge_id: null, rear_edge_id: null, street_pattern: 'unknown' },
    result: { schema_version: 'placement-scenarios.result.v1', status: 'bounded_pass', reason: 'Synthetic example', property_revision: expectedPropertyRevision(assumptions), placement_revision: 'placement', model_revision: 'synthetic-model',
      packet_id: 'synthetic', packet_revision: 'synthetic-revision', scope: 'Synthetic dimensions, not a legal requirement', edge_distances_m: distances, thresholds_m: { side_rear: 2, flanking_street: 3 },
      scenarios: [{ front_edge_id: south.id, outcome: 'pass', checks: [check(east.id, 'flanking_street'), check(north.id, 'rear'), check(west.id, 'side')] },
        { front_edge_id: east.id, outcome: 'pass', checks: [check(south.id, 'side'), check(north.id, 'flanking_street'), check(west.id, 'rear')] }],
      sources: [{ provider: 'Synthetic fixture', record_label: 'Analytic offsets', capture_date: null, review_status: 'synthetic', url: 'https://example.com/fixture', locator: 'Test assumption' }], limitations: ['Not a real parcel or rule.'] },
  }
}

test('offsets stay inward and distinguish source distances from planning allowances for either winding and large coordinates', () => {
  // Independently calculable: 20 x 30 parcel, east minimum 3 m, west/rear 2 m,
  // no front minimum. Interior x=[2,17], y=[0,28]; +1 m planning -> x=[3,16], y=[0,27].
  for (const reverse of [false, true]) for (const origin of [0, 5000000]) {
    const drawing = buildSetbackDrawing(context({ reverse, origin }))
    assert.equal(drawing.status, 'ready')
    if (drawing.status !== 'ready') continue
    const bounds = (points: [number, number][]) => [Math.min(...points.map(p => p[0])) - origin, Math.max(...points.map(p => p[0])) - origin, Math.min(...points.map(p => p[1])) - origin, Math.max(...points.map(p => p[1])) - origin]
    assert.deepEqual(bounds(drawing.candidateArea), [2, 17, 0, 28])
    assert.deepEqual(bounds(drawing.planningArea), [3, 16, 0, 27])
    const street = drawing.lines.find(line => line.role === 'flanking_street')!
    assert.deepEqual(street.candidate?.map(p => p[0] - origin), [17, 17])
    assert.deepEqual(street.planning?.map(p => p[0] - origin), [16, 16])
    assert.equal(drawing.lines.length, 3, 'No unsupported front setback is invented.')
  }
})

test('selecting another scenario changes the complete assignment, and suggested preference is honored', () => {
  const input = context(), selected = setbackScenarioKey(input.result!.scenarios[1])
  const drawing = buildSetbackDrawing(input, selected)
  assert.equal(drawing.status, 'ready')
  if (drawing.status !== 'ready') return
  assert.equal(drawing.scenarioIndex, 1)
  assert.equal(drawing.frontEdgeNumber, 2)
  assert.deepEqual(drawing.lines.map(line => [line.edgeNumber, line.role]), [[1, 'side'], [3, 'flanking_street'], [4, 'rear']])
  assert.deepEqual(drawing.candidateArea.map(point => point[0]).sort((a, b) => a - b), [2, 2, 20, 20])
  function PreferredMap() { const map = useSetbackMap(input, selected); return <>{map.layer}{map.legend}</> }
  const html = renderToStaticMarkup(createElement(PreferredMap))
  assert.match(html, /front at edge 2/)
  assert.match(html, /selected=""[^>]*>Scenario 2 of 2 · front edge 2/)
  assert.match(html, /No front setback line/)
  assert.match(html, /extra planning margin/)
  assert.match(html, /not a model-fit area/)
})

test('stale results, unsupported geometry and contradictory scenario data never draw offsets', () => {
  for (const key of ['property_revision', 'placement_revision', 'model_revision'] as const) {
    const input = context(); input.result![key] = 'old'
    assert.equal(buildSetbackDrawing(input).status, 'unavailable')
  }
  const pending = context(); pending.result = null
  assert.equal(buildSetbackDrawing(pending).status, 'pending')
  const concave = context(); concave.request.assumptions.edges[1].end = [3, 3]; concave.request.assumptions.edges[2].start = [3, 3]
  assert.equal(buildSetbackDrawing(concave).status, 'unavailable')
  const hole = context(); (hole.request.geometry.parcel.shape.geometry.coordinates as number[][][]).push([[4, 4], [5, 4], [5, 5], [4, 4]])
  assert.equal(buildSetbackDrawing(hole).status, 'unavailable')
  const mismatched = context(); mismatched.result!.scenarios[0].checks[0].edge_id = mismatched.result!.scenarios[0].checks[1].edge_id
  assert.equal(buildSetbackDrawing(mismatched).status, 'unavailable')
})

test('the drawing and accessible legend retain source, scope and full-distance basis', () => {
  const drawing = buildSetbackDrawing(context())
  const html = renderToStaticMarkup(<><svg><SetbackLayer drawing={drawing} /></svg><SetbackLegend drawing={drawing} onScenario={() => {}} /></>)
  assert.match(html, /data-setback-edge=/)
  assert.match(html, /Setback distances, assumptions and source/)
  assert.match(html, /Synthetic fixture/)
  assert.match(html, /https:\/\/example.com\/fixture/)
  assert.match(html, /3 m candidate setback, plus 1 m extra planning margin \(4 m from the mapped edge\)/)
})
