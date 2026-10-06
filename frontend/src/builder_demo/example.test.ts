import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { parseResult, type Result } from '../occupied_lots/contract'
import { exampleObservation, exampleRequest, initialExamplePosition, parseExampleResult } from './example'

const fixture = parseResult(JSON.parse(readFileSync('src/scenario_handoff/retained-assessment.fixture.json', 'utf8')))
const geometryOnly: Result = { ...fixture, checks: fixture.checks.filter(check => check.kind !== 'requirement') }
const changed = (patch: Partial<Result['checks'][number]>, kind: string): Result => ({
  ...geometryOnly, checks: geometryOnly.checks.map(check => check.kind === kind ? { ...check, ...patch } : check),
})

test('saved example distinguishes separate, touching, overlapping and outside observations', () => {
  assert.equal(exampleObservation(geometryOnly).kind, 'clear')
  assert.equal(exampleObservation(changed({ relation: 'touches', area_m2: 0 }, 'building_overlap')).kind, 'conflict')
  assert.equal(exampleObservation(changed({ relation: 'positive_area_overlap', area_m2: 0.00001 }, 'building_overlap')).kind, 'conflict')
  assert.equal(exampleObservation(changed({ relation: 'outside', area_m2: 1 }, 'containment')).kind, 'conflict')
  const partial = changed({ status: 'missing', relation: null }, 'building_overlap')
  assert.equal(exampleObservation(partial).kind, 'unresolved')
  assert.equal(exampleObservation({ ...partial, checks: partial.checks.map(c => c.kind === 'containment' ? { ...c, relation: 'touches' } : c) }).kind, 'conflict')
})

test('optional user minima preserve exact numbers and a shortfall cannot look clear', () => {
  const position = initialExamplePosition()
  assert.deepEqual(exampleRequest(position)?.requirements, [])
  const request = exampleRequest(position, { parcel: '1.234567', roofline: '0' })
  assert.deepEqual(request?.requirements, [
    { id: 'user-parcel-minimum', target: 'parcel_boundary', minimum_m: 1.234567, status: 'user_assumption' },
    { id: 'user-roofline-minimum', target: 'nearest_building', minimum_m: 0, status: 'user_assumption' },
  ])
  assert.equal(exampleRequest(position, { parcel: '-1', roofline: '' }), null)
  assert.equal(exampleRequest(position, { parcel: 'not a number', roofline: '' }), null)
  const withRequirement: Result = { ...geometryOnly, checks: [...geometryOnly.checks, fixture.checks.find(check => check.kind === 'requirement')!] }
  assert.equal(exampleObservation({ ...withRequirement, checks: withRequirement.checks.map(check => check.kind === 'requirement' ? { ...check, comparison: 'shortfall', margin_m: -0.000001 } : check) }).kind, 'shortfall')
  assert.equal(exampleObservation({ ...withRequirement, checks: withRequirement.checks.map(check => check.kind === 'requirement' ? { ...check, comparison: null, status: 'missing' } : check) }).kind, 'unresolved')
})

test('late or mismatched measurement input cannot be returned as the current example', () => {
  const request = exampleRequest(initialExamplePosition())!
  const matching = { ...fixture, input: { ...fixture.input, placement: { ...request.placement }, requirements: request.requirements } }
  assert.equal(parseExampleResult(matching, request).checks.length, fixture.checks.length)
  assert.throws(() => parseExampleResult({ ...matching, input: { ...matching.input, placement: { ...matching.input.placement, centre_xy: [0, 0] } } }, request))
  assert.throws(() => parseExampleResult({ ...matching, input: { ...matching.input, requirements: [{ ...request.requirements[0], minimum_m: 7 }] } }, request))
  const withMinimum = exampleRequest(initialExamplePosition(), { parcel: '1', roofline: '' })!
  assert.throws(() => parseExampleResult({ ...matching, input: { ...matching.input, requirements: withMinimum.requirements }, checks: geometryOnly.checks }, withMinimum))
  const echoedRequirement = { ...withMinimum.requirements[0], target_id: null, source: null }
  assert.equal(parseExampleResult({ ...matching, input: { ...matching.input, requirements: [echoedRequirement] } }, withMinimum).checks.length, fixture.checks.length)
})
