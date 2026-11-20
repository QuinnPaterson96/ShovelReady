import { useEffect, useState } from 'react'
import { publicSourceUrl, readableDate } from '../ReadableProvenance'
import { measurementWithUnit } from '../measurements'
import type { Confirmed } from '../site_discovery/flow'
import { placementCase } from '../site_discovery/placement'
import { municipalProfile } from './model'

export type Opportunity = { evidence: unknown; detail: string; sourceLabel: string; sourceUrl: string | null }
const profile = municipalProfile('ca-bc-saanich')
const areaDefinition = profile?.inputs.find(field => field.id === 'lot_area')?.definition

export function usePropertyOpportunity(selected: Confirmed | null): Opportunity | null {
  const [result, setResult] = useState<{ property: Confirmed; opportunity: Opportunity } | null>(null)
  useEffect(() => {
    setResult(null)
    if (!selected || !profile || !areaDefinition) return
    const raw = selected.parcel.raw as { candidate?: { parcel_ref?: { source: string; object_id: number } } } | null
    const parcelRef = raw?.candidate?.parcel_ref
    if (parcelRef?.source !== profile.parcel_source || selected.observation.parcel.geometry.type !== 'Polygon') return
    const parcel = placementCase(selected).site.parcel
    const controller = new AbortController()
    const load = async () => {
      const response = await fetch('/api/municipal-rules/v1/property-opportunity', {
        method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schema_version: 'municipal-property-opportunity.request.v1', parcel_ref: parcelRef, parcel }),
      })
      if (!response.ok) return
      const value = await response.json()
      if (controller.signal.aborted || value?.schema_version !== 'municipal-property-opportunity.result.v1'
        || value.jurisdiction_id !== profile.jurisdiction_id || value.pathway_id !== profile.pathway_id
        || value.parcel_ref?.source !== parcelRef.source || value.parcel_ref?.object_id !== parcelRef.object_id
        || value.parcel?.id !== parcel.id || value.definition?.id !== areaDefinition.id
        || !['meets_under_assumptions', 'apparent_conflict_under_assumptions'].includes(value.status)) return
      const observed = measurementWithUnit(value.derived_area_m2, 'area')
      const minimum = measurementWithUnit(value.minimum_m2, 'area')
      const source = value.definition.source
      if (observed === 'unknown' || minimum === 'unknown' || !source || typeof source.locator !== 'string') return
      const meets = value.status === 'meets_under_assumptions'
      const roundedToMinimum = observed === minimum && Number(value.derived_area_m2) !== Number(value.minimum_m2)
      const close = roundedToMinimum ? ` (unrounded ${value.derived_area_m2} m²)` : ''
      setResult({ property: selected, opportunity: {
        evidence: value,
        detail: `This lot ${meets ? 'meets' : 'falls below'} the ${minimum} garden-suite lot-area minimum${close}. The zone still needs checking.`,
        sourceLabel: `District of Saanich · ${source.locator} · captured ${readableDate(source.capture_date)} · unreviewed`,
        sourceUrl: publicSourceUrl(source.url),
      } })
    }
    void load().catch(() => { /* The property summary remains available without the area finding. */ })
    return () => controller.abort()
  }, [selected])
  return result?.property === selected ? result.opportunity : null
}
