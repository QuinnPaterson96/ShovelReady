// Optional real-browser PDF smoke check; keep ordinary CI offline.
// Run from frontend with a Vite preview/dev server at PDF_CHECK_ORIGIN.
import { createRequire } from 'node:module'
import { writeFileSync, mkdirSync, unlinkSync } from 'node:fs'
import assert from 'node:assert/strict'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const harness = '.enquiry-pdf-check.html'
const html = String.raw`<html><body><script type="module">
import { manufacturerDocument } from './src/builder_demo/manufacturer.ts';
import { renderEnquiryPdf, placementDrawing, renderDrawing } from './src/builder_demo/placementExport.ts';
import { exampleCase } from './src/builder_demo/example.ts';
import { defaultJourneyModel, journeyCatalogue, modelSnapshot } from './src/model_catalogue/demo.ts';
import { bundledCatalogue } from './src/model_catalogue/model.ts';
import { emptyBudget, catalogueSuggestions, reconcile, budgetEvidence } from './src/project_budget/pipeline.ts';
import fixture from './src/builder_demo/cecelia-geometry.fixture.json';
const input={intendedUse:'family accommodation',relationship:'I own the property',stage:'early research',configuration:'a turnkey suite with kitchen',nextStep:'Please advise which configuration and next steps you recommend.',timing:'next spring',budget:'CAD 150,000 before site work',access:'a narrow driveway; can you assess crane access from photos?',services:'water and electricity are near the house',contact:'Quinn - property owner'};
// Keep parcel, placement and boundary coordinates from the same retained case.
// The former harness mixed a different property's result into the Cecelia map.
const measured={...fixture.measurement,model:defaultJourneyModel};
const colours={ink:'#203238',danger:'#9a3e35',parcelFill:'#d3e2e0',parcelStroke:'#245b68',roofFill:'#dbd5e8',roofStroke:'#564881',zoneFill:'#edcfac',zoneStroke:'#91602f'};
const assets=await renderDrawing(placementDrawing(measured,fixture.request.assumptions,null,true,colours));
const example=manufacturerDocument(input,'saved Victoria example',true,measured,null,null,null,true,true,'garden_suite');
const studio=journeyCatalogue.models.find(m=>m.model_id==='wcch-ch-studio');
const unknown=manufacturerDocument({...input,intendedUse:'Not sure',contact:'Zoë - 601 Su’it Street',access:'',services:''},'601 Su’it Street',false,null,null,null,null,true,false,null,studio);
const today='2026-11-04';
const context=model=>({model_id:model.model_id,model_revision:model.source_revision,snapshot_id:modelSnapshot(model),configuration:model.configuration,property_key:'software verification only',scenario_key:'initial placement'});
const quadra=journeyCatalogue.models.find(m=>m.provider==='Hewing Haus');
const quadraContext=context(quadra);
const unrelated=reconcile({...emptyBudget(),scope:'whole_project',items:catalogueSuggestions(studio,modelSnapshot(studio),context(studio),today)},quadraContext);
const cross=manufacturerDocument({...input,intendedUse:'Not sure',budgetDraft:{draft:unrelated,context:quadraContext,today}},null,false,null,null,null,null,false,false,null,quadra);
const currentContext={...context(defaultJourneyModel),scenario_key:'edited placement'};
const stale=reconcile({...emptyBudget(),scope:'whole_project',items:catalogueSuggestions(defaultJourneyModel,modelSnapshot(defaultJourneyModel),context(defaultJourneyModel),today)},currentContext);
const activeStale=manufacturerDocument({...input,intendedUse:'Not sure',budgetDraft:{draft:stale,context:currentContext,today}},null,false,null,null,null,null,false,false,null,defaultJourneyModel);
const encode=bytes=>{let s='';for(const byte of bytes)s+=String.fromCharCode(byte);return btoa(s)};
// Reproduced pagination risk: plan notes and a second plan title inflated the message.
const painted=[];const fillText=CanvasRenderingContext2D.prototype.fillText;
CanvasRenderingContext2D.prototype.fillText=function(text,...args){painted.push(text);return fillText.call(this,text,...args)};
const examplePdf=encode(await renderEnquiryPdf(example,assets));const examplePainted=painted.splice(0);
const unknownPdf=encode(await renderEnquiryPdf(unknown,null));
const unknownPainted=painted.splice(0);
const crossPdf=encode(await renderEnquiryPdf(cross,null));const crossPainted=painted.splice(0);
const activeStalePdf=encode(await renderEnquiryPdf(activeStale,null));const activeStalePainted=painted.splice(0);
// Near-bottom recipient content reproduced an otherwise empty Thank-you page.
// A one-page body must stay one page for generic courtesy; contact must survive.
const nearBottom={title:'Enquiry',question:'Please arrange a call.',example:false,
 sections:[{heading:'Site information',paragraphs:['No current measured placement is available.',...Array.from({length:28},(_,i)=>'Recipient paragraph '+(i+1))],emailSummary:''}],closing:'Thank you.'};
await renderEnquiryPdf(nearBottom,null);const genericClosingPainted=painted.splice(0);
await renderEnquiryPdf({...nearBottom,closing:'Please contact Jordan to arrange a call.'},null);const customClosingPainted=painted.splice(0);
window.pdfChecks={example:examplePdf,unknown:unknownPdf,cross:crossPdf,activeStale:activeStalePdf,crossPainted,activeStalePainted,examplePainted,unknownPainted,genericClosingPainted,customClosingPainted,exampleText:JSON.stringify(example),unknownText:JSON.stringify(unknown),crossText:JSON.stringify(cross),activeStaleText:JSON.stringify(activeStale),crossEvidence:budgetEvidence(unrelated,quadraContext,today)};
</script></body></html>`

writeFileSync(harness, html)
let browser
try {
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}) })
  const page = await browser.newPage()
  page.on('pageerror', error => { throw error })
  await page.goto(`${process.env.PDF_CHECK_ORIGIN || 'http://127.0.0.1:5189'}/${harness}`)
  await page.waitForFunction(() => window.pdfChecks, { timeout: 30000 })
  const checks = await page.evaluate(() => window.pdfChecks)
  mkdirSync('../output/pdf', { recursive: true })
  for (const [key, name] of [['example', 'example-enquiry.pdf'], ['unknown', 'unknown-use-studio-enquiry.pdf'], ['cross', 'quadra-cross-provider-enquiry.pdf'], ['activeStale', 'model-300-stale-cost-enquiry.pdf']]) {
    const bytes = Buffer.from(checks[key], 'base64')
    assert.equal(bytes.subarray(0, 4).toString(), '%PDF')
    assert.ok(bytes.length > 10000)
    writeFileSync(`../output/pdf/${name}`, bytes)
  }
  const example = JSON.parse(checks.exampleText), unknown = JSON.parse(checks.unknownText)
  assert.ok(example.example)
  assert.ok(unknown.title.includes('C.H. Studio Pod'))
  assert.ok(!JSON.stringify(unknown).includes('Model 300'))
  assert.ok(JSON.stringify(unknown).includes('Intended use is unconfirmed'))
  assert.ok(!checks.examplePainted.includes('Placement sketch'))
  assert.ok(!checks.examplePainted.includes('Approximate proposed placement')) // already in the map image
  assert.ok(checks.examplePainted.some(line => line.includes('Approximate mapped outlines')))
  assert.ok(!checks.unknownPainted.some(line => /plan follows|Placement sketch|Approximate mapped outlines/.test(line)))
  assert.ok(checks.crossPainted.some(line => /Hewing Haus/.test(line)))
  assert.ok(!checks.crossPainted.some(line => /West Coast Container Homes|Currency unknown|Affected cost entries/.test(line)))
  assert.ok(checks.activeStalePainted.some(line => /Costs for this model need rechecking/.test(line)))
  assert.ok(checks.activeStalePainted.some(line => /Installed total unavailable/.test(line)))
  assert.equal(checks.genericClosingPainted.filter(line => line.startsWith('Unsent preliminary enquiry | Page')).length, 1)
  assert.ok(checks.genericClosingPainted.includes('Recipient paragraph 28'))
  assert.ok(!checks.genericClosingPainted.includes('Thank you.'))
  assert.equal(checks.customClosingPainted.filter(line => line.startsWith('Unsent preliminary enquiry | Page')).length, 2)
  assert.ok(checks.customClosingPainted.includes('Please contact Jordan to arrange a call.'))
  writeFileSync('../output/pdf/representative-enquiries.json', JSON.stringify({ example, unknown, cross:JSON.parse(checks.crossText), activeStale:JSON.parse(checks.activeStaleText), crossEvidence:checks.crossEvidence }, null, 2))
  console.log('Generated actual example, Studio, cross-provider and active-stale PDFs. Render all pages before handoff.')
} finally {
  await browser?.close()
  unlinkSync(harness)
}
