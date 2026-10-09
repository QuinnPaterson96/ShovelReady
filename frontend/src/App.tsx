import { useEffect, useReducer, useRef, useState } from 'react'
import RealObservations from './investigation/RealObservations'
import InvestigationPreview from './preview/InvestigationPreview'
import PublicCases from './reference_cases/PublicCases'
import IdentityPanel from './Identity'
import DraftEvaluations from './draft_evaluations/DraftEvaluations'
import PilotPreparation from './case_preparations/PilotPreparation'
import OccupiedLots from './occupied_lots/OccupiedLots'
import BuilderDemo from './builder_demo/BuilderDemo'
import { BuilderJourneyNav, emptyBuilderJourneyCompletion } from './navigation/BuilderJourneyNav'
import './navigation/builder-journey-nav.css'
import './builder_demo/model_image/model-image.css'
import { Brand } from './brand/Brand'
import { PropertyIllustration } from './brand/PropertyIllustration'
import { AssessmentForm, PreparationSummary } from './assessment/Assessment'
import { draftReducer, initialDraft, submissionErrors } from './assessment/model'
import './assessment/assessment.css'
import './evidence_checklist/evidence-checklist.css'
import './model_catalogue/model-inputs.css'
import './site_preparations/site-preparation.css'
import './case_preparations/pilot.css'
import './builder_demo/builder-demo.css'
import './conditional_screening/placement-scenarios.css'
import './zoning_site_assumptions/boundary-map.css'
import './builder_demo/height_view/height-view.css'
import './occupied_lots/occupied-lots.css'
import './scenario_handoff/scenario-handoff.css'
import './navigation/navigation.css'
import { assessmentEntry, type AssessmentEntry } from './navigation/assessmentEntry'

export default function App() {
  type Page = 'home' | 'builder' | 'inputs' | 'summary' | 'evidence' | 'pilot' | 'occupied'
  const initialEntry = useRef(assessmentEntry(window.location.hash))
  const initialPage = (): Page => initialEntry.current ? 'builder' : window.location.hash === '#inputs' ? 'inputs' : 'home'
  const [page, setPage] = useState<Page>(initialPage)
  const [entryRequest, setEntryRequest] = useState<AssessmentEntry | null>(initialEntry.current)
  const [occupiedOpened, setOccupiedOpened] = useState(false)
  const [builderCompletion, setBuilderCompletion] = useState(emptyBuilderJourneyCompletion)
  const [builderOpened, setBuilderOpened] = useState(() => !!initialEntry.current)
  const builderVisited = useRef(!!initialEntry.current)
  const navigate = (destination: Page, hash: string) => {
    if (window.location.hash !== hash) window.history.pushState(null, '', hash)
    setPage(destination)
  }
  const openHome = () => navigate('home', '#home')
  const openBuilder = () => { builderVisited.current = true; setBuilderOpened(true); navigate('builder', '#assessment') }
  const openDemo = () => {
    builderVisited.current = true; setBuilderOpened(true)
    setEntryRequest({ example: true, modelId: 'aux-300' })
    navigate('builder', '#assessment')
  }
  useEffect(() => {
    const followRoute = () => {
      const entry = assessmentEntry(window.location.hash)
      if (entry) {
        // History and step links reopen the mounted journey; only a new explicit
        // entry (or cold URL load) initializes a preset.
        if (!builderVisited.current) setEntryRequest(entry)
        builderVisited.current = true; setBuilderOpened(true); setPage('builder')
      } else if (['#inputs', '#summary', '#evidence', '#pilot', '#occupied'].includes(window.location.hash)) {
        const destination = window.location.hash.slice(1) as Page
        if (destination === 'occupied') setOccupiedOpened(true)
        setPage(destination)
      }
      else if (window.location.hash === '#home' || window.location.hash === '#examples' || !window.location.hash) setPage('home')
    }
    window.addEventListener('hashchange', followRoute)
    window.addEventListener('popstate', followRoute)
    return () => { window.removeEventListener('hashchange', followRoute); window.removeEventListener('popstate', followRoute) }
  }, [])
  const openOccupied = () => { setOccupiedOpened(true); navigate('occupied', '#occupied') }
  const [draft, dispatch] = useReducer(draftReducer, initialDraft)
  const content = useRef<HTMLDivElement>(null)
  const researchMenu = useRef<HTMLDetailsElement>(null)
  const assessmentReady = !Object.keys(submissionErrors(draft)).length
  const openResearch = (destination: 'evidence' | 'pilot' | 'occupied') => {
    if (researchMenu.current) researchMenu.current.open = false
    if (destination === 'occupied') openOccupied()
    else navigate(destination, '#' + destination)
  }
  const [mode, setMode] = useState('real')
  const [health, setHealth] = useState('Checking backend…')
  useEffect(() => {
    if (researchMenu.current) researchMenu.current.open = false
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
      <header className="sr-site-header">
        <button className="sr-home-brand" type="button" onClick={openHome} aria-label="ShovelReady home"><Brand /></button>
        <nav className="sr-nav sr-primary-nav" aria-label="Main navigation">
          <button aria-current={page === 'home' ? 'page' : undefined} onClick={openHome}>Home</button>
          <button aria-current={page === 'builder' ? 'page' : undefined} onClick={openBuilder}>Start assessment</button>
        </nav>
        <details className="sr-more-nav" ref={researchMenu} onKeyDown={event => {
          if (event.key === 'Escape' && researchMenu.current?.open) {
            researchMenu.current.open = false
            researchMenu.current.querySelector('summary')?.focus()
          }
        }}>
          <summary>Research <span aria-hidden="true">▾</span></summary>
          <nav aria-label="Research navigation">
            <button aria-current={page === 'inputs' || page === 'summary' ? 'page' : undefined} onClick={() => navigate('inputs', '#inputs')}>Input preparation tools</button>
            <button aria-current={page === 'evidence' ? 'page' : undefined} onClick={() => openResearch('evidence')}>Examples and evidence</button>
            <button aria-current={page === 'pilot' ? 'page' : undefined} onClick={() => openResearch('pilot')}>Pilot investigation</button>
            <button aria-current={page === 'occupied' ? 'page' : undefined} onClick={() => openResearch('occupied')}>Occupied-lot sketch</button>
          </nav>
        </details>
      </header>
      <div ref={content} tabIndex={-1} className="sr-page-content">
      {page === 'home' && <section className="sr-home sr-home-layout"><div>
        <p className="eyebrow">From an idea to the next useful question</p>
        <h1>Explore a prefab on your property.</h1>
        <p>Choose a model, explore its placement and prepare a useful question for the provider.</p>
        <p>Preliminary exploration, starting with City of Victoria properties. Source observations and planning comparisons are unreviewed; no accepted zoning or permit finding is made.</p>
        <div className="sr-actions"><button className="sr-primary" onClick={openBuilder}>Start assessment</button><button onClick={openDemo}>Try the demo</button></div>
        <p>The demo opens an Example assessment with aux box Model 300 and a saved Victoria property. You can change either.</p>
        </div><PropertyIllustration />
      </section>}
      {builderOpened && <div hidden={page !== 'builder'} className="sr-workspace">
        <BuilderJourneyNav completion={builderCompletion} />
        <BuilderDemo onProgressChange={setBuilderCompletion} entryRequest={entryRequest} />
      </div>}
      {(page === 'inputs' || page === 'summary') && <div className="sr-workspace">
        <aside className="sr-workspace-rail"><nav aria-label="Input preparation steps">
          <p>Input preparation</p>
          <button aria-current={page === 'inputs' ? 'step' : undefined} onClick={() => setPage('inputs')}>01 <span>Inputs</span></button>
          <button aria-current={page === 'summary' ? 'step' : undefined} disabled={!assessmentReady} onClick={() => setPage('summary')}>02 <span>Preparation summary</span></button>
          {!assessmentReady && <small>Complete required inputs to view the summary.</small>}
        </nav></aside><div>
      <h1 className="sr-visually-hidden">{page === 'summary' ? 'Preparation summary' : 'General assessment inputs'}</h1>
      {page === 'inputs' && <AssessmentForm draft={draft} dispatch={dispatch}
        onBuilder={openBuilder}
        onSummary={() => { if (!Object.keys(submissionErrors(draft)).length) setPage('summary') }}
        onEvidence={() => setPage('pilot')} />}
      {page === 'summary' && <PreparationSummary draft={draft} onEdit={() => setPage('inputs')} />}
      </div></div>}
      {occupiedOpened && <div hidden={page !== 'occupied'}><h1 className="sr-visually-hidden">Occupied-lot sketch</h1><OccupiedLots /></div>}
      {page === 'pilot' && <><h1 className="sr-visually-hidden">Pilot investigation</h1><PilotPreparation /></>}
      {page === 'evidence' && <>
      <section><h1>Examples and evidence</h1><p>Explore saved observations and software examples separately from your editable preparation. These views never evaluate your form values.</p>
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
