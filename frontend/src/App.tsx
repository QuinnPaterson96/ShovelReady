import { useEffect, useState } from 'react'
import RealObservations from './investigation/RealObservations'
import InvestigationPreview from './preview/InvestigationPreview'
import IdentityPanel from './Identity'

export default function App() {
  const [mode, setMode] = useState('real')
  const [health, setHealth] = useState('Checking backend…')

  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)
    let active = true
    async function checkHealth() {
      try {
        const response = await fetch('/health', { signal: controller.signal })
        const body: unknown = await response.json()
        if (!response.ok || typeof body !== 'object' || body === null ||
            !('status' in body) || body.status !== 'ok') {
          throw new Error('Unexpected health response')
        }
        if (active) setHealth('Backend reachable')
      } catch {
        if (active) setHealth('Backend unavailable — start the local API and reload.')
      } finally {
        clearTimeout(timer)
      }
    }
    void checkHealth()
    return () => {
      active = false
      clearTimeout(timer)
      controller.abort()
    }
  }, [])

  return (
    <main>
      <p className="eyebrow">Exploratory checkpoint</p>
      <h1>ShovelReady</h1>
      <IdentityPanel />
      <p>Preliminary zoning scouting and source-backed investigation.</p>
      <label htmlFor="mode">Investigation mode</label>
      <select id="mode" value={mode} onChange={e => setMode(e.target.value)}>
        <option value="real">Real observations · unreviewed licensed captures</option>
        <option value="synthetic">Fictional preview · synthetic saved scenarios</option>
      </select>
      {mode === 'real' ? <RealObservations /> : <InvestigationPreview />}
      <section aria-labelledby="status-heading">
        <h2 id="status-heading">Foundation status</h2>
        <p role="status">{health}</p>
        <p>This scaffold does not yet ingest rules, evaluate sites, or establish design fit.</p>
        <p>No accepted dataset is published. A health response only confirms that the API is running.</p>
      </section>
    </main>
  )
}
