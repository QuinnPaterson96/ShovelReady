import { ordinaryFourEdgeBoundary, type BoundaryEdge, type BoundaryMapMode } from './model'

export type BoundaryMapInteraction = {
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
  if (interaction.mode === 'place' || !ordinaryFourEdgeBoundary(interaction.edges)) return null
  return <g className="boundary-map-overlay" aria-hidden="true">
    {interaction.edges.filter(edge => edge.ring === 0).map((edge, index) => <g key={edge.id}>
      <line x1={edge.start[0]} y1={-edge.start[1]} x2={edge.end[0]} y2={-edge.end[1]}
        className={interaction.frontId === edge.id || interaction.rearId === edge.id ? 'boundary-map-edge boundary-map-edge--selected' : 'boundary-map-edge'} />
      <line x1={edge.start[0]} y1={-edge.start[1]} x2={edge.end[0]} y2={-edge.end[1]}
        className="boundary-map-edge-hit" onClick={event => { event.stopPropagation(); interaction.onSelect(edge.id) }} />
      <text x={(edge.start[0] + edge.end[0]) / 2} y={-(edge.start[1] + edge.end[1]) / 2}
        className="boundary-map-edge-label">{index + 1}</text>
    </g>)}
  </g>
}

export function BoundaryMapTools({ interaction }: { interaction: BoundaryMapInteraction }) {
  const { mode, frontId, rearId, edges, streetPattern, onModeChange, onSelect, onStreetPattern } = interaction
  const exterior = edges.filter(edge => edge.ring === 0)
  const supported = ordinaryFourEdgeBoundary(edges)
  return <div className="boundary-map-tools" aria-label="Boundary selection controls">
    {!supported && <p>Boundary roles for this irregular or incomplete parcel remain unknown. Review a legal plan; this map cannot resolve frontage.</p>}
    <div className="boundary-map-modes">
      <button type="button" aria-pressed={mode === 'place'} onClick={() => onModeChange('place')}>Move model</button>
      {supported && <><button type="button" aria-pressed={mode === 'front'} onClick={() => onModeChange('front')}>Choose street-facing edge</button>
      <button type="button" aria-pressed={mode === 'rear'} onClick={() => onModeChange('rear')}>Choose rear edge</button></>}
    </div>
    {supported && mode !== 'place' && <>
      <p role="status">Boundary selection is on. Clicking an edge or its numbered button selects it; clicking elsewhere cannot move the model. Use <strong>Move model</strong> to reposition it.</p>
      <div className="boundary-map-buttons">{exterior.map((edge, index) => <button type="button" key={edge.id}
        aria-pressed={(mode === 'front' ? frontId : rearId) === edge.id} onClick={() => onSelect(edge.id)}>
        Edge {index + 1}{mode === 'front' ? ' faces street' : ' is rear'}
      </button>)}
        <button type="button" onClick={() => onSelect(null)}>Not sure</button>
        <button type="button" aria-pressed={streetPattern === 'corner_or_multiple'} onClick={() => onStreetPattern('corner_or_multiple')}>Corner or multiple streets</button>
      </div>
      <label className="boundary-map-single"><input type="checkbox" checked={streetPattern === 'single'}
        onChange={event => onStreetPattern(event.target.checked ? 'single' : 'unknown')} /> I know this parcel has only one street-facing edge</label>
      {streetPattern !== 'single' && <p>Street-facing and rear clues alone do not settle legal frontage. Corner, multiple-street and unusual lot roles need review.</p>}
    </>}
  </div>
}
