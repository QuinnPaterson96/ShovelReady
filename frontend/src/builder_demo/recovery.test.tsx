import assert from 'node:assert/strict'
import { test } from 'node:test'
import { JSDOM } from 'jsdom'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { EnquiryRecovery } from './EnquiryRecovery'

// Browser storage is an untrusted, fallible boundary. A corrupt record must not
// block the journey; denied writes must offer an honest copy/download fallback.
test('enquiry recovery tolerates corrupt records and reports unavailable storage', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://example.test' })
  const originals = new Map<string, PropertyDescriptor | undefined>()
  for (const [name, value] of Object.entries({ window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true })) {
    originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name))
    Object.defineProperty(globalThis, name, { configurable: true, value })
  }
  const root = createRoot(dom.window.document.getElementById('root')!)
  try {
    for (const corrupt of ['{', JSON.stringify({ schema: 'sr.enquiry-recovery.v1', savedAt: 'bad date', enquiry: 42, report: [] })]) {
      dom.window.sessionStorage.setItem('shovelready.enquiry-recovery.v1', corrupt)
      await act(async () => root.render(<EnquiryRecovery key={corrupt} enquiry={null} report={null} />))
      assert.equal(dom.window.document.getElementById('recovered-enquiry'), null)
    }
    Object.defineProperty(dom.window, 'sessionStorage', { configurable: true, get() { throw new Error('Storage blocked') } })
    await act(async () => root.render(<EnquiryRecovery key="blocked" enquiry="My unsent question" report="Unreviewed findings" />))
    assert.match(dom.window.document.body.textContent!, /could not save.*Download or copy/s)
    assert.equal(dom.window.document.getElementById('recovered-enquiry'), null)
  } finally {
    await act(async () => root.unmount())
    for (const [name, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name) }
    dom.window.close()
  }
})
