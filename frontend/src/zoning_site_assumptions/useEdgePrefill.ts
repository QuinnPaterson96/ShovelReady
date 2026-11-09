import { useEffect, useState } from 'react'
import { parcelCoverage, type MunicipalityContext } from '../municipality_coverage/model'
import type { Case } from '../occupied_lots/contract'
import type { Confirmed } from '../site_discovery/flow'
export type ParcelRef = { source: string; object_id: number }
export const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object'

export function sameParcel(value: Record<string, unknown>, ref: ParcelRef) {
  return object(value.parcel_ref) && value.parcel_ref.source === ref.source && value.parcel_ref.object_id === ref.object_id
}

export function sameGeometry(value: unknown, site: Case) {
  const geometry = site.site.parcel.shape.geometry
  return object(value) && geometry.type === 'Polygon' && value.type === geometry.type
    && JSON.stringify(value.coordinates) === JSON.stringify(geometry.coordinates)
}

export type PrefillInputs = [site: Case | null, revision: string | null, municipality: MunicipalityContext | null, property: Confirmed | null, example: boolean]

export function useEdgePrefill<R>(endpoint: string, read: (value: unknown, ref: ParcelRef, site: Case, revision: string) => R,
  unavailable: R, [site, revision, municipality, property, example]: PrefillInputs) {
  const candidate = (property?.parcel.raw as { candidate?: { parcel_ref?: ParcelRef; pid?: string } } | null)?.candidate
  const ref = example ? { source: 'city-of-victoria-pid-parcels', object_id: 10573 } : candidate?.parcel_ref
  const source = ref?.source, oid = ref?.object_id, pid = example ? undefined : candidate?.pid
  const eligible = !!ref && parcelCoverage(municipality)?.source === source
  const key = eligible && revision ? JSON.stringify([revision, source, oid, pid]) : null
  const [state, setState] = useState<{ key: string; result: R } | null>(null)
  useEffect(() => {
    if (!key || !source || !oid || !site || !revision) return
    let current = true
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), 20000)
    const load = async () => {
      try {
        const response = await fetch('/api/municipal-sites/' + endpoint, { method: 'POST',
          headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
          body: JSON.stringify({ schema_version: 'municipal-sites.v1', parcel_ref: { source, object_id: oid }, expected_pid: pid }) })
        const result = response.ok ? read(await response.json(), { source, object_id: oid }, site, revision) : unavailable
        if (current) setState({ key, result })
      } catch { if (current) setState({ key, result: unavailable }) }
      finally { window.clearTimeout(timer) }
    }
    void load()
    return () => { current = false; controller.abort(); window.clearTimeout(timer) }
  }, [key, source, oid, pid, site, revision, endpoint, read, unavailable])
  return key && state?.key === key ? state.result : null
}
