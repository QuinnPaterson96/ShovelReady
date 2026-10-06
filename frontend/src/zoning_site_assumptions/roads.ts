import { ordinaryFourEdgeBoundary, type BoundaryEdge } from './model'

/** Schematic bands only. Convex, closed four-edge outlines have a reliable exterior.
 * Local coordinates avoid cancellation in large projected coordinate frames. */
export function roadBands(edges: BoundaryEdge[], marked: string[]) {
  if (!ordinaryFourEdgeBoundary(edges)) return []
  const ordered = [...edges].sort((a, b) => a.segment - b.segment)
  const [ox, oy] = ordered[0].start
  const area = ordered.reduce((sum, edge) => sum + (edge.start[0] - ox) * (edge.end[1] - oy) - (edge.end[0] - ox) * (edge.start[1] - oy), 0)
  const direction = area > 0 ? 1 : -1
  const extent = Math.max(...edges.map(edge => Math.hypot(edge.end[0] - edge.start[0], edge.end[1] - edge.start[1])))
  const gap = extent * .025, width = extent * .05
  return ordered.filter(edge => marked.includes(edge.id)).map(edge => {
    const dx = edge.end[0] - edge.start[0], dy = edge.end[1] - edge.start[1], length = Math.hypot(dx, dy)
    const nx = direction * dy / length, ny = -direction * dx / length
    const trim = Math.min(length * .2, extent * .05)
    const point = (along: number, offset: number): [number, number] => [edge.start[0] + dx * along / length + nx * offset, edge.start[1] + dy * along / length + ny * offset]
    return { id: edge.id, corners: [point(trim, gap), point(length - trim, gap), point(length - trim, gap + width), point(trim, gap + width)],
      centre: [point(trim, gap + width / 2), point(length - trim, gap + width / 2)], label: point(length / 2, gap + width / 2) }
  })
}
