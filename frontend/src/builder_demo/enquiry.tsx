import type { ReactNode } from 'react'
import { publicSourceUrl } from '../ReadableProvenance'

export type EnquirySection = { heading: string; paragraphs: string[]; emailSummary: string }
export type EnquiryDocument = {
  title: string
  question: string
  example: boolean
  sections: EnquirySection[]
  closing: string
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

const markdownEscape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/[\\`*_{}\[\]()#+.!|~-]/g, '\\$&')
const markdownParagraph = (value: string) => safeParts(value).map(part => part.url
  ? `[${markdownEscape(part.text)}](${part.url.replace(/\(/g, '%28').replace(/\)/g, '%29')})` : markdownEscape(part.text)).join('')

export function enquiryPlainText(document: EnquiryDocument) {
  return [document.title, document.question,
    ...document.sections.flatMap(section => [section.heading, ...section.paragraphs]),
    document.closing].join('\n\n')
}

export function enquiryMarkdown(document: EnquiryDocument) {
  return [`# ${markdownEscape(document.title)}`, markdownParagraph(document.question),
    ...document.sections.map(section => `## ${markdownEscape(section.heading)}\n\n${section.paragraphs.map(markdownParagraph).join('\n\n')}`),
    markdownParagraph(document.closing)].join('\n\n') + '\n'
}

export function enquiryEmailBody(document: EnquiryDocument, includeSiteDetails: boolean) {
  const sections = document.sections.filter(section => includeSiteDetails || section.heading === 'Model')
  return [document.example ? 'SAVED EXAMPLE ONLY — not my property.' : 'Preliminary Model 300 enquiry.',
    document.question,
    ...sections.map(section => `${section.heading}: ${section.emailSummary}`),
    ...(!includeSiteDetails ? ['The automatic property summary and placement observations are withheld; the question above is included as written. I can share them after reviewing the recipient.'] : []),
    document.closing,
    'Prepared independently with ShovelReady. Please review and edit before sending.'].join('\n\n')
}

export function EnquiryPreview({ document }: { document: EnquiryDocument }) {
  const links = (value: string): ReactNode[] => safeParts(value).map((part, index) => part.url
    ? <a key={index} href={part.url} target="_blank" rel="noreferrer">{part.text}</a> : part.text)
  return <article className="enquiry-preview" aria-label="Unsent enquiry preview">
    <h3>{document.title}</h3>
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
