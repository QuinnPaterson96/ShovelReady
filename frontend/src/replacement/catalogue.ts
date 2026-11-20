export type ReplacementPlan = {
  id: string
  name: string
  description: string
  provider: string
  sourceUrl: string
  capturedAt: string
  sourceRevision: string | null
  reviewStatus: 'unreviewed'
  widthFt: number
  depthFt: number
  widthM: number
  depthM: number
}

export const replacementFootprintNote = 'Each outline is a rectangle drawn from the published width and depth. Confirm the wall shape and the extent of decks, eaves and other projections with Pacific Homes.'

// Dimensions transcribed from the Specifications section of each manufacturer page.
const observations = [
  {
    id: 'concord', name: 'Concord',
    description: 'Narrow two-storey plan with three bedrooms.',
    sourceUrl: 'https://pacific-homes.com/inspirational-home/concord/',
    widthFt: 19, depthFt: 40,
  },
  {
    id: 'everest', name: 'Everest',
    description: 'Two-storey plan with four upstairs bedrooms and an attached garage.',
    sourceUrl: 'https://pacific-homes.com/inspirational-home/everest/',
    widthFt: 32, depthFt: 60,
  },
  {
    id: 'sedona', name: 'Sedona',
    description: 'Two bedrooms and a separate den on the main floor.',
    sourceUrl: 'https://pacific-homes.com/inspirational-home/sedona/',
    widthFt: 40, depthFt: 63,
  },
]

const metresPerFoot = 0.3048
export const replacementPlans: readonly ReplacementPlan[] = observations.map(plan => ({
  ...plan,
  provider: 'Pacific Homes',
  capturedAt: '2026-11-19',
  sourceRevision: null,
  reviewStatus: 'unreviewed',
  widthM: plan.widthFt * metresPerFoot,
  depthM: plan.depthFt * metresPerFoot,
}))
