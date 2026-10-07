import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { bundledCatalogue } from '../src/model_catalogue/model'
import { screeningDocument } from '../src/builder_demo/BuilderDemo'
import { buildSelection } from '../src/site_preparations/SitePreparation'
import type { Fact } from '../src/site_preparations/types'
import { manufacturerDocument } from '../src/builder_demo/manufacturer'
import { EnquiryPreview, enquiryMarkdown, enquiryPlainText, technicalEvidenceMarkdown } from '../src/builder_demo/enquiry'
import { reviewAddress, reviewInput, reviewConditional, reviewScenarios, reviewScan, reviewAssumptions, reviewSettings } from '../src/builder_demo/manufacturer-review.fixture'

// Run from frontend with TSX_TSCONFIG_PATH=tsconfig.app.json and node --import tsx.
// No network, database, source acceptance or geometry recomputation occurs.
const directory = resolve('../docs/samples/manufacturer-enquiry')
mkdirSync(directory, { recursive: true })
const note = 'Reporting reconstruction from the October 7 exported enquiry: address, two rear-yard concerns and approximate figures retained. Original geometry, full live API payload and named permit-area records were unavailable. Strict-input contract/source shape comes from a separately labelled synthetic fixture. This sample tests communication, not the property or legal interpretation.'
const brief = manufacturerDocument(reviewInput, reviewAddress, false, null, reviewConditional, reviewScenarios, reviewScan, true)
const reconstructionFact = (value: string | null): Fact => ({ value, unit: null, basis: null, unresolved_reason: value === null ? 'not supplied' : null, evidence: { origin: 'user', snapshot_id: null, feature_index: null, source_url: null, captured_at: '2026-10-07', method: 'Manual reporting reconstruction from supplied export, not an original user assertion', review_status: 'unreviewed' } })
const selection = buildSelection(null, null, { address: reconstructionFact(reviewAddress), pid: reconstructionFact(null), lot_area_m2: reconstructionFact(null), notes: reconstructionFact('Reporting reconstruction only; original site geometry and source record unavailable.') })
const report = screeningDocument(selection, reviewInput, null, false, null, null, false, null, reviewConditional, reviewAssumptions, reviewSettings.proposal, reviewScenarios, reviewSettings, reviewScan)
report.sections.find(section => section.heading === 'Conditional zoning')!.heading = 'Strict-input contract demonstration · separate synthetic fixture'
const evidence = { status: 'reporting_reconstruction_only', note, model_catalogue: { snapshot_id: bundledCatalogue.snapshot_id, model: bundledCatalogue.models.find(model => model.model_id === 'aux-300') }, input: reviewInput, address: reviewAddress,
  scenarios: reviewScenarios, conditional: reviewConditional, assumptions: reviewAssumptions, settings: reviewSettings, scan: reviewScan }
writeFileSync(resolve(directory, 'after-enquiry.md'), enquiryMarkdown(brief))
writeFileSync(resolve(directory, 'after-enquiry.txt'), enquiryPlainText(brief))
writeFileSync(resolve(directory, 'supporting-report.md'), `> ${note}\n\n${enquiryMarkdown(report)}\n## Complete reconstruction evidence\n\n${technicalEvidenceMarkdown(evidence)}`)
writeFileSync(resolve(directory, 'reconstruction-evidence.json'), JSON.stringify(evidence, null, 2) + '\n')
const preview = renderToStaticMarkup(createElement(EnquiryPreview, { document: brief }))
const supporting = renderToStaticMarkup(createElement(EnquiryPreview, { document: report }))
writeFileSync(resolve(directory, 'preview.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Manufacturer enquiry review sample</title><style>body{font:16px/1.6 system-ui;margin:2rem auto;padding:0 1rem;max-width:52rem;color:#23333b;background:#faf9f6}h3{font-size:1.5rem}h4{margin-bottom:.5rem}p{margin:.5rem 0 1rem}section{border-top:1px solid #d5dddc;padding-top:.7rem}.note{background:#fff0d7;padding:1rem}article{overflow-wrap:anywhere}summary{cursor:pointer;font-weight:600}details{margin-top:2rem}</style><body><p class="note">${note}</p>${preview}<details><summary>Supporting screening report</summary>${supporting}</details></body></html>`)
console.log(`Generated ${directory}; enquiry ${enquiryPlainText(brief).split(/\s+/).length} words.`)
