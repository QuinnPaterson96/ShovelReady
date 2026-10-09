import { StepInfo } from '../StepInfo'
import { roadBands } from './roads'
import { useId, type ReactNode } from 'react'
import { type Feature } from '../occupied_lots/contract'
import { ordinaryFourEdgeBoundary, type BoundaryEdge, type BoundaryMapMode } from './model'

/** Sketch vocabulary only; the legal classification remains a separate reviewed fact. */
export function BoundaryRoleHelp({ compact = false }: { compact?: boolean }) {
  const id = useId()
  const content = <>
    <figure>
      <svg viewBox="0 0 420 210" role="img" aria-labelledby={id}>
        <title id={id}>Illustrative corner lot: front faces a street, rear is opposite, and street-side faces a second street. A planning margin is deducted from the mapped gap.</title>
        <rect className="boundary-help-street" x="20" y="165" width="220" height="30" />
        <rect className="boundary-help-street" x="200" y="20" width="40" height="145" />
        <rect className="boundary-help-parcel" x="50" y="35" width="150" height="125" />
        <text x="95" y="27">Rear</text><text x="100" y="155">Front</text>
        <text x="12" y="90">Side</text><text x="203" y="90">Street-</text><text x="203" y="105">side</text>
        <text x="98" y="185">Street</text>
        <rect className="boundary-help-unit" x="108" y="60" width="48" height="40" />
        <text x="120" y="85">Unit</text>
        <path className="boundary-help-margin" d="M50 43h22v108H50" />
        <text x="268" y="57">Mapped edge</text><path className="boundary-help-parcel" d="M275 65v100" />
        <path className="boundary-help-margin" d="M300 65v100" />
        <rect className="boundary-help-unit" x="345" y="88" width="55" height="55" />
        <text x="351" y="121">Unit</text>
        <path className="boundary-help-gap" d="M278 77h64m-64 0 6-4m-6 4 6 4m58-4-6-4m6 4-6 4" />
        <text x="269" y="181">Gap − margin</text><text x="269" y="198">= planning estimate</text>
      </svg>
      <figcaption>Illustration only · no measured fit or legal boundary classification.</figcaption>
    </figure>
    <p><strong>Front</strong> is the chosen front in one complete sketch; <strong>rear</strong> is opposite on a simple four-edge lot. <strong>Side</strong> is another edge; <strong>street-side</strong> adjoins a second street. Corners, through lots and unusual outlines need review.</p>
    <p>A <strong>planning margin</strong> leaves extra room for uncertainty: it is subtracted from the approximate mapped gap. It is your editable allowance, not a required setback or a correction to the map. Reducing it does not improve the underlying measurement.</p>
    <p><strong>I don’t know:</strong> keep the role unknown or choose Not sure in the controls. Mark only streets you know; ask for a property plan or City review when the classification changes the decision.</p>
    <p>These labels support the stated City of Victoria garden-suite comparison. A survey and applicable source rule are still needed to establish legal roles and distances.</p>
  </>
  return compact ? <StepInfo label="Boundary roles & planning margins" className="boundary-role-info"><strong>Boundary roles &amp; planning margins</strong><div className="boundary-role-help">{content}</div></StepInfo> : <details className="boundary-role-help"><summary>Boundary roles &amp; planning margins · illustrated help</summary>{content}</details>
}

export type BoundaryMapInteraction = {
  showPropertyDetails?: boolean
  mainBuilding?: Feature
  mainBuildingAssumed?: boolean
  waterfront?: boolean
  waterfrontIds?: string[]
  suggestedRoles?: Record<string, import('./model').EdgeRole>
  streetIds?: string[]
  allStreetsMarked?: boolean
  editor?: ReactNode
  selectedId?: string | null
  edges: BoundaryEdge[]
  mode: BoundaryMapMode
  frontId: string | null
  rearId: string | null
  streetPattern: 'unknown' | 'single' | 'corner_or_multiple'
  onModeChange: (mode: BoundaryMapMode) => void
  onSelect: (id: string | null) => void
  onStreetPattern?: (pattern: 'unknown' | 'single' | 'corner_or_multiple') => void
}

export function BoundaryOverlay({ interaction }: { interaction: BoundaryMapInteraction }) {
  const marked = interaction.streetIds ?? []
  const roads = roadBands(interaction.edges, marked)
  return <g className="boundary-map-overlay" aria-hidden="true">
    {interaction.edges.filter(edge => interaction.waterfrontIds?.includes(edge.id)).map(edge => <g key={`water-${edge.id}`} className="waterfront-mark">
      <line x1={edge.start[0]} y1={-edge.start[1]} x2={edge.end[0]} y2={-edge.end[1]} stroke="var(--primary)" strokeWidth="7" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
      <text transform={`translate(${(edge.start[0] + edge.end[0]) / 2} ${-(edge.start[1] + edge.end[1]) / 2 - 2})`} x="0" y="0" textAnchor="middle" className="boundary-map-edge-label">Waterfront · your mark</text>
    </g>)}
    {roads.map(road => <g key={road.id} className="street-road" data-road-edge={road.id}>
      <polygon points={road.corners.map(([x, y]) => `${x},${-y}`).join(' ')} />
      <line x1={road.centre[0][0]} y1={-road.centre[0][1]} x2={road.centre[1][0]} y2={-road.centre[1][1]} />
      <text transform={`translate(${road.label[0]} ${-road.label[1]})`} textAnchor="middle" dominantBaseline="middle">Street · your mark</text>
    </g>)}
    {interaction.mode !== 'place' && interaction.edges.map((edge, index) => <g key={edge.id}>
      <line x1={edge.start[0]} y1={-edge.start[1]} x2={edge.end[0]} y2={-edge.end[1]}
        className={(interaction.mode === 'waterfront' ? interaction.waterfrontIds?.includes(edge.id) : interaction.mode === 'front' ? marked.includes(edge.id) : interaction.selectedId === edge.id) ? 'boundary-map-edge boundary-map-edge--selected' : 'boundary-map-edge'} />
      <line x1={edge.start[0]} y1={-edge.start[1]} x2={edge.end[0]} y2={-edge.end[1]}
        className="boundary-map-edge-hit" onClick={event => { event.stopPropagation(); if (interaction.mode === 'rear' || edge.ring === 0) interaction.onSelect(edge.id) }} data-edge-id={edge.id} />
      <text transform={`translate(${(edge.start[0] + edge.end[0]) / 2} ${-(edge.start[1] + edge.end[1]) / 2})`} x="0" y="0"
        textAnchor="middle" dominantBaseline="middle" className="boundary-map-edge-label">{edge.ring ? `Inner ${edge.ring} · ${edge.segment + 1}` : index + 1}{edge.role.value && edge.role.value !== 'unknown' ? ` · ${edge.role.value === 'flanking_street' ? 'Flanking' : edge.role.value[0].toUpperCase() + edge.role.value.slice(1)}` : interaction.suggestedRoles?.[edge.id] ? ` · ${interaction.suggestedRoles[edge.id] === 'flanking_street' ? 'Flanking' : interaction.suggestedRoles[edge.id][0].toUpperCase() + interaction.suggestedRoles[edge.id].slice(1)} (suggested)` : ''}</text>
    </g>)}
  </g>
}

export function BoundaryMapTools({ interaction }: { interaction: BoundaryMapInteraction }) {
  const { mode, edges, onSelect } = interaction
  const marked = interaction.streetIds ?? []
  const complete = interaction.allStreetsMarked ?? false
  const exterior = edges.filter(edge => edge.ring === 0)
  const supported = ordinaryFourEdgeBoundary(edges)
  return <div className="boundary-map-tools" hidden={mode === 'place'} data-mode={mode} aria-label="Boundary selection controls">
    {!supported && <p>This outline needs manual review. Marks record your assumptions; street-side suggestions cannot resolve its frontage.</p>}
    {mode === 'front' && <>
      <p>Streets help determine which boundary rules we compare. Click each edge that borders a street, or choose Not sure.</p>
      <div className="boundary-street-toolbar">
        <button type="button" aria-label="Not sure · clear street marks" onClick={() => onSelect(null)}>Not sure</button>
        <details className="boundary-keyboard"><summary>Mark without the map</summary>
          <div className="boundary-map-buttons">{exterior.map((edge, index) => <button type="button" key={edge.id}
            aria-pressed={marked.includes(edge.id)} onClick={() => onSelect(edge.id)}>Edge {index + 1} borders a street</button>)}</div>
        </details>
        <StepInfo label="your street marks"><p>Click a marked edge again to remove it. Marks save immediately; other edges are assumed not to adjoin a street. Not sure clears the marks and leaves street context unknown.</p>
          <p><strong>Street information: your input · {complete ? 'marked streets; other edges assumed not street-adjoining' : marked.length ? 'previous partial marks; completeness unresolved' : 'not sure or not yet marked'}.</strong> These are your observations, not an independent map verification.</p>
          <p>For a simple one-street lot, front, opposite rear and side roles are suggestions. Grey road bands illustrate your marks, not measured road width or access.</p>
        </StepInfo>
      </div>
      <p role="status" className="boundary-street-status">{complete ? marked.length ? `${marked.length} ${marked.length === 1 ? 'street' : 'streets'} marked · saved` : 'No street-adjoining edges · your answer saved' : marked.length ? `${marked.length} marked · completeness unknown` : 'Street context unknown · you can continue'}</p>
    </>}
    {mode === 'waterfront' && <>
      <p>Mark every edge adjoining water. Click again to remove a mark. Waterfront edges are separate from street edges and front/rear roles.</p>
      <div className="boundary-map-buttons">{exterior.map((edge, index) => <button key={edge.id} type="button" aria-pressed={interaction.waterfrontIds?.includes(edge.id) ?? false} onClick={() => onSelect(edge.id)}>Edge {index + 1} adjoins water</button>)}<button type="button" onClick={() => onSelect(null)}>Not sure · clear waterfront marks</button></div>
      <p>These marks record your observations. Waterfront front-line classification and special siting provisions still need a reviewed property plan.</p>
    </>}
    <div hidden={mode !== 'rear' && !interaction.showPropertyDetails}>{interaction.editor}</div>
  </div>
}

export function BoundaryActionTabs({ interaction }: { interaction: BoundaryMapInteraction }) {
  const actions: [BoundaryMapMode, string][] = [['place', 'Move unit'], ['front', 'Mark street edges'], ['rear', 'Adjust boundaries'], ...(interaction.waterfront ? [['waterfront', 'Mark waterfront'] as [BoundaryMapMode, string]] : [])]
  return <div className="boundary-map-modes" role="tablist" aria-label="Placement actions" onKeyDown={event => {
    const index = actions.findIndex(([mode]) => mode === interaction.mode)
    const next = event.key === 'ArrowRight' ? (index + 1) % actions.length : event.key === 'ArrowLeft' ? (index + actions.length - 1) % actions.length : event.key === 'Home' ? 0 : event.key === 'End' ? actions.length - 1 : null
    if (next === null) return
    event.preventDefault(); interaction.onModeChange(actions[next][0])
    document.getElementById(`placement-action-${actions[next][0]}`)?.focus()
  }}>
    {actions.map(([mode, label]) => <button key={mode} id={`placement-action-${mode}`} type="button" role="tab"
      aria-selected={interaction.mode === mode} aria-controls="placement-action-panel" tabIndex={interaction.mode === mode ? 0 : -1}
      onClick={() => interaction.onModeChange(mode)}>{label}</button>)}
  </div>
}
