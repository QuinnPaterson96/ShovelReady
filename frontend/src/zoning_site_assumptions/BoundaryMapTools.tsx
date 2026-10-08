import { roadBands } from './roads'
import type { ReactNode } from 'react'
import { type Feature } from '../occupied_lots/contract'
import { ordinaryFourEdgeBoundary, type BoundaryEdge, type BoundaryMapMode } from './model'

/** Sketch vocabulary only; the legal classification remains a separate reviewed fact. */
export function BoundaryRoleHelp() {
  return <details className="boundary-role-help"><summary>What do front, rear, side and street-side mean?</summary>
    <p>These words label your preliminary property sketch. Check a survey or reliable property plan; a street mark alone does not establish a legal lot-line role.</p>
    <dl><dt>Front</dt><dd>The boundary treated as the front in a complete placement scenario. It often faces a street; corners and through lots need review.</dd>
      <dt>Rear</dt><dd>The boundary treated as the back of that same scenario. On a simple four-edge lot it is opposite the front; unusual lots may differ.</dd>
      <dt>Side</dt><dd>A remaining boundary that is not treated as front, rear or street-side in that scenario.</dd>
      <dt>Street-side (flanking street)</dt><dd>A side boundary adjoining another street. It can have a different candidate distance requirement from an ordinary side.</dd>
      <dt>Not sure</dt><dd>Leave the role unknown. Mark known streets separately, and ask the property contact or City reviewer to confirm unclear roles.</dd></dl>
    <p>The candidate comparisons here use the City of Victoria garden-suite packet shown with each result. These sketch definitions do not verify that packet's current legal applicability or supply a surveyed classification.</p>
  </details>
}

export type BoundaryMapInteraction = {
  mainBuilding?: Feature
  mainBuildingAssumed?: boolean
  waterfront?: boolean
  waterfrontIds?: string[]
  suggestedRoles?: Record<string, import('./model').EdgeRole>
  streetIds?: string[]
  allStreetsMarked?: boolean
  onStreetComplete?: (complete: boolean) => void
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
  return <div className="boundary-map-tools" aria-label="Boundary selection controls">
    <BoundaryRoleHelp />
    {!supported && <p>This outline needs manual review. Marks record your assumptions; street-side suggestions cannot resolve its frontage.</p>}
    {mode === 'front' && <>
      <p>Click every property edge that borders a street. Click a marked edge again to remove it. Your unit stays in position.</p>
      <div className="boundary-map-buttons">{exterior.map((edge, index) => <button type="button" key={edge.id}
        aria-pressed={marked.includes(edge.id)} onClick={() => onSelect(edge.id)}>Edge {index + 1} borders a street</button>)}
        <button type="button" onClick={() => onSelect(null)}>Not sure · clear street marks</button>
      </div>
      <label className="boundary-map-single"><input type="checkbox" checked={complete} onChange={event => interaction.onStreetComplete?.(event.target.checked)} /> I've marked all street edges</label>
      <p role="status">{!complete ? 'Unmarked edges remain uncertain. Changing a mark clears this confirmation.' : marked.length === 1 && supported ? 'For this simple one-street sketch, front, opposite rear and side roles are suggestions only. Adjust boundary facts if you can support them.' : 'Street marks are recorded. In Adjust boundaries, mark Front or Rear to suggest the other roles; use your property plan to support your choice.'}</p>
      <p><strong>Street information: your input · {complete ? 'you confirmed all street edges are marked' : marked.length ? 'partial marks; completion not confirmed' : 'not sure or not yet marked'}.</strong> These are your observations, not an independent map verification.</p>
      <p>Grey road bands show your street marks only: no measured road width, surveyed location or access point is implied.</p>
    </>}
    {mode === 'waterfront' && <>
      <p>Mark every edge adjoining water. Click again to remove a mark. Waterfront edges are separate from street edges and front/rear roles.</p>
      <div className="boundary-map-buttons">{exterior.map((edge, index) => <button key={edge.id} type="button" aria-pressed={interaction.waterfrontIds?.includes(edge.id) ?? false} onClick={() => onSelect(edge.id)}>Edge {index + 1} adjoins water</button>)}<button type="button" onClick={() => onSelect(null)}>Not sure · clear waterfront marks</button></div>
      <p>These marks record your observations. Waterfront front-line classification and special siting provisions still need a reviewed property plan.</p>
    </>}
    {interaction.editor}
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
