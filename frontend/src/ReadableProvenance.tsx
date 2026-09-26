import { useState } from 'react'

export function TechnicalDetails({ children, title = 'Technical evidence and exact identifiers' }: { children: React.ReactNode; title?: string }) {
  return <details className="technical-evidence"><summary>{title}</summary>{children}</details>
}

export function CopyableRecord({ id, label, value }: { id: string; label: string; value: string }) {
  const [message, setMessage] = useState('')
  async function copy() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(value)
      setMessage('Copied to clipboard.')
    } catch {
      setMessage('Automatic copy unavailable. Select and copy the text in the field.')
      document.getElementById(id)?.focus()
    }
  }
  return <div className="copyable-record">
    <label htmlFor={id}>{label}</label>
    <textarea id={id} readOnly value={value} rows={8} onFocus={event => event.currentTarget.select()} />
    <button type="button" onClick={() => void copy()}>Copy text</button>
    <span role="status" aria-live="polite">{message}</span>
  </div>
}

export function readableDate(value: string | null | undefined) { return value ? value.slice(0, 10) : 'date unknown' }

export function publicSourceUrl(url: string | null | undefined) {
  if (!url) return null
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' && !parsed.pathname.endsWith('/query') ? parsed.href :
      parsed.protocol === 'https:' && parsed.hostname === 'maps.victoria.ca' ? `${parsed.origin}${parsed.pathname.replace(/\/query$/, '')}` : null
  } catch { return null }
}
