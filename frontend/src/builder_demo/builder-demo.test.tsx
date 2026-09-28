import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import BuilderDemo, { enquiry } from './BuilderDemo'
import { buildSelection } from '../site_preparations/SitePreparation'
import type { Fact, ManualFacts } from '../site_preparations/types'
import { parseResult, parseSites } from '../occupied_lots/contract'

const manualFact = (value: string | number | null): Fact => ({
  value, unit: null, basis: null, unresolved_reason: value === null ? 'unknown' : null,
  evidence: { origin: 'user', snapshot_id: null, feature_index: null, source_url: null,
    captured_at: '2026-09-27', method: 'manual entry', review_status: 'unreviewed' },
})
const manual: ManualFacts = { address: manualFact('Unmatched example address'), pid: manualFact(null),
  lot_area_m2: manualFact(450), notes: manualFact(null) }
const questions = { intendedUse: 'family accommodation', timing: '', budget: '', access: '', services: '' }

test('Model 300 entry uses an explicit single-model catalogue lead and optional examples', () => {
  const html = renderToStaticMarkup(createElement(BuilderDemo))
  assert.match(html, /Model 300/)
  assert.match(html, /Start with a site lead or the facts you know/)
  assert.doesNotMatch(html, /Model 240|The Landing/)
  assert.doesNotMatch(html, /Import a separate retained example for placement/)
})

test('unmatched manual site yields a useful enquiry without invented geometry', () => {
  const text = enquiry(buildSelection(null, null, manual), questions, null)
  assert.match(text, /Unmatched example address/)
  assert.match(text, /450 m²/)
  assert.match(text, /Geometry and zoning unassessed/)
  assert.match(text, /family accommodation/)
  assert.doesNotMatch(text, /EPSG:3157|VIC-087|No overlap/)
})

test('explicit retained measurement remains a separately named example with provenance', () => {
  const site = parseSites(JSON.parse(readFileSync('../app/scouting_sites/data/sites.json', 'utf8')))[0]
  const result = parseResult(JSON.parse(readFileSync('src/scenario_handoff/retained-assessment.fixture.json', 'utf8')))
  const text = enquiry(buildSelection(null, null, manual), questions,
    { site, model: null, result, widthOrigin: 'user', depthOrigin: 'catalogue' })
  assert.match(text, /separately imported retained example/)
  assert.match(text, /not linked to the site lead/)
  assert.match(text, /width user edited; depth catalogue nominal/)
  assert.match(text, /No overlap with the captured rooflines was observed/)
})
