import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import PilotPreparation, { LoadView, PreparationView } from './PilotPreparation'
import { evidenceUrl, parsePreparation, startLoad } from './adapter'
import type { LoadState } from './adapter'
import fixture from './pilot.test.json'

const tick = () => new Promise(resolve => setTimeout(resolve, 0))
const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status })

test('real producer fixture preserves uncertainty, exact provenance and next evidence', () => {
  const data = parsePreparation(fixture)
  const html = renderToStaticMarkup(createElement(PreparationView, { data }))
  for (const text of ['Needs investigation', 'evaluation_not_run', '2018-07-30', '2018-08-07',
    '2.6 m', '0.20 m', '0.22 m', '22.25 m2', '22.75 m2', 'Plan 5230', 'Plan 5130',
    'No canonical regulatory area', 'parsed', 'BP055452', 'BP055453', 'Missing / unknown',
    'annotation', 'not municipal-source hashes', 'accepted revision requires',
    data.annotation_text_sha256, data.source_manifest_text_sha256, 'Next evidence needed',
    'unresolved_rule_dependencies', 'context_only_not_required_for_historical_request']) assert.ok(html.includes(text), text)
  assert.ok(html.includes('<details>'))
  assert.ok(html.includes('PM-PLAN'))
  assert.ok(!html.includes('href="file:'))
  assert.ok(renderToStaticMarkup(createElement(PilotPreparation)).includes('Loading Pilot preparation'))
})

test('malformed, unknown-version and affirmative payloads are refused', () => {
  for (const mutate of [
    (d: any) => { d.status = 'candidate' },
    (d: any) => { d.schema_version = 'next' },
    (d: any) => { delete d.annotation_text_sha256 },
    (d: any) => { d.retained_observations[0].quantity.value = 2.6 },
    (d: any) => { delete d.boundary_attempts },
    (d: any) => { d.private_path = 'C:/private' },
  ]) { const d = structuredClone(fixture); mutate(d); assert.throws(() => parsePreparation(d)) }
})

test('source text is escaped and only public evidence links are clickable', () => {
  const data = parsePreparation(structuredClone(fixture))
  data.retained_observations[0].summary = '<img src=x onerror=alert(1)>'
  data.retained_observations[0].sources[0].url = 'javascript:alert(1)'
  const html = renderToStaticMarkup(createElement(PreparationView, { data }))
  assert.ok(html.includes('&lt;img'))
  assert.ok(!html.includes('<img'))
  assert.ok(!html.includes('href="javascript:'))
  for (const value of ['file:///secret', 'https://tender.victoria.ca.evil.test/', 'https://x@tender.victoria.ca/', 'https://tender.victoria.ca/\\evil', 'data:text/html,test']) assert.equal(evidenceUrl(value), null)
  assert.equal(evidenceUrl('https://tender.victoria.ca/a.pdf'), 'https://tender.victoria.ca/a.pdf')
})

test('reload clears data and suppresses both late success and late error even without abort support', async () => {
  for (const rejectOld of [false, true]) {
    const states: LoadState[] = []
    let resolve!: (r: Response) => void, reject!: (e: Error) => void
    const old = new Promise<Response>((ok, bad) => { resolve = ok; reject = bad })
    const stop = startLoad(s => states.push(s), (() => old) as typeof fetch)
    stop()
    const stopNew = startLoad(s => states.push(s), (async () => response(fixture)) as typeof fetch)
    await tick()
    if (rejectOld) reject(new Error('C:/private error')); else resolve(response(fixture))
    await tick()
    assert.deepEqual(states.map(s => s.kind), ['loading', 'loading', 'ready'])
    const stopFail = startLoad(s => states.push(s), (async () => response({ detail: 'private stack' }, 503)) as typeof fetch)
    assert.deepEqual(states.at(-1), { kind: 'loading' })
    await tick()
    assert.deepEqual(states.at(-1), { kind: 'error' })
    const html = renderToStaticMarkup(createElement(LoadView, { state: states.at(-1)! }))
    assert.ok(!html.includes('22.75'))
    assert.ok(!html.includes('private'))
    stopNew(); stopFail()
  }
})

test('empty, invalid JSON and malformed successful responses never leave evidence displayed', async () => {
  for (const [reply, expected] of [
    [new Response(null, { status: 204 }), 'empty'],
    [new Response('not JSON'), 'error'],
    [response({}), 'error'],
    [response({ ...fixture, retained_observations: [] }), 'empty'],
  ] as const) {
    const states: LoadState[] = []
    const stop = startLoad(s => states.push(s), (async () => reply) as typeof fetch)
    await tick()
    assert.equal(states.at(-1)?.kind, expected)
    stop()
  }
})
