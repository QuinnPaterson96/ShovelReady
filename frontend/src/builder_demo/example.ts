import savedCase from './example-site.json'
import { bundledCatalogue } from '../model_catalogue/model'
import type { Case, Result } from '../occupied_lots/contract'
import { parseResult } from '../occupied_lots/contract'

// Frozen from app/scouting_sites/data/sites.json, VIC-087. This is a saved
// observation, not an address match or a claim about a customer's property.
export const exampleCase = savedCase as Case
export const exampleSourcePage = (reference: string | null) => {
  if (!reference) return 'source link unavailable'
  const url = new URL(reference)
  return `${url.origin}${url.pathname}`
}
export const examplePlacement = {
  x: 473689.18, y: 5362171.53, angle: 90,
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
export const initialExamplePosition = (): ExamplePosition => ({
  x: String(examplePlacement.x), y: String(examplePlacement.y),
  width: String(exampleWidth), depth: String(exampleDepth), angle: String(examplePlacement.angle),
})

export function exampleRequest(position: ExamplePosition) {
  const values = [position.x, position.y, position.width, position.depth, position.angle].map(value => value.trim() === '' ? NaN : Number(value))
  const [x, y, width, depth, angle] = values
  if (!values.every(Number.isFinite) || width <= 0 || depth <= 0) return null
  return {
    schema_version: 'scouting-geometry.v1' as const,
    ...exampleCase.site,
    placement: { id: 'illustrative-example-placement', centre_xy: [x, y] as [number, number],
      width_m: width, depth_m: depth, angle_degrees: angle },
    requirements: [],
  }
}

export function parseExampleResult(value: unknown, request: NonNullable<ReturnType<typeof exampleRequest>>): Result {
  const result = parseResult(value)
  if (result.input.parcel.id !== request.parcel.id ||
      result.input.projected_metre_crs !== request.projected_metre_crs ||
      JSON.stringify(result.input.parcel.shape) !== JSON.stringify(request.parcel.shape) ||
      JSON.stringify(result.input.placement.centre_xy) !== JSON.stringify(request.placement.centre_xy) ||
      result.input.placement.width_m !== request.placement.width_m ||
      result.input.placement.depth_m !== request.placement.depth_m ||
      result.input.placement.angle_degrees !== request.placement.angle_degrees)
    throw new Error('Measurement returned a different example placement or parcel.')
  return result
}
