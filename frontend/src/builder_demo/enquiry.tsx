import type { ReactNode } from 'react'
import { publicSourceUrl } from '../ReadableProvenance'

export type EnquirySection = { heading: string; paragraphs: string[]; emailSummary: string; siteDetails?: boolean }
export type EnquiryDocument = {
  kind?: 'enquiry' | 'screening'
  title: string
  question: string
  example: boolean
  sections: EnquirySection[]
  closing: string
}

export function withPlacementSketch(document: EnquiryDocument, note: string | null): EnquiryDocument {
  const sections = document.sections.filter(section => section.heading !== 'Placement sketch')
  if (note) sections.push({ heading: 'Placement sketch', paragraphs: [note], emailSummary: note, siteDetails: true })
  return { ...document, sections }
}

const urlPattern = /https:\/\/[^\s<>]+/g
const safeParts = (text: string): { text: string; url?: string }[] => {
  const parts: { text: string; url?: string }[] = []
  let start = 0
  for (const match of text.matchAll(urlPattern)) {
    const index = match.index ?? 0
    if (index > start) parts.push({ text: text.slice(start, index) })
    const raw = match[0].replace(/[.,;:)]+$/, '')
    const url = publicSourceUrl(raw)
    parts.push(url ? { text: raw, url } : { text: raw })
    start = index + raw.length
  }
  if (start < text.length) parts.push({ text: text.slice(start) })
  return parts
}

const markdownEscape = (value: string) => value.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/[\\`*_{}\[\]|]/g, '\\$&').replace(/^(\s*)([>#-])/gm, '$1\\$2')
const markdownParagraph = (value: string) => safeParts(value).map(part => part.url
  ? `[${markdownEscape(part.text)}](${part.url.replace(/\(/g, '%28').replace(/\)/g, '%29')})` : markdownEscape(part.text)).join('')

export function enquiryPlainText(document: EnquiryDocument) {
  return [document.example ? 'SAVED EXAMPLE ONLY — not my property.' : '', document.title, document.question,
    ...document.sections.flatMap(section => [section.heading, ...section.paragraphs]),
    document.closing].filter(Boolean).join('\n\n')
}

export function enquiryMarkdown(document: EnquiryDocument) {
  return [`# ${markdownEscape(document.title)}`, ...(document.example ? ['SAVED EXAMPLE ONLY — not my property.'] : []), markdownParagraph(document.question),
    ...document.sections.map(section => `## ${markdownEscape(section.heading)}\n\n${section.paragraphs.map(markdownParagraph).join('\n\n')}`),
    markdownParagraph(document.closing)].join('\n\n') + '\n'
}

// Keep arbitrary source text inside a fence it cannot close, without altering evidence bytes.
export function technicalEvidenceMarkdown(record: unknown) {
  const json = JSON.stringify(record, null, 2)
  const fence = '`'.repeat(Math.max(3, ...[...json.matchAll(/`+/g)].map(match => match[0].length + 1)))
  return `${fence}json\n${json}\n${fence}\n`
}

export function enquiryEmailBody(document: EnquiryDocument, includeSiteDetails: boolean) {
  const sections = document.sections.filter(section => includeSiteDetails || !section.siteDetails)
  return [document.example ? 'SAVED EXAMPLE ONLY — not my property.' : '', document.question,
    ...sections.flatMap(section => [section.heading, ...section.paragraphs]),
    ...(!includeSiteDetails ? ['Property details and placement findings are withheld. Planning feasibility is unconfirmed; the question above is included as written.'] : []),
    document.closing].filter(Boolean).join('\n\n')
}

export function EnquiryPreview({ document }: { document: EnquiryDocument }) {
  const links = (value: string): ReactNode[] => safeParts(value).map((part, index) => part.url
    ? <a key={index} href={part.url} target="_blank" rel="noreferrer">{part.text}</a> : part.text)
  return <article className="enquiry-preview" aria-label={document.kind === 'screening' ? 'Supporting screening report' : 'Unsent enquiry preview'}>
    <h3>{document.title}</h3>{document.example && <p>SAVED EXAMPLE ONLY — not my property.</p>}
    <p className="enquiry-question">{links(document.question)}</p>
    {document.sections.map(section => <section key={section.heading} aria-label={section.heading}>
      <h4>{section.heading}</h4>{section.paragraphs.map((paragraph, index) => <p key={index}>{links(paragraph)}</p>)}
    </section>)}
    <p className="enquiry-closing">{links(document.closing)}</p>
  </article>
}

export const EMAIL_URL_LIMIT = 1800
export function validRecipient(value: string) {
  const recipient = value.trim()
  return recipient === '' || (/^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)+$/i.test(recipient) && !/[\r\n]/.test(recipient))
}

export function emailDraftUrl(kind: 'mailto' | 'gmail', recipient: string, subject: string, body: string) {
  if (!validRecipient(recipient)) return null
  const address = recipient.trim()
  const url = kind === 'mailto'
    ? `mailto:${encodeURIComponent(address)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    : `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(address)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  return url.length <= EMAIL_URL_LIMIT ? url : null
}
