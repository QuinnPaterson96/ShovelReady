import { useEffect, useState } from 'react'
import { downloadFile } from './placementExport'

const storageKey = 'shovelready.enquiry-recovery.v1'
type Snapshot = { schema: 'sr.enquiry-recovery.v1'; savedAt: string; enquiry: string; report: string; technicalEvidence?: string }
const maxLength = 2_000_000

function readSnapshot(): Snapshot | null {
  try {
    const raw = window.sessionStorage.getItem(storageKey)
    if (!raw || raw.length > maxLength) return null
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== 'object') return null
    const snapshot = value as Record<string, unknown>
    if (snapshot.schema !== 'sr.enquiry-recovery.v1' || typeof snapshot.savedAt !== 'string' ||
      !Number.isFinite(Date.parse(snapshot.savedAt)) || typeof snapshot.enquiry !== 'string' ||
      !snapshot.enquiry.trim() || typeof snapshot.report !== 'string') return null
    return { schema: 'sr.enquiry-recovery.v1', savedAt: snapshot.savedAt, enquiry: snapshot.enquiry, report: snapshot.report, technicalEvidence: typeof snapshot.technicalEvidence === 'string' ? snapshot.technicalEvidence : undefined }
  } catch { return null }
}

/** Preserve text for recovery, never restore old findings into live evaluation. */
export function EnquiryRecovery({ enquiry, report, technicalEvidence }: { enquiry: string | null; report: string | null; technicalEvidence?: string }) {
  const [recovered, setRecovered] = useState(readSnapshot)
  const [message, setMessage] = useState('')
  useEffect(() => {
    if (!enquiry) return
    const snapshot: Snapshot = { schema: 'sr.enquiry-recovery.v1', savedAt: new Date().toISOString(), enquiry, report: report ?? '', technicalEvidence }
    try {
      const raw = JSON.stringify(snapshot)
      if (raw.length > maxLength) throw Error('Too large')
      window.sessionStorage.setItem(storageKey, raw)
      setMessage('Enquiry and supporting report saved in this tab for refresh recovery.')
    } catch { setMessage('This browser could not save a recovery copy. Download or copy your enquiry before leaving.') }
  }, [enquiry, report, technicalEvidence])
  async function copy() {
    try { await navigator.clipboard.writeText(recovered!.enquiry); setMessage('Recovered enquiry copied.') }
    catch { setMessage('Select and copy the recovered text below.') }
  }
  if (!recovered && !enquiry && !message) return null
  return <aside className="builder-stage builder-recovery" aria-label="Enquiry recovery">
    {recovered && <details><summary>Recover your previous enquiry</summary>
      <p>Saved {new Date(recovered.savedAt).toLocaleString()}. This is a previous snapshot. Choose your property and recheck it to continue; saved findings and acknowledgements are not restored as current.</p>
      <label htmlFor="recovered-enquiry">Previous enquiry · unsent</label>
      <textarea id="recovered-enquiry" rows={8} readOnly value={recovered.enquiry} />
      <button type="button" onClick={() => void copy()}>Copy recovered enquiry</button>
      {recovered.report && <details><summary>Previous supporting report · historical snapshot</summary><textarea aria-label="Previous supporting report" rows={10} readOnly value={recovered.report} /></details>}
      {recovered.technicalEvidence && <button type="button" onClick={() => downloadFile('previous-technical-evidence.json', recovered.technicalEvidence!, 'application/json')}>Download previous technical evidence JSON</button>}
      <button type="button" onClick={() => { setRecovered(null); try { window.sessionStorage.removeItem(storageKey); setMessage('Recovery copy cleared.'); } catch { setMessage('Could not clear browser storage.'); } }}>Clear recovery copy</button>
    </details>}
    <p className="metadata" role="status">{message || 'Prepared enquiry text is kept in this browser tab across refreshes.'} Closing the tab or clearing browser data may remove it; download a copy to keep it.</p>
  </aside>
}
