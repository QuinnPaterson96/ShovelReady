import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { HomeownerSummary } from './HomeownerSummary'
import { homeownerSummary } from './victoriaSummaryAdapter'
import type { Result } from '../occupied_lots/contract'
import type { MappedZoning } from './projectSettings'
import { applyMappedZoning, changeProjectSetting, initialProjectSettings } from './projectSettings'
import type { ScenarioResult } from './scenarios'
import { PropertyScan, parsePropertyScan, type PropertyScanResult } from './PropertyScan'
import type { ScreeningResult } from './model'

const captured = JSON.parse(readFileSync('src/scenario_handoff/retained-assessment.fixture.json', 'utf8')) as Result
const clear = { ...captured, checks: captured.checks.map(check => ({ ...check,
  relation: check.relation === 'outside' || check.relation === 'touches' || check.relation === 'positive_area_overlap' ? 'separate' : check.relation,
  comparison: check.comparison === 'shortfall' ? null : check.comparison })) }
const base = { geometry: clear, geometryComplete: true, scenario: null, screening: null, assumptions: null, settings: initialProjectSettings(), mapped: null, lookup: null,
  zoningBusy: false, zoningError: '', scenarioError: '', screeningError: '', onRetryAvailable: true }

test('exact PGA map label retains its identity and restores ordinary garden-suite coverage', () => {
  const mapped: MappedZoning = { schema_version: 'sr.mapped-zoning.v1', property_revision: 'cecelia', status: 'single', zone: 'GRD-1 (PGA)',
    instrument: 'Zoning Bylaw 2018 (No. 18-072)', source: { provider: 'City of Victoria', record_label: 'zoning polygon', url: 'https://maps.victoria.ca/', capture_date: '2026-10-06', review_status: 'unreviewed', locator: 'Zoning' }, reason: 'whole captured parcel' }
  const settings = applyMappedZoning(initialProjectSettings(), mapped, 'cecelia')
  assert.equal(settings.proposal.confirmed_zone, 'GRD-1 (PGA)')
  const summary = homeownerSummary({ ...base, settings, mapped })
  assert.equal(summary.checks.at(-1)?.status, 'checked')
  for (const label of ['Distance to boundaries', 'Existing garden suite', 'Floor area']) {
    assert.equal(summary.checks.find(check => check.label === label)?.status, 'unknown')
    assert.ok(summary.checks.find(check => check.label === label)?.action)
  }
  assert.equal(applyMappedZoning(initialProjectSettings(), { ...mapped, zone: 'GRD-1 - Site Specific' }, 'cecelia').proposal.confirmed_zone, 'other')
})

test('observed geometry conflict wins over any apparently clear subset', () => {
  const conflict = { ...captured, checks: captured.checks.map(check => check.kind === 'containment' ? { ...check, relation: 'outside' } : check) }
  const summary = homeownerSummary({ ...base, geometry: conflict, scenario: { status: 'bounded_pass' } as ScenarioResult })
  assert.equal(summary.conclusion, 'This placement has a conflict')
  assert.equal(summary.checks[0].status, 'conflict')
  assert.equal(summary.checks.find(check => check.label === 'Height')?.status, 'unsupported')
})

test('clear captured geometry with missing rules remains a closer look', () => {
  const summary = homeownerSummary(base)
  assert.equal(summary.conclusion, 'Review this placement')
  assert.equal(summary.checks[0].status, 'checked')
  assert.notEqual(summary.checks.find(check => check.label === 'Distance to boundaries')?.status, 'checked')
  const html = renderToStaticMarkup(createElement(HomeownerSummary, { summary, onNavigate: () => {} }))
  assert.match(html, /Height · Not covered/)
  assert.match(html, /Enter suite count/)
  assert.match(html, /Review boundary offsets/)
})

test('zoning outage offers retry while an unsupported mapped zone stays outside scope', () => {
  const unavailable = homeownerSummary({ ...base, zoningError: 'Timed out.' })
  assert.equal(unavailable.checks.at(-1)?.status, 'unknown')
  assert.deepEqual(unavailable.checks.at(-1)?.action, { label: 'Retry zoning lookup', target: 'zoning-retry' })
  const mapped: MappedZoning = { schema_version: 'sr.mapped-zoning.v1', property_revision: 'a', status: 'single', zone: 'R-1',
    instrument: 'Zoning Bylaw 2018 (No. 18-072)', source: null, reason: 'mapped' }
  const outside = homeownerSummary({ ...base, mapped })
  assert.equal(outside.checks.at(-1)?.status, 'unsupported')
  assert.match(outside.checks.at(-1)?.detail ?? '', /does not mean a garden suite is prohibited/)
  assert.equal(outside.checks.at(-1)?.action, undefined)
  assert.equal(outside.checks.find(check => check.label === 'Distance to boundaries')?.status, 'unsupported')
  const entered = homeownerSummary({ ...base, settings: changeProjectSetting(initialProjectSettings(), 'confirmed_zone', 'other') })
  assert.equal(entered.checks.at(-1)?.status, 'unsupported')
})

test('a supplied area conflict has a visible actionable row rather than only changing the headline', () => {
  const screening = { checks: [{ rule: { kind: 'area_max' }, status: 'apparent_conflict_under_assumptions' }] } as ScreeningResult
  const summary = homeownerSummary({ ...base, screening })
  assert.equal(summary.conclusion, 'This placement has a conflict')
  assert.equal(summary.checks.find(check => check.label === 'Floor area')?.status, 'conflict')
  assert.equal(summary.checks.find(check => check.label === 'Floor area')?.action?.target, 'zsa-floor-area')
})

test('mixed summary counts named statuses and gives conflict action priority without user questions for unsupported rules', () => {
  const summary = homeownerSummary({ ...base, screening: { checks: [
    { rule: { kind: 'area_max' }, status: 'apparent_conflict_under_assumptions' },
    JSON.parse(readFileSync('src/conditional_screening/api-response.fixture.json', 'utf8')).checks.find((check: {rule: {kind: string}}) => check.rule.kind === 'separation_min'),
  ] } as ScreeningResult })
  const html = renderToStaticMarkup(createElement(HomeownerSummary, { summary, onNavigate() {} }))
  for (const [status, label] of [['checked', 'Checked'], ['unknown', 'Missing information'], ['conflict', 'Conflicts'], ['unsupported', 'Not covered']] as const) {
    assert.match(html, new RegExp(`${summary.checks.filter(check => check.status === status).length} ${label}`))
  }
  assert.match(html, /Next: Review floor area/)
  const gap = summary.checks.find(check => check.label === 'Distance from the main building')!
  assert.equal(gap.status, 'unsupported')
  assert.equal(gap.action, undefined)
  const outside = homeownerSummary({ ...base, settings: changeProjectSetting(initialProjectSettings(), 'confirmed_zone', 'other') })
  assert.equal(outside.checks.filter(check => check.status === 'unknown').length, 0, 'missing rule coverage cannot be solved by filling user facts')
})

test('incomplete captured geometry cannot become a promising or checked space finding', () => {
  const summary = homeownerSummary({ ...base, geometryComplete: false })
  assert.equal(summary.checks[0].status, 'unknown')
  assert.equal(summary.conclusion, 'Review this placement')
  assert.doesNotMatch(summary.next, /No mapped overlap/)
})


test('provider exploration needs supported comparisons, not geometry or a majority of green rows', () => {
  const mapped: MappedZoning = { schema_version: 'sr.mapped-zoning.v1', property_revision: 'test', status: 'single', zone: 'GRD-1', instrument: 'Zoning Bylaw 2018 (No. 18-072)', source: null, reason: 'constructed' }
  const screening = { checks: [
    { rule: { kind: 'count_max' }, status: 'meets_under_assumptions' },
    { rule: { kind: 'area_max' }, status: 'meets_under_assumptions' },
    { rule: { kind: 'separation_min', applicability: 'unknown', measurement_definition: null }, status: 'needs_information' },
  ] } as ScreeningResult
  const scenario = { status: 'bounded_pass', additional_checks: [['height', 'Height'], ['separation', 'Distance from the main building'], ['front', 'Front boundary distance'], ['rear_location', 'Located behind the main building'], ['rear_occupancy', 'Share of the rear yard']].map(([id, label]) => ({ id, label, status: 'checked', detail: 'Constructed supported comparison.' })) } as ScenarioResult
  const assumptions = { existing_garden_suites: { value: 0, origin: 'journey_default', evidence_state: 'assumed' } } as import('../zoning_site_assumptions/model').SiteAssumptions
  const input = { ...base, mapped, screening, scenario, assumptions }
  const summary = homeownerSummary(input)
  assert.equal(summary.conclusion, 'Worth exploring with the provider')
  assert.match(summary.checks.find(check => check.label === 'Existing garden suite')!.detail, /assuming none existing/)
  assert.ok(summary.checks.some(check => check.status === 'unsupported'))
  assert.equal(homeownerSummary({ ...input, scenario: { ...scenario, status: 'clarify' } }).conclusion, 'Review this placement')
  assert.equal(homeownerSummary({ ...input, screening: { ...screening, checks: screening.checks.map(check => check.rule.kind === 'count_max' ? { ...check, status: 'needs_information' } : check) } }).conclusion, 'Worth exploring with the provider')
  assert.equal(homeownerSummary({ ...input, geometryComplete: false }).conclusion, 'Review this placement')
})


test('probable defaults stay labelled and never replace a measured conflict', () => {
  const assumptions = { existing_garden_suites: { value: 0, origin: 'journey_default', evidence_state: 'assumed' } } as import('../zoning_site_assumptions/model').SiteAssumptions
  const scenario = { additional_checks: [{ id: 'area', label: 'Floor area', status: 'probable', detail: 'Nominal footprint +10%.' }] } as ScenarioResult
  const summary = homeownerSummary({ ...base, assumptions, scenario })
  assert.equal(summary.checks.find(row => row.label === 'Existing garden suite')?.status, 'probable')
  assert.equal(summary.checks.find(row => row.label === 'Floor area')?.status, 'probable')
  const html = renderToStaticMarkup(createElement(HomeownerSummary, { summary, onNavigate() {} }))
  assert.match(html, /Existing garden suite .* Likely fine/)
  assert.match(html, /About Floor area assumption/)
  const conflict = homeownerSummary({ ...base, assumptions, scenario, screening: { checks: [{ rule: { kind: 'area_max' }, status: 'apparent_conflict_under_assumptions' }] } as ScreeningResult })
  assert.equal(conflict.checks.find(row => row.label === 'Floor area')?.status, 'conflict')
})


test('scan failures and malformed empty results cannot become probable clearances', () => {
  const parcel_ref = { source: 'city-of-victoria-pid-parcels' as const, object_id: 87 }
  const labels = ['Heritage properties', 'Heritage conservation areas', 'Development permit areas', 'Mapped special restrictions', 'Mapped development applications', 'Development application history']
  const scan: PropertyScanResult = { schema_version: 'victoria-property-scan.v1', parcel_ref, parcel_source: null, limitations: ['Permit documents remain unsearched.'], findings: labels.map((label, index) => ({ label, status: 'probably_clear', records: [], detail: 'No mapped records in this searched scope.', source: { provider: 'City of Victoria Open Data', record_label: label, review_status: 'unreviewed_live_observation', captured_at_utc: '2026-10-06T00:00:00Z', sha256: 'a'.repeat(64), source_url: `https://maps.victoria.ca/server/rest/services/OpenData/OpenData_PlanningAndDevelopment/MapServer/${[10,14,11,1,3,18][index]}/query?f=json` } })) }
  assert.equal(parsePropertyScan(scan, parcel_ref), scan)
  assert.equal(homeownerSummary({ ...base, propertyScan: scan }).checks.flatMap(row => row.parts ?? [row]).find(row => row.label === 'Mapped records')?.status, 'probable')
  const checklist = (result: PropertyScanResult | null) => renderToStaticMarkup(createElement(PropertyScan, { scan: { result, available: true, busy: false, error: '', retry() {} } }))
  assert.match(checklist(scan), /No · Likely fine in searched scope/)
  assert.match(checklist(scan), /Service capacity<\/strong><span>Maybe · Not checked/)
  const flagged = { ...scan, findings: scan.findings.map((row, index) => index === 0 ? { ...row, status: 'review' as const, records: [{ OBJECTID: 1, Name: 'Retained heritage lead' }] } : row) }
  assert.match(checklist(flagged), /Yes · Needs review/)
  assert.match(checklist(flagged), /Retained heritage lead/)
  assert.doesNotMatch(checklist(null), /No · Likely fine/)
  const partial = { ...scan, findings: scan.findings.map((row, index) => index === 0 ? { ...row, status: 'unknown' as const, source: null } : row) }
  assert.equal(homeownerSummary({ ...base, propertyScan: partial }).checks.flatMap(row => row.parts ?? [row]).find(row => row.label === 'Mapped records')?.status, 'unknown')
  assert.throws(() => parsePropertyScan({ ...scan, findings: scan.findings.slice(1) }, parcel_ref))
  assert.throws(() => parsePropertyScan({ ...scan, findings: scan.findings.map(row => ({ ...row, source: null })) }, parcel_ref))
  assert.throws(() => parsePropertyScan(scan, { ...parcel_ref, object_id: 88 }))
})

// Independent subtraction: 2.54 - 2 = .54 m available allowance;
// retaining a 1 m buffer requires .46 m extra gap. No overall viability claim.
test('buffer guidance retains review and separates assumption changes from measured clearance', () => {
  const scenario = { status: 'bounded_pass', scenarios: [{ checks: [{ edge_id: 'side', role: 'side', distance_m: 2.54, minimum_m: 2, planning_buffer_m: 1, planning_distance_m: 1.54, planning_meets: false, meets: true, basis: 'captured_nominal' }] }] } as ScenarioResult
  const assumptions = { edges: [{ id: 'side' }], existing_garden_suites: { value: null } } as import('../zoning_site_assumptions/model').SiteAssumptions
  const row = homeownerSummary({ ...base, scenario, assumptions }).checks.find(row => row.label === 'Distance to boundaries')!
  assert.equal(row.status, 'review')
  assert.match(row.resolutions!.join(' '), /at least 2 m.*approximately 0.46 m.*buffer of 0.54 m.*only your assumption/)
  assert.equal(homeownerSummary({ ...base, scenario: { ...scenario, scenarios: [...scenario.scenarios, ...scenario.scenarios] }, assumptions }).checks.find(row => row.label === 'Distance to boundaries')!.resolutions, undefined)
})
