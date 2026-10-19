// Offline fixture preparation. Run from frontend: node --import tsx tools/budget_comparison.ts
import { mkdirSync, writeFileSync } from 'node:fs'
import { defaultJourneyModel as model, modelSnapshot } from '../src/model_catalogue/demo'
import { manufacturerDocument } from '../src/builder_demo/manufacturer'
import { enquiryMarkdown, enquiryPlainText } from '../src/builder_demo/enquiry'
import { budgetEvidence, catalogueSuggestions, emptyBudget, manualItem, replaceItem } from '../src/project_budget/pipeline'
import type { Context } from '../src/project_budget/contract'

const today = '2026-10-19'
const context: Context = { model_id: model.model_id, model_revision: model.source_revision, snapshot_id: modelSnapshot(model),
  configuration: model.configuration, property_key: 'Synthetic homeowner case; no real site or quote', scenario_key: 'Unknown use; no measured placement' }
const input = { intendedUse: 'Unknown', relationship: 'Unknown', nextStep: 'I would like an initial call.', timing: '',
  budget: 'Around CAD 250,000 for the whole project, as an owner preference rather than a cost estimate.',
  question: 'I have a CAD 2,500.25 planning allowance for delivery and lift, not a quote. Can you help establish the next information needed?', access: '', services: '' }
let draft = replaceItem({ ...emptyBudget(), scope: 'whole_project' }, catalogueSuggestions(model, context.snapshot_id, context, today)[0])
draft = replaceItem(draft, manualItem({ id: 'manual:delivery', category: 'delivery', label: 'Delivery and lift', state: 'priced', basis: 'allowance',
  minimum: '2500.25', maximum: '', bound: 'exact', currency: 'CAD', included_in: '', rationale: 'Synthetic owner planning allowance, no reviewed site or provider quote',
  tax_basis: '', provider: 'Synthetic homeowner', locator: 'Same supplied facts as comparator question', captured_at: '', effective_at: '', expires_at: '',
  inclusions: [], exclusions: [], treatment: 'capital_cost', tax_status: 'unknown' }, context, today))
const before = manufacturerDocument(input, null, false, null, null, null, null, false, false, null, model)
const after = manufacturerDocument({ ...input, budgetDraft: { draft, context, today } }, null, false, null, null, null, null, false, false, null, model)
const output = '../docs/samples/budget-scope'
mkdirSync(output, { recursive: true })
for (const [name, doc] of [['before', before], ['after', after]] as const) {
  writeFileSync(`${output}/${name}-enquiry.md`, enquiryMarkdown(doc))
  writeFileSync(`${output}/${name}-enquiry.txt`, enquiryPlainText(doc))
}
writeFileSync(`${output}/inputs-and-evidence.json`, JSON.stringify({ source_baseline: '86ddb42', date: today,
  method: 'Current generator with optional budget omitted preserves the baseline path. Same model snapshot and supplied facts in both versions; structured draft repeats the owner scope and allowance already in the comparator text.',
  input, evidence: budgetEvidence(draft, context, today) }, null, 2) + '\n')
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
const documentHtml = (doc: typeof before) => `<p><strong>${escape(doc.question)}</strong></p>${doc.sections.map(s => `<h3>${escape(s.heading)}</h3>${s.paragraphs.map(p => `<p>${escape(p)}</p>`).join('')}`).join('')}`
writeFileSync(`${output}/comparison.html`, `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Budget scope: paired enquiry review</title>
<style>body{font:16px/1.6 "Segoe UI",sans-serif;background:#f4f7f6;color:#203238;margin:0}main{max-width:86rem;margin:auto;padding:2rem}h1{font-size:2rem;line-height:1.2}h2{font-size:1.5rem}h3{font-size:1rem;margin:1.5rem 0 .4rem}p{margin:.5rem 0 1rem}.pair{display:grid;grid-template-columns:1fr 1fr;gap:2rem}.pair>section{background:white;border:1px solid #c8d5d4;padding:1.4rem;min-width:0;overflow-wrap:anywhere}a{color:#155b76}aside{max-width:75ch}textarea{width:100%;min-height:7rem;padding:.5rem;font:inherit;box-sizing:border-box}label{display:block;font-weight:600;margin-top:1rem}@media(max-width:850px){main{padding:1rem}.pair{grid-template-columns:1fr}}</style>
<main><h1>Does cost scope improve the next conversation?</h1><aside><p>Prepared October 19, 2026 for a future paired builder/homeowner review. Synthetic homeowner facts; existing aux box Model 300 public claim captured October 6, 2026, unreviewed. No real quote, site, outreach or recipient study.</p>
<p>Both versions receive the same model, owner preference, whole-project scope, delivery/lift allowance and unknown use/site. Version B adds structured presentation and deterministic coverage; it does not add site prices. CAD 187,000 + CAD 2,500.25 = CAD 189,500.25 of priced components, with no finite upper amount. Owner preference CAD 250,000 is separate.</p>
<p><a href="inputs-and-evidence.json">Full inputs, original claim and calculation</a> · <a href="before-enquiry.md">Before Markdown</a> · <a href="after-enquiry.md">After Markdown</a></p>
<p>For a study, counterbalance presentation order and record triage time, repeated questions, next action, invented certainty and preference. Do not treat preference as willingness to pay. Quinn owns recruitment and the study decision under #16/#147.</p></aside>
<div class="pair"><section><h2>A · Existing enquiry path</h2>${documentHtml(before)}</section><section><h2>B · Optional cost scope</h2>${documentHtml(after)}</section></div>
<aside><h2>Review record (unsaved)</h2><p>These fields are blank prompts for a separately authorized study. Nothing is transmitted or stored.</p><label for="response">What can you decide, what would you ask again, and what is the next action?</label><textarea id="response"></textarea><label for="uncertainty">Did either version imply an installed total, quote guarantee or affordability conclusion?</label><textarea id="uncertainty"></textarea></aside></main></html>`)
console.log(`Retained paired enquiry comparison at ${output}; before ${enquiryPlainText(before).split(/\s+/).length} words; after ${enquiryPlainText(after).split(/\s+/).length} words.`)
