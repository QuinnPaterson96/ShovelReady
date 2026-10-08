import { path, points, type Case } from '../occupied_lots/contract'

export function MainBuildingPreview({ site, selectedId, onSelect }: { site: Case; selectedId: string | null; onSelect: (id: string) => void }) {
  const all = [site.site.parcel, ...site.site.buildings].flatMap(points)
  if (!all.length) return null
  const xs = all.map(p => p[0]), ys = all.map(p => p[1])
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys)
  const extent = Math.max(maxX - minX, maxY - minY, 1), pad = extent * .08
  return <figure className="main-building-preview">
    <svg viewBox={`${minX - pad} ${-maxY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`} role="group" aria-label="Choose the main building from captured outlines">
      <path d={path(site.site.parcel)} fill="var(--map-parcel-fill)" stroke="var(--map-parcel-stroke)" fillRule="evenodd" vectorEffect="non-scaling-stroke" />
      {site.site.buildings.map((building, index) => {
        const coordinates = points(building)
        if (!coordinates.length) return null
        const x = coordinates.reduce((sum, point) => sum + point[0], 0) / coordinates.length
        const y = coordinates.reduce((sum, point) => sum + point[1], 0) / coordinates.length
        return <g key={building.id} role="button" tabIndex={0} aria-label={`Select outline ${index + 1} as main building`} aria-pressed={selectedId === building.id} onClick={() => onSelect(building.id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(building.id) } }}>
          <path d={path(building)} fill={selectedId === building.id ? 'var(--map-roof-stroke)' : 'var(--map-roof-fill)'} stroke="var(--map-roof-stroke)" strokeWidth={selectedId === building.id ? 4 : 2} fillRule="evenodd" vectorEffect="non-scaling-stroke" />
          <text x={x} y={-y} textAnchor="middle" fontSize={extent * .065} fill={selectedId === building.id ? 'var(--surface)' : 'var(--ink)'}>{index + 1}</text>
        </g>
      })}
    </svg>
    <figcaption>Click an outline or use the buttons below. North ↑ · approximate rooflines, not walls.</figcaption>
  </figure>
}
