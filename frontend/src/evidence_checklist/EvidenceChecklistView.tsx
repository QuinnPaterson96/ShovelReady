import type { EvidenceChecklist, EvidenceReference } from './model'

function Source({ evidence }: { evidence: EvidenceReference }) {
  const url = evidence.url && /^https:\/\//.test(evidence.url) ? evidence.url : null
  return <li>
    <strong>{evidence.description}</strong> · {evidence.origin}, {evidence.review_status}
    {evidence.value !== null && <> · {evidence.value} {evidence.unit ?? ''}</>}
    {evidence.basis && <> · basis: {evidence.basis}</>}
    {evidence.source_id && <> · source: {evidence.source_id}</>}
    {evidence.locator && <> · {evidence.locator}</>}
    {evidence.captured_at && <> · captured {evidence.captured_at}</>}
    {evidence.snapshot_id && <> · snapshot <code>{evidence.snapshot_id}</code></>}
    {evidence.revision_id && <> · revision <code>{evidence.revision_id}</code></>}
    {url && <> · <a href={url} target="_blank" rel="noreferrer">Source page</a></>}
  </li>
}

export function EvidenceChecklistView({ checklist }: { checklist: EvidenceChecklist }) {
  return <section className="sr-checklist" aria-labelledby="evidence-checklist-title">
    <h2 id="evidence-checklist-title">Evidence to prepare</h2>
    <p className="sr-checklist-status"><strong>Preparation only · screening not performed.</strong> This list records available evidence and what still needs review. It does not establish site fit or permit eligibility.</p>
    <p className="metadata">Scope: {checklist.scope.municipality ?? 'unknown'} / {checklist.scope.use ?? 'unknown'} / {checklist.scope.role ?? 'unknown'} · site {checklist.scope.site_mode ?? 'unconfirmed'} · model {checklist.scope.model_id ?? 'manual or unknown'}{checklist.scope.synthetic ? ' · synthetic example' : ''} · {checklist.schema_version}</p>
    <ol>{checklist.items.map(item => <li className="sr-checklist-item" key={item.id}>
      <h3>{item.title}</h3>
      <p><strong>Status: {item.state}.</strong> {item.missing_input}</p>
      <p><strong>Why it matters:</strong> {item.impact}</p>
      <p><strong>Suggested supplier:</strong> {item.suggested_supplier}</p>
      <p><strong>Next action:</strong> {item.next_action}</p>
      {item.available_evidence.length > 0 ? <details><summary>Available attributed evidence ({item.available_evidence.length})</summary>
        <ul>{item.available_evidence.map((evidence, index) => <Source evidence={evidence} key={`${item.id}-${index}`} />)}</ul>
      </details> : <p className="metadata">No selected evidence for this item.</p>}
    </li>)}</ol>
  </section>
}
