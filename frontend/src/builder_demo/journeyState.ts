import type { SummaryCheck } from '../conditional_screening/HomeownerSummary'
import type { SiteAssumptions, StreetAdjacency } from '../zoning_site_assumptions/model'
import type { OccupiedMeasurement } from '../occupied_lots/OccupiedLots'
import type { ProjectSettings } from '../conditional_screening/projectSettings'

/** Acknowledgements belong to a finding's relevant inputs, never to the open tab.
 * Keep each dependency explicit: editing height must not erase a roof-overlap review.
 */
export function findingAcknowledgementKey(check: SummaryCheck, input: {
  geometryRevision: string | null; measurement: OccupiedMeasurement | null;
  assumptions: SiteAssumptions | null; streets: StreetAdjacency; settings: ProjectSettings;
  buffers: { area: number; height: number }; foundation: string | null;
  installedHeight: number | null; intendedUse: string; scan: unknown;
}): string {
  const a = input.assumptions, placement = input.measurement?.result.input.placement
  const roles = a?.edges.map(edge => [edge.id, edge.role])
  const boundary = [placement, roles, input.streets, a?.waterfront, a?.measurements.boundary, a?.planning_buffers_m]
  const main = [placement, a?.principal_building_id, a?.infer_principal_building, a?.measurements.principal_separation]
  const regulatory = [input.settings, input.intendedUse]
  let dependencies: unknown
  switch (check.label) {
    case 'Space within the property': dependencies = input.measurement?.result.input; break
    case 'Street edges': dependencies = input.streets; break
    case 'Distance to boundaries': case 'Front boundary distance': dependencies = [boundary, regulatory]; break
    case 'Located behind the main building': case 'Share of the rear yard': dependencies = [boundary, main, a?.building_type, regulatory]; break
    case 'Distance from the main building': dependencies = [main, regulatory]; break
    case 'Floor area': dependencies = [placement?.width_m, placement?.depth_m, a?.measurements.floor_area, input.buffers.area, regulatory]; break
    case 'Height': dependencies = [input.installedHeight, input.buffers.height, input.foundation, regulatory]; break
    case 'Existing garden suite': dependencies = [a?.existing_garden_suites, a?.building_type, regulatory]; break
    case 'Waterfront rules': dependencies = [a?.waterfront, a?.waterfront_edge_ids, regulatory]; break
    case 'Mapped records': case 'Mapped heritage and planning flags': dependencies = input.scan; break
    case 'Zoning coverage': dependencies = input.settings; break
    default: dependencies = regulatory; break
  }
  return JSON.stringify([input.geometryRevision, check.label, dependencies, check.status, check.detail, check.resolutions])
}
