import { test } from 'node:test'
import assert from 'node:assert/strict'
import response from './api-response.fixture.json'
import { currentPlacementRevision, expectedPropertyRevision, parseScreeningResult, screeningCheckTitle, screeningIdentity, type ScreeningRequest } from './model'
import type { SiteAssumptions } from '../zoning_site_assumptions/model'
import { screeningDocument as enquiryDocument } from '../builder_demo/BuilderDemo'

test('actual API producer fixture parses and echoes the exact site identity', () => {
  // Captured from the FastAPI route with tests/test_conditional_screening_api.py payload().
  const result = parseScreeningResult(response)
  const assumptions = result.request.site_assumptions as SiteAssumptions
  assert.equal(result.request.property_revision, expectedPropertyRevision(assumptions))
  assert.equal(result.request.placement_revision, assumptions.placement_revision)
  assert.equal(result.coverage.apparent_conflict_under_assumptions, 1)
  assert.ok(result.checks.some(check => check.status === 'meets_under_assumptions'))
  assert.ok(result.checks.some(check => check.status === 'needs_information'))
  const boundary = result.checks.find(check => check.rule.kind === 'boundary_min')!
  assert.match(screeningCheckTitle(boundary), /setback · edge/)
  assert.doesNotMatch(screeningCheckTitle(boundary), /geom-1/)
  assert.equal(screeningCheckTitle(result.checks.find(check => check.rule.fact_id === 'foundation')!), 'Foundation attachment')
  assert.equal(screeningCheckTitle(result.checks.find(check => check.rule.fact_id === 'building_type')!), 'Existing main building type')
  assert.equal(screeningCheckTitle(result.checks.find(check => check.rule.fact_id === 'principal_building')!), 'Main building selection')
  assert.throws(() => parseScreeningResult({ ...response, checks: [{ rule: {}, status: 'meets_under_assumptions' }] }))
})

test('placement and proposal edits have different request identities before a response can be shown', () => {
  const assumptions = response.request.site_assumptions as unknown as SiteAssumptions
  const base: ScreeningRequest = { schema_version: 'conditional-screening.api.v1', assumptions,
    model_revision: 'catalogue-record:aux-300@example', proposal: { proposed_use: 'garden_suite', foundation_attached: true,
      confirmed_zone: 'GRD-1', confirmed_instrument: 'Zoning Bylaw 2018', legal_lot_confirmed: true,
      floor_area_definition_acknowledged: true, no_relevant_projections: true } }
  const identity = screeningIdentity(base)
  const nextPlacement = currentPlacementRevision({ x: 1, y: 2, angle: 3 })
  assert.notEqual(nextPlacement, currentPlacementRevision({ x: 1.1, y: 2, angle: 3 }))
  assert.notEqual(identity, screeningIdentity({ ...base, assumptions: { ...assumptions, placement_revision: nextPlacement } }))
  assert.notEqual(identity, screeningIdentity({ ...base, proposal: { ...base.proposal, confirmed_zone: null } }))
})

test('supporting report carries each current candidate check and citation, while stale findings can be omitted', () => {
  const result = parseScreeningResult(response)
  const assumptions = result.request.site_assumptions as SiteAssumptions
  const input = { intendedUse: '', timing: '', budget: '', access: '', services: '' }
  const current = enquiryDocument(null, input, null, false, null, null, false, null, result, assumptions)
  const conditional = current.sections.find(section => section.heading === 'Conditional zoning')!
  assert.equal(conditional.paragraphs.length, result.checks.length + 3)
  assert.match(conditional.paragraphs.join(' '), /Part 3\.1\(28\)/)
  assert.match(conditional.paragraphs.join(' '), /https:\/\/www\.victoria\.ca/)
  assert.match(conditional.paragraphs.join(' '), /unresolved preliminary concern under the supplied assumptions/)
  const stale = enquiryDocument(null, input, null, false, null, null, false, null, null, assumptions)
  assert.doesNotMatch(stale.sections.find(section => section.heading === 'Conditional zoning')!.paragraphs.join(' '), /unresolved preliminary concern under the supplied assumptions/)
})
