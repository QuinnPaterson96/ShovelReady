import { roadBands } from './roads'
import type { ReactNode } from 'react'
import { ordinaryFourEdgeBoundary, type BoundaryEdge, type BoundaryMapMode } from './model'

export type BoundaryMapInteraction = {
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
    {roads.map(road => <g key={road.id} className="street-road" data-road-edge={road.id}>
      <polygon points={road.corners.map(([x, y]) => `${x},${-y}`).join(' ')} />
      <line x1={road.centre[0][0]} y1={-road.centre[0][1]} x2={road.centre[1][0]} y2={-road.centre[1][1]} />
      <text transform={`translate(${road.label[0]} ${-road.label[1]})`} textAnchor="middle" dominantBaseline="middle">Street · your mark</text>
    </g>)}
    {interaction.mode !== 'place' && interaction.edges.map((edge, index) => <g key={edge.id}>
      <line x1={edge.start[0]} y1={-edge.start[1]} x2={edge.end[0]} y2={-edge.end[1]}
        className={(interaction.mode === 'front' ? marked.includes(edge.id) : interaction.selectedId === edge.id) ? 'boundary-map-edge boundary-map-edge--selected' : 'boundary-map-edge'} />
      <line x1={edge.start[0]} y1={-edge.start[1]} x2={edge.end[0]} y2={-edge.end[1]}
        className="boundary-map-edge-hit" onClick={event => { event.stopPropagation(); if (interaction.mode !== 'front' || edge.ring === 0) interaction.onSelect(edge.id) }} data-edge-id={edge.id} />
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
    {!supported && <p>This outline needs manual review. Marks record your assumptions; street-side suggestions cannot resolve its frontage.</p>}
    {mode === 'front' && <>
      <p>Click every property edge that borders a street. Click a marked edge again to remove it. Your unit stays in position.</p>
      <div className="boundary-map-buttons">{exterior.map((edge, index) => <button type="button" key={edge.id}
        aria-pressed={marked.includes(edge.id)} onClick={() => onSelect(edge.id)}>Edge {index + 1} borders a street</button>)}
        <button type="button" onClick={() => onSelect(null)}>Not sure · clear street marks</button>
      </div>
      <label className="boundary-map-single"><input type="checkbox" checked={complete} onChange={event => interaction.onStreetComplete?.(event.target.checked)} /> I've marked all street edges</label>
      <p role="status">{!complete ? 'Unmarked edges remain uncertain. Changing a mark clears this confirmation.' : marked.length === 1 && supported ? 'For this simple one-street sketch, front, opposite rear and side roles are suggestions only. Adjust boundary facts if you can support them.' : 'Street marks are recorded. In Adjust boundaries, mark Front or Rear to suggest the other roles; use your property plan to support your choice.'}</p>
      <p>Grey road bands show your street marks only: no measured road width, surveyed location or access point is implied.</p>
    </>}
    {interaction.editor}
  </div>
}

export function BoundaryActionTabs({ interaction }: { interaction: BoundaryMapInteraction }) {
  const actions = [['place', 'Move unit'], ['front', 'Mark street edges'], ['rear', 'Adjust boundaries']] as const
  return <div className="boundary-map-modes" role="tablist" aria-label="Placement actions" onKeyDown={event => {
    const index = actions.findIndex(([mode]) => mode === interaction.mode)
    const next = event.key === 'ArrowRight' ? (index + 1) % 3 : event.key === 'ArrowLeft' ? (index + 2) % 3 : event.key === 'Home' ? 0 : event.key === 'End' ? 2 : null
    if (next === null) return
    event.preventDefault(); interaction.onModeChange(actions[next][0])
    document.getElementById(`placement-action-${actions[next][0]}`)?.focus()
  }}>
    {actions.map(([mode, label]) => <button key={mode} id={`placement-action-${mode}`} type="button" role="tab"
      aria-selected={interaction.mode === mode} aria-controls="placement-action-panel" tabIndex={interaction.mode === mode ? 0 : -1}
      onClick={() => interaction.onModeChange(mode)}>{label}</button>)}
  </div>
}
