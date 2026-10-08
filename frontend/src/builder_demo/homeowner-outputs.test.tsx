import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { manufacturerDocument, enquiryUseQualification, boundaryObservations } from './manufacturer'
import { reviewAssumptions, reviewScenarios } from './manufacturer-review.fixture'
import { enquiryPlainText, enquiryMarkdown, enquiryEmailBody } from './enquiry'
import { enquiryPackageFiles } from './placementExport'
import { HomeownerSummary } from '../conditional_screening/HomeownerSummary'
import { homeownerSummary } from '../conditional_screening/victoriaSummaryAdapter'
import { initialProjectSettings } from '../conditional_screening/projectSettings'

// Reproduced reporting risk: an unanswered use must not become a stated garden-suite project.
// Exercise the public document -> copy/email/download/package path; no legal source accuracy claim.
test('unknown and office uses stay qualified across the recipient formats', () => {
  for (const intendedUse of ['Unknown', 'Still deciding', 'office']) {
    const doc = manufacturerDocument({ intendedUse, relationship: 'I own the property', nextStep: 'Please advise which configuration would work for an office.', question: '', timing: '', budget: '', access: '', services: '' }, null, false, null, null, null, null, true)
    assert.equal(doc.question, 'Please advise which configuration would work for an office.')
    const qualification = enquiryUseQualification(intendedUse)
    for (const text of [enquiryPlainText(doc), enquiryMarkdown(doc), enquiryEmailBody(doc, true)]) {
      assert.ok(text.includes(qualification))
      assert.ok(text.includes('City staff or a qualified local professional'))
      assert.ok(text.includes('No current measured placement'))
      assert.ok(text.indexOf(doc.question) < text.indexOf('Project'))
    }
    const files = enquiryPackageFiles(doc, null, ['Ask the property owner'], { exact_value: 3.048, revision: 'unknown' }, null)
    const decode = (name: string) => new TextDecoder().decode(files[name])
    assert.ok(decode('prefab-enquiry.md').includes(qualification))
    assert.ok(decode('prefab-supporting-report.md').includes('No supporting screening report'))
    assert.ok(decode('prefab-supporting-report.md').includes('(prefab-technical-evidence.json)'))
    assert.ok(decode('README.txt').includes('No placement drawing is included'))
    assert.equal(JSON.parse(decode('prefab-technical-evidence.json')).exact_value, 3.048)
  }
})

test('missing inputs expose affected comparison and next owner without acknowledgement changing evidence', () => {
  const summary = homeownerSummary({ geometry: null, geometryComplete: false, scenario: null, screening: null, assumptions: null, settings: initialProjectSettings(), mapped: null, lookup: null, zoningBusy: false, zoningError: '', scenarioError: '', screeningError: '', onRetryAvailable: true })
  const leaves = summary.checks.flatMap(check => check.parts ?? [check])
  assert.ok(leaves.filter(check => ['unknown', 'unsupported', 'review'].includes(check.status)).every(check => check.gap?.missing && check.gap.affects && check.gap.next && check.gap.owner))
  const html = renderToStaticMarkup(createElement(HomeownerSummary, { summary, useQualification: enquiryUseQualification('Unknown'), onNavigate: () => {}, acknowledged: ['Space within the property'] }))
  assert.ok(html.includes('Intended use is unconfirmed'))
  assert.ok(html.includes('Why it matters'))
  assert.ok(html.includes('Next action · Property contact'))
  assert.ok(html.includes('Enquiry workflow: included for discussion'))
  assert.ok(html.includes('Space within the property · Missing information'))
})

test('incomplete street context cannot present hypothetical boundary alternatives as selected roles', () => {
  const assumptions = { ...reviewAssumptions, street_adjacency: { edge_ids: [], all_marked: false, origin: 'user' as const, note: null } }
  const summary = homeownerSummary({ geometry: null, geometryComplete: false, scenario: reviewScenarios, screening: null, assumptions, settings: initialProjectSettings(), mapped: null, lookup: null, zoningBusy: false, zoningError: '', scenarioError: '', screeningError: '', onRetryAvailable: true })
  const check = summary.checks.find(check => check.label === 'Distance to boundaries')!
  assert.equal(check.status, 'unknown')
  assert.equal(check.action?.target, 'street-side')
  assert.ok(check.gap?.affects.includes('Street context'))
  const observations = boundaryObservations(reviewScenarios, assumptions).join('\n')
  assert.ok(observations.includes('selection is incomplete'))
  assert.ok(!observations.includes('Rear boundary (assumed'))
})
