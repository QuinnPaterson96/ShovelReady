import type { PlacementSuggestion } from '../placement_suggestion/usePlacementSuggestion'
import type { BudgetDraft } from '../project_budget/contract'
import type { ProjectSettings } from '../conditional_screening/projectSettings'
import type { SiteAssumptions } from '../zoning_site_assumptions/model'

/** Authored inputs only. Results must be evaluated again after restoration. */
export type RetainedPlacementDraft = {
  /** Evidence for the origin of these coordinates; current checks are recomputed. */
  startingSuggestion?: PlacementSuggestion | null
  position: { x: string; y: string; width: string; depth: string; angle: string }
  widthOrigin: 'catalogue' | 'user'
  depthOrigin: 'catalogue' | 'user'
  minima: { parcel: string; building: string }
}

export type AlternativeDraft = {
  configuration: string
  foundationAllowanceM: string | null
  estimateBuffers: { area: number; height: number }
  installedHeight: number | null
  settings: ProjectSettings
  measurements: SiteAssumptions['measurements'] | null
  budgetDraft: BudgetDraft
  placement: RetainedPlacementDraft | null
}
