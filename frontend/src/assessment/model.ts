import direct from '../../../app/draft_evaluations/inputs/synthetic-direct-pass.json'
import missing from '../../../app/draft_evaluations/inputs/synthetic-missing-fact.json'
import failed from '../../../app/draft_evaluations/inputs/synthetic-placement-failure.json'
import type { StatusContent } from '../StatusBanner'
import { assessmentValues, emptySelection, fieldError } from '../model_catalogue/model'
import type { Selection } from '../model_catalogue/model'
import { emptySiteInput, type SiteInputDraft, type Lookup, type SitePreparationSelection } from '../site_preparations/types'

export const fields = {
  municipality: 'Municipality', use: 'Intended use', role: 'Building role',
  width: 'Nominal exterior width (m)', depth: 'Nominal exterior depth (m)',
  height: 'Roof height from foundation datum (m)', area: 'Manufacturer interior floor area (m²)',
} as const
export type Field = keyof typeof fields
export type Values = Record<Field, string>
export const emptyValues: Values = { municipality: '', use: '', role: '', width: '', depth: '', height: '', area: '' }
const requests = { 'synthetic-direct-pass': direct, 'synthetic-missing-fact': missing, 'synthetic-placement-failure': failed }
export type ExampleId = keyof typeof requests
export const exampleIds = Object.keys(requests) as ExampleId[]
export function example(id: ExampleId) {
  const request = requests[id]
  const measurement = (name: string, unit: string) => {
    const m = request.design.measurements.find(item => item.name === name)
    return m?.status === 'known' && m.quantity?.unit === unit ? m.quantity.value : ''
  }
  return { id, request, values: {
    municipality: request.scope.jurisdiction, use: request.design.intended_use, role: request.scope.building_role,
    width: measurement('nominal_exterior_width', 'm'), depth: measurement('nominal_exterior_depth', 'm'),
    height: measurement('roof_height', 'm'), area: measurement('manufacturer_interior_area', 'm2'),
  } }
}
export type Import = ReturnType<typeof example>
export function errorsFor(values: Values): Partial<Record<Field, string>> {
  const errors: Partial<Record<Field, string>> = {}
  for (const key of ['width', 'depth', 'height', 'area'] as const) {
    const text = values[key].trim()
    if (text && (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text) || !Number.isFinite(Number(text)) || Number(text) <= 0)) {
      errors[key] = 'Enter a finite decimal greater than zero, or leave blank for unknown.'
    }
  }
  return errors
}
export interface Draft {
  values: Values
  imported?: Import
  edited: Field[]
  dirty: boolean
  submitted: boolean
  errors: Partial<Record<Field, string>>
  pending?: ExampleId
  model: Selection
  site: SitePreparationSelection | null
  siteInput: SiteInputDraft
  siteAreaInvalid: boolean
}
export function submissionErrors(draft: Draft): Partial<Record<Field, string>> {
  const errors = errorsFor(draft.values)
  for (const key of ['width', 'depth', 'height', 'area'] as const) {
    const error = fieldError(draft.model.fields[key].value)
    if (error) errors[key] = error
  }
  if (draft.siteAreaInvalid) errors.area = 'Manual lot area must be positive in m², or blank.'
  return errors
}
export const initialDraft: Draft = { values: emptyValues, edited: [], dirty: false, submitted: false, errors: {}, model: emptySelection(), site: null, siteInput: emptySiteInput, siteAreaInvalid: false }
export type Action = { type: 'site-lookup'; value: Lookup | null } | { type: 'site-input'; value: SiteInputDraft; areaInvalid: boolean } | { type: 'edit'; field: Field; value: string } | { type: 'model'; value: Selection } |
  { type: 'site'; value: SitePreparationSelection | null; areaInvalid?: boolean } | { type: 'load'; id: ExampleId } | { type: 'confirm' } | { type: 'cancel' } | { type: 'submit' }
function importedDraft(id: ExampleId): Draft {
  const imported = example(id)
  const model = emptySelection()
  for (const key of ['width', 'depth', 'height', 'area'] as const) model.fields[key].value = imported.values[key]
  return { ...initialDraft, values: { ...imported.values }, model, imported }
}
export function draftReducer(state: Draft, action: Action): Draft {
  switch (action.type) {
    case 'edit': return { ...state, values: { ...state.values, [action.field]: action.value },
      edited: [...new Set([...state.edited, action.field])], dirty: true, submitted: false, errors: {}, pending: undefined }
    case 'model': return { ...state, model: action.value, values: { ...state.values, ...assessmentValues(action.value) },
      edited: [...new Set([...state.edited, 'width', 'depth', 'height', 'area'] as Field[])], dirty: true,
      submitted: false, errors: {}, pending: undefined }
    case 'site-lookup': return { ...state, siteInput: { ...state.siteInput, lookup: action.value } }
    case 'site-input': return { ...state, siteInput: action.value, site: null, siteAreaInvalid: action.areaInvalid, dirty: true, submitted: false, errors: {}, pending: undefined }
    case 'site': return { ...state, site: action.value, siteAreaInvalid: action.areaInvalid ?? false, dirty: true, submitted: false, errors: {}, pending: undefined }
    case 'load': return state.dirty ? { ...state, pending: action.id } : importedDraft(action.id)
    case 'confirm': return state.pending ? importedDraft(state.pending) : state
    case 'cancel': return { ...state, pending: undefined }
    case 'submit': {
      const errors = submissionErrors(state)
      return { ...state, errors, submitted: Object.keys(errors).length === 0 }
    }
  }
}
export function preparationStatus(draft: Draft): StatusContent {
  const { values, submitted, imported } = draft
  const unresolved = (Object.keys(fields) as Field[]).filter(key => !values[key].trim()).map(key => `${fields[key]} is unknown.`)
  for (const [key, error] of Object.entries(submissionErrors(draft))) unresolved.push(`${key === 'area' && draft.siteAreaInvalid ? 'Manual lot area' : fields[key as Field]} is invalid. ${error}`)
  const site = draft.site
  if (!site) unresolved.push('Parcel lead has not been confirmed; site identity is unknown.')
  else if (site.mode === 'manual_unmatched') unresolved.push('Manual site facts are unreviewed; parcel identity has not been matched to a retained source.')
  else {
    unresolved.push('Confirmed GIS parcel lead is unreviewed; legal lot, survey and zoning applicability remain unresolved.')
    if (site.manual.pid.value && site.manual.pid.value !== site.candidate?.pid.value) unresolved.push('Manual PID conflicts with the retained parcel PID; resolve identity before evaluation.')
    if (site.manual.lot_area_m2.value && site.manual.lot_area_m2.value !== site.candidate?.approximate_area_m2.value) unresolved.push('Manual lot area differs from approximate GIS area; verify both measurement bases.')
  }
  if (!draft.model.modelId) unresolved.push('Model identity and dimensions are manual or synthetic and unreviewed.')
  else unresolved.push('Provider model specification and Victoria installation service remain unreviewed.')
  if (draft.model.heightReference === 'unknown') unresolved.push('Building height reference is unknown; roof height cannot be mapped to a check.')
  unresolved.push(
    'Suite count check: legal lot and existing garden-suite count are unverified.',
    'Floor-area check: manufacturer interior area is not the bylaw Floor Area definition.',
    'Principal-building separation check: both building footprints and a proposed placement are missing.',
    'Rear-yard occupancy check: legal rear-yard geometry and proposed suite occupied area are missing.',
    'Supplied placement, principal-building geometry and site constraints are unknown.',
    'Current applicable rules are provisional and unaccepted; no real-site evaluation has run.',
  )
  const base = { coverage: 'Input preparation only. No regulatory checks, site screening or placement evaluation performed.', unresolved,
    nextAction: 'Obtain reviewed design, site, placement and applicable source evidence before evaluation.', synthetic: !!imported }
  if (!submitted) return { ...base, status: 'not_assessed', reason: 'This draft has not been prepared, or has changed since its last summary.' }
  const municipality = values.municipality.trim().toLowerCase()
  const synthetic = !!imported && municipality === 'synthetic'
  const outside = (municipality && !['victoria', 'city of victoria'].includes(municipality) && !synthetic) ||
    (values.use.trim() && values.use.trim().toLowerCase() !== 'garden suite') ||
    (values.role.trim() && !['accessory', 'accessory building'].includes(values.role.trim().toLowerCase()))
  if (outside) return { ...base, status: 'outside_coverage', reason: 'These inputs are outside the proposed City of Victoria garden-suite/accessory scope. This is not a zoning exclusion.' }
  return { ...base, status: 'needs_investigation', reason: 'Inputs have been summarized, but their evidence is incomplete or unreviewed. Form completion does not establish zoning fit.' }
}
