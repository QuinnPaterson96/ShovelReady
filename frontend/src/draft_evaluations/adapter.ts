import Ajv2020 from 'ajv/dist/2020'
import addFormats from 'ajv-formats'
import schema from './schema.json'
import type { EvaluationReport, Provenance, RevisionRef } from './types'

const ajv = new Ajv2020({ strict: false, allErrors: true })
addFormats(ajv)
const validate = ajv.compile(schema)
class DraftError extends Error {}
export const caseIds = ['synthetic-direct-pass', 'synthetic-missing-fact', 'synthetic-placement-failure'] as const
export type CaseId = typeof caseIds[number]
export const refKey = (r: RevisionRef) => JSON.stringify([r.logical_id, r.revision_id])
const altKey = (a: { pathway_id: string; alternative_id: string }) => JSON.stringify([a.pathway_id, a.alternative_id])
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value !== null && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`
  return JSON.stringify(value)
}
const same = (a: unknown, b: unknown) => canonical(a) === canonical(b)
const reviewed = (p: Provenance) => p.review.status === 'accepted' && p.uncertainty.length === 0
function requireValid(condition: unknown): asserts condition {
  if (!condition) throw new DraftError('Incompatible draft report: invalid structure, version or trace identity.')
}
function unique<T>(items: T[], key: (v: T) => string): Map<string, T> {
  const result = new Map(items.map(v => [key(v), v]))
  requireValid(result.size === items.length)
  return result
}

/** Validate wire shape and trace coherence; never calculate or replace an outcome. */
export function parseReport(value: unknown): EvaluationReport {
  requireValid(validate(value))
  const report = value as EvaluationReport
  const r = report.request
  const sources = unique(r.sources, s => s.snapshot_id)
  const rules = unique(r.rules, r => refKey(r.identity))
  const facts = unique(r.facts, f => refKey(f.identity))
  const bindings = unique(r.bindings, b => refKey(b.rule))
  const declared = unique(r.alternatives, altKey)
  const actual = unique(report.alternatives, altKey)
  const traces = unique(report.traces, t => refKey(t.rule))
  const inputs = { design: r.design.identity, site: r.site.identity, placement: r.placement.identity }
  requireValid(same(r.placement.design, inputs.design) && same(r.placement.site, inputs.site))
  for (const record of [...r.facts, ...r.bindings]) requireValid(same(record.inputs, inputs))
  const assigned = new Map<string, string>()
  for (const a of r.alternatives) {
    unique(a.rules, ref => ref.logical_id)
    for (const ref of a.rules) {
      requireValid(!assigned.has(refKey(ref)))
      assigned.set(refKey(ref), altKey(a))
    }
  }
  for (const rule of r.rules) requireValid(assigned.get(refKey(rule.identity)) === altKey(rule.content))
  for (const b of r.bindings) requireValid(assigned.has(refKey(b.rule)))
  requireValid(actual.size === declared.size && traces.size === assigned.size)
  for (const a of report.alternatives) {
    const declaration = declared.get(altKey(a))
    requireValid(declaration && declaration.rules.length === a.checks.length)
    const checks = unique(a.checks, c => c.rule ? refKey(c.rule) : '')
    for (const ref of declaration.rules) {
      const key = refKey(ref), check = checks.get(key), trace = traces.get(key)
      requireValid(check && trace && same(check, trace.result) && check.check_id === ref.revision_id)
      const binding = bindings.get(key) ?? null
      const fact = binding ? facts.get(refKey(binding.fact)) ?? null : null
      requireValid(same(trace.binding, binding) && same(trace.fact, fact))
      if (check.status === 'pass' || check.status === 'supported_failure') {
        const rule = rules.get(key)
        requireValid(rule && binding && fact?.status === 'known' && fact.quantity &&
          check.evidence.length > 0 && check.missing_facts.length === 0 && trace.diagnostics.length === 0)
        const content = rule.content, scalar = content.semantics
        requireValid(content.runtime_support === 'supported' && scalar.kind === 'scalar_bound' &&
          content.references.length === 0 && content.applicability.conditions.length === 0 &&
          content.applicability.exceptions.length === 0 && content.applicability.status === 'reviewed_scope')
        requireValid(binding.applicability === 'applicable' && binding.definition_support === 'reviewed_direct_measurement' &&
          reviewed(binding.provenance) && reviewed(fact.provenance) && rule.review.status === 'accepted')
        requireValid(fact.definition === binding.measurement_definition && fact.definition === scalar.measurement_definition &&
          fact.quantity.unit === scalar.threshold.unit && fact.quantity.dimension === scalar.threshold.dimension &&
          same(fact.quantity.basis ?? null, scalar.threshold.basis ?? null))
        requireValid([r.scope.provenance, r.design.provenance, r.site.provenance, r.placement.footprint.provenance].every(reviewed) &&
          r.placement.footprint.status === 'known' && r.site.conditions.length === 0 &&
          check.evidence.every(e => sources.get(e.snapshot_id)?.review.status === 'accepted'))
      }
      requireValid((check.status === 'missing_fact') === (check.missing_facts.length > 0))
    }
    if (a.outcome === 'candidate') requireValid(a.checks.every(c => c.status === 'pass') &&
      (a.approval === 'as_of_right' || a.approval === 'conditional'))
    if (a.outcome === 'no_match_under_evaluated_pathways') requireValid(
      a.checks.some(c => c.status === 'supported_failure') &&
      a.checks.every(c => c.status === 'pass' || c.status === 'supported_failure'))
  }
  if (report.outcome === 'candidate') requireValid(report.alternatives.some(a => a.outcome === 'candidate'))
  if (report.outcome === 'no_match_under_evaluated_pathways') requireValid(report.alternatives.every(a => a.outcome === report.outcome))
  if (r.scope.coverage !== 'within_coverage') requireValid(report.outcome === 'needs_investigation' && report.alternatives.every(a => a.outcome === 'needs_investigation'))
  requireValid(report.scope_exclusions.length > 0 && r.scope.exclusions.every(e => report.scope_exclusions.includes(e)))
  // Pydantic model validators are not fully expressed in JSON Schema. Check references,
  // quantity basis and review attribution without doing evaluator arithmetic in JS.
  function walk(node: unknown): void {
    if (Array.isArray(node)) { node.forEach(walk); return }
    if (!node || typeof node !== 'object') return
    const n = node as Record<string, unknown>
    if ('excerpt' in n && 'snapshot_id' in n) requireValid(sources.has(n.snapshot_id as string))
    if ('original_value' in n) {
      requireValid(!String(n.value).startsWith('-') && !String(n.original_value).startsWith('-'))
      requireValid((n.dimension === 'ratio' || n.dimension === 'rate') === (n.basis != null))
    }
    if ('rationale' in n && 'scope' in n && n.status !== 'unreviewed') requireValid(n.reviewer && n.reviewed_at)
    Object.values(n).forEach(walk)
  }
  walk(report)
  return report
}

export type LoadState = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready'; report: EvaluationReport }
export async function fetchReport(id: CaseId, signal: AbortSignal, fetcher: typeof fetch = fetch): Promise<EvaluationReport> {
  const response = await fetcher(`/api/draft-evaluations/${id}`, { signal, headers: { Accept: 'application/json' } })
  if (!response.ok) {
    const messages: Record<number, string> = {
      503: 'Draft evaluation service is disabled or unavailable. Enable and seed the SR-32 service, then retry.',
      404: 'This synthetic case was not found or has not been imported.',
      502: 'The service could not validate the stored draft report.',
    }
    throw new DraftError(messages[response.status] ?? 'Draft evaluation request failed. Retry when the service is available.')
  }
  let body: unknown
  try { body = await response.json() } catch { throw new DraftError('Incompatible draft report: response is not JSON.') }
  return parseReport(body)
}

/** Cleanup suppresses old success AND error responses even when a fetch ignores abort. */
export function startLoad(id: CaseId, publish: (s: LoadState) => void, fetcher: typeof fetch = fetch) {
  const controller = new AbortController()
  let active = true
  publish({ kind: 'loading' })
  const timer = setTimeout(() => {
    if (active) publish({ kind: 'error', message: 'Draft evaluation request timed out. Retry when the service is available.' })
    active = false
    controller.abort()
  }, 15000)
  void fetchReport(id, controller.signal, fetcher).then(report => {
    if (active) publish({ kind: 'ready', report })
  }).catch((error: unknown) => {
    if (active) publish({ kind: 'error', message: error instanceof DraftError ? error.message : 'Network error loading draft evaluation. Check the API and retry.' })
  }).finally(() => clearTimeout(timer))
  return () => { active = false; clearTimeout(timer); controller.abort() }
}
