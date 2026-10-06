import type { ReactNode } from 'react'
import { ordinaryFourEdgeBoundary, type BoundaryEdge, type BoundaryMapMode } from './model'

export type BoundaryMapInteraction = {
  editor?: ReactNode
  selectedId?: string | null
  edges: BoundaryEdge[]
  mode: BoundaryMapMode
  frontId: string | null
  rearId: string | null
  streetPattern: 'unknown' | 'single' | 'corner_or_multiple'
  onModeChange: (mode: BoundaryMapMode) => void
  onSelect: (id: string | null) => void
  onStreetPattern: (pattern: 'unknown' | 'single' | 'corner_or_multiple') => void
}

export function BoundaryOverlay({ interaction }: { interaction: BoundaryMapInteraction }) {
  if (interaction.mode === 'place') return null
  return <g className="boundary-map-overlay" aria-hidden="true">
    {interaction.edges.map((edge, index) => <g key={edge.id}>
      <line x1={edge.start[0]} y1={-edge.start[1]} x2={edge.end[0]} y2={-edge.end[1]}
        className={(interaction.mode === 'front' ? interaction.frontId === edge.id : interaction.selectedId === edge.id) ? 'boundary-map-edge boundary-map-edge--selected' : 'boundary-map-edge'} />
      <line x1={edge.start[0]} y1={-edge.start[1]} x2={edge.end[0]} y2={-edge.end[1]}
        className="boundary-map-edge-hit" onClick={event => { event.stopPropagation(); interaction.onSelect(edge.id) }} data-edge-id={edge.id} />
      <text transform={`translate(${(edge.start[0] + edge.end[0]) / 2} ${-(edge.start[1] + edge.end[1]) / 2})`} x="0" y="0"
        textAnchor="middle" dominantBaseline="middle" className="boundary-map-edge-label">{edge.ring ? `Inner ${edge.ring} · ${edge.segment + 1}` : index + 1}{edge.role.value && edge.role.value !== 'unknown' ? ` · ${edge.role.value === 'flanking_street' ? 'Flanking' : edge.role.value[0].toUpperCase() + edge.role.value.slice(1)}` : ''}</text>
    </g>)}
  </g>
}

export function BoundaryMapTools({ interaction }: { interaction: BoundaryMapInteraction }) {
  const { mode, frontId, edges, streetPattern, onSelect, onStreetPattern } = interaction
  const exterior = edges.filter(edge => edge.ring === 0)
  const supported = ordinaryFourEdgeBoundary(edges)
  return <div className="boundary-map-tools" aria-label="Boundary selection controls">
    {!supported && <p>This outline needs manual review. Marks record your assumptions; street-side suggestions cannot resolve its frontage.</p>}
    {supported && mode === 'front' && <>
      <p role="status">Boundary selection is on. Clicking an edge or its numbered button selects it; clicking elsewhere cannot move the model. Use <strong>Move unit</strong> to reposition it.</p>
      <div className="boundary-map-buttons">{exterior.map((edge, index) => <button type="button" key={edge.id}
        aria-pressed={frontId === edge.id} onClick={() => onSelect(edge.id)}>
        Edge {index + 1} faces street
      </button>)}
        <button type="button" onClick={() => onSelect(null)}>Not sure</button>
        <button type="button" aria-pressed={streetPattern === 'corner_or_multiple'} onClick={() => onStreetPattern('corner_or_multiple')}>Corner or multiple streets</button>
      </div>
      <label className="boundary-map-single"><input type="checkbox" checked={streetPattern === 'single'}
        onChange={event => onStreetPattern(event.target.checked ? 'single' : 'unknown')} /> I know this parcel has only one street-facing edge</label>
      {frontId && streetPattern === 'single' && <p>For this simple one-street sketch, the opposite edge suggests the rear and the other two suggest sides. Adjust boundaries to enter any roles you can support.</p>}
      {streetPattern !== 'single' && <p>Street-facing and rear clues alone do not settle legal frontage. Corner, multiple-street and unusual lot roles need review.</p>}
    </>}
    {interaction.editor}
  </div>
}

export function BoundaryActionTabs({ interaction }: { interaction: BoundaryMapInteraction }) {
  const actions = [['place', 'Move unit'], ['front', 'Mark street side'], ['rear', 'Adjust boundaries']] as const
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
