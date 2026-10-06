import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { HomeownerSummary } from './HomeownerSummary'
import { homeownerSummary } from './victoriaSummaryAdapter'
import type { Result } from '../occupied_lots/contract'
import type { MappedZoning } from './projectSettings'
import { changeProjectSetting, initialProjectSettings } from './projectSettings'
import type { ScenarioResult } from './scenarios'
import type { ScreeningResult } from './model'

const captured = JSON.parse(readFileSync('src/scenario_handoff/retained-assessment.fixture.json', 'utf8')) as Result
const clear = { ...captured, checks: captured.checks.map(check => ({ ...check,
  relation: check.relation === 'outside' || check.relation === 'touches' || check.relation === 'positive_area_overlap' ? 'separate' : check.relation,
  comparison: check.comparison === 'shortfall' ? null : check.comparison })) }
const base = { geometry: clear, geometryComplete: true, scenario: null, screening: null, assumptions: null, settings: initialProjectSettings(), mapped: null, lookup: null,
  zoningBusy: false, zoningError: '', scenarioError: '', screeningError: '', onRetryAvailable: true }

test('observed geometry conflict wins over any apparently clear subset', () => {
  const conflict = { ...captured, checks: captured.checks.map(check => check.kind === 'containment' ? { ...check, relation: 'outside' } : check) }
  const summary = homeownerSummary({ ...base, geometry: conflict, scenario: { status: 'bounded_pass' } as ScenarioResult })
  assert.equal(summary.conclusion, 'This placement has a problem')
  assert.equal(summary.checks[0].status, 'conflict')
  assert.equal(summary.checks.find(check => check.label === 'Height')?.status, 'unsupported')
})

test('clear captured geometry with missing rules remains a closer look', () => {
  const summary = homeownerSummary(base)
  assert.equal(summary.conclusion, 'A promising starting position · limited checks')
  assert.equal(summary.checks[0].status, 'checked')
  assert.notEqual(summary.checks.find(check => check.label === 'Distance to boundaries')?.status, 'checked')
  const html = renderToStaticMarkup(createElement(HomeownerSummary, { summary, onNavigate: () => {} }))
  assert.match(html, /Height · Not covered/)
  assert.match(html, /Enter suite count/)
  assert.match(html, /Review boundary roles/)
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
  assert.equal(summary.conclusion, 'This placement has a problem')
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
  assert.equal(summary.conclusion, 'This placement needs a closer look')
  assert.doesNotMatch(summary.next, /No mapped overlap/)
})
