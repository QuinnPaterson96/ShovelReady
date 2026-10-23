// Same supplied facts as the retained PR #326 example, with its actual generated before text.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { manufacturerDocument } from '../src/builder_demo/manufacturer'
import { enquiryPlainText, enquiryMarkdown } from '../src/builder_demo/enquiry'
import { defaultJourneyModel as model } from '../src/model_catalogue/demo'
import { parseBudget } from '../src/project_budget/contract'
import { budgetEvidence } from '../src/project_budget/pipeline'

const original = JSON.parse(readFileSync('../docs/samples/budget-scope/inputs-and-evidence.json', 'utf8'))
const before = readFileSync('../docs/samples/budget-scope/after-enquiry.txt', 'utf8')
const draft = parseBudget(original.evidence.draft), context = original.evidence.current_context
const afterDoc = manufacturerDocument({ ...original.input, budgetDraft: { draft, context, today: original.date } }, null, false, null, null, null, null, false, false, null, model)
const after = enquiryPlainText(afterDoc)
const output = '../docs/samples/budget-journey'
mkdirSync(output, { recursive: true })
const words = (text: string) => text.trim().split(/\s+/).length
const escape = (text: string) => text.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!))
writeFileSync(`${output}/before-enquiry.txt`, before)
writeFileSync(`${output}/after-enquiry.txt`, after)
writeFileSync(`${output}/after-enquiry.md`, enquiryMarkdown(afterDoc))
writeFileSync(`${output}/inputs-and-evidence.json`, JSON.stringify({ baseline: 'a573522715894e66f5c976f377b0004320ff3420',
  method: 'Before is the retained generated PR #326 after-enquiry.txt. After uses the same owner/model/source/allowance facts and frozen calculation date. Synthetic case, no real quote or participant.',
  input: original.input, evidence: budgetEvidence(draft, context, original.date), words: { before: words(before), after: words(after) } }, null, 2) + '\n')
writeFileSync(`${output}/comparison.html`, `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Budget journey: same-facts enquiry comparison</title><style>body{font:16px/1.6 system-ui;color:#203238;background:#f4f7f6;margin:0}main{max-width:86rem;margin:auto;padding:2rem}.pair{display:grid;grid-template-columns:1fr 1fr;gap:2rem}section{background:white;border:1px solid #c8d5d4;padding:1.5rem;min-width:0}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit}a{color:#155b76}p{max-width:75ch}@media(max-width:800px){.pair{grid-template-columns:1fr}main{padding:1rem}}</style><main><h1>Budget journey: same facts, shorter handoff</h1><p>October 23, 2026. Before: actual PR #326 generated enquiry. After: the revised generator with identical supplied facts. Owner preference CAD 250,000; priced components CAD 189,500.25; installed total unavailable. Synthetic delivery/lift allowance, unreviewed Model 300 claim captured October 6. No actual homeowner or builder validation.</p><p><a href="inputs-and-evidence.json">Inputs and complete evidence</a> · <a href="after-enquiry.md">After Markdown</a></p><div class="pair"><section><h2>Before · ${words(before)} words</h2><pre>${escape(before)}</pre></section><section><h2>After · ${words(after)} words</h2><pre>${escape(after)}</pre></section></div></main></html>`)
console.log(JSON.stringify({ before: words(before), after: words(after), output }))
