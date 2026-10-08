import { useEffect } from 'react'

export type EnquirySaveKind = 'enquiry-pdf' | 'png' | 'pdf' | 'package' | 'markdown'

export function EnquirySaveOptions({ onSave, disabled = false, busy = false, hasPlacement }: {
  onSave: (kind: EnquirySaveKind) => void; disabled?: boolean; busy?: boolean; hasPlacement: boolean
}) {
  useEffect(() => { void import('./enquiry-save-options.css') }, [])
  return <section className="enquiry-save-options" aria-label="Save your enquiry">
    <button className="sr-primary" type="button" disabled={disabled || busy} onClick={() => onSave('enquiry-pdf')}>
      {busy ? 'Preparing download…' : 'Save enquiry PDF'}
    </button>
    <p>{hasPlacement ? 'Includes your message and current approximate placement plan.' : 'Saves your message. No current placement plan is included.'}</p>
    <details><summary>Other download formats</summary>
      <div className="enquiry-save-secondary">
        <button type="button" disabled={disabled || busy} onClick={() => onSave('markdown')}>Markdown enquiry</button>
        <button type="button" disabled={disabled || busy || !hasPlacement} onClick={() => onSave('png')}>Placement image (PNG)</button>
        <button type="button" disabled={disabled || busy || !hasPlacement} onClick={() => onSave('pdf')}>Placement plan only (PDF)</button>
        <button type="button" disabled={disabled || busy} onClick={() => onSave('package')}>Enquiry and evidence package (ZIP)</button>
      </div>
      <p>The package preserves the message, supporting report and full technical evidence. Nothing is sent when you download.</p>
    </details>
  </section>
}
