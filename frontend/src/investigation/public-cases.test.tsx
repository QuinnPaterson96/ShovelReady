import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
const inventory = JSON.parse(readFileSync(new URL('../../../docs/research/public-cases/cases.json', import.meta.url), 'utf8'))
import { parseInventory, officialUrl } from '../reference_cases/adapter'
import { CaseDetail } from '../reference_cases/PublicCases'

function saved() {
  return structuredClone({
    schema_version: 'public-case-view.v1',
    identity: { kind: 'provisional_public_case_inventory', inventory_revision: inventory.inventory_revision,
      content_sha256: 'a'.repeat(64), source_schema_version: inventory.schema_version, access_date: inventory.access_date },
    purpose: inventory.purpose, first_case_id: inventory.first_integration_candidate,
    cases: inventory.cases.map(({ local_artifacts: _, ...c }: Record<string, unknown>) => c),
    sources: Object.fromEntries(Object.entries(inventory.sources as Record<string, Record<string, unknown>>).map(([id, { local_artifact: _, ...s }]) => [id, s])),
    rights: inventory.rights,
  })
}
test('public-case boundary retains original roles, conditions, transfer scope and unknowns', () => {
  const data = parseInventory(saved())
  assert.equal(data.cases.length, 10)
  const html = renderToStaticMarkup(createElement(CaseDetail, { item: data.cases[0], data }))
  for (const text of ['28.50', '2.40 m', 'proposed separation space', 'DDP01047', 'Official interpretations', 'Researcher inferences', 'unknown', 'provisional']) assert.ok(html.includes(text), text)
  const transfer = renderToStaticMarkup(createElement(CaseDetail, { item: data.cases[9], data }))
  assert.ok(transfer.includes('Transfer example'))
  assert.ok(transfer.includes('curtains removed'))
  assert.ok(transfer.includes('local HTTP returned 403'))
  const empty = renderToStaticMarkup(createElement(CaseDetail, { item: data.cases[3], data }))
  assert.ok(empty.includes('No measurements recorded'))
})
test('public-case malformed payloads fail closed', () => {
  for (const mutate of [
    (d: any) => { d.schema_version = 'future' },
    (d: any) => { delete d.schema_version },
    (d: any) => { delete d.identity.kind },
    (d: any) => { d.cases[0].review_status = 'accepted' },
    (d: any) => { d.cases[0].measurements[0].original_value = 28.5 },
    (d: any) => { delete d.sources['REZ00787-9'] },
    (d: any) => { d.cases[1] = d.cases[0] },
    (d: any) => { d.cases[0].scope = 'transfer_only' },
    (d: any) => { d.sources['REZ00787-9'].url = 'javascript:alert(1)' },
    (d: any) => { d.sources['REZ00787-9'].local_artifact = 'secret.pdf' },
  ]) { const d = saved(); mutate(d); assert.throws(() => parseInventory(d)) }
})
test('public-case text is inert, links restricted and unknown values remain visible', () => {
  const data = parseInventory(saved())
  data.cases[0].development.summary = '<img src=x onerror=alert(1)>'
  data.cases[0].measurements[0].original_value = null
  data.cases[0].measurements[0].original_unit = null
  const html = renderToStaticMarkup(createElement(CaseDetail, { item: data.cases[0], data }))
  assert.ok(html.includes('&lt;img'))
  assert.ok(!html.includes('<img'))
  assert.ok(html.includes('original unit: unknown'))
  for (const url of ['file:///secret', 'https://vancouver.ca.evil.test/', 'https://x@vancouver.ca/', 'https://vancouver.ca/\\evil']) assert.equal(officialUrl(url), null)
  assert.equal(officialUrl('https://vancouver.ca/files/test.pdf'), 'https://vancouver.ca/files/test.pdf')
})
