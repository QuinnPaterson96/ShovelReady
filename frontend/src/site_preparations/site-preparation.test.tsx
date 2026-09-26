import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { SitePreparation, buildSelection, validLookup } from './SitePreparation'
import type { Candidate, ManualFacts } from './types'

test('standalone selector keeps manual fallback and unreviewed scope visible', () => {
  const html = renderToStaticMarkup(createElement(SitePreparation, { onConfirm: () => {} }))
  for (const phrase of ['three retained Victoria', 'Manual site facts', 'leave unknown fields empty',
    'An address alone does not verify']) assert.ok(html.includes(phrase), phrase)
  assert.ok(html.includes('Continue with unmatched manual facts'))
  assert.ok(!html.includes('buildable'))
})

test('invalid and inconsistent lookup payloads are rejected', () => {
  const base = {
    schema_version: 'sr-38.site-lookup.v1', spatial_revision: 'spatial:sha256:example',
    status: 'no_match', candidates: [], screening_status: 'not_performed',
    collection: 'retained', query_kind: 'pid', query: '028279638',
    coverage: 'three_retained_victoria_parcel_leads', reason: null,
  }
  assert.ok(validLookup(base))
  assert.ok(!validLookup({ ...base, schema_version: 'future' }))
  assert.ok(!validLookup({ ...base, status: 'one_match' }))
  assert.ok(!validLookup({ ...base, screening_status: 'passed' }))
  assert.ok(!validLookup({ ...base, candidates: [{}] }))
})

test('manual override stays distinct from the source value', () => {
  const source = { value: '028-279-638', evidence: { origin: 'source' } } as Candidate['pid']
  const candidate = { pid: source } as Candidate
  const manual = { pid: { value: '008-140-723', evidence: { origin: 'user' } } } as ManualFacts
  const selection = buildSelection(candidate, 'spatial:sha256:pinned', manual)
  assert.equal(selection.mode, 'retained_candidate')
  assert.equal(selection.candidate?.pid.value, '028-279-638')
  assert.equal(selection.manual.pid.value, '008-140-723')
  assert.equal(selection.spatial_revision, 'spatial:sha256:pinned')
  assert.equal(selection.review_status, 'unreviewed')
  assert.equal(buildSelection(null, 'spatial:sha256:pinned', manual).spatial_revision, null)
})


test('lookup rejects incomplete nested candidates before rendering', () => {
  const payload = { schema_version: 'sr-38.site-lookup.v1', spatial_revision: 'pinned',
    collection: 'retained', query_kind: 'pid', query: '028279638',
    coverage: 'three_retained_victoria_parcel_leads', reason: null,
    status: 'one_match', screening_status: 'not_performed',
    candidates: [{candidate_id: 'test', boundary_crs: 'EPSG:3157',
      pid: {evidence: {origin: 'source'}}, approximate_area_m2: {evidence: {origin: 'derived'}},
      constraints_status: 'not_queried', selected: false, zones: []}] }
  assert.equal(validLookup(payload), false)
  assert.equal(validLookup({...payload, candidates: [null]}), false)
})
