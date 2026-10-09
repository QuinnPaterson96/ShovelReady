import { points, type Building, type Result } from '../occupied_lots/contract'

// Separate projected extents along the centre-to-centre axis. This deliberately
// conservative translation also works for overlapping and concave roof outlines.
// It does not choose a feasible site position: every other gap must be rechecked.
export function buildingClearanceMove(building: Building, placement: Result['input']['placement'], minimum: number) {
  const outline = points(building)
  if (!outline.length || !Number.isFinite(minimum) || minimum <= 0) return null
  const bx = (Math.min(...outline.map(p => p[0])) + Math.max(...outline.map(p => p[0]))) / 2
  const by = (Math.min(...outline.map(p => p[1])) + Math.max(...outline.map(p => p[1]))) / 2
  const [cx, cy] = placement.centre_xy
  const length = Math.hypot(cx - bx, cy - by)
  if (length < 1e-8) return null // No supported direction when centres coincide.
  const ux = (cx - bx) / length, uy = (cy - by) / length
  const angle = placement.angle_degrees * Math.PI / 180
  const radius = Math.abs(ux * Math.cos(angle) + uy * Math.sin(angle)) * placement.width_m / 2
    + Math.abs(-ux * Math.sin(angle) + uy * Math.cos(angle)) * placement.depth_m / 2
  const gap = cx * ux + cy * uy - radius - Math.max(...outline.map(p => p[0] * ux + p[1] * uy))
  const distance = Math.ceil(Math.max(0, minimum - gap) * 100) / 100
  return distance > 0 ? { dx: ux * distance, dy: uy * distance, distance } : null
}
