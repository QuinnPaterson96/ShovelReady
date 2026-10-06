import savedCase from './example-site.json'
import { suggestPlacementOrientation } from '../placement_orientation'
import { bundledCatalogue } from '../model_catalogue/model'
import type { Case, Result } from '../occupied_lots/contract'
import { parseResult } from '../occupied_lots/contract'
import { overlapFinding } from '../occupied_lots/observations'

// Frozen from app/scouting_sites/data/sites.json, VIC-087. This is a saved
// observation, not an address match or a claim about a customer's property.
export const exampleCase = savedCase as Case
export const exampleSourcePage = (reference: string | null) => {
  if (!reference) return 'source link unavailable'
  const url = new URL(reference)
  return `${url.origin}${url.pathname}`
}
export const exampleOrientation = suggestPlacementOrientation(exampleCase.site)
export const examplePlacement = {
  x: 473689.18, y: 5362171.53, angle: exampleOrientation.status === 'suggested' ? exampleOrientation.angle_degrees : 90,
} as const

const model = bundledCatalogue.models.find(item => item.model_id === 'aux-300')
if (!model) throw new Error('Model 300 is unavailable')
const dimension = (name: string) => {
  const quantity = model.measurements.find(item => item.name === name)?.quantity
  if (quantity?.unit !== 'm') throw new Error(`Model 300 ${name} is unavailable in metres`)
  return Number(quantity.value)
}
export const exampleWidth = dimension('nominal_exterior_width')
export const exampleDepth = dimension('nominal_exterior_depth')

export type ExamplePosition = { x: string; y: string; width: string; depth: string; angle: string }
export type ExampleAssumptions = { parcel: string; roofline: string }
export const emptyExampleAssumptions = (): ExampleAssumptions => ({ parcel: '', roofline: '' })
const optionalMinimum = (value: string) => value.trim() === '' ? null : Number(value)
export function validExampleAssumptions(value: ExampleAssumptions) {
  return [value.parcel, value.roofline].every(text => {
    const minimum = optionalMinimum(text)
    return minimum === null || Number.isFinite(minimum) && minimum >= 0
  })
}
export const initialExamplePosition = (): ExamplePosition => ({
  x: String(examplePlacement.x), y: String(examplePlacement.y),
  width: String(exampleWidth), depth: String(exampleDepth), angle: String(examplePlacement.angle),
})

export function exampleRequest(position: ExamplePosition, assumptions: ExampleAssumptions = emptyExampleAssumptions()) {
  const values = [position.x, position.y, position.width, position.depth, position.angle].map(value => value.trim() === '' ? NaN : Number(value))
  const [x, y, width, depth, angle] = values
  if (!values.every(Number.isFinite) || width <= 0 || depth <= 0 || !validExampleAssumptions(assumptions)) return null
  return {
    schema_version: 'scouting-geometry.v1' as const,
    ...exampleCase.site,
    placement: { id: 'illustrative-example-placement', centre_xy: [x, y] as [number, number],
      width_m: width, depth_m: depth, angle_degrees: angle },
    requirements: [
      ...(optionalMinimum(assumptions.parcel) === null ? [] : [{ id: 'user-parcel-minimum', target: 'parcel_boundary', minimum_m: optionalMinimum(assumptions.parcel)!, status: 'user_assumption' }]),
      ...(optionalMinimum(assumptions.roofline) === null ? [] : [{ id: 'user-roofline-minimum', target: 'nearest_building', minimum_m: optionalMinimum(assumptions.roofline)!, status: 'user_assumption' }]),
    ],
  }
}

export function parseExampleResult(value: unknown, request: NonNullable<ReturnType<typeof exampleRequest>>): Result {
  const result = parseResult(value)
  const returnedRequirements = (result.input as typeof result.input & { requirements?: unknown }).requirements
  const sameRequirements = Array.isArray(returnedRequirements) && returnedRequirements.length === request.requirements.length &&
    request.requirements.every((requirement, index) => {
      const returned = returnedRequirements[index]
      return returned && typeof returned === 'object' &&
        ['id', 'target', 'minimum_m', 'status'].every(key => (returned as Record<string, unknown>)[key] === requirement[key as keyof typeof requirement])
    })
  if (result.input.parcel.id !== request.parcel.id ||
      result.input.projected_metre_crs !== request.projected_metre_crs ||
      JSON.stringify(result.input.parcel.shape) !== JSON.stringify(request.parcel.shape) ||
      JSON.stringify(result.input.placement.centre_xy) !== JSON.stringify(request.placement.centre_xy) ||
      result.input.placement.width_m !== request.placement.width_m ||
      result.input.placement.depth_m !== request.placement.depth_m ||
      result.input.placement.angle_degrees !== request.placement.angle_degrees ||
      !sameRequirements ||
      !request.requirements.every(requirement => result.checks.filter(check => check.id === `requirement:${requirement.id}` && check.kind === 'requirement').length === 1))
    throw new Error('Measurement returned a different example placement or parcel.')
  return result
}

// Conflict has priority over incomplete capture: an unresolved check must not hide an observed collision.
export function exampleObservation(result: Result) {
  const finding = overlapFinding(exampleCase, result)
  const comparisons = result.checks.filter(check => check.kind === 'requirement')
  const conflict = finding.conflicts.length > 0
  const unresolved = !finding.complete || comparisons.some(check => check.comparison === null)
  const shortfall = comparisons.some(check => check.comparison === 'shortfall')
  return { finding, comparisons, conflict, unresolved, shortfall,
    kind: conflict ? 'conflict' : unresolved ? 'unresolved' : shortfall ? 'shortfall' : 'clear' } as const
}
