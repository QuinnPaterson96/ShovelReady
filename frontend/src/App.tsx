import { useEffect, useState } from 'react'
import RealObservations from './investigation/RealObservations'
import InvestigationPreview from './preview/InvestigationPreview'
import PublicCases from './reference_cases/PublicCases'
import IdentityPanel from './Identity'
import DraftEvaluations from './draft_evaluations/DraftEvaluations'

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
        <option value="public">Public cases · provisional historical evidence</option>
        <option value="synthetic">Fictional preview · synthetic saved scenarios</option>
        <option value="draft">Computed draft evaluations · synthetic examples</option>
      </select>
      {mode === 'real' ? <RealObservations /> : mode === 'public' ? <PublicCases /> : mode === 'draft' ? <DraftEvaluations /> : <InvestigationPreview />}
      <section aria-labelledby="status-heading">
        <h2 id="status-heading">Foundation status</h2>
        <p role="status">{health}</p>
        <p>Computed draft examples exercise the scalar evaluator. Real-site screening and design fit are not established.</p>
        <p>No accepted dataset is published. A health response only confirms that the API is running.</p>
      </section>
    </main>
  )
}
