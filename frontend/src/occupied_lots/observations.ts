import type { Case, Check, Result } from './contract'

export function overlapFinding(selected: Case, result: Result): { conflicts: Check[]; complete: boolean } {
  const containment = result.checks.filter(check => check.kind === 'containment' &&
    check.source_feature_ids.includes(selected.site.parcel.id))
  const overlaps = result.checks.filter(check => check.kind === 'building_overlap')
  const conflicts = [...containment, ...overlaps].filter(check => check.status === 'observed' &&
    (check.kind === 'containment' ? check.relation === 'outside' || check.relation === 'touches' :
      check.relation === 'positive_area_overlap' || check.relation === 'touches'))
  const complete = containment.length === 1 && containment[0].status === 'observed' &&
    ['contained', 'outside', 'touches'].includes(containment[0].relation ?? '') &&
    selected.site.buildings.every(building => {
      const rows = overlaps.filter(check => check.source_feature_ids.includes(building.id))
      return rows.length === 1 && rows[0].status === 'observed' &&
        ['separate', 'touches', 'positive_area_overlap'].includes(rows[0].relation ?? '')
    })
  return { conflicts, complete }
}
