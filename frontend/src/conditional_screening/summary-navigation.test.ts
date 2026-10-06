import { test } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { focusSummaryTarget } from './summaryNavigation'

test('flag opens nested sections, focuses its actual input and retains the entered fact', () => {
  const dom = new JSDOM('<details><summary>Optional assumptions</summary><section><details><summary>Property facts</summary><label>Existing garden suites <select id="existing-suites"><option value="0">None</option><option value="1" selected>One</option></select></label></details></section></details>')
  const doc = dom.window.document
  const input = doc.getElementById('existing-suites') as HTMLSelectElement
  assert.equal(focusSummaryTarget(doc, 'existing-suites'), true)
  assert.equal(input.value, '1')
  assert.equal(doc.activeElement, input)
  assert.equal(doc.querySelectorAll('details[open]').length, 2)
  assert.equal(focusSummaryTarget(doc, 'missing-control'), false)
})
