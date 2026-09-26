import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { initialDraft, draftReducer, type Draft } from '../assessment/model'
import { bundledCatalogue, selectModel, editField } from '../model_catalogue/model'
import { buildEvidenceChecklist, evidenceChecklistText } from './model'
import { EvidenceChecklistView } from './EvidenceChecklistView'
import exampleOutput from './example-output.json'
import type { Candidate, Fact, ManualFacts, SitePreparationSelection } from '../site_preparations/types'

const scope = { municipality: 'Victoria', use: 'garden suite', role: 'accessory building' }
function fact(value: string | number | null, origin: 'source' | 'derived' | 'user', basis: string | null = null): Fact {
  return { value, unit: null, basis, unresolved_reason: null, evidence: { origin,
    snapshot_id: origin === 'user' ? null : 'parcel-snapshot', feature_index: origin === 'user' ? null : 1,
    source_url: origin === 'user' ? null : 'https://maps.victoria.ca/example', captured_at: '2026-09-25',
    method: origin === 'user' ? 'manual entry' : 'captured observation', review_status: 'unreviewed' } }
}
const manualFacts = (pid = '123', area = '450', notes = 'Survey still needed'): ManualFacts => ({
  pid: fact(pid, 'user'), address: fact('1255 Queens Ave', 'user'), lot_area_m2: fact(area, 'user'), notes: fact(notes, 'user'),
})
function retained(pid = '123', area = 450): SitePreparationSelection {
  const candidate = { candidate_id: 'lead-1', pid: fact(pid, 'source'), address: fact('1255 QUEENS AVE', 'source', 'ALIAS'),
    approximate_area_m2: { ...fact(area, 'derived'), unit: 'm2', basis: 'GIS polygon area' } } as Candidate
  return { schema_version: 'sr-38.site-selection.v1', mode: 'retained_candidate', candidate,
    spatial_revision: 'spatial-r1', manual: manualFacts(), review_status: 'unreviewed', screening_status: 'not_performed' }
}
function draft(modelId: string | null = 'auxbox-240', site: SitePreparationSelection | null = retained()): Draft {
  const model = selectModel(initialDraft.model, bundledCatalogue, modelId)
  return { ...initialDraft, values: { ...initialDraft.values, ...scope }, model, site }
}
const item = (value: Draft, id: string) => {
  const result = buildEvidenceChecklist(value).items.find(entry => entry.id === id)
  assert.ok(result, id)
  return result
}

test('retained source, manual notes, provisional rule identity and accessible view stay separate', () => {
  const checklist = buildEvidenceChecklist(draft())
  assert.equal(checklist.schema_version, 'sr-50.evidence-checklist.v1')
  assert.equal(checklist.screening_status, 'not_performed')
  assert.deepEqual(item(draft(), 'site-identity').available_evidence.map(e => e.origin), ['source', 'source', 'user', 'user'])
  assert.equal(item(draft(), 'site-identity').available_evidence[1].basis, 'ALIAS')
  assert.equal(item(draft(), 'site-geometry-placement').available_evidence[0].revision_id, 'spatial-r1')
  assert.equal(item(draft(), 'user-notes').available_evidence[0].review_status, 'unreviewed')
  const rule = checklist.items.find(entry => entry.id === 'rule-victoria-zb2018-garden-suite-rear-yard-occupancy')!
  assert.equal(rule.state, 'provisional')
  assert.match(rule.available_evidence[0].basis!, /legally defined rear-yard area/)
  assert.match(rule.available_evidence[0].revision_id!, /source-6c9e35a8de4e-agent-1/)
  const html = renderToStaticMarkup(createElement(EvidenceChecklistView, { checklist }))
  assert.match(html, /screening not performed/)
  assert.match(html, /Status: provisional/)
  assert.match(html, /Available attributed evidence/)
  assert.match(html, /Source page/)
  assert.match(evidenceChecklistText(checklist), /feature 1; snapshot parcel-snapshot/)
})

test('manual and unconfirmed site entries remain unreviewed, with no source parcel', () => {
  const manualSite = { ...retained(), mode: 'manual_unmatched' as const, candidate: null, spatial_revision: null }
  assert.deepEqual(item(draft(null, manualSite), 'site-identity').available_evidence.map(e => e.origin), ['user', 'user'])
  const unconfirmed = { ...draft(null, null), siteInput: { ...initialDraft.siteInput, address: '1255 Queens Ave', notes: 'Need title' } }
  assert.equal(item(unconfirmed, 'site-identity').available_evidence[0].description, 'Unconfirmed address entry')
  assert.equal(item(unconfirmed, 'user-notes').state, 'unreviewed')
  assert.equal(item(unconfirmed, 'model-service').state, 'missing')
})

test('conflicts require reconciliation; matching retained values still require legal evidence', () => {
  const selected = retained('999', 430)
  assert.equal(item(draft('auxbox-240', selected), 'site-identity').state, 'conflicting')
  assert.equal(item(draft('auxbox-240', selected), 'site-geometry-placement').state, 'conflicting')
  assert.match(item(draft('auxbox-240', selected), 'site-identity').missing_input, /Resolve manual PID/)
  assert.equal(item(draft(), 'site-identity').state, 'unreviewed')
  assert.match(item(draft(), 'site-identity').missing_input, /legal lot/)
})

test('model service exclusions and unknown roof datum survive edits', () => {
  const landing = draft('click-landing')
  assert.equal(item(landing, 'model-service').state, 'conflicting')
  assert.match(item(landing, 'model-service').available_evidence[0].description, /Sunshine Coast/)
  assert.match(item(landing, 'model-service').missing_input, /excludes Victoria/)
  assert.match(item(landing, 'model-roof-datum').missing_input, /unknown/)
  const edited = { ...landing, model: editField(landing.model, 'width', '5.5') }
  assert.deepEqual(item(edited, 'model-revision-footprint').available_evidence.slice(0, 2).map(e => e.origin), ['source', 'user'])
})

test('synthetic example remains labeled and Victoria packet is outside its scope', () => {
  const synthetic = draftReducer(initialDraft, { type: 'load', id: 'synthetic-direct-pass' })
  const checklist = buildEvidenceChecklist(synthetic)
  assert.equal(checklist.scope.synthetic, true)
  assert.equal(checklist.screening_status, 'not_performed')
  assert.match(item(synthetic, 'rule-currentness-applicability').missing_input, /outside or incomplete/)
  assert.equal(item(synthetic, 'model-revision-footprint').available_evidence[0].origin, 'synthetic')
  assert.match(evidenceChecklistText(checklist), /synthetic true/)
})

test('versioned example output matches the deterministic builder', () => {
  const prepared = { ...draft('click-landing', null), siteInput: { ...initialDraft.siteInput,
    address: 'Example address (unconfirmed)', notes: 'Survey still needed' } }
  assert.deepEqual(buildEvidenceChecklist(prepared), exampleOutput)
})
