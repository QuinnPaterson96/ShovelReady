import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { caseIds, fetchReport, parseReport, startLoad } from './adapter'
import type { LoadState } from './adapter'
import { LoadView, ReportView } from './DraftEvaluations'
import reports from './reports.test.json'

const pass = reports['synthetic-direct-pass']
const render = (value: unknown) => renderToStaticMarkup(createElement(ReportView, { report: parseReport(value) }))
const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status })
const tick = () => new Promise(resolve => setTimeout(resolve, 0))

test('all evaluator-produced fixtures validate, preserving decimal strings and missing records', () => {
  for (const r of Object.values(reports)) parseReport(r)
  assert.equal(parseReport(pass).traces[0].fact?.quantity?.value, '10')
  assert.equal(parseReport(reports['synthetic-missing-fact']).traces[0].fact, null)
  assert.equal(parseReport(reports['absent-bindings']).traces[0].binding, null)
  assert.equal(parseReport(reports['absent-rules']).traces[0].result.status, 'unresolved_reference')
})

test('three outcomes keep scope, exclusions, review and approval separate from arithmetic', () => {
  for (const [id, text] of [
    ['synthetic-direct-pass', 'Passing arithmetic example within the declared scope'],
    ['synthetic-missing-fact', 'Missing facts or binding'],
    ['synthetic-placement-failure', 'Supplied placement fails the evaluated pathways'],
  ] as const) {
    const html = render(reports[id])
    assert.ok(html.includes(text))
    for (const expected of ['no placement on the parcel can work', 'no published zoning release',
      'not human approval', 'Reported approval status', 'All legal use', 'synthetic measured width',
      'width-rule-r1', 'bounded-scalar.v1', 'sr-10.v1', 'draft_only', 'Full-source documents are not served']) {
      assert.ok(html.toLowerCase().includes(expected.toLowerCase()), expected)
    }
  }
  const html = render(reports['unknown-approval'])
  assert.ok(html.includes('Arithmetic pass'))
  assert.ok(html.includes('Needs investigation within the declared scope'))
  assert.ok(html.includes('<strong>unknown</strong>'))
})

test('unresolved alternatives, missing rules/bindings and out-of-coverage stay inspectable', () => {
  const html = render(reports['unresolved-alternative'])
  for (const value of ['alternative A', 'alternative B', 'Passing arithmetic', 'Needs investigation', 'Unresolved regulatory reference', 'missing_fact: exact rule-to-fact binding is absent', 'absent-rule-r1']) assert.ok(html.includes(value), value)
  assert.ok(render(reports['absent-bindings']).includes('Binding not supplied'))
  assert.ok(render(reports['absent-rules']).includes('Declared exact rule revision is absent'))
  assert.ok(render(reports['outside-coverage']).includes('Outside evaluated coverage'))
})

test('original and normalized ratios, provenance and effective-date uncertainty remain available', () => {
  const html = render(reports.ratio)
  for (const value of ['45 %', '0.45 fraction', 'regulatory_floor_area / regulatory_lot_area', 'effective from: Unknown', 'sha256', pass.request.sources[0].artifact.sha256, 'synthetic-draft-r1']) assert.ok(html.includes(value), value)
})

test('all source content is inert, with no source download anchors or executable elements', () => {
  const html = render(reports['inert-evidence'])
  assert.ok(html.includes('&lt;img'))
  assert.ok(html.includes('file:///private/source.html'))
  assert.ok(html.includes('repo:tests/fixtures'))
  assert.doesNotMatch(html, /<img|<script|<a[\s>]/)
})

test('reject incompatible versions, wrapped/partial reports, altered identities and misleading claims', () => {
  const changes: Array<(r: any) => void> = [
    r => { r.schema_version = 'future' }, r => { r.evaluator_version = 'future' },
    r => { r.request.schema_version = 'future' }, r => { r.data_state = 'published' },
    r => { r.release_id = 'invented' }, r => { r.alternatives = [] },
    r => { r.traces = [] }, r => { r.request.sources = [] },
    r => { r.traces[0].fact.quantity.value = 10 },
    r => { r.request.placement.design.revision_id = 'stale' },
    r => { r.request.facts[0].inputs.site.revision_id = 'stale' },
    r => { r.request.bindings.push(structuredClone(r.request.bindings[0])) },
    r => { r.traces[0].result.explanation = 'different result' },
    r => { r.request.rules[0].content.alternative_id = 'different' },
    r => { r.alternatives[0].approval = 'unknown' },
    r => { r.request.scope.coverage = 'outside_coverage' },
    r => { r.scope_exclusions = [] },
    r => { r.traces[0].binding.fact.revision_id = 'stale' },
    r => { r.request.rules[0].content.runtime_support = 'unsupported' },
    r => { r.request.rules[0].content.semantics.measurement_definition = 'other definition' },
    r => { delete r.request.scope.provenance.review.reviewer },
  ]
  for (const change of changes) {
    const r = structuredClone(pass)
    change(r)
    assert.throws(() => parseReport(r), /Incompatible/)
  }
  assert.throws(() => parseReport({ report: pass }))
  const missing = structuredClone(reports['synthetic-missing-fact'])
  missing.outcome = 'candidate'
  assert.throws(() => parseReport(missing))
})

test('fetch uses exact aliases and unwrapped report; errors never use server detail or a fallback', async () => {
  for (const id of caseIds) {
    const r = await fetchReport(id, new AbortController().signal, async (url, init) => {
      assert.equal(url, `/api/draft-evaluations/${id}`)
      assert.ok(init?.signal)
      return response(reports[id])
    })
    assert.equal(r.request.evaluation_id, id)
  }
  for (const [status, expected] of [[503, /disabled or unavailable/], [404, /not found/], [502, /stored draft report/], [500, /request failed/]] as const) {
    await assert.rejects(fetchReport(caseIds[0], new AbortController().signal, async () => response({ detail: 'private server information' }, status)), expected)
  }
  await assert.rejects(fetchReport(caseIds[0], new AbortController().signal, async () => new Response('<html>proxy</html>')), /not JSON/)
})

test('loading/error views contain no stale report, and cancellation suppresses late success and failure', async () => {
  for (const rejectOld of [false, true]) {
    const states: LoadState[] = []
    let resolveOld!: (r: Response) => void
    let failOld!: (e: Error) => void
    const oldResponse = new Promise<Response>((resolve, reject) => { resolveOld = resolve; failOld = reject })
    const cancel = startLoad(caseIds[0], s => states.push(s), async () => oldResponse)
    assert.deepEqual(states, [{ kind: 'loading' }])
    cancel()
    const cancelNew = startLoad(caseIds[1], s => states.push(s), async () => response(reports['synthetic-missing-fact']))
    await tick()
    if (rejectOld) failOld(new Error('old network failure'))
    else resolveOld(response(pass))
    await tick()
    assert.equal(states.length, 3)
    const last = states[2]
    assert.equal(last.kind, 'ready')
    if (last.kind === 'ready') assert.equal(last.report.outcome, 'needs_investigation')
    cancelNew()
  }
  for (const state of [{ kind: 'loading' }, { kind: 'error', message: 'Unavailable' }] as LoadState[]) {
    const html = renderToStaticMarkup(createElement(LoadView, { state }))
    assert.doesNotMatch(html, /Passing arithmetic|width-rule|Source evidence/)
  }
})

test('network rejection produces a safe error and reload can recover with a computed report', async () => {
  const states: LoadState[] = []
  const stop = startLoad(caseIds[0], s => states.push(s), async () => { throw new Error('private network details') })
  await tick()
  assert.deepEqual(states[1], { kind: 'error', message: 'Network error loading draft evaluation. Check the API and retry.' })
  stop()
  const stopRetry = startLoad(caseIds[0], s => states.push(s), async () => response(pass))
  await tick()
  assert.equal(states[2].kind, 'loading')
  assert.equal(states[3].kind, 'ready')
  stopRetry()
})
