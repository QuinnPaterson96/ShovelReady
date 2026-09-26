import snapshot from '../../../app/model_catalogue/catalogue.json'

export type Field = 'width' | 'depth' | 'height' | 'area'
export type SourceMeasure = {
  name: string; status: 'known' | 'missing'; definition: string
  quantity: null | { original_text: string; original_value: string; original_unit: string; dimension: string; value: string; unit: string; basis: null }
  source_id: string | null; reason: string | null
}
export type CatalogueModel = {
  model_id: string; provider: string; name: string; provider_url: string; source_revision: string | null
  configuration: string; construction_method: string; intended_use_note: string
  service_area_status: 'unknown' | 'provider_claim' | 'excluded_by_provider'
  service_area_note: string; installation_note: string; footprint_note: string; height_note: string
  missing_facts: string[]; review_status: 'unreviewed'
  sources: Array<{ source_id: string; url: string; locator: string; captured_at: string; sha256: string | null; artifact_status: string; upstream_revision: string | null }>
  measurements: SourceMeasure[]
}
export type Catalogue = { schema_version: 'sr-40.catalogue.v1'; snapshot_id: string; captured_at: string; review_status: 'unreviewed'; models: CatalogueModel[] }
export const bundledCatalogue = snapshot as Catalogue

export type InputField = { value: string; origin: 'source' | 'user'; baseline: SourceMeasure | null }
export type Selection = {
  modelId: string | null; modelRevision: string | null; snapshotId: string | null
  provider: string; modelName: string; fields: Record<Field, InputField>
  heightReference: 'unknown' | 'foundation_datum_to_roof_high_point'
  changeSequence: number; reviewStatus: 'unreviewed'
}
const blank = (): InputField => ({ value: '', origin: 'user', baseline: null })
export const emptySelection = (): Selection => ({ modelId: null, modelRevision: null, snapshotId: null,
  provider: '', modelName: '', fields: { width: blank(), depth: blank(), height: blank(), area: blank() },
  heightReference: 'unknown', changeSequence: 0, reviewStatus: 'unreviewed' })

const measureNames: Record<Field, string> = { width: 'nominal_exterior_width', depth: 'nominal_exterior_depth',
  height: 'roof_height', area: 'manufacturer_interior_area' }
const units: Record<Field, string> = { width: 'm', depth: 'm', height: 'm', area: 'm2' }
function fieldFrom(model: CatalogueModel, field: Field): InputField {
  const baseline = model.measurements.find(item => item.name === measureNames[field]) ?? null
  const quantity = baseline?.status === 'known' ? baseline.quantity : null
  // A provider's overall exterior or ceiling height has a different reference.
  const compatible = quantity?.unit === units[field] && quantity.dimension === (field === 'area' ? 'area' : 'length')
  // Keep the exact Decimal serialization in baseline; show a usable decimal for mixed ft/in sources.
  return { value: compatible ? String(Number(quantity.value)) : '', origin: compatible ? 'source' : 'user', baseline }
}
export function selectModel(previous: Selection, catalogue: Catalogue | null, modelId: string | null): Selection {
  const model = catalogue?.models.find(item => item.model_id === modelId)
  if (!model) return { ...emptySelection(), changeSequence: previous.changeSequence + 1 }
  return { modelId: model.model_id, modelRevision: model.source_revision, snapshotId: catalogue!.snapshot_id,
    provider: model.provider, modelName: model.name,
    fields: { width: fieldFrom(model, 'width'), depth: fieldFrom(model, 'depth'),
      height: fieldFrom(model, 'height'), area: fieldFrom(model, 'area') },
    heightReference: model.measurements.find(item => item.name === 'roof_height')?.status === 'known'
      ? 'foundation_datum_to_roof_high_point' : 'unknown',
    changeSequence: previous.changeSequence + 1, reviewStatus: 'unreviewed' }
}
export function editField(previous: Selection, field: Field, value: string): Selection {
  return { ...previous, fields: { ...previous.fields, [field]: { ...previous.fields[field], value, origin: 'user' } },
    changeSequence: previous.changeSequence + 1, reviewStatus: 'unreviewed' }
}
export function editHeightReference(previous: Selection, reference: Selection['heightReference']): Selection {
  return { ...previous, heightReference: reference, changeSequence: previous.changeSequence + 1,
    reviewStatus: 'unreviewed' }
}
export function editIdentity(previous: Selection, field: 'provider' | 'modelName', value: string): Selection {
  return { ...previous, [field]: value, changeSequence: previous.changeSequence + 1, reviewStatus: 'unreviewed' }
}
export function fieldError(value: string): string | null {
  const trimmed = value.trim()
  return trimmed && (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(trimmed) || !Number.isFinite(Number(trimmed)) || Number(trimmed) <= 0)
    ? 'Use a positive decimal, or leave blank for unknown.' : null
}
export function assessmentValues(selection: Selection) {
  const usable = (field: Field) => fieldError(selection.fields[field].value) ? '' : selection.fields[field].value.trim()
  return { width: usable('width'), depth: usable('depth'), area: usable('area'),
    height: selection.heightReference === 'foundation_datum_to_roof_high_point' ? usable('height') : '' }
}
