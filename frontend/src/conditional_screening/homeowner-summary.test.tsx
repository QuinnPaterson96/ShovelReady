import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { homeownerSummary, HomeownerSummary } from './HomeownerSummary'
import type { Result } from '../occupied_lots/contract'
import type { MappedZoning } from './projectSettings'
import { changeProjectSetting, initialProjectSettings } from './projectSettings'
import type { ScenarioResult } from './scenarios'

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
  assert.equal(summary.conclusion, 'This placement needs a closer look')
  assert.equal(summary.checks[0].status, 'checked')
  assert.notEqual(summary.checks.find(check => check.label === 'Distance to boundaries')?.status, 'checked')
  const html = renderToStaticMarkup(createElement(HomeownerSummary, { summary, onNavigate: () => {} }))
  assert.match(html, /Height · Not yet covered/)
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
  const entered = homeownerSummary({ ...base, settings: changeProjectSetting(initialProjectSettings(), 'confirmed_zone', 'other') })
  assert.equal(entered.checks.at(-1)?.status, 'unsupported')
})
