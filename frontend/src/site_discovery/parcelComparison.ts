import type { Observation, Parcel, Polygon } from './flow'

type Candidate = { pid?: string | null; gislink?: string | null; parcel_ref?: { source?: string; object_id?: number }; attributes?: Record<string, unknown> }
export function parcelRecord(parcel: Parcel): Candidate {
  return (parcel.raw as { candidate?: Candidate } | null)?.candidate ?? {}
}

// Exact coordinates only: no positional tolerance can establish legal equivalence.
// Canonicalize ring starting vertex/winding, preserving shell/hole topology.
function ringKey(ring: number[][]): string {
  const points = ring.slice(0, -1)
  const minimum = points.map(point => JSON.stringify(point)).sort()[0]
  const rotations = [points, [...points].reverse()].flatMap(sequence => sequence.flatMap((point, i) =>
    JSON.stringify(point) === minimum ? [JSON.stringify([...sequence.slice(i), ...sequence.slice(0, i)])] : []))
  return rotations.sort()[0] ?? ''
}
export function geometryKey(geometry: Polygon): string {
  const parts = geometry.type === 'Polygon' ? [geometry.coordinates as number[][][]] : geometry.coordinates as number[][][][]
  return JSON.stringify(parts.map(part => [ringKey(part[0]), ...part.slice(1).map(ringKey).sort()]).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))))
}
export function parcelIdentityKey(parcel: Parcel): string | null {
  const record = parcelRecord(parcel)
  if (!record.parcel_ref?.source || !record.pid || !record.gislink || !record.attributes) return null
  const attributes = record.attributes
  // Different meaningful identifiers/types/statuses remain separate even for
  // identical outlines. Object and address-join IDs are preserved in raw evidence.
  const fields = ['VicPID', 'ParcelType', 'ParcelStatus']
  if (fields.some(field => typeof attributes[field] !== 'string' || !(attributes[field] as string).trim())) return null
  return JSON.stringify([record.parcel_ref.source, record.pid, record.gislink, ...fields.map(field => attributes[field])])
}

export function compareParcels(parcels: Parcel[]): Parcel[] {
  const result: Parcel[] = []
  const keys = new Map<string, number>()
  for (const parcel of parcels) {
    const identity = parcelIdentityKey(parcel)
    const key = parcel.inspection && identity ? `${identity}:${geometryKey(parcel.inspection.parcel.geometry)}` : null
    const existing = key ? keys.get(key) : undefined
    if (existing === undefined) {
      if (key) keys.set(key, result.length)
      result.push({ ...parcel })
    } else {
      const first = result[existing]
      const previous = (first.raw as { equivalentRecords?: unknown[] }).equivalentRecords ?? []
      first.raw = { ...(first.raw as object), equivalentRecords: [...previous, { candidateRecord: parcel.raw, observation: parcel.inspection?.raw }] }
    }
  }
  return result.map(parcel => {
    const alternatives = result.filter(other => other.id !== parcel.id && other.label === parcel.label)
    const different = alternatives.filter(other => {
      const a = parcelRecord(parcel), b = parcelRecord(other)
      const attributesConflict = ['VicPID', 'ParcelType', 'ParcelStatus'].some(field =>
        a.attributes?.[field] != null && b.attributes?.[field] != null && a.attributes[field] !== b.attributes[field])
      return (a.pid != null && b.pid != null && a.pid !== b.pid) ||
        (a.gislink != null && b.gislink != null && a.gislink !== b.gislink) || attributesConflict ||
        (other.inspection && parcel.inspection && geometryKey(other.inspection.parcel.geometry) !== geometryKey(parcel.inspection.parcel.geometry))
    })
    if (!different.length) return parcel
    const sharedRoof = parcel.inspection?.roofs.some(roof => different.some(other => other.inspection?.roofs.some(otherRoof =>
      geometryKey(otherRoof.geometry) === geometryKey(roof.geometry))))
    return { ...parcel, identityConcern: `This address links to ${different.length + 1} different mapped parcels. Check which parcel your project concerns.${sharedRoof ? ' A mapped roof spans more than one of these parcels; identify the relevant property boundary before relying on placement checks.' : ''}` }
  })
}

export function parcelDescription(parcel: Parcel): string {
  const record = parcelRecord(parcel)
  const attributes = record.attributes ?? {}
  const observedArea = parcel.inspection?.parcel.areaM2 ?? (typeof attributes.Shape_Area === 'number' ? attributes.Shape_Area : null)
  const area = observedArea !== null && Number.isFinite(observedArea) ? observedArea : null
  return [record.pid ? `PID ${record.pid}` : null, area === null ? null : `approx. ${Number(area.toFixed(1))} m²`,
    typeof attributes.ParcelStatus === 'string' ? attributes.ParcelStatus.toLowerCase() : null].filter(Boolean).join(' · ')
}

export function roofParcelDetails(observation: Observation): string[] {
  const raw = observation.raw as { rooflines?: { area_m2?: number; intersection_area_m2?: number }[] } | null
  return (raw?.rooflines ?? []).flatMap((roof, i) => {
    if (typeof roof.area_m2 !== 'number' || typeof roof.intersection_area_m2 !== 'number' ||
      !Number.isFinite(roof.area_m2) || !Number.isFinite(roof.intersection_area_m2) || roof.intersection_area_m2 < 0 || roof.area_m2 <= roof.intersection_area_m2) return []
    const outside = roof.area_m2 - roof.intersection_area_m2
    return [`Roof ${i + 1}: ${outside < .1 ? '< 0.1' : Number(outside.toFixed(1))} m² of its ${Number(roof.area_m2.toFixed(1))} m² mapped outline extends outside this parcel. Roof outlines include overhangs and may span neighbouring parcels; they do not establish wall positions or ownership.`]
  })
}
