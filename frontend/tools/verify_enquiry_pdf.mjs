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
import { defaultJourneyModel, journeyCatalogue } from './src/model_catalogue/demo.ts';
import { bundledCatalogue } from './src/model_catalogue/model.ts';
import { reviewScenarios, reviewAssumptions } from './src/builder_demo/manufacturer-review.fixture.ts';
import fixture from './src/scenario_handoff/retained-assessment.fixture.json';
const input={intendedUse:'family accommodation',relationship:'I own the property',stage:'early research',configuration:'a turnkey suite with kitchen',nextStep:'Please advise which configuration and next steps you recommend.',timing:'next spring',budget:'CAD 150,000 before site work',access:'a narrow driveway; can you assess crane access from photos?',services:'water and electricity are near the house',contact:'Quinn - property owner'};
const measured={site:exampleCase,model:defaultJourneyModel,result:fixture,widthOrigin:'user',depthOrigin:'user'};
const colours={ink:'#203238',danger:'#9a3e35',parcelFill:'#d3e2e0',parcelStroke:'#245b68',roofFill:'#dbd5e8',roofStroke:'#564881',zoneFill:'#edcfac',zoneStroke:'#91602f'};
const assets=await renderDrawing(placementDrawing(measured,reviewAssumptions,reviewScenarios,true,colours));
const example=manufacturerDocument(input,'saved Victoria example',true,measured,null,reviewScenarios,null,true,true,'garden_suite');
const studio=journeyCatalogue.models.find(m=>m.model_id==='wcch-ch-studio');
const unknown=manufacturerDocument({...input,intendedUse:'Not sure',contact:'Zoë - 601 Su’it Street',access:'',services:''},'601 Su’it Street',false,null,null,null,null,true,false,null,studio);
const encode=bytes=>{let s='';for(const byte of bytes)s+=String.fromCharCode(byte);return btoa(s)};
// Reproduced pagination risk: plan notes and a second plan title inflated the message.
const painted=[];const fillText=CanvasRenderingContext2D.prototype.fillText;
CanvasRenderingContext2D.prototype.fillText=function(text,...args){painted.push(text);return fillText.call(this,text,...args)};
const examplePdf=encode(await renderEnquiryPdf(example,assets));const examplePainted=painted.splice(0);
const unknownPdf=encode(await renderEnquiryPdf(unknown,null));
window.pdfChecks={example:examplePdf,unknown:unknownPdf,examplePainted,unknownPainted:painted,exampleText:JSON.stringify(example),unknownText:JSON.stringify(unknown)};
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
  for (const [key, name] of [['example', 'example-enquiry.pdf'], ['unknown', 'unknown-use-studio-enquiry.pdf']]) {
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
  writeFileSync('../output/pdf/representative-enquiries.json', JSON.stringify({ example, unknown }, null, 2))
  console.log('Generated actual example + unknown-use Studio PDFs. Render all pages before handoff.')
} finally {
  await browser?.close()
  unlinkSync(harness)
}
