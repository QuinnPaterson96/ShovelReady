import { useEffect, useReducer, useRef, useState } from 'react'
import RealObservations from './investigation/RealObservations'
import InvestigationPreview from './preview/InvestigationPreview'
import PublicCases from './reference_cases/PublicCases'
import IdentityPanel from './Identity'
import DraftEvaluations from './draft_evaluations/DraftEvaluations'
import { AssessmentForm, PreparationSummary } from './assessment/Assessment'
import { draftReducer, errorsFor, initialDraft } from './assessment/model'
import './assessment/assessment.css'

export default function App() {
  const [page, setPage] = useState<'home' | 'inputs' | 'summary' | 'evidence'>('home')
  const [draft, dispatch] = useReducer(draftReducer, initialDraft)
  const content = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState('real')
  const [health, setHealth] = useState('Checking backend…')
  useEffect(() => {
    content.current?.focus({ preventScroll: true })
    window.scrollTo({ top: 0 })
  }, [page])

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
    <main className="sr-shell">
      <header><p className="eyebrow">Preliminary scouting</p><h1>ShovelReady</h1>
        <nav className="sr-nav" aria-label="Main navigation">
          <button aria-current={page === 'home' ? 'page' : undefined} onClick={() => setPage('home')}>Home</button>
          <button aria-current={page === 'inputs' ? 'page' : undefined} onClick={() => setPage('inputs')}>Assessment inputs</button>
          <button aria-current={page === 'summary' ? 'page' : undefined} onClick={() => setPage('summary')}>Preparation summary</button>
          <button aria-current={page === 'evidence' ? 'page' : undefined} onClick={() => setPage('evidence')}>Examples/evidence</button>
        </nav>
      </header>
      <div ref={content} tabIndex={-1}>
      {page === 'home' && <section className="sr-home">
        <p className="eyebrow">From an idea to the next useful question</p>
        <h2>Prepare a design for source-backed investigation.</h2>
        <p>Collect what you know about a building and its intended use. See which evidence is still needed before preliminary zoning scouting.</p>
        <p>We are exploring City of Victoria garden suites first. There is no accepted zoning dataset or real-site fit result yet. A preparation summary is not a feasibility assessment or permit approval.</p>
        <div className="sr-actions"><button className="sr-primary" onClick={() => setPage('inputs')}>Start an assessment</button>
          <button onClick={() => setPage('evidence')}>Explore examples</button></div>
        <p>Begin with your own inputs, or explicitly load a labelled synthetic example. Unknown facts can stay unknown.</p>
      </section>}
      {page === 'inputs' && <AssessmentForm draft={draft} dispatch={dispatch}
        onSummary={() => { if (!Object.keys(errorsFor(draft.values)).length) setPage('summary') }}
        onEvidence={() => { setMode('public'); setPage('evidence') }} />}
      {page === 'summary' && <PreparationSummary draft={draft} onEdit={() => setPage('inputs')} />}
      {page === 'evidence' && <>
      <section><h2>Examples and evidence</h2><p>Explore saved observations and software examples separately from your editable preparation. These views never evaluate your form values.</p>
      <label htmlFor="mode">Investigation mode</label>
      <select id="mode" value={mode} onChange={e => setMode(e.target.value)}>
        <option value="real">Real observations · unreviewed licensed captures</option>
        <option value="public">Public cases · provisional historical evidence</option>
        <option value="synthetic">Fictional preview · synthetic saved scenarios</option>
        <option value="draft">Computed draft evaluations · synthetic examples</option>
      </select>
      </section>
      {mode === 'real' ? <RealObservations /> : mode === 'public' ? <PublicCases /> : mode === 'draft' ? <DraftEvaluations /> : <InvestigationPreview />}
      </>}
      </div>
      <details className="sr-technical"><summary>Technical build and API health · not assessment status</summary>
      <IdentityPanel />
      <section aria-labelledby="status-heading">
        <h2 id="status-heading">Foundation status</h2>
        <p role="status">{health}</p>
        <p>Computed draft examples exercise the scalar evaluator. Real-site screening and design fit are not established.</p>
        <p>No accepted dataset is published. A health response only confirms that the API is running.</p>
      </section>
      </details>
    </main>
  )
}
