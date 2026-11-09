import type { Result } from '../occupied_lots/contract'
import type { SummaryCheck } from './HomeownerSummary'

/** Physical observations have the same meaning before any local rules apply. */
export function geometryFinding(geometry: Result | null, complete: boolean): SummaryCheck {
  const conflict = geometry?.checks.some(check => check.relation === 'outside' || check.relation === 'touches' || check.relation === 'positive_area_overlap' || check.comparison === 'shortfall') ?? false
  const contained = geometry?.checks.some(check => check.kind === 'containment' && check.relation === 'contained') ?? false
  return conflict
    ? { label: 'Space within the property', status: 'conflict', detail: 'The current approximate placement has a parcel, roofline or chosen clearance conflict.', action: { label: 'Adjust placement', target: 'placement-map' } }
    : contained && complete ? { label: 'Space within the property', status: 'checked', detail: 'The footprint is inside the captured parcel and no overlap with captured rooflines was observed. Captured geometry is approximate.' }
      : { label: 'Space within the property', status: 'unknown', detail: geometry ? 'The parcel or roofline observation is incomplete.' : 'Place the model to check the captured parcel and rooflines.', action: { label: geometry ? 'Review placement' : 'Place model', target: 'placement-map' } }
}
