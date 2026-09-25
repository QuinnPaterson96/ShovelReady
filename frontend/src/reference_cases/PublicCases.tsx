import { useEffect, useState } from 'react'
import { officialUrl, parseInventory } from './adapter'
import type { Evidence, Inventory, PublicCase, Statement } from './adapter'

function Link({ url, children }: { url: string; children: React.ReactNode }) {
  const safe = officialUrl(url)
  return safe ? <a href={safe} target="_blank" rel="noreferrer">{children}</a> : <span>{children} (link unavailable)</span>
}
function Citations({ evidence, data }: { evidence: Evidence[]; data: Inventory }) {
  return evidence.length ? <ul className="metadata">{evidence.map((e, i) => <li key={i}>
    <Link url={data.sources[e.source_id].url}>{data.sources[e.source_id].title}</Link> · {e.locator} · source {e.source_id}
  </li>)}</ul> : <p className="metadata">No evidence locator recorded.</p>
}
function Statements({ values, data }: { values: Statement[]; data: Inventory }) {
  return values.length ? <>{values.map((s, i) => <div className="evidence" key={i}><p>{s.summary}</p><Citations evidence={s.evidence} data={data} /></div>)}</> : <p>None recorded in this packet; completeness is unknown.</p>
}
function TextList({ values }: { values: string[] }) {
  return <ul>{values.map((v, i) => <li key={i}>{v}</li>)}</ul>
}
export function CaseDetail({ item, data }: { item: PublicCase; data: Inventory }) {
  const refs = new Set<string>()
  function collect(value: unknown): void {
    if (Array.isArray(value)) value.forEach(collect)
    else if (value && typeof value === 'object') {
      if ('source_id' in value) refs.add(String(value.source_id))
      Object.values(value).forEach(collect)
    }
  }
  collect(item)
  return <article>
    <h3>{item.public_site_label}</h3>
    <p>{item.case_id} · {item.jurisdiction.name}, {item.jurisdiction.province}, {item.jurisdiction.country}</p>
    <p className="notice">{item.scope === 'transfer_only' ? 'Transfer example — outside the Victoria pilot jurisdiction.' : 'Victoria pilot jurisdiction · historical evidence only.'} Review status: {item.review_status}. Benchmark eligible: no.</p>
    <p>Official identifiers: {item.official_identifiers.join(', ')}. Dependency group: {item.dependency_group}; split {item.split}.</p>
    <Statements values={[item.development]} data={data} />
    <h4>Application and historical decision</h4>
    <p>Application date: {item.application_date ?? 'unknown'}.</p>
    <Citations evidence={item.application_date_evidence} data={data} />
    <p>Historical status: {item.decision.status.replace(/_/g, ' ')}. Decision date: {item.decision.date ?? 'unknown'}.</p>
    <Citations evidence={item.decision.evidence} data={data} />
    <p>Issued development permit: unknown. Issued building permit: unknown. As-built verification: unknown.</p>
    <h4>Historical decision conditions</h4><Statements values={item.decision.conditions} data={data} />
    <h4>Plan version and later revisions</h4><Statements values={[item.plan_version]} data={data} />
    <h4>Governing-rule references in the packet</h4><Statements values={[item.governing_rules]} data={data} />
    <p>Legal effective date: unknown. Current applicability: {item.governing_rules.current_applicability}.</p>
    <h4>Original reported measurements and table roles</h4>
    <p>Provisional source annotations. Listed limits are not accepted zoning rules; measurement endpoints and legal definitions require review. No normalization or comparison performed.</p>
    {item.measurements.length ? item.measurements.map((m, i) => <div className="evidence" key={i}>
      <h5>{m.name}</h5><p>Original value: <strong>{Array.isArray(m.original_value) ? m.original_value.join(' / ') : m.original_value ?? 'unknown'}</strong> · original unit: {m.original_unit ?? 'unknown'}.</p>
      <p>{m.measurement_definition}</p><p className="metadata">Review: {m.review_status}; normalized value: unknown; normalization: not performed.</p>
      <Citations evidence={m.evidence} data={data} />
    </div>) : <p>No measurements recorded. This does not mean zero or unlimited permission.</p>}
    <h4>Source facts</h4><Statements values={item.source_facts} data={data} />
    <h4>Official interpretations</h4><Statements values={item.official_interpretations} data={data} />
    <h4>Researcher inferences</h4><TextList values={item.researcher_inferences} />
    <h4>Prefab evidence</h4><p>Status: {item.prefab.status}. {item.prefab.note}</p><Citations evidence={item.prefab.evidence} data={data} />
    <h4>Missing inputs and unresolved conflicts</h4><TextList values={item.missing_inputs} />
    <h4>Unsupported conclusions</h4><TextList values={item.unsupported} />
    <details><summary>Potential research uses · not accepted benchmarks</summary><TextList values={item.test_uses} /></details>
    <h4>Source revisions and access limitations</h4>
    <p>Official links open externally. Availability today is not checked; this application does not fetch or republish source PDFs.</p>
    {[...refs].map(id => { const s = data.sources[id]; const rights = data.rights[s.rights_id]; return <details key={id}>
      <summary>{s.title} · {id}</summary>
      <p><Link url={s.url}>Open official source</Link> · {s.kind}</p>
      <p>Access date: {s.access_date}. Recorded access: {s.access_method}</p>
      <p>Document date: {s.document_date ?? 'unknown'}. Date basis: {s.date_basis}</p>
      <p>Inspection: {s.inspection}</p>
      <p className="metadata">Inspection SHA-256: {s.sha256 ?? 'unknown'}; byte length: {s.byte_length ?? 'unknown'}; pages: {s.page_count ?? 'unknown'}.</p>
      <p>{rights.summary} {rights.handling}</p><p><Link url={rights.evidence_url}>Rights evidence</Link> · {rights.locator} · accessed {rights.access_date}</p>
    </details> })}
  </article>
}
export default function PublicCases() {
  const [data, setData] = useState<Inventory>()
  const [selected, setSelected] = useState('')
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10000)
    setData(undefined); setError('')
    void (async () => {
      try {
        const response = await fetch('/api/reference-cases', { signal: controller.signal })
        if (!response.ok) throw new Error('Public-case inventory unavailable or invalid.')
        const next = parseInventory(await response.json())
        if (active) { setData(next); setSelected(next.first_case_id) }
      } catch {
        if (active) setError('Public-case inventory unavailable, invalid or request timed out. No case evidence loaded.')
      } finally { clearTimeout(timer) }
    })()
    return () => { active = false; clearTimeout(timer); controller.abort() }
  }, [attempt])
  const item = data?.cases.find(c => c.case_id === selected)
  return <section aria-labelledby="public-heading">
    <h2 id="public-heading">Public cases · provisional historical evidence</h2>
    <p className="notice">No screening has been performed. No current-law, legal-measurement or prefab-fit result. These ten public cases are separate from the three spatial leads and the fictional preview; no map or site linkage is inferred.</p>
    <button onClick={() => setAttempt(a => a + 1)}>Reload public cases</button>
    {!data && !error && <p role="status">Loading public-case metadata…</p>}
    {error && <p role="alert">{error}</p>}
    {data && <>
      <p>{data.purpose}</p>
      <details><summary>Public-case inventory identity · not an accepted dataset release</summary>
        <p className="metadata">Inventory revision: {data.identity.inventory_revision}<br />Content SHA-256: <code>{data.identity.content_sha256}</code><br />Access date: {data.identity.access_date}<br />DTO: {data.schema_version}; source schema: {data.identity.source_schema_version}</p>
      </details>
      <label htmlFor="public-case">Public case</label>
      <select id="public-case" value={selected} onChange={e => setSelected(e.target.value)}>
        {data.cases.map(c => <option key={c.case_id} value={c.case_id}>{c.case_id} · {c.public_site_label} · {c.scope === 'transfer_only' ? 'transfer example' : 'Victoria'}</option>)}
      </select>
      {item && <CaseDetail key={item.case_id} item={item} data={data} />}
    </>}
  </section>
}
