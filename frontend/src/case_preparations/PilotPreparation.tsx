import { useEffect, useRef, useState } from 'react'
import { evidenceUrl, startLoad } from './adapter'
import type { Citation, LoadState, Preparation } from './adapter'
import StatusBanner from '../StatusBanner'

function Sources({ sources }: { sources: Citation[] }) {
  return <ul>{sources.map((s, i) => <li key={i}>{evidenceUrl(s.url)
    ? <a href={evidenceUrl(s.url)!} target="_blank" rel="noopener noreferrer">{s.source_id}</a>
    : <span>{s.source_id} (link unavailable)</span>}: {s.locator}</li>)}</ul>
}
function Raw({ value }: { value: unknown }) {
  return <pre>{JSON.stringify(value, (_key, item) => item === null ? 'Missing / unknown' : item, 2)}</pre>
}
export function PreparationView({ data }: { data: Preparation }) {
  return <>
    <StatusBanner status="needs_investigation"
      reason="evaluation_not_run · Provisional historical preparation. No EvaluationReport, accepted release, zoning fit or legal outcome."
      coverage={`${data.selected_period}: ${data.retained_observations.length} retained observations; ${data.mapped_fragments.facts.length} uncertain fact fragments. No regulatory evaluation performed.`}
      unresolved={data.diagnostics.filter(d => d.scope === 'historical_preparation').map(d => d.detail)}
      nextAction="Review the source-linked evidence requests below before attempting a supported evaluation." />
    <h2>Selected 2018 proposal</h2>
    <p>{data.case_id} · {data.selected_period} · Drawing {data.design_date}, received {data.received_date}; historical cutoff {data.historical_cutoff}.</p>
    <p>{data.mapped_fragments.design.configuration}. Later records cannot establish this proposal’s geometry or historical legal applicability.</p>
    <p>Mapped {data.mapped_fragments.facts.length} uncertain fact fragments from {data.retained_observations.length} observations. Threshold claims remain unresolved; original-source capture, geometry, rule acceptance and exact bindings are incomplete.</p>
    <h2>Next evidence needed</h2>
    <ul>{[...new Set(data.diagnostics.filter(d => d.scope === 'historical_preparation').map(d => d.next_artifact))].map(action => <li key={action}>{action}</li>)}</ul>
    <h2>Observations, not verified measurements</h2>
    <p>No canonical regulatory area selected. Corner observations refer to separate locations.</p>
    {data.retained_observations.map(o => <details key={o.observation_id}>
      <summary>{o.observation_id}: {o.quantity.value} {o.quantity.unit} — {o.eligible_for_historical_fact_fragment ? 'uncertain fact fragment' : 'threshold claim / context'}</summary>
      <p>{o.summary}</p><p>Period: {o.period}. Original: {o.quantity.original_value} {o.quantity.original_unit}; ratio basis: {o.quantity.basis === null ? 'Not applicable' : JSON.stringify(o.quantity.basis)}.</p>
      <Sources sources={o.sources} />
    </details>)}
    <h2>Unresolved source, area, parcel and date issues</h2>
    <p>Parcel claims: {data.parcel_claims.map(p => `Plan ${p.value} (${p.link.source_id}: ${p.link.locator})`).join('; ')}.</p>
    {data.diagnostics.map((d, i) => <details key={i}>
      <summary>{d.code}: {d.detail}</summary><p>Scope: {d.scope}</p><p>Next: {d.next_artifact}</p><Sources sources={d.sources} />
    </details>)}
    <details><summary>Later house replacement and permit chronology</summary>
      <p>Application dates are not issue, completion or occupancy dates. Later replacement cannot supply 2018 placement dimensions.</p>
      {data.later_permit_observations.map((p, i) => <article key={i}><h3>{String(p.permit_id)}</h3>
        <dl>{Object.entries(p).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value === null ? 'Missing / unknown' : String(value)}</dd></div>)}</dl></article>)}
    </details>
    <details><summary>Exact revision and provenance</summary>
      <dl><dt>Annotation revision</dt><dd>{data.annotation_revision}</dd>
        <dt>Annotation text SHA-256</dt><dd>{data.annotation_text_sha256}</dd>
        <dt>Research manifest text SHA-256</dt><dd>{data.source_manifest_text_sha256}</dd></dl>
      <p>{data.hash_basis}. Fragment evidence identifies manual annotations, not captured municipal source bytes. Missing capture times, source artifact URIs and reviews remain missing.</p>
      <Raw value={data.mapped_fragments} />
    </details>
    <details><summary>Boundary validation and source capture gaps</summary>
      {data.boundary_attempts.map((a, i) => <article key={i}><h3>{a.boundary}: {a.item}</h3>
        <p>{a.period ?? 'Historical request attempt'}</p><ul>{a.errors.map((e, j) => <li key={j}>{e.loc.join('.') || '(root)'}: {e.msg}</li>)}</ul>
        <Sources sources={a.sources} /><Raw value={a.attempted_payload ?? null} /></article>)}
    </details>
    <details><summary>Raw diagnostic JSON</summary><pre>{JSON.stringify(data, null, 2)}</pre></details>
  </>
}
export function LoadView({ state }: { state: LoadState }) {
  if (state.kind === 'loading') return <p role="status">Loading Pilot preparation…</p>
  if (state.kind === 'error') return <p role="alert">Pilot preparation is unavailable or incompatible. No evaluation was run. Reload to retry.</p>
  if (state.kind === 'empty') return <p role="status">No Pilot observations available. No evaluation was run.</p>
  return <PreparationView data={state.data} />
}
export default function PilotPreparation() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const cancel = useRef<(() => void) | undefined>(undefined)
  const reload = () => { cancel.current?.(); cancel.current = startLoad(setState) }
  useEffect(() => { cancel.current = startLoad(setState); return () => cancel.current?.() }, [])
  return <section className="pilot-preparation" aria-label="Pilot preparation investigation">
    <h2>Pilot preparation investigation</h2><button onClick={reload}>Reload preparation</button><LoadView state={state} />
  </section>
}
