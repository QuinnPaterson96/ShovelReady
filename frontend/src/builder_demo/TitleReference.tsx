import { useRef, useState, type FormEvent } from 'react'
import type { EnquirySection } from './enquiry'
import { downloadFile, type DrawingAssets } from './placementExport'
import { parcelRecord } from '../site_discovery/parcelComparison'
import type { Confirmed } from '../site_discovery/flow'

const kinds = { title: 'Title number', instrument: 'Instrument number', plan: 'Plan number' } as const
const questionExample = 'Does the statutory right of way shown on this plan affect the proposed location?'

export type TitleReference = {
  schema_version: 'property-title-reference.v1'
  origin: 'owner_supplied'
  review_status: 'legal_effect_unreviewed'
  kind: keyof typeof kinds
  number: string
  document_date: string
  title_date?: string
  question: string
}

export function titleReferenceSection(reference: TitleReference): EnquirySection {
  const paragraphs = [
    `Owner-supplied reference dated ${reference.document_date}. ${kinds[reference.kind]} ${reference.number}.${reference.title_date ? ` Related title dated ${reference.title_date}.` : ''} The current title and the reference’s effect on this project still need professional review.`,
    `My question: ${reference.question}`,
  ]
  return { heading: 'Title reference for follow-up', paragraphs, emailSummary: paragraphs.join(' '), siteDetails: true }
}

export const titleReferenceTarget = 'builder-title-reference'

export function titleParcelMatch(selected: Confirmed): { pid: string | null } | null {
  const { pid, relation } = parcelRecord(selected.parcel)
  if (selected.parcel.identityConcern || !['pid_exact', 'gislink_join', 'parcel_address'].includes(relation ?? '')
    || (selected.schema_version === 'site-discovery.selected.v1' && selected.selection_basis === 'user_choice')) return null
  if (pid == null || pid === '') return { pid: null }
  if (!/^(?:\d{9}|\d{3}-\d{3}-\d{3})$/.test(pid)) return null
  return { pid: pid.replace(/^(\d{3})(\d{3})(\d{3})$/, '$1-$2-$3') }
}

function GetTitle({ pid }: { pid: string | null }) {
  const [status, setStatus] = useState('')
  const pidInput = useRef<HTMLInputElement>(null)
  async function copyPid() {
    if (!pid) return
    try {
      await navigator.clipboard.writeText(pid)
      setStatus('PID copied.')
    } catch {
      pidInput.current?.focus()
      pidInput.current?.select()
      setStatus('Select and copy the PID from the field.')
    }
  }
  return <details>
    <summary>Get my BC title</summary>
    {pid ? <div>
      <label>Selected parcel identifier (PID) <input ref={pidInput} readOnly value={pid} /></label>{' '}
      <button type="button" onClick={() => void copyPid()}>Copy PID</button>
      <p>Compare this mapped PID with your property tax notice or BC Assessment record before paying for a title.</p>
      <p role="status">{status}</p>
    </div> : <p>This selection does not establish one PID for ordering. Confirm the correct nine-digit PID with your property tax notice, BC Assessment, or a qualified professional before placing an order.</p>}
    <ol>
      <li><a href="https://myltsa.ltsa.ca/explorer" target="_blank" rel="noopener noreferrer">Open LTSA Explorer in a new tab</a>. Sign in or create an Explorer account. Search by the confirmed PID, select the matching current title and check the PID and land title district.</li>
      <li>Review the items and total on LTSA’s payment screen. The title lists registered charges and interests. If you need the text or drawing, <a href="https://help.ltsa.ca/ltsa-explorer/search-documents-and-plans" target="_blank" rel="noopener noreferrer">order the instrument or plan separately</a>.</li>
      <li>Save the PDF from the LTSA confirmation email or the Explorer Inbox. For a large file, follow the email link to sign in and download it.</li>
      <li>Return to this assessment tab and open <strong>I already have my title</strong>. Keep this tab open without reloading so your assessment stays available.</li>
    </ol>
    <p><a href="https://ltsa.ca/fees/" target="_blank" rel="noopener noreferrer">LTSA fee schedule</a> · <a href="https://help.ltsa.ca/ltsa-explorer/search-titles-and-plans" target="_blank" rel="noopener noreferrer">LTSA ordering help</a> · <a href="https://help.ltsa.ca/ltsa-explorer/download-items" target="_blank" rel="noopener noreferrer">LTSA download help</a></p>
  </details>
}

type Sketch = { key: string; prepare: () => Promise<DrawingAssets> }

function TitleReviewDraft({ value, address, pid, sketch }: { value: TitleReference; address: string; pid: string | null; sketch?: Sketch }) {
  const [status, setStatus] = useState('')
  const [draftDrawing, setDraftDrawing] = useState<{ key: string; assets: DrawingAssets } | null>(null)
  const drawing = draftDrawing?.key === sketch?.key ? draftDrawing?.assets : undefined
  const [editedText, setEditedText] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const preview = useRef<HTMLTextAreaElement>(null)
  const text = editedText ?? [
    'BC title review request',
    'For a qualified land-title reviewer',
    `Selected property: ${address}. ${pid ? `Mapped PID ${pid}; please confirm against the current title.` : 'Please confirm the parcel and PID.'}`,
    ...titleReferenceSection(value).paragraphs,
    'Could you confirm which registered documents apply to the proposed location and advise what further evidence you need?',
    ...(drawing ? ['An approximate placement sketch is available. Please compare the proposed location with the area affected by the registered document.']
      : ['The proposed location still needs to be confirmed for this review.']),
  ].join('\n\n')
  async function copyDraft() {
    try {
      await navigator.clipboard.writeText(text)
      setStatus('Unsent review draft copied.')
    } catch {
      preview.current?.focus()
      preview.current?.select()
      setStatus('Select and copy the draft from the field.')
    }
  }
  async function prepareSketch() {
    if (!sketch) return
    setBusy(true)
    try {
      setDraftDrawing({ key: sketch.key, assets: await sketch.prepare() })
      setStatus('Placement sketch ready to preview and download.')
    } catch {
      setStatus('The sketch could not be prepared. Try again using the current placement.')
    } finally {
      setBusy(false)
    }
  }
  return <details>
    <summary>Preview title review handoff</summary>
    <p>Unsent draft for a qualified land-title reviewer. Edit the text below before sharing. Saving a changed title reference will regenerate this draft.</p>
    <label htmlFor="title-review-draft">Review draft</label>
    <textarea id="title-review-draft" ref={preview} value={text} onChange={event => { setEditedText(event.target.value); setStatus('') }} rows={10} />
    {drawing && <img className="builder-export-preview" src={drawing.pngUrl} alt="Approximate proposed placement for title review" />}
    <div className="budget-actions">
      <button type="button" disabled={!text.trim()} onClick={() => void copyDraft()}>Copy review draft</button>
      <button type="button" disabled={!text.trim()} onClick={() => {
        downloadFile('bc-title-review-draft.txt', text, 'text/plain;charset=utf-8')
        setStatus('Unsent review draft downloaded.')
      }}>Download review draft</button>
      {sketch && !drawing && <button type="button" disabled={busy} onClick={() => void prepareSketch()}>Preview placement sketch</button>}
      {drawing && <button type="button" onClick={() => {
        downloadFile('bc-title-review-placement.png', new Uint8Array(drawing.png).buffer, 'image/png')
        setStatus('Placement sketch downloaded separately. Attach it when sharing the draft.')
      }}>Download review sketch</button>}
    </div>
    <p role="status">{status}</p>
  </details>
}

export function TitleReferenceEditor({ selected, value, onChange, sketch }: { selected: Confirmed; value: TitleReference | null; onChange: (value: TitleReference | null) => void; sketch?: Sketch }) {
  const [editing, setEditing] = useState(false)
  const [kind, setKind] = useState<TitleReference['kind']>(value?.kind ?? 'title')
  const action = useRef<HTMLButtonElement>(null)
  const type = useRef<HTMLSelectElement>(null)
  const pid = titleParcelMatch(selected)?.pid ?? null
  function open() {
    setKind(value?.kind ?? 'title')
    setEditing(true)
    requestAnimationFrame(() => type.current?.focus())
  }
  function close() {
    setEditing(false)
    requestAnimationFrame(() => action.current?.focus())
  }
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const number = String(form.get('number')).trim()
    const document_date = String(form.get('date'))
    const title_date = String(form.get('title_date') ?? '')
    const question = String(form.get('question')).trim().replace(/\s+/g, ' ')
    if (!(kind in kinds) || !number || !document_date || !question) return
    onChange({ schema_version: 'property-title-reference.v1', origin: 'owner_supplied', review_status: 'legal_effect_unreviewed', kind, number, document_date, ...(title_date ? { title_date } : {}), question })
    close()
  }

  return <section className="project-details" id={titleReferenceTarget} tabIndex={-1} aria-labelledby="builder-title-reference-heading">
    <h3 id="builder-title-reference-heading">Title restrictions</h3>
    <p>Registered covenants, easements or rights of way may affect where you can build. City map records can point to something worth checking. The current title and relevant documents are needed to establish what applies.</p>
    <GetTitle pid={pid} />
    <details>
      <summary>I already have my title</summary>
      {!editing && <>
        {value && titleReferenceSection(value).paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
        <div className="budget-actions">
          <button ref={action} type="button" onClick={open}>{value ? 'Edit title reference' : 'Add a title reference'}</button>
          {value && <button type="button" onClick={() => { onChange(null); action.current?.focus() }}>Remove title reference</button>}
        </div>
      </>}
      {value && <div hidden={editing}>
        <TitleReviewDraft key={JSON.stringify([value, pid])} value={value} address={selected.address.label} pid={pid} sketch={sketch} />
      </div>}
      {editing && <form className="builder-title-reference-form" onSubmit={save}>
        <p id="title-reference-sharing">Use an existing document for this property. The reference and question go in your enquiry and evidence export. Enter only the reference number, date and a question you’re comfortable sharing. Leave out owner names, contact details and document text.</p>
        <div>
          <label htmlFor="title-reference-kind">Reference type</label>
          <select ref={type} id="title-reference-kind" value={kind} onChange={event => setKind(event.target.value as TitleReference['kind'])}>
            {Object.entries(kinds).map(([kind, label]) => <option value={kind} key={kind}>{label}</option>)}
          </select>
        </div>
        <label>Reference number
          <input name="number" defaultValue={value?.number} required maxLength={32} pattern="[A-Za-z0-9\u0020\u002D\u002F]*[0-9][A-Za-z0-9\u0020\u002D\u002F]*" title="Enter a reference number using letters, numbers, spaces, hyphens or slashes." />
        </label>
        <label>Document date
          <input name="date" type="date" defaultValue={value?.document_date} required />
        </label>
        {kind !== 'title' && <label>Related title date (optional)
          <input name="title_date" type="date" defaultValue={value?.title_date} />
        </label>}
        <label>Question to share
          <textarea name="question" defaultValue={value?.question} required maxLength={300} rows={3} placeholder={questionExample} aria-describedby="title-reference-sharing" onChange={event => event.target.setCustomValidity(event.target.value.trim() || !event.target.value ? '' : 'Enter a question about this property.')} />
        </label>
        <div className="budget-actions">
          <button type="submit" className="sr-primary">Save title reference</button>
          <button type="button" onClick={close}>Cancel</button>
        </div>
      </form>}
    </details>
  </section>
}
