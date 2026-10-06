import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { exampleCase } from '../builder_demo/example'
import { initialAssumptions } from '../zoning_site_assumptions/model'
import { PlacementScenarios } from './PlacementScenarios'
import { parseScenarioResult, type ScenarioResult } from './scenarios'

const base = initialAssumptions(exampleCase, 'test-geometry', 'test-placement')
const ids = base.edges.map(edge => edge.id)
const source = { provider: 'City of Victoria', record_label: 'Candidate setback packet', capture_date: '2026-10-05', review_status: 'candidate', url: 'https://www.victoria.ca/', locator: 'Part 3.1(28)' }
const result: ScenarioResult = {
  schema_version: 'placement-scenarios.result.v1', status: 'bounded_pass', reason: 'Bounded subset only.',
  property_revision: 'example:parcel:test-geometry', placement_revision: 'test-placement', model_revision: 'test-model',
  packet_id: 'candidate', packet_revision: 'test', scope: 'Approximate captured edges',
  edge_distances_m: Object.fromEntries(ids.map(id => [id, 1.25])), thresholds_m: { side_rear: .6, flanking_street: 3.5 },
  scenarios: [{ front_edge_id: ids[0], outcome: 'pass', checks: [
    { edge_id: ids[1], role: 'side', distance_m: .75, basis: 'user_wall_to_lot_line', minimum_m: .6, meets: true, rule_id: 'side' },
    { edge_id: ids[2], role: 'rear', distance_m: 1.25, basis: 'captured_nominal', minimum_m: .6, meets: true, rule_id: 'rear' },
    { edge_id: ids[3], role: 'side', distance_m: 1.25, basis: 'captured_nominal', minimum_m: .6, meets: true, rule_id: 'side' },
  ] }], sources: [source], limitations: ['Front and height are not checked.'],
}

test('scenario response and current result distinguish derived roles, captured distance and user override', () => {
  const assumptions = { ...base, measurements: { ...base.measurements, boundary: { [ids[1]]: {
    value: .75, unit: 'm' as const, basis: 'proposed_wall_to_lot_line' as const,
    origin: 'user' as const, note: null, placement_revision: 'test-placement',
  } } } }
  const parsed = parseScenarioResult(result)
  const html = renderToStaticMarkup(createElement(PlacementScenarios, { assumptions, request: null, result: parsed,
    busy: false, error: '', frontEdge: ids[0], rearEdge: null, boundaryMode: 'place', onBoundaryMode: () => {} }))
  assert.match(html, /Derived scenario role: front/)
  assert.match(html, /Derived scenario role: rear/)
  assert.match(html, /≈ 1\.25 m from captured parcel edge/)
  assert.match(html, /Your wall-to-legal-line entry: 0\.75 m \(unverified\)/)
  assert.match(html, /Candidate comparison uses this entry; the approximate map distance remains above/)
  assert.match(html, /Missing front, rear-yard, height and site-specific checks/)
  assert.doesNotMatch(html, /surveyed front lot line|complete approval/i)
})

test('malformed nested scenario evidence is rejected before it can be displayed', () => {
  assert.throws(() => parseScenarioResult({ ...result, scenarios: [{ ...result.scenarios[0], checks: [{ ...result.scenarios[0].checks[0], role: 'front' }] }] }), /malformed/)
  assert.throws(() => parseScenarioResult({ ...result, sources: [{ ...source, record_label: null }] }), /malformed/)
  assert.throws(() => parseScenarioResult({ ...result, edge_distances_m: { [ids[0]]: Infinity } }), /malformed/)
})
