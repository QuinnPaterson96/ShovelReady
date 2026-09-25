import direct from '../../../app/draft_evaluations/inputs/synthetic-direct-pass.json'
import missing from '../../../app/draft_evaluations/inputs/synthetic-missing-fact.json'
import failed from '../../../app/draft_evaluations/inputs/synthetic-placement-failure.json'
import type { StatusContent } from '../StatusBanner'

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
}
export const initialDraft: Draft = { values: emptyValues, edited: [], dirty: false, submitted: false, errors: {} }
export type Action = { type: 'edit'; field: Field; value: string } | { type: 'load'; id: ExampleId } | { type: 'confirm' } | { type: 'cancel' } | { type: 'submit' }
function importedDraft(id: ExampleId): Draft {
  const imported = example(id)
  return { ...initialDraft, values: { ...imported.values }, imported }
}
export function draftReducer(state: Draft, action: Action): Draft {
  switch (action.type) {
    case 'edit': return { ...state, values: { ...state.values, [action.field]: action.value },
      edited: [...new Set([...state.edited, action.field])], dirty: true, submitted: false, errors: {}, pending: undefined }
    case 'load': return state.dirty ? { ...state, pending: action.id } : importedDraft(action.id)
    case 'confirm': return state.pending ? importedDraft(state.pending) : state
    case 'cancel': return { ...state, pending: undefined }
    case 'submit': {
      const errors = errorsFor(state.values)
      return { ...state, errors, submitted: Object.keys(errors).length === 0 }
    }
  }
}
export function preparationStatus(draft: Draft): StatusContent {
  const { values, submitted, imported } = draft
  const unresolved = (Object.keys(fields) as Field[]).filter(key => !values[key].trim()).map(key => `${fields[key]} is unknown.`)
  for (const [key, error] of Object.entries(errorsFor(values))) unresolved.push(`${fields[key as Field]} is invalid. ${error}`)
  unresolved.push('Site and supplied placement facts are unknown.', 'Current applicable rules, source review and accepted publication are missing.')
  const base = { coverage: 'Input preparation only. No regulatory checks, site screening or placement evaluation performed.', unresolved,
    nextAction: 'Obtain reviewed design, site, placement and applicable source evidence before evaluation.', synthetic: !!imported }
  if (!submitted) return { ...base, status: 'not_assessed', reason: 'This draft has not been prepared, or has changed since its last summary.' }
  const municipality = values.municipality.trim().toLowerCase()
  const synthetic = !!imported && municipality === 'synthetic'
  const outside = (municipality && !['victoria', 'city of victoria'].includes(municipality) && !synthetic) ||
    (values.use.trim() && values.use.trim().toLowerCase() !== 'garden suite') ||
    (values.role.trim() && values.role.trim().toLowerCase() !== 'accessory')
  if (outside) return { ...base, status: 'outside_coverage', reason: 'These inputs are outside the proposed City of Victoria garden-suite/accessory scope. This is not a zoning exclusion.' }
  return { ...base, status: 'needs_investigation', reason: 'Inputs have been summarized, but their evidence is incomplete or unreviewed. Form completion does not establish zoning fit.' }
}
