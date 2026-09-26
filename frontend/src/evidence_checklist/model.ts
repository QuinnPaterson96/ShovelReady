import type { Draft } from '../assessment/model'
import { bundledCatalogue } from '../model_catalogue/model'
import type { Fact } from '../site_preparations/types'
import packet from '../../../docs/rule-packets/victoria-garden-suite/packet.json'

export type EvidenceReference = {
  origin: 'source' | 'derived' | 'user' | 'synthetic'
  description: string
  value: string | null
  unit: string | null
  basis: string | null
  source_id: string | null
  url: string | null
  locator: string | null
  snapshot_id: string | null
  revision_id: string | null
  captured_at: string | null
  review_status: 'unreviewed' | 'synthetic'
}
export type ChecklistItem = {
  id: string
  title: string
  state: 'missing' | 'conflicting' | 'provisional' | 'unreviewed'
  available_evidence: EvidenceReference[]
  missing_input: string
  impact: string
  suggested_supplier: string
  next_action: string
}
export type EvidenceChecklist = {
  schema_version: 'sr-50.evidence-checklist.v1'
  screening_status: 'not_performed'
  scope: { municipality: string | null; use: string | null; role: string | null; site_mode: string | null; model_id: string | null; synthetic: boolean }
  items: ChecklistItem[]
}

const stringValue = (value: string | number | null) => value === null ? null : String(value)
function factEvidence(description: string, fact: Fact, revision: string | null): EvidenceReference | null {
  if (fact.value === null || String(fact.value).trim() === '') return null
  return { origin: fact.evidence.origin, description, value: stringValue(fact.value), unit: fact.unit,
    basis: fact.basis, source_id: null, url: fact.evidence.source_url, locator: fact.evidence.feature_index === null ? null : `feature ${fact.evidence.feature_index}`,
    snapshot_id: fact.evidence.snapshot_id, revision_id: revision, captured_at: fact.evidence.captured_at, review_status: 'unreviewed' }
}
const present = (...entries: Array<EvidenceReference | null | undefined | false>) => entries.filter((entry): entry is EvidenceReference => Boolean(entry))
const manual = (description: string, value: string): EvidenceReference | null => value.trim() ? {
  origin: 'user', description, value: value.trim(), unit: null, basis: null, source_id: null, url: null,
  locator: null, snapshot_id: null, revision_id: null, captured_at: null, review_status: 'unreviewed',
} : null

export function buildEvidenceChecklist(draft: Draft): EvidenceChecklist {
  const site = draft.site
  const candidate = site?.candidate
  const revision = site?.spatial_revision ?? null
  const model = bundledCatalogue.models.find(item => item.model_id === draft.model.modelId)
  const synthetic = Boolean(draft.imported)
  const items: ChecklistItem[] = []
  const add = (item: ChecklistItem) => items.push(item)
  const selectedFacts = site?.manual
  const pidConflict = Boolean(candidate && selectedFacts?.pid.value && String(selectedFacts.pid.value) !== String(candidate.pid.value))
  const areaConflict = Boolean(candidate && selectedFacts?.lot_area_m2.value && String(selectedFacts.lot_area_m2.value) !== String(candidate.approximate_area_m2.value))

  add({ id: 'site-identity', title: 'Legal site identity', state: pidConflict ? 'conflicting' : site ? 'unreviewed' : 'missing',
    available_evidence: present(candidate && factEvidence('Retained parcel PID', candidate.pid, revision), candidate && factEvidence('Captured address', candidate.address, revision),
      selectedFacts && factEvidence('Manual PID', selectedFacts.pid, null), selectedFacts && factEvidence('Manual address', selectedFacts.address, null),
      !site && manual('Unconfirmed address entry', draft.siteInput.address), !site && manual('Unconfirmed PID entry', draft.siteInput.pid)),
    missing_input: pidConflict ? 'Resolve manual PID against retained parcel PID and confirm the legal lot.' : 'Confirm legal lot, title/PID and whether the retained GIS lead identifies it.',
    impact: 'A captured parcel lead or typed address does not establish the legal site for applicable rules.', suggested_supplier: 'Owner or land surveyor',
    next_action: 'Obtain title/legal parcel evidence and reconcile it with the retained lead.' })
  add({ id: 'site-geometry-placement', title: 'Survey, existing buildings and placement', state: areaConflict ? 'conflicting' : 'missing',
    available_evidence: present(candidate && factEvidence('Approximate GIS parcel area', candidate.approximate_area_m2, revision),
      selectedFacts && factEvidence('Manual lot area', selectedFacts.lot_area_m2, null), !site && manual('Unconfirmed lot area entry', draft.siteInput.area)),
    missing_input: areaConflict ? 'Reconcile manual lot area and approximate GIS area; obtain surveyed legal rear yard and existing building geometry with a proposed suite placement.' :
      'Surveyed legal boundaries, front/rear lines, existing buildings, constraints and a proposed suite placement.',
    impact: 'Approximate parcel area cannot establish rear-yard area, occupied area, separation or available placement.',
    suggested_supplier: 'Owner, land surveyor and site designer', next_action: 'Supply a current survey and placement drawing with measurement bases.' })

  const modelRefs = model?.sources ?? []
  const modelEvidence = (description: string, sourceId: string | null, value: string | null, unit: string | null, basis: string | null): EvidenceReference => {
    const source = modelRefs.find(item => item.source_id === sourceId)
    return { origin: 'source', description: `${description} [${source?.artifact_status ?? 'source status unknown'}]`, value, unit, basis, source_id: sourceId, url: source?.url ?? model?.provider_url ?? null,
      locator: source?.locator ?? null, snapshot_id: draft.model.snapshotId, revision_id: draft.model.modelRevision,
      captured_at: source?.captured_at ?? null, review_status: 'unreviewed' }
  }
  const fieldEvidence = (key: 'width' | 'depth' | 'height' | 'area'): EvidenceReference[] => {
    const field = draft.model.fields[key]
    const result: EvidenceReference[] = []
    if (field.baseline?.status === 'known' && field.baseline.quantity) result.push(modelEvidence(
      `${key} provider baseline: ${field.baseline.definition}; original ${field.baseline.quantity.original_text}`,
      field.baseline.source_id, field.baseline.quantity.value, field.baseline.quantity.unit, field.baseline.quantity.basis))
    if (field.value.trim() && field.origin === 'user') result.push(synthetic && !draft.edited.includes(key) ? {
      origin: 'synthetic', description: `${key} imported example`, value: field.value.trim(), unit: key === 'area' ? 'm2' : 'm', basis: null,
      source_id: null, url: null, locator: null, snapshot_id: draft.imported?.request.sources[0]?.snapshot_id ?? null,
      revision_id: null, captured_at: null, review_status: 'synthetic',
    } : { ...manual(`${key} user entry`, field.value)!, unit: key === 'area' ? 'm2' : 'm' })
    if (!field.baseline && !field.value.trim() && draft.values[key].trim()) result.push({ ...manual(`${key} manual entry`, draft.values[key])!, unit: key === 'area' ? 'm2' : 'm' })
    return result
  }
  add({ id: 'model-revision-footprint', title: 'Controlled model and occupied footprint', state: model || draft.model.fields.width.value || draft.model.fields.depth.value ? 'unreviewed' : 'missing',
    available_evidence: [...fieldEvidence('width'), ...fieldEvidence('depth'), ...present((!model || draft.model.provider !== model.provider) && manual('Entered provider name (unreviewed)', draft.model.provider), (!model || draft.model.modelName !== model.name) && manual('Entered model name (unreviewed)', draft.model.modelName))],
    missing_input: 'Controlled configuration/revision and dimensioned wall faces, projections and installed occupied footprint.',
    impact: 'Nominal product dimensions cannot define placement or rear-yard occupancy.', suggested_supplier: 'Model provider and site designer',
    next_action: 'Request a controlled model drawing and site-specific footprint.' })
  add({ id: 'model-roof-datum', title: 'Installed roof height and datum', state: 'missing',
    available_evidence: [...fieldEvidence('height'), ...(model ? [modelEvidence(model.height_note, model.sources[0]?.source_id ?? null, null, null, null)] : [])],
    missing_input: draft.model.heightReference === 'unknown' ? 'Installed roof high point and its grade/foundation datum; current height reference is unknown.' :
      'Verify the asserted foundation-to-roof-high-point datum against controlled installed drawings and site grade.',
    impact: 'Interior ceiling or unspecified exterior height cannot be treated as regulatory building height.', suggested_supplier: 'Model provider and site designer',
    next_action: 'Obtain a section/elevation identifying roof point and datum.' })
  add({ id: 'model-regulatory-area', title: 'Regulatory Floor Area', state: 'missing',
    available_evidence: fieldEvidence('area'), missing_input: 'Controlled Floor Area calculation using independently reviewed bylaw inclusions and exclusions.',
    impact: 'Provider interior or headline area has a different basis from the provisional Floor Area clause.',
    suggested_supplier: 'Model provider, designer and rule reviewer', next_action: 'Reconcile dimensioned plans to the reviewed Floor Area definition.' })
  add({ id: 'model-service', title: 'Victoria delivery and installation service', state: model?.service_area_status === 'excluded_by_provider' ? 'conflicting' : model ? 'unreviewed' : 'missing',
    available_evidence: model ? [modelEvidence(`Provider service statement (${model.service_area_status}): ${model.service_area_note}`, model.service_area_status === 'excluded_by_provider' ? model.sources[model.sources.length - 1]?.source_id ?? null : model.sources[0]?.source_id ?? null, null, null, null)] : [],
    missing_input: model?.service_area_status === 'excluded_by_provider' ? 'Provider confirmation of any Victoria exception or an alternative supplier; captured service statement excludes Victoria from near-term area.' :
      'Written Victoria project delivery, installation scope and site-specific availability confirmation.',
    impact: 'Product dimensions alone do not establish project availability or installed specification.', suggested_supplier: 'Model provider',
    next_action: 'Ask provider to confirm Victoria service and the installed scope.' })

  const victoriaScope = ['victoria', 'city of victoria'].includes(draft.values.municipality.trim().toLowerCase()) &&
    draft.values.use.trim().toLowerCase() === 'garden suite' && ['accessory', 'accessory building'].includes(draft.values.role.trim().toLowerCase())
  const ruleRefs = packet.candidates.map(rule => ({ rule, evidence: {
    origin: 'source' as const, description: `${packet.source.instrument}; provisional ${rule.content.semantics.subject}: ${rule.content.semantics.threshold.original_text} (${rule.content.semantics.measurement_definition}); printed revision: ${packet.source.printed_revision}`,
    value: rule.content.semantics.threshold.value, unit: rule.content.semantics.threshold.unit,
    basis: 'basis' in rule.content.semantics.threshold ? JSON.stringify(rule.content.semantics.threshold.basis) : rule.content.semantics.measurement_definition,
    source_id: packet.source.source_id, url: packet.source.source_url, locator: rule.locator,
    snapshot_id: packet.source.snapshot_id, revision_id: `${rule.logical_rule_id}@${rule.proposed_revision_id}`,
    captured_at: packet.source.captured_at, review_status: 'unreviewed' as const,
  } }))
  add({ id: 'rule-currentness-applicability', title: victoriaScope ? 'Current applicable Victoria rules' : 'Confirm scope before rule investigation', state: 'provisional',
    available_evidence: victoriaScope ? ruleRefs.map(item => item.evidence) : [],
    missing_input: `${victoriaScope ? '' : 'Selected scope is outside or incomplete for this Victoria packet; no applicability is inferred. '}Independently reviewed current consolidation, adoption/effective-date chain, legal site designation, definitions and site-specific provisions.`,
    impact: 'The captured four clauses are provisional candidates; current applicability and other requirements are unresolved.',
    suggested_supplier: 'Municipal source custodian and independent rule reviewer',
    next_action: 'Obtain the current authoritative instrument and review its applicability to the confirmed legal lot.' })
  const ruleNeeds: Record<string, [string, string, string]> = {
    garden_suite_count_on_lot: ['Verified existing garden-suite count on the legal lot.', 'Suite count cannot be assessed.', 'Owner and municipal records reviewer'],
    garden_suite_floor_area: ['Reviewed regulatory Floor Area calculation for the selected configuration.', 'Marketing interior area cannot be compared to this candidate threshold.', 'Designer and rule reviewer'],
    garden_suite_principal_building_separation: ['Surveyed principal-building faces and proposed suite placement with measurement method.', 'Separation cannot be measured.', 'Land surveyor and site designer'],
    garden_suite_rear_yard_occupancy: ['Legal rear-yard polygon and proposed occupied suite area including relevant projections.', 'Parcel area is not the rear-yard ratio denominator.', 'Land surveyor, site designer and rule reviewer'],
  }
  for (const { rule, evidence } of (victoriaScope ? ruleRefs : [])) {
    const [missing_input, impact, suggested_supplier] = ruleNeeds[rule.content.semantics.subject] ?? ['Reviewed rule-specific inputs.', 'The provisional clause cannot be assessed.', 'Rule reviewer']
    add({ id: `rule-${rule.logical_rule_id}`, title: rule.content.semantics.subject.replace(/_/g, ' '), state: 'provisional',
      available_evidence: [evidence], missing_input, impact, suggested_supplier,
      next_action: 'Confirm rule applicability and obtain the stated input before any evaluation.' })
  }
  const notes = selectedFacts?.notes.value ?? (!site ? draft.siteInput.notes : null)
  if (notes !== null && String(notes).trim()) add({ id: 'user-notes', title: 'User notes for review', state: 'unreviewed',
    available_evidence: present(selectedFacts ? factEvidence('Manual notes', selectedFacts.notes, null) : manual('Unconfirmed notes entry', String(notes))),
    missing_input: 'Verify each factual statement in the notes against a named source or controlled artifact.',
    impact: 'Notes are attributed user statements and do not establish measured or legal facts.', suggested_supplier: 'Note author and relevant source custodian',
    next_action: 'Identify supporting evidence for any note used in later evaluation.' })
  return { schema_version: 'sr-50.evidence-checklist.v1', screening_status: 'not_performed',
    scope: { municipality: draft.values.municipality.trim() || null, use: draft.values.use.trim() || null,
      role: draft.values.role.trim() || null, site_mode: site?.mode ?? null, model_id: draft.model.modelId, synthetic }, items }
}

export function evidenceChecklistText(checklist: EvidenceChecklist): string {
  const lines = [`Evidence checklist ${checklist.schema_version} — preparation only; screening ${checklist.screening_status}`,
    `Scope: ${checklist.scope.municipality ?? 'unknown'} / ${checklist.scope.use ?? 'unknown'} / ${checklist.scope.role ?? 'unknown'}; site ${checklist.scope.site_mode ?? 'unconfirmed'}; model ${checklist.scope.model_id ?? 'manual/unknown'}; synthetic ${checklist.scope.synthetic}`]
  for (const item of checklist.items) {
    lines.push(`\n${item.title} [${item.id}; ${item.state}]`, `Missing: ${item.missing_input}`, `Impact: ${item.impact}`,
      `Supplier: ${item.suggested_supplier}`, `Next: ${item.next_action}`)
    for (const e of item.available_evidence) lines.push(`Evidence (${e.origin}; ${e.review_status}): ${e.description}; value ${e.value ?? 'unstated'} ${e.unit ?? ''}; basis ${e.basis ?? 'unknown'}; source ${e.source_id ?? 'none'}; URL ${e.url ?? 'none'}; locator ${e.locator ?? 'none'}; snapshot ${e.snapshot_id ?? 'none'}; revision ${e.revision_id ?? 'none'}; captured ${e.captured_at ?? 'unknown'}`)
  }
  return lines.join('\n')
}
