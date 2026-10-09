import assert from 'node:assert/strict'
import test from 'node:test'
import { JSDOM } from 'jsdom'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { EvidenceAtFooter } from './EvidenceAtFooter'

// Reproduces the live map arriving after the purpose section first mounts.
test('journey section follows a late and replaced map destination', async () => {
  const dom = new JSDOM('<div id="root"></div>')
  const originals = new Map<string, PropertyDescriptor | undefined>()
  for (const [name, value] of Object.entries({ window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true })) {
    originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name))
    Object.defineProperty(globalThis, name, { configurable: true, value })
  }
  const root = createRoot(dom.window.document.getElementById('root')!)
  const render = (map: boolean, revision: number) => <>
    <EvidenceAtFooter targetId="purpose-slot"><section id="purpose">Purpose</section></EvidenceAtFooter>
    {map && <div key={revision} id="map"><div id="facts">Property details</div><div id="purpose-slot" /><div id="checks">Quick checks</div></div>}
  </>
  const settle = () => new Promise(resolve => setTimeout(resolve, 0))
  try {
    await act(async () => root.render(render(false, 0)))
    await act(async () => { root.render(render(true, 1)); await settle() })
    await act(settle)
    const first = dom.window.document.getElementById('purpose-slot')!
    assert.equal(first.querySelector('#purpose')?.textContent, 'Purpose')
    assert.deepEqual([...first.parentElement!.children].map(node => node.id), ['facts', 'purpose-slot', 'checks'])
    await act(async () => { root.render(render(true, 2)); await settle() })
    await act(settle)
    const replacement = dom.window.document.getElementById('purpose-slot')!
    assert.notEqual(replacement, first)
    assert.equal(replacement.querySelector('#purpose')?.textContent, 'Purpose')
    assert.equal(dom.window.document.querySelectorAll('#purpose').length, 1)
  } finally {
    await act(async () => root.unmount())
    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor)
      else Reflect.deleteProperty(globalThis, name)
    }
    dom.window.close()
  }
})
