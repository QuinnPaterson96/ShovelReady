import { useEffect, useState } from 'react'
import { caseIds, refKey, startLoad } from './adapter'
import type { CaseId, LoadState } from './adapter'
import type { CheckTrace, EvaluationReport, Quantity, RevisionRef, Review } from './types'

const labels: Record<EvaluationReport['outcome'], string> = {
  candidate: 'Passing arithmetic example within the declared scope',
  needs_investigation: 'Needs investigation within the declared scope',
  no_match_under_evaluated_pathways: 'Supplied placement fails the evaluated pathways',
}
const checkLabels = {
  pass: 'Arithmetic pass', supported_failure: 'Supported failure · supplied placement only',
  missing_fact: 'Missing facts or binding', unresolved_reference: 'Unresolved regulatory reference',
  unsupported_semantics: 'Unsupported rule semantics', outside_coverage: 'Outside evaluated coverage',
  extraction_failure: 'Extraction failure', not_applicable: 'Not applicable',
}
function Ref({ value }: { value: RevisionRef }) {
  return <><code>{value.logical_id}</code> · revision <code>{value.revision_id}</code></>
}
function JsonDetail({ label, value }: { label: string; value: unknown }) {
  return <details><summary>{label}</summary><pre>{JSON.stringify(value, null, 2)}</pre></details>
}
function ReviewDetail({ review }: { review: Review }) {
  return <div className="notice"><p><strong>Synthetic review record · not human approval</strong></p>
    <p>Recorded status: {review.status}. Scope: {review.scope}</p>
    <p>{review.rationale}</p><p className="metadata">{review.reviewer ?? 'Reviewer not supplied'} · {review.reviewed_at ?? 'Review time unknown'}</p>
  </div>
}
function QuantityDetail({ label, quantity }: { label: string; quantity: Quantity | null }) {
  return <div><h5>{label}</h5>{quantity ? <>
    <p>Original: {quantity.original_text} ({quantity.original_value} {quantity.original_unit})<br />
      Normalized: <strong>{quantity.value} {quantity.unit}</strong> · {quantity.dimension}<br />
      Basis: {quantity.basis ? `${quantity.basis.numerator} / ${quantity.basis.denominator}` : 'Not a ratio or rate'}</p>
  </> : <p>Quantity not supplied; never interpreted as zero.</p>}</div>
}
function Trace({ trace, report }: { trace: CheckTrace; report: EvaluationReport }) {
  const rule = report.request.rules.find(r => refKey(r.identity) === refKey(trace.rule))
  return <details className="draft-check"><summary>{checkLabels[trace.result.status]} · {trace.rule.logical_id}</summary>
    <p>{trace.result.explanation}</p>
    <h5>Diagnostics · all reported reasons</h5>
    {trace.diagnostics.length ? <ul>{trace.diagnostics.map((d, i) => <li key={i}>{d}</li>)}</ul> : <p>No blocking diagnostics reported for this check.</p>}
    {!!trace.result.missing_facts.length && <><h5>Missing facts</h5><ul>{trace.result.missing_facts.map((f, i) => <li key={i}>{f}</li>)}</ul></>}
    <p>Exact rule: <Ref value={trace.rule} /></p>
    <p>{rule?.content.text ?? 'Declared exact rule revision is absent; no replacement inferred.'}</p>
    <p>Measurement definition: {trace.binding?.measurement_definition ?? 'Binding not supplied'}</p>
    <p>Fact definition: {trace.fact?.definition ?? 'Exact fact not supplied'}</p>
    {trace.binding && <p>Bound fact: <Ref value={trace.binding.fact} /> · {trace.binding.definition_support} · {trace.binding.applicability}</p>}
    {trace.fact && <p>Supplied fact: <Ref value={trace.fact.identity} /> · {trace.fact.status} · {trace.fact.reason}</p>}
    <QuantityDetail label="Supplied fact quantity" quantity={trace.fact?.quantity ?? null} />
    {rule?.content.semantics.kind === 'scalar_bound' && <>
      <p>Rule definition: {rule.content.semantics.measurement_definition} · operator <code>{rule.content.semantics.operator}</code></p>
      <QuantityDetail label="Rule threshold" quantity={rule.content.semantics.threshold} />
    </>}
    {rule && <><ReviewDetail review={rule.review} /><JsonDetail label="Complete rule, applicability and references" value={rule} /></>}
    <JsonDetail label="Exact binding, input revisions and review" value={trace.binding} />
    <JsonDetail label="Exact fact, input revisions and review" value={trace.fact} />
    <h5>Source evidence · inert excerpts</h5>
    <p>Full-source documents are not served by this inspector. Locations below are provenance text, not download links.</p>
    {!trace.result.evidence.length && <p>No evidence supplied for this check.</p>}
    {trace.result.evidence.map((e, i) => {
      const source = report.request.sources.find(s => s.snapshot_id === e.snapshot_id)!
      return <article className="evidence" key={i}><p><strong>{e.locator}</strong> · snapshot <code>{e.snapshot_id}</code></p>
        <blockquote>{e.excerpt}</blockquote><p>Context: {e.context}</p>
        <p>Printed page: {e.printed_page ?? 'Not supplied'} · page index: {e.page_index ?? 'Not supplied'}</p>
        <p>Captured: {source.captured_at} · effective from: {source.effective_from ?? 'Unknown'} · effective to: {source.effective_to ?? 'Unknown'}</p>
        <JsonDetail label="Source identity, hash, availability and review" value={source} />
      </article>
    })}
  </details>
}

export function ReportView({ report }: { report: EvaluationReport }) {
  const r = report.request
  return <article className="draft-report">
    <h3>{labels[report.outcome]}</h3>
    <p className="notice">Synthetic draft computation only. No published zoning release, actual buildable site or legal approval is established.
      A failed supplied placement does not establish that no placement on the parcel can work.</p>
    <p>{r.scope.description}</p><p>Coverage: {r.scope.coverage.replace(/_/g, ' ')} · {r.scope.jurisdiction} · {r.scope.use} · {r.scope.building_role}</p>
    <p>{report.alternatives.length} declared alternative(s) · {report.traces.length} computed check(s). Alternatives retain their own rules and outcomes.</p>
    <h4>Scope exclusions</h4><ul>{report.scope_exclusions.map((e, i) => <li key={i}>{e}</li>)}</ul>
    <details><summary>Run, draft and exact input revisions</summary>
      <dl className="identities">
        <dt>Evaluation</dt><dd>{r.evaluation_id}</dd>
        <dt>Versions</dt><dd>{report.schema_version} · {report.evaluator_version}</dd>
        <dt>Data and placement scope</dt><dd>{report.data_state} · {report.scope}</dd>
        <dt>Draft</dt><dd><Ref value={r.draft} /></dd>
        <dt>Design</dt><dd><Ref value={r.design.identity} /></dd>
        <dt>Site</dt><dd><Ref value={r.site.identity} /></dd>
        <dt>Placement</dt><dd><Ref value={r.placement.identity} /></dd>
      </dl><ReviewDetail review={r.scope.provenance.review} />
      <JsonDetail label="Complete scope and provenance" value={r.scope} />
    </details>
    <h4>Computed alternatives</h4>
    {report.alternatives.map(a => <section className="alternative" key={JSON.stringify([a.pathway_id, a.alternative_id])}>
      <h4>Pathway {a.pathway_id} · alternative {a.alternative_id}</h4><p><strong>{labels[a.outcome]}</strong></p>
      <p>Reported approval status: <strong>{a.approval.replace(/_/g, ' ')}</strong>. This is supplied synthetic input, separate from arithmetic, and grants no legal approval.</p>
      {!!a.conditions.length && <><h5>Conditions and exceptions</h5><ul>{a.conditions.map((c, i) => <li key={i}>{c}</li>)}</ul></>}
      {a.checks.map(c => <Trace key={refKey(c.rule!)} trace={report.traces.find(t => refKey(t.rule) === refKey(c.rule!))!} report={report} />)}
    </section>)}
    <JsonDetail label="All source snapshots and synthetic review records" value={r.sources} />
    <JsonDetail label="Full computed report · all original input and trace fields" value={report} />
  </article>
}

export function LoadView({ state }: { state: LoadState }) {
  if (state.kind === 'loading') return <p role="status">Loading computed draft evaluation…</p>
  if (state.kind === 'error') return <p role="alert" className="notice">{state.message} No report is displayed.</p>
  return <ReportView report={state.report} />
}
function SelectedCase({ id }: { id: CaseId }) {
  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => startLoad(id, setState), [id, attempt])
  return <><button onClick={() => { setState({ kind: 'loading' }); setAttempt(n => n + 1) }}>Reload selected case</button><LoadView state={state} /></>
}
export default function DraftEvaluations() {
  const [id, setId] = useState<CaseId>('synthetic-direct-pass')
  return <section aria-labelledby="draft-heading" className="draft-inspector">
    <p className="eyebrow">Computed examples · draft only</p>
    <h2 id="draft-heading">Synthetic examples computed by the evaluator</h2>
    <p className="notice">Draft data · no published zoning release. These invented examples exercise software, not real-site screening.</p>
    <label htmlFor="draft-case">Synthetic evaluation case</label>
    <select id="draft-case" value={id} onChange={e => setId(e.target.value as CaseId)}>
      {caseIds.map(c => <option key={c} value={c}>{c}</option>)}
    </select>
    <SelectedCase key={id} id={id} />
  </section>
}
