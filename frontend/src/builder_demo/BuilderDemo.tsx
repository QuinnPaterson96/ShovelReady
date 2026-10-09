import type { AssessmentEntry } from '../navigation/assessmentEntry'
import { buildingClearanceMove } from './buildingMove'
import { useWalkthrough } from './walkthrough'
import { FloatingNext, PlaybackLayout } from '../FloatingNext'
import { findingAcknowledgementKey } from './journeyState'
import { enquiryUseQualification, manufacturerDocument, placementConcerns, boundaryObservations, additionalObservation, conditionalObservation, assumptionsDescription, type EnquiryInput } from './manufacturer'
import { EvidenceAtFooter } from '../EvidenceAtFooter'
import { EnquiryRecovery } from './EnquiryRecovery'
import { PropertyScan, usePropertyScan, type PropertyScanResult } from '../conditional_screening/PropertyScan'
import { StepInfo } from '../StepInfo'
import { AdditionalInputs } from '../conditional_screening/AdditionalInputs'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { SiteDiscovery } from '../site_discovery/SiteDiscovery'
import type { Confirmed } from '../site_discovery/flow'
import { SelectedProperty } from '../site_discovery/SelectedProperty'
import { parcelRecord } from '../site_discovery/parcelComparison'
import { placementCase } from '../site_discovery/placement'
import { ManualSiteInput } from '../manual_site/ManualSiteInput'
import type { ManualSiteOutput } from '../manual_site/model'
import { measurementWithUnit } from '../measurements'
import type { CatalogueModel } from '../model_catalogue/model'
import { defaultJourneyModel, journeyCatalogue, modelSnapshot, modelContact, modelProjectSettings, modelMeasure } from '../model_catalogue/demo'
import { PriceTiming, priceTimingParagraphs } from '../model_catalogue/PriceTiming'
import { CopyableRecord, publicSourceUrl, readableDate, TechnicalDetails } from '../ReadableProvenance'
import { SitePreparation } from '../site_preparations/SitePreparation'
import { emptySiteInput, type SiteInputDraft, type SitePreparationSelection } from '../site_preparations/types'
import OccupiedLots, { type OccupiedMeasurement } from '../occupied_lots/OccupiedLots'
import { overlapFinding } from '../occupied_lots/observations'
import { HeightView } from './height_view/HeightView'
import { ModelImage } from './model_image/ModelImage'
import { ExampleProperty } from './ExampleProperty'
import { IntendedUseControl, applyIntendedUse } from './intendedUse'
import { useRetainedResult } from '../conditional_screening/resultRetention'
import { demoEnquiryAnswers, movedExamplePosition, exampleCase, exampleSourcePage } from './example'
import { SiteAssumptionsEditor } from '../zoning_site_assumptions/SiteAssumptions'
import { ordinaryFourEdgeBoundary, type StreetAdjacency, type BoundaryMapMode, type SiteAssumptions } from '../zoning_site_assumptions/model'
import type { BoundaryMapInteraction } from '../zoning_site_assumptions/BoundaryMapTools'
import { ConditionalScreen } from '../conditional_screening/ConditionalScreen'
import { ProjectDetails } from '../conditional_screening/ProjectDetails'
import { applyMappedZoning, withFloorAreaBasis } from '../conditional_screening/projectSettings'
import type { ProjectSettings } from '../conditional_screening/projectSettings'
import { parseZoningLookup, selectedParcelRef, zoningProjection, type ZoningLookup } from '../conditional_screening/victoriaZoning'
import { PlacementScenarios } from '../conditional_screening/PlacementScenarios'
import { FindingResolutions, HomeownerSummary, statusLabels, summaryFindings } from '../conditional_screening/HomeownerSummary'
import { homeownerSummary } from '../conditional_screening/victoriaSummaryAdapter'
import { focusSummaryTarget } from '../conditional_screening/summaryNavigation'
import { parseScenarioResult, type ScenarioRequest, type ScenarioResult } from '../conditional_screening/scenarios'
import { currentPlacementRevision, expectedPropertyRevision, parseScreeningResult, propertyGeometryRevision, screeningIdentity, type Pathway, type ScreeningRequest, type ScreeningResult } from '../conditional_screening/model'
import { EnquiryPreview, withPlacementSketch, emailDraftUrl, enquiryEmailBody, enquiryMarkdown, enquiryPlainText,  validRecipient, type EnquiryDocument } from './enquiry'
import { preparationChecklist } from './manufacturer'
import { EnquirySaveOptions } from './EnquirySaveOptions'
import { placementDrawing, renderDrawing, renderEnquiryPdf, downloadFile, attachedEmail, enquiryPackageFiles, type DrawingAssets } from './placementExport'

const modelValues = (model: CatalogueModel) => {
  const measurement = (name: string) => modelMeasure(model, name)
  const original = (name: string) => measurement(name)?.quantity?.original_text ?? 'unknown'
  const metres = (name: string) => measurement(name)?.quantity?.unit === 'm' ? measurementWithUnit(measurement(name)!.quantity!.value, 'length') : 'unknown'
  return { measurement, original, metres }
}
const fact = (value: string | number | null) => value === null || value === '' ? 'unknown' : String(value)
const field = (value: string) => value.trim() || 'unknown'

export function screeningDocument(selection: SitePreparationSelection | null, input: EnquiryInput, measured: OccupiedMeasurement | null, exampleImported = false, live: Confirmed | null = null, manual: ManualSiteOutput | null = null, savedExample = false, foundationAllowanceM: string | null = null,
  conditional: ScreeningResult | null = null, siteAssumptions: SiteAssumptions | null = null, pathway: Pathway | null = null, scenarios: ScenarioResult | null = null, settings: ProjectSettings | null = null, scan: PropertyScanResult | null = null, model: CatalogueModel = defaultJourneyModel) {
  // Human-facing report uses applicable scope; complete hypothetical responses
  // remain in the separate technical evidence, never current planning findings.
  if (pathway && pathway.proposed_use !== 'garden_suite') { conditional = null; scenarios = null }
  const { original, metres } = modelValues(model)
  const source = model.sources[0]
  const candidate = selection?.candidate
  const p = measured?.result.input.placement
  const checks = measured?.result.checks ?? []
  const containment = checks.find(check => check.kind === 'containment')
  const overlaps = checks.filter(check => check.kind === 'building_overlap')
  const boundary = checks.find(check => check.kind === 'parcel_boundary_distance')
  const observed = (check: typeof containment) => check?.status === 'observed'
  const complete = measured ? overlapFinding(measured.site, measured.result).complete : false
  const overlapText = complete && overlaps.length && overlaps.every(observed)
    ? overlaps.some(check => check.relation === 'positive_area_overlap' || check.relation === 'touches')
      ? 'A captured roofline intersects or touches this nominal rectangle.'
      : 'No overlap with the captured rooflines was observed; other obstructions remain unknown.'
    : 'Captured roofline overlap remains unresolved.'
  const clearanceText = checks.filter(check => check.kind === 'requirement').map(check => {
    const label = check.id === 'requirement:user-parcel-minimum' ? 'Parcel boundary' : check.id === 'requirement:user-roofline-minimum' || check.id === 'requirement:user-building-minimum' ? 'Nearest captured roofline' : 'Clearance target'
    const outcome = check.comparison === 'shortfall' && check.margin_m !== null ? `shortfall ${measurementWithUnit(Math.abs(check.margin_m), 'length')}` : check.comparison === 'meets' ? 'meets the supplied target' : 'comparison unresolved'
    return `${label}: ${outcome}; measured ${measurementWithUnit(check.distance_m, 'length')}. ${check.id.startsWith('requirement:user-') ? 'User assumption, not a legal setback.' : 'Source-derived comparison; applicability requires review.'}`
  }).join(' ')
  const subsetCount = (status: import('../conditional_screening/model').ScreeningStatus) => conditional?.checks.filter(check => check.status === status).length ?? 0
  const conditionalSummary = pathway && pathway.proposed_use !== 'garden_suite'
    ? 'Garden-suite applicability is unresolved for the selected use. The retained candidate-rule details below are hypothetical investigation prompts, not applicable passes or an overall result. Use the overall placement summary for physical concerns and open questions.'
    : conditional
    ? `Candidate Victoria garden-suite comparison for this supplied placement: ${subsetCount('meets_under_assumptions')} checks meet under stated assumptions; ${subsetCount('apparent_conflict_under_assumptions') ? `${subsetCount('apparent_conflict_under_assumptions')} concern${subsetCount('apparent_conflict_under_assumptions') === 1 ? '' : 's'} in this subset;` : `no concerns identified in the supplied-facts comparisons;`} ${subsetCount('needs_information')} need information; ${subsetCount('unsupported')} outside scope. Candidate source/currentness and site facts remain unreviewed; no approval or complete bylaw review.`
    : 'Conditional zoning findings are not current for these inputs. No legal compatibility conclusion is available.'
  const scenarioSummary = scenarios
    ? `Side, rear and street-side boundary comparison: ${scenarios.status === 'bounded_pass' ? 'mapped gaps meet the candidate distances' : scenarios.status === 'apparent_conflict' ? 'candidate distance concerns remain' : scenarios.status === 'clarify' ? 'the result depends on boundary classification' : 'not assessed'}. This subset excludes front distance, rear-yard location/share and height/area; those results are listed separately. Source: ${[...new Set(scenarios.sources.map(item => `${item.provider}, ${item.record_label}, captured ${readableDate(item.capture_date)}, ${item.review_status}; ${item.url}`))].join(' ')}`
    : 'No current approximate boundary comparison for this placement.'
  const conditionalCheckDetails = conditional?.checks.map(check => conditionalObservation(check)) ?? []
  const sourceCaveat = conditional?.checks[0]?.rule.source.currentness_limitations.join(' ') ?? ''
  const mappedSource = settings?.evidence.confirmed_zone.source
  const settingSourceSummary = mappedSource ? ` Mapped zoning observation: ${mappedSource.provider}, ${mappedSource.record_label}, ${mappedSource.locator}, captured ${readableDate(mappedSource.capture_date)}, ${mappedSource.review_status}; ${mappedSource.url}.` : ''
  const planningSummary = boundaryObservations(scenarios, siteAssumptions)
  const assumptionsSummary = assumptionsDescription(input, siteAssumptions, pathway, settings) + settingSourceSummary
  const lines = [
    `UNSENT DRAFT · ${model.name} enquiry for preliminary investigation`,
    `Prepared independently with ShovelReady; no affiliation with or contact to ${model.provider}.`,
    `Design: ${model.provider} ${model.name}; public page captured ${readableDate(source?.captured_at)}; unreviewed; manufacturer revision ${model.source_revision ?? 'unknown'}. Nominal exterior ${original('nominal_exterior_width')} × ${original('nominal_exterior_depth')} (${metres('nominal_exterior_width')} × ${metres('nominal_exterior_depth')}). Advertised exterior height ${original('advertised_overall_height')}; regulatory installed height and datum unknown. Source: ${model.provider_url}.`,
    savedExample ? `Example property / saved data: City of Victoria ${exampleCase.site.parcel.source.record_label}; captured ${readableDate(exampleCase.site.parcel.source.capture_date)}; ${exampleCase.site.parcel.source.review_status}. Parcel source: ${exampleSourcePage(exampleCase.site.parcel.source.reference)} (${exampleCase.site.parcel.source.record_label}). Roofline source: ${exampleSourcePage(exampleCase.site.buildings[0]?.source.reference ?? null)} (${exampleCase.site.buildings[0]?.source.record_label ?? 'record unavailable'}). Contains information licensed under the Open Government Licence – City of Victoria: https://opendata.victoria.ca/pages/open-data-licence. Full source record links are in the technical evidence export. This is not the sender's property or a verified address.` :
    live ? `Site lead: ${live.address.label}; ${live.parcel.label}. ${live.schema_version === 'site-discovery.selected.v1' ? 'Source-selected City of Victoria observation; identity, ownership and legal boundaries are not confirmed' : 'User-confirmed City of Victoria source observation'}; source join and parcel identity remain unreviewed. Captured ${readableDate(live.observation.source.capturedAt)}. Source: ${publicSourceUrl(live.observation.source.url) ?? 'source link unavailable'}. ${live.observation.issues.join(' ')}` :
      manual ? `User-supplied site: ${field(manual.facts.address)}; stated area ${measurementWithUnit(manual.facts.statedAreaM2, 'area')}; notes ${field(manual.facts.notes)}. Approximate local sketch only, with no verified address, survey position or orientation.` :
      `Site lead: ${candidate ? 'City of Victoria retained parcel observation' : 'manual facts without a matched parcel'}. Source address ${candidate ? fact(candidate.address.value) : 'unknown'}; manual address ${fact(selection?.manual.address.value ?? null)}; manual approximate area ${measurementWithUnit(selection?.manual.lot_area_m2.value, 'area')}. Manual notes: ${fact(selection?.manual.notes.value ?? null)}. Manual entries are unverified and separate from source observations. Exact parcel identifiers remain in technical evidence.`,
    ...(candidate ? [`Parcel source: City of Victoria; captured ${readableDate(candidate.pid.evidence.captured_at)}; ${candidate.pid.evidence.review_status}; ${publicSourceUrl(candidate.pid.evidence.source_url) ?? 'source link unavailable'}.`] : []),
    `Use: ${field(input.intendedUse)}. Timing: ${field(input.timing)}. Budget, if shared: ${field(input.budget)}.`,
    `Access and crane questions/known facts: ${field(input.access)}. Utility/services questions/known facts: ${field(input.services)}.`,
    measured && p ? `${savedExample ? `Illustrative placement on the saved example ${measured.site.label}` : live ? `Placement on the selected source property ${measured.site.label}` : `Optional, separately imported retained example ${measured.site.label} (not linked to the site lead)`}: nominal rectangle ${measurementWithUnit(p.width_m, 'length')} × ${measurementWithUnit(p.depth_m, 'length')} (width ${measured.widthOrigin === 'catalogue' ? 'catalogue nominal' : 'user edited'}; depth ${measured.depthOrigin === 'catalogue' ? 'catalogue nominal' : 'user edited'}), rotation ${Number(p.angle_degrees.toFixed(2))}°. ${observed(containment) ? containment?.relation === 'contained' ? 'The rectangle lies inside the mapped parcel.' : containment?.relation === 'outside' ? 'Part of the rectangle lies outside the mapped parcel.' : 'The rectangle touches the mapped parcel boundary.' : 'Parcel containment unresolved.'} ${overlapText} ${observed(boundary) && boundary?.distance_m != null ? `Observed parcel boundary distance ${measurementWithUnit(boundary.distance_m, 'length')}.` : 'Parcel boundary distance unresolved.'} Captured ${readableDate(measured.site.site.parcel.source.capture_date)}; ${measured.site.site.parcel.source.review_status}; approximate captured geometry only.`
      : manual?.assessment ? `Measured user sketch: tested user-supplied rectangle ${measurementWithUnit(manual.assessment.input.placement.width_m, 'length')} × ${measurementWithUnit(manual.assessment.input.placement.depth_m, 'length')}; edits may differ from the model dimensions above. ${manual.assessment.checks.filter(c => c.status === 'observed').map(c => `${c.kind.replace(/_/g, ' ')}: ${c.relation?.replace(/_/g, ' ') ?? measurementWithUnit(c.distance_m, 'length')}`).join('; ')}. Obstruction coverage remains partial or unknown; no zoning or site fit assessed.`
      : savedExample ? 'Saved example placement has no current measurement; measure again after edits. Zoning remains unassessed.'
      : live || manual?.site ? 'No current placement measurement. Position the footprint and measure again after edits. Zoning remains unassessed.'
      : `${exampleImported ? 'Imported example has no current measurement; remeasure after edits. ' : ''}Geometry and zoning unassessed for this site. An address or area does not define a usable parcel shape.`,
    `Foundation scenario allowance: ${foundationAllowanceM === null ? 'not supplied' : measurementWithUnit(foundationAllowanceM, 'length') + ' planning assumption (default or edited)'}. This allowance is used only in the labelled preliminary height estimate; installed height remains unverified.`,
    `Provider service/installation: ${model.service_area_note} ${model.installation_note}`,
    `Questions: Please confirm the current controlled ${model.name} drawing/revision, installed envelope and height datum; roof projections and site clearances; local delivery/crane access, foundation and utility requirements; and what site information you need before discussing this property.`,
    'Legal lot lines, building walls and roles, other obstructions, zoning and setbacks, installed height and datum, current controlled provider dimensions, access and services remain unresolved.',
    'Planning feasibility remains unconfirmed. Manufacturer drawings, property confirmation and City or professional review are separate next steps.',
  ]
  const offset = candidate ? 1 : 0
  return {
    kind: 'screening',
    title: `${model.name} supporting screening report`,
    question: ['Preliminary supplied-placement screening; source observations and candidate rules remain unreviewed.', enquiryUseQualification(input.intendedUse, pathway?.proposed_use), 'Exact values and complete identifiers are retained in the accompanying technical evidence.'].filter(Boolean).join(' '),
    example: savedExample,
    sections: [
      { heading: 'Overall account', paragraphs: [placementConcerns(measured, conditional, scenarios).length ? 'Unresolved concerns are present across the included checks; see the concerns below. Passing a narrower subset does not resolve them.' : !measured && !conditional && !scenarios ? 'No current geometry or screening results supplied; no placement conclusion is available.' : 'No concerns identified in the included checks; missing information and unsupported conditions remain unresolved.', ...placementConcerns(measured, conditional, scenarios), 'Mapped estimates and supplied measurements have different bases. None establishes legal feasibility.'], emailSummary: '' },
      ...(planningSummary.length ? [{ heading: 'Boundary planning assumptions', paragraphs: planningSummary, emailSummary: planningSummary.join(' ') }] : []),
      ...(scenarios?.additional_checks?.length ? [{ heading: 'Additional scouting checks', paragraphs: scenarios.additional_checks.map(check => `${additionalObservation(check)} Source: ${check.source.provider}, ${check.source.record_label}, ${check.source.review_status}; ${check.source.url} (${check.source.locator}).`), emailSummary: scenarios.additional_checks.map(check => `${check.label}: ${statusLabels[check.status]}. ${check.detail}`).join(' ') }] : []),
      ...(scan ? [{ heading: 'Preliminary property scan', paragraphs: [...scan.findings.map(row => `${row.label}: ${row.status === 'probably_clear' ? 'no matching records found in this searched dataset' : row.status === 'review' ? 'records need review' : 'unknown'}. ${row.status === 'probably_clear' ? 'This does not establish absence of restrictions.' : row.detail}${row.source ? ` Source: ${row.source.provider}, ${row.source.record_label}, captured ${row.source.captured_at_utc.slice(0, 10)}, unreviewed; ${row.source.source_url.split('?')[0]}.` : ''}`), ...scan.limitations], emailSummary: scan.findings.map(row => `${row.label}: ${row.status === 'probably_clear' ? 'Likely fine in searched scope' : row.status === 'review' ? 'Needs review' : 'Unknown'}.`).join(' ') + ' Permit documents, title, projections and servicing remain unsearched.' }] : []),

      { heading: 'Price & timing', paragraphs: priceTimingParagraphs(model), emailSummary: priceTimingParagraphs(model).join(' ') },
      { heading: 'Model', paragraphs: [lines[1], lines[2], lines[8 + offset]], emailSummary: `${model.provider} ${model.name}; nominal exterior ${original('nominal_exterior_width')} × ${original('nominal_exterior_depth')}; source ${model.provider_url}; current controlled revision and installed height unknown.` },
      { heading: 'Property', paragraphs: [lines[3], ...(candidate ? [lines[4]] : []), lines[4 + offset], lines[5 + offset], ...(input.propertyConcern ? [input.propertyConcern] : [])], emailSummary: savedExample ? 'Saved City of Victoria example only; this is not my property.' : live ? `Selected Victoria source lead: ${live.address.label}. Identity, ownership and legal boundaries remain unverified.` : manual ? `User-supplied site: ${field(manual.facts.address)}; facts and sketch unverified.` : `Site lead: ${candidate ? fact(candidate.address.value) : fact(selection?.manual.address.value ?? null)}; identity and dimensions unverified.` },
      { heading: 'Placement', paragraphs: [lines[6 + offset], lines[7 + offset], ...(clearanceText ? [clearanceText] : [])], emailSummary: measured ? `Approximate measured rectangle ${measurementWithUnit(p?.width_m, 'length')} × ${measurementWithUnit(p?.depth_m, 'length')}; ${measured.widthOrigin === 'user' || measured.depthOrigin === 'user' ? 'custom size, provider availability unknown; ' : ''}geometry observations recorded; ${conditional ? 'see separate conditional zoning checks' : 'zoning comparison unresolved'}. ${clearanceText}` : manual?.assessment ? `User sketch measured at ${measurementWithUnit(manual.assessment.input.placement.width_m, 'length')} × ${measurementWithUnit(manual.assessment.input.placement.depth_m, 'length')}; unverified geometry; zoning unassessed.` : 'No current placement measurement; geometry and zoning unassessed.' },
      { heading: 'Approximate setbacks', paragraphs: [scenarioSummary], emailSummary: scenarioSummary },
      { heading: 'Conditional zoning', paragraphs: [assumptionsSummary, conditionalSummary, ...(sourceCaveat ? [sourceCaveat] : []), ...conditionalCheckDetails, ...new Set(conditional?.checks.map(check => `Candidate source: ${check.rule.source.provider}, ${check.rule.source.record_label}, captured ${readableDate(check.rule.source.capture_date)}, ${check.rule.source.review_status}; ${check.rule.source.url}. Clause references: ${[...new Set(conditional?.checks.map(c => c.rule.source.locator))].join('; ')}.`) ?? [])], emailSummary: conditional ? `${conditionalSummary} ${sourceCaveat} ${conditionalCheckDetails.join(' ')}` : 'No current conditional zoning findings.' },
      { heading: 'Still to confirm', paragraphs: [lines[9 + offset], lines[10 + offset]], emailSummary: `Current drawing and revision, installed envelope and height, site access, foundations, utilities, legal boundaries and zoning. Timing: ${field(input.timing)}. Budget: ${field(input.budget)}. Access: ${field(input.access)}. Services: ${field(input.services)}.` },
    ],
    closing: lines[11 + offset],
  } satisfies EnquiryDocument
}

export function enquiryDocument(...args: Parameters<typeof screeningDocument>) {
  const [selection, input, measured, , live, manual, savedExample, , conditional, , pathway, scenarios, , scan] = args
  const address = savedExample ? null : live?.address.label || manual?.facts.address || selection?.candidate?.address.value || selection?.manual.address.value || null
  return manufacturerDocument(input, address === null ? null : String(address), !!savedExample, measured, conditional ?? null, scenarios ?? null, scan ?? null, !!(savedExample || live || manual?.assessment), false, pathway?.proposed_use, args[14] ?? defaultJourneyModel)
}

export function enquiry(...args: Parameters<typeof enquiryDocument>) { return enquiryPlainText(enquiryDocument(...args)) }

export type BuilderProgress = import('../navigation/BuilderJourneyNav').BuilderJourneyCompletion
type JourneyStep = import('../navigation/BuilderJourneyNav').JourneyStep

export default function BuilderDemo({ onProgressChange, presetRequest = 0, entryRequest, visible = true }: { visible?: boolean; entryRequest?: AssessmentEntry | null; presetRequest?: number; onProgressChange?: (progress: BuilderProgress) => void } = {}) {
  const [modelId, setModelId] = useState(defaultJourneyModel.model_id)
  const model = journeyCatalogue.models.find(item => item.model_id === modelId)!
  const MODEL_ID = model.model_id
  const { measurement, original, metres } = modelValues(model)
  const suggestedQuestion = `Could ${model.name} be suitable for this property?`
  const [expanded, setExpanded] = useState({ property: true, placement: false, next: false, email: false })
  const playbackLayoutRef = useRef(false)
  const journeyVisible = useRef(visible)
  journeyVisible.current = visible
  const [journeyStep, setJourneyStep] = useState<JourneyStep>('property')
  const [boundaryEditorOverride, setBoundaryEditorOverride] = useState(false)
  const [reviewedBoundariesFor, setReviewedBoundariesFor] = useState<string | null>(null)
  const [reviewedPurposeFor, setReviewedPurposeFor] = useState<string | null>(null)
  const [reviewedDetailsFor, setReviewedDetailsFor] = useState<string | null>(null)
  const [checksRevealed, setChecksRevealed] = useState(false)
  const [reviewedChecksFor, setReviewedChecksFor] = useState<string | null>(null)
  const [websiteRequestedFor, setWebsiteRequestedFor] = useState<string | null>(null)
  const [emailRequestedFor, setEmailRequestedFor] = useState<string | null>(null)
  const toggleStep = (step: keyof typeof expanded) => setExpanded(value => ({ ...value, [step]: !value[step] }))
  const [foundationAllowanceM, setFoundationAllowanceM] = useState<string | null>('0.30')
  const [estimateBuffers, setEstimateBuffers] = useState({ area: 10, height: 10 })
  const [heightRevision, setHeightRevision] = useState(0)
  const [mode, setMode] = useState<'live' | 'manual' | 'retained' | 'example'>('live')
  const [propertyReset, setPropertyReset] = useState(0)
  const [propertyInspect, setPropertyInspect] = useState(0)
  const [live, setLive] = useState<Confirmed | null>(null)
  const [manual, setManual] = useState<ManualSiteOutput | null>(null)
  const liveCase = useMemo(() => live ? placementCase(live) : undefined, [live])
  const [draft, setDraft] = useState<SiteInputDraft>({ ...emptySiteInput, kind: 'address' })
  const [selection, setSelection] = useState<SitePreparationSelection | null>(null)
  const [imported, setImported] = useState(false)
  const [measurementResult, setMeasurementResult] = useState<OccupiedMeasurement | null>(null)
  const [geometryFailure, setGeometryFailure] = useState(false)
  const [geometryPending, setGeometryPending] = useState(false)
  const [buffersPending, setBuffersPending] = useState(false)
  const [siteAssumptions, setSiteAssumptions] = useState<SiteAssumptions | null>(null)
  const [projectSettings, setProjectSettings] = useState(() => applyIntendedUse(modelProjectSettings(model), ''))
  const [zoningState, setZoningState] = useState<{ key: string; result: ZoningLookup } | null>(null)
  const [zoningError, setZoningError] = useState<{ key: string; message: string } | null>(null)
  const [zoningBusy, setZoningBusy] = useState(false)
  const [zoningRetry, setZoningRetry] = useState(0)
  const [conditionalState, setConditionalState] = useState<{ key: string; result: ScreeningResult } | null>(null)
  const [conditionalError, setConditionalError] = useState<{ key: string; message: string } | null>(null)
  const [conditionalBusy, setConditionalBusy] = useState(false)
  const [conditionalRetry, setConditionalRetry] = useState(0)
  const [streetDecisionFor, setStreetDecisionFor] = useState<string | null>(null)
  const [streetSkipTarget, setStreetSkipTarget] = useState<JourneyStep | null>(null)
  const streetDialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = streetDialog.current
    if (!dialog) return
    if (streetSkipTarget) { if (!dialog.open) { if (dialog.showModal) dialog.showModal(); else dialog.setAttribute('open', '') } }
    else if (dialog.open) { if (dialog.close) dialog.close(); else dialog.removeAttribute('open') }
  }, [streetSkipTarget])
  const [streetMarks, setStreetMarks] = useState<{ revision: string | null; data: StreetAdjacency }>({ revision: null, data: { edge_ids: [], all_marked: false, origin: 'user' } })
  const [markingRole, setMarkingRole] = useState<import('../zoning_site_assumptions/model').EdgeRole | null>(null)
  const [boundaryMark, setBoundaryMark] = useState<{ id: string; role: import('../zoning_site_assumptions/model').EdgeRole } | null>(null)
  const [selectedBoundary, setSelectedBoundary] = useState<string | null>(null)
  const [rearEdge, setRearEdge] = useState<string | null>(null)
  const [waterfrontMarks, setWaterfrontMarks] = useState<{ revision: string | null; ids: string[] }>({ revision: null, ids: [] })
  const [bufferSuggestion, setBufferSuggestion] = useState<{ edgeId: string; value: number; token: number; geometryRevision: string; placementRevision: string }>()
  const [moveSuggestion, setMoveSuggestion] = useState<{ dx: number; dy: number; token: number; geometryRevision: string }>()
  const suggestionSequence = useRef(0)
  const [acknowledgedConflicts, setAcknowledgedConflicts] = useState<string[]>([])
  const [boundaryMode, setBoundaryMode] = useState<BoundaryMapMode>('place')
  const [scenarioState, setScenarioState] = useState<{ key: string; result: ScenarioResult } | null>(null)
  const [scenarioError, setScenarioError] = useState<{ key: string; message: string } | null>(null)
  const [scenarioBusy, setScenarioBusy] = useState(false)
  const [scenarioRetry, setScenarioRetry] = useState(0)
  const [scoutingHeight, setScoutingHeight] = useState<{ key: string; value: number | null } | null>(null)
  const [revision, setRevision] = useState(0)
  const [use, setUse] = useState('')
  const [timing, setTiming] = useState('')
  const [budget, setBudget] = useState('')
  const [access, setAccess] = useState('')
  const [services, setServices] = useState('')
  const [projectContext, setProjectContext] = useState({ relationship: '', stage: '', configuration: '', nextStep: '', contact: '' })
  const [drawingExport, setDrawingExport] = useState<{ key: string; assets: DrawingAssets } | null>(null)
  const [exportBusy, setExportBusy] = useState(false)
  const [exportMessage, setExportMessage] = useState('')
  const drawingRevision = useRef('')
  const [question, setQuestion] = useState(suggestedQuestion)
  const [readyFor, setReadyFor] = useState<string | null>(null)
  const [manualConfirmedFor, setManualConfirmedFor] = useState<string | null>(null)
  const [recipient, setRecipient] = useState('')
  const [includeSiteDetails, setIncludeSiteDetails] = useState(true)
  const [emailMessage, setEmailMessage] = useState('')
  const [demoAnswers, setDemoAnswers] = useState<EnquiryInput['demoAnswers']>({})
  function clearDemoAnswer(key: 'intendedUse' | 'relationship' | 'nextStep' | 'streetContext') { setDemoAnswers(previous => { const next = { ...previous }; delete next[key]; return next }) }
  function changeIntendedUse(value: string, demo = false) { if (!demo) clearDemoAnswer('intendedUse'); if (value !== use) setReviewedPurposeFor(null); setUse(value); setProjectSettings(previous => applyIntendedUse(previous, value)); setReadyFor(null) }
  function siteEdited() { setGeometryFailure(false); setDemoAnswers({}); setStreetDecisionFor(null); setStreetSkipTarget(null); setChecksRevealed(false); setBufferSuggestion(undefined); setMoveSuggestion(undefined); setAcknowledgedConflicts([]); setSelection(null); setImported(false); setMeasurementResult(null); setSiteAssumptions(null); setProjectSettings(applyIntendedUse(modelProjectSettings(model), use)); setGeometryPending(false); setAccess(''); setServices(''); setProjectContext(previous => ({ ...previous, relationship: '', nextStep: '' })); setQuestion(`Could ${model.name} be suitable for this property?`); setWaterfrontMarks({ revision: null, ids: [] }); setDrawingExport(null); setStreetMarks({ revision: null, data: { edge_ids: [], all_marked: false, origin: 'user' } }); setRearEdge(null); setSelectedBoundary(null); setBoundaryMark(null); setMarkingRole(null); setBoundaryMode('place'); setReadyFor(null); setRevision(value => value + 1) }
  function changeMode(next: typeof mode) {
    if (next !== 'example' && window.location.hash.startsWith('#examples/')) window.history.replaceState(null, '', '#assessment')
    setExpanded({ property: next !== 'example', placement: next === 'example', next: false, email: false })
    setMode(next); siteEdited(); setLive(null); setManual(null)
    setDraft({ ...emptySiteInput, kind: 'address' })
    setDrawingExport(null)
    setReadyFor(null); setManualConfirmedFor(null); setIncludeSiteDetails(true); setEmailMessage('')
  }
  const entryHandled = useRef(false)
  const processedEntry = useRef<{ request: AssessmentEntry | null | undefined; legacy: number } | null>(null)
  const [pendingEntry, setPendingEntry] = useState<AssessmentEntry | null>(null)
  const entryDialog = useRef<HTMLDialogElement>(null)
  function applyEntry(entry: AssessmentEntry) {
    const next = journeyCatalogue.models.find(item => item.model_id === entry.modelId) ?? model
    switchModel(next.model_id)
    if (entry.example) {
      playback.cancel()
      setUse(''); setTiming(''); setBudget(''); setAccess(''); setServices('');
      setProjectContext({ relationship: '', stage: '', configuration: '', nextStep: '', contact: '' })
      setFoundationAllowanceM('0.30'); setEstimateBuffers({ area: 10, height: 10 })
      changeMode('example')
      setProjectSettings(applyIntendedUse(modelProjectSettings(next), ''))
      setQuestion(`Could ${next.name} be suitable for this property?`)
      setJourneyStep(entry.walkthrough ? 'model' : 'placement')
      if (entry.walkthrough) playback.start()
    }
  }
  useEffect(() => {
    if (processedEntry.current?.request === entryRequest && processedEntry.current?.legacy === presetRequest) return
    processedEntry.current = { request: entryRequest, legacy: presetRequest }
    const entry = entryRequest ?? (presetRequest ? { example: true, modelId: defaultJourneyModel.model_id } : null)
    if (!entry) { entryHandled.current = true; return }
    if (entry.example && (entryHandled.current || hasSite)) setPendingEntry(entry)
    else applyEntry(entry)
    entryHandled.current = true
  }, [entryRequest, presetRequest])
  useEffect(() => { if (pendingEntry) entryDialog.current?.showModal() }, [pendingEntry])
  function switchModel(nextId: string) {
    const next = journeyCatalogue.models.find(item => item.model_id === nextId)
    if (!next || nextId === modelId) return
    setGeometryFailure(false); setModelId(nextId); setMeasurementResult(null); setGeometryPending(false)
    setManual(previous => previous ? { ...previous, assessment: null, placement: null } : null)
    setSiteAssumptions(previous => previous ? { ...previous, measurements: { ...previous.measurements, boundary: {}, principal_separation: null, floor_area: null } } : null)
    setProjectSettings(previous => {
      const nextSettings = applyIntendedUse(modelProjectSettings(next), use)
      return { proposal: { ...nextSettings.proposal,
        confirmed_zone: previous.proposal.confirmed_zone, confirmed_instrument: previous.proposal.confirmed_instrument,
        legal_lot_confirmed: previous.proposal.legal_lot_confirmed },
        evidence: { ...nextSettings.evidence, confirmed_zone: previous.evidence.confirmed_zone,
          confirmed_instrument: previous.evidence.confirmed_instrument, legal_lot_confirmed: previous.evidence.legal_lot_confirmed } }
    })
    setFoundationAllowanceM(null); setHeightRevision(value => value + 1); setScoutingHeight(null)
    setProjectContext(previous => ({ ...previous, configuration: '' }))
    setQuestion(`Could ${next.name} be suitable for this property?`); setRecipient('')
    setConditionalState(null); setScenarioState(null); setDrawingExport(null)
    setAcknowledgedConflicts([]); setReviewedDetailsFor(null); setReviewedChecksFor(null)
    setReadyFor(null); setEmailRequestedFor(null); setWebsiteRequestedFor(null)
    setEmailMessage(''); setExportMessage(''); setMoveSuggestion(undefined); setBufferSuggestion(undefined)
    setRevision(value => value + 1)
  }
  const hasSite = mode === 'example' || !!(selection || live || manual && (manual.site || Object.values(manual.facts).some(value => value.trim())))
  const zoningCase = mode === 'example' ? exampleCase : mode === 'live' ? liveCase ?? null : null
  const geometryRevision = zoningCase ? propertyGeometryRevision(zoningCase) : null
  const placementRevision = measurementResult ? currentPlacementRevision({ placement: measurementResult.result.input.placement, model: measurementResult.model?.model_id ?? null, widthOrigin: measurementResult.widthOrigin, depthOrigin: measurementResult.depthOrigin }) : 'placement-unmeasured'
  const currentAssumptions = zoningCase && geometryRevision && siteAssumptions?.property.case_id === zoningCase.case_id && siteAssumptions.property.parcel_id === zoningCase.site.parcel.id && siteAssumptions.property.geometry_revision === geometryRevision && siteAssumptions.placement_revision === placementRevision ? siteAssumptions : null
  const selectedRef = mode === 'live' ? selectedParcelRef(live) : mode === 'example' ? { parcel_ref: { source: 'city-of-victoria-pid-parcels' as const, object_id: 87 } } : null
  const propertyScan = usePropertyScan(selectedRef, geometryRevision)
  const zoningKey = selectedRef && geometryRevision ? JSON.stringify([selectedRef, geometryRevision, revision, zoningRetry]) : null
  const currentZoning = zoningKey && zoningState?.key === zoningKey ? zoningState.result : null
  const latestZoningKey = useRef(zoningKey); latestZoningKey.current = zoningKey
  const currentZoningError = zoningKey && zoningError?.key === zoningKey ? zoningError.message : ''
  useEffect(() => {
    if (!zoningKey || !selectedRef) { setZoningBusy(false); return }
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort('timeout'), 10000)
    setZoningBusy(true)
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/victoria-zoning/lookup', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ schema_version: 'victoria-zoning.v1', ...selectedRef }), signal: controller.signal })
        if (!response.ok) throw Error(`City zoning lookup unavailable (${response.status}).`)
        const result = parseZoningLookup(await response.json(), selectedRef.parcel_ref)
        if (!controller.signal.aborted && latestZoningKey.current === zoningKey) { setZoningState({ key: zoningKey, result }); setZoningError(null); setZoningBusy(false) }
      } catch (error) {
        if (latestZoningKey.current === zoningKey && (!controller.signal.aborted || controller.signal.reason === 'timeout')) { setZoningError({ key: zoningKey, message: controller.signal.reason === 'timeout' ? 'Timed out.' : error instanceof Error ? error.message : 'Unavailable.' }); setZoningBusy(false) }
      } finally { window.clearTimeout(timeout) }
    }, 300)
    return () => { controller.abort(); window.clearTimeout(timer); window.clearTimeout(timeout) }
  }, [zoningKey])
  const mappedZoning = currentZoning && geometryRevision ? zoningProjection(currentZoning, geometryRevision) : null
  const effectiveSettings = withFloorAreaBasis(applyMappedZoning(projectSettings, mappedZoning, geometryRevision ?? ''), currentAssumptions?.measurements.floor_area?.basis === 'regulatory_floor_area' ? 'regulatory_floor_area' : currentAssumptions?.measurements.floor_area?.basis === 'rough_floor_area_estimate' ? 'rough_floor_area_estimate' : null)
  const pathway = effectiveSettings.proposal
  const streetAdjacency = useMemo<StreetAdjacency>(() => streetMarks.revision === geometryRevision ? streetMarks.data : { edge_ids: [], all_marked: false, origin: 'user' }, [streetMarks, geometryRevision])
  const streetEdge = streetAdjacency.all_marked && streetAdjacency.edge_ids.length === 1 && ordinaryFourEdgeBoundary(currentAssumptions?.edges ?? []) ? streetAdjacency.edge_ids[0] : null
  const streetPattern: ScenarioRequest['street_pattern'] = streetEdge ? 'single' : streetAdjacency.all_marked && streetAdjacency.edge_ids.length > 1 ? 'corner_or_multiple' : 'unknown'
  function toggleStreet(id: string | null) { clearDemoAnswer('streetContext');
    if (id && !currentAssumptions?.edges.some(edge => edge.id === id && edge.ring === 0)) return
    const edge_ids = id === null ? [] : streetAdjacency.edge_ids.includes(id) ? streetAdjacency.edge_ids.filter(edge => edge !== id) : [...streetAdjacency.edge_ids, id]
    setStreetDecisionFor(id === null || edge_ids.length > 0 ? geometryRevision : null)
    setStreetMarks({ revision: geometryRevision, data: { origin: 'user', all_marked: edge_ids.length > 0, completion_method: edge_ids.length ? 'marking' : undefined, edge_ids } }); setReadyFor(null)
  }
  function changeBoundaryMode(next: BoundaryMapMode, answered = false) {
    if (!answered && next === 'rear' && zoningCase && !streetAdjacency.all_marked && streetDecisionFor !== geometryRevision) { setStreetSkipTarget('boundaries'); return }
    setBoundaryEditorOverride(false)
    setJourneyStep(next === 'front' ? 'streets' : next === 'place' ? 'placement' : 'boundaries')
    setBoundaryMode(next)
  }
  const waterfrontFocusPending = useRef(false)
  useEffect(() => {
    if (waterfrontFocusPending.current && boundaryMode === 'waterfront' && currentAssumptions?.waterfront.value === true) {
      waterfrontFocusPending.current = false
      focusSummaryTarget(document, 'placement-action-waterfront')
    }
  }, [boundaryMode, currentAssumptions?.waterfront.value])
  function selectBoundary(id: string | null) { setSelectedBoundary(id); if (id && markingRole) setBoundaryMark({ id, role: markingRole }) }
  const additionalKey = JSON.stringify([geometryRevision, revision])
  const scenarioRequest: ScenarioRequest | null = measurementResult && currentAssumptions && zoningCase && measurementResult.site.site.parcel.id === zoningCase.site.parcel.id
    ? { schema_version: 'placement-scenarios.request.v1', geometry: measurementResult.result.input, assumptions: currentAssumptions,
      model_revision: `catalogue-record:${model.model_id}@${modelSnapshot(model)}`, proposal: pathway, proposal_evidence: effectiveSettings.evidence,
      street_edge_id: streetEdge, rear_edge_id: rearEdge, street_pattern: streetPattern,
      additional_inputs: { height_from_average_grade_m: scoutingHeight?.key === additionalKey ? scoutingHeight.value : null,
        nominal_footprint_area_m2: currentAssumptions.measurements.floor_area?.basis === 'rough_floor_area_estimate' ? currentAssumptions.measurements.floor_area.value : measurementResult.result.input.placement.width_m * measurementResult.result.input.placement.depth_m,
        advertised_height_m: Number(measurement('advertised_overall_height')?.quantity?.value) || null,
        area_buffer_percent: estimateBuffers.area, height_buffer_percent: estimateBuffers.height,
        foundation_allowance_m: foundationAllowanceM === null ? null : Number(foundationAllowanceM) } } : null
  const scenarioKey = scenarioRequest ? JSON.stringify([scenarioRequest, scenarioRetry]) : null
  const currentScenario = scenarioKey && scenarioState?.key === scenarioKey ? scenarioState.result : null
  const latestScenarioKey = useRef(scenarioKey); latestScenarioKey.current = scenarioKey
  const currentScenarioError = scenarioKey && scenarioError?.key === scenarioKey ? scenarioError.message : ''
  const boundaryInteraction: BoundaryMapInteraction | undefined = zoningCase ? {
    showPropertyDetails: journeyStep === 'details',
    editor: <SiteAssumptionsEditor initialValue={siteAssumptions} detailsTargetId="property-details-below-map" detailsSummary={<>Floor area buffer: +{estimateBuffers.area}%. {scoutingHeight?.key === additionalKey && scoutingHeight.value !== null ? `Supplied installed height: ${measurementWithUnit(scoutingHeight.value, 'length')}.` : `Advertised height buffer: +${estimateBuffers.height}%; foundation allowance: ${foundationAllowanceM === null ? 'unknown' : measurementWithUnit(foundationAllowanceM, 'length')}.`}</>} detailsInputs={<AdditionalInputs key={additionalKey} buffers={estimateBuffers} onBuffers={setEstimateBuffers} foundation={foundationAllowanceM} onFoundation={setFoundationAllowanceM} onHeight={value => { setScoutingHeight({ key: additionalKey, value }); setReadyFor(null) }} result={currentScenario} />} bufferSuggestion={bufferSuggestion} onBoundaryAccepted={accepted => setReviewedBoundariesFor(boundaryReviewKey(accepted))} onFactsNext={() => advanceJourneyStep('purpose')} factsNextDisabled={buffersPending} detailsStep={journeyStep === 'details'} forceBoundaryEditor={boundaryEditorOverride || selectedBoundary !== null} onPlanningBuffersPending={setBuffersPending} waterfrontMarks={waterfrontMarks.revision === geometryRevision ? waterfrontMarks.ids : []} onWaterfrontChange={yes => { if (yes) { waterfrontFocusPending.current = true; changeBoundaryMode('waterfront') } else { if (boundaryMode === 'waterfront') changeBoundaryMode('place'); setWaterfrontMarks({ revision: geometryRevision, ids: [] }) } }} onBoundaryDismiss={() => { setSelectedBoundary(null); setMarkingRole(null); document.getElementById('boundary-roles')?.focus() }} edgeDistances={currentScenario?.edge_distances_m} homeownerDefaults streetAdjacency={streetAdjacency} markingRole={markingRole} onMarkingRoleChange={setMarkingRole} boundaryMark={boundaryMark} sharedMode={boundaryMode} selectedBoundary={selectedBoundary} onBoundarySelect={selectBoundary} site={zoningCase} geometryRevision={geometryRevision!} placementRevision={placementRevision} frontEdge={streetEdge} rearEdge={rearEdge} streetPattern={streetPattern} onChange={assumptionsChanged} />,
    mainBuilding: zoningCase.site.buildings.find(b => b.id === currentAssumptions?.principal_building_id.value), mainBuildingAssumed: currentAssumptions?.principal_building_id.origin === 'journey_default', waterfront: currentAssumptions?.waterfront.value === true, waterfrontIds: currentAssumptions?.waterfront_edge_ids,
    suggestedRoles: currentAssumptions?.boundary_role_suggestions?.roles, streetIds: streetAdjacency.edge_ids, allStreetsMarked: streetAdjacency.all_marked, selectedId: selectedBoundary, edges: currentAssumptions?.edges ?? [], mode: boundaryMode, frontId: streetEdge, rearId: rearEdge,
    streetPattern, onModeChange: changeBoundaryMode,
    onSelect: id => { if (boundaryMode === 'front') toggleStreet(id); else if (boundaryMode === 'rear') selectBoundary(id); else if (boundaryMode === 'waterfront') { if (id && !currentAssumptions?.edges.some(edge => edge.id === id && edge.ring === 0)) return; const ids = waterfrontMarks.revision === geometryRevision ? waterfrontMarks.ids : []; setWaterfrontMarks({ revision: geometryRevision, ids: id === null ? [] : ids.includes(id) ? ids.filter(edge => edge !== id) : [...ids, id] }); setReadyFor(null) } },
  } : undefined
  useEffect(() => {
    if (!scenarioRequest || !scenarioKey) { setScenarioBusy(false); return }
    const controller = new AbortController()
    setScenarioBusy(true)
    const timeout = window.setTimeout(() => {
      controller.abort()
      if (latestScenarioKey.current !== scenarioKey) return
      setScenarioError({ key: scenarioKey, message: 'Approximate setback screen timed out. Change the placement or measure again to retry.' })
      setScenarioBusy(false)
    }, 10000)
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/conditional-screening/v1/placement-scenarios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(scenarioRequest), signal: controller.signal })
        if (!response.ok) throw new Error(`Approximate setback screen unavailable (${response.status}).`)
        const result = parseScenarioResult(await response.json(), scenarioRequest)
        if (result.property_revision !== expectedPropertyRevision(scenarioRequest.assumptions) ||
          result.placement_revision !== scenarioRequest.assumptions.placement_revision ||
          result.model_revision !== scenarioRequest.model_revision) throw new Error('Scenario response did not match current inputs.')
        if (!controller.signal.aborted && latestScenarioKey.current === scenarioKey) { setScenarioState({ key: scenarioKey, result }); setScenarioError(null); setScenarioBusy(false) }
      } catch (error) {
        if (!controller.signal.aborted && latestScenarioKey.current === scenarioKey) { setScenarioError({ key: scenarioKey, message: error instanceof Error ? error.message : 'Approximate setback screen unavailable.' }); setScenarioBusy(false) }
      } finally {
        window.clearTimeout(timeout)
      }
    }, 300)
    return () => { controller.abort(); window.clearTimeout(timer); window.clearTimeout(timeout) }
  }, [scenarioKey])
  const screeningRequest: ScreeningRequest | null = measurementResult && currentAssumptions && zoningCase && measurementResult.site.site.parcel.id === zoningCase.site.parcel.id
    ? { schema_version: 'conditional-screening.api.v1', assumptions: currentAssumptions, model_revision: `catalogue-record:${model.model_id}@${modelSnapshot(model)}`, proposal: pathway, proposal_evidence: effectiveSettings.evidence } : null
  const requestKey = screeningRequest ? JSON.stringify([screeningIdentity(screeningRequest), conditionalRetry]) : null
  const currentScreening = requestKey && conditionalState?.key === requestKey ? conditionalState.result : null
  const latestScreeningKey = useRef(requestKey); latestScreeningKey.current = requestKey
  const currentScreeningError = requestKey && conditionalError?.key === requestKey ? conditionalError.message : ''
  useEffect(() => {
    if (!screeningRequest || !requestKey) { setConditionalBusy(false); return }
    const controller = new AbortController()
    const timeout = window.setTimeout(() => {
      controller.abort('timeout')
      if (latestScreeningKey.current !== requestKey) return
      setConditionalError({ key: requestKey, message: 'Conditional screen timed out.' })
      setConditionalBusy(false)
    }, 10000)
    setConditionalBusy(true)
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/conditional-screening/v1/evaluate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(screeningRequest), signal: controller.signal })
        if (!response.ok) throw new Error(`Conditional screen unavailable (${response.status}).`)
        const result = parseScreeningResult(await response.json())
        if (result.request.property_revision !== expectedPropertyRevision(screeningRequest.assumptions) ||
          result.request.placement_revision !== screeningRequest.assumptions.placement_revision ||
          result.request.model_revision !== screeningRequest.model_revision) throw new Error('Conditional response did not match the current input revisions.')
        if (!controller.signal.aborted && latestScreeningKey.current === requestKey) { setConditionalState({ key: requestKey, result }); setConditionalError(null); setConditionalBusy(false) }
      } catch (error) {
        if (!controller.signal.aborted && latestScreeningKey.current === requestKey) { setConditionalError({ key: requestKey, message: error instanceof Error ? error.message : 'Conditional screen unavailable.' }); setConditionalBusy(false) }
      } finally {
        window.clearTimeout(timeout)
      }
    }, 300)
    return () => { controller.abort(); window.clearTimeout(timer); window.clearTimeout(timeout) }
  }, [requestKey])
  const selectedParcelPid = live ? parcelRecord(live.parcel).pid : null
  const propertyConcern = live?.parcel.identityConcern ? `${live.parcel.identityConcern.replace('Check which parcel your project concerns.', 'I need to confirm which parcel my project concerns.')}${selectedParcelPid ? ` The selected mapped parcel is PID ${selectedParcelPid}.` : ''}` : undefined
  const makeEnquiryDoc = () => hasSite ? enquiryDocument(selection, { question, intendedUse: use, timing, budget, access, services, ...projectContext, propertyConcern }, measurementResult, imported, live, manual, mode === 'example', foundationAllowanceM, currentScreening, currentAssumptions, pathway, currentScenario, effectiveSettings, propertyScan.result, model) : null
  const manualSignature = JSON.stringify({ facts: manual?.facts ?? null, site: manual?.site ?? null })
  const propertyComplete = mode === 'example' || !!(live || selection || mode === 'manual' && manual && manualConfirmedFor === manualSignature)
  const placementComplete = !!(measurementResult || mode === 'manual' && manual?.assessment)
  const previousPropertyComplete = useRef(false)
  useEffect(() => {
    if (!playbackLayoutRef.current && propertyComplete && !previousPropertyComplete.current) { setExpanded({ property: false, placement: true, next: false, email: false }); setJourneyStep('placement') }
    if (!propertyComplete && previousPropertyComplete.current) { setExpanded({ property: true, placement: false, next: false, email: false }); setJourneyStep('property') }
    previousPropertyComplete.current = propertyComplete
  }, [propertyComplete])
  useEffect(() => {
    if (!playbackLayoutRef.current && journeyStep === 'placement' && propertyComplete) requestAnimationFrame(() => { if (!playbackLayoutRef.current && journeyVisible.current) focusSummaryTarget(document, 'builder-placement-title', 'start') })
  }, [journeyStep, propertyComplete])
  useEffect(() => {
    function revealStep(event: MouseEvent) {
      const anchor = event.target instanceof Element ? event.target.closest('a') : null
      if (event.defaultPrevented || !anchor?.closest('.builder-journey-rail') || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
      const routes: Record<string, JourneyStep> = { '#builder-model': 'model', '#builder-property': 'property', '#builder-placement': 'placement', '#placement-action-front': 'streets', '#placement-action-rear': 'boundaries', '#builder-property-details': 'details', '#builder-purpose': 'purpose', '#builder-quick-checks': 'checks', '#builder-next': 'enquiry', '#builder-email': 'email' }
      const href = anchor.getAttribute('href') ?? ''
      if (href.startsWith('#summary-check-')) { event.preventDefault(); openJourneyStep('checks'); requestAnimationFrame(() => focusSummaryTarget(document, href.slice(1))); return }
      const step = routes[href]
      if (step) { event.preventDefault(); openJourneyStep(step) }
    }
    document.addEventListener('click', revealStep)
    return () => document.removeEventListener('click', revealStep)
  })
  // Review milestones apply to the current placement and editable assumptions;
  // neither visiting a step nor requesting an email establishes a passing check.
  const reviewRevision = JSON.stringify([geometryRevision, placementRevision, currentAssumptions, effectiveSettings, estimateBuffers, foundationAllowanceM, scoutingHeight?.value, use])
  const detailsReviewRevision = JSON.stringify([geometryRevision, currentAssumptions?.building_type, currentAssumptions?.existing_garden_suites, currentAssumptions?.principal_building_id, currentAssumptions?.waterfront, currentAssumptions?.measurements.floor_area, estimateBuffers, foundationAllowanceM, scoutingHeight?.value])
  function boundaryReviewKey(assumptions: SiteAssumptions | null) { return JSON.stringify([geometryRevision, assumptions?.placement_revision, assumptions?.edges, assumptions?.planning_buffers_m, assumptions?.measurements.boundary, streetAdjacency]) }
  function assumptionsChanged(next: SiteAssumptions | null) {
    // Retain the prior payload during reassessment; the current-revision guard
    // excludes it from evaluation until the editor rebases the placement.
    if (!next) return
    if (siteAssumptions && siteAssumptions.property.geometry_revision === next.property.geometry_revision && siteAssumptions.placement_revision !== next.placement_revision && reviewedBoundariesFor === boundaryReviewKey(siteAssumptions)) {
      setReviewedBoundariesFor(boundaryReviewKey(next))
    }
    if (JSON.stringify(next) !== JSON.stringify(siteAssumptions)) { setSiteAssumptions(next); setReadyFor(null) }
  }
  const boundaryReviewRevision = boundaryReviewKey(currentAssumptions)
  const currentMeasurement = measurementResult?.result ?? manual?.assessment
  const computedSummary = zoningCase ? homeownerSummary({ geometry: measurementResult?.result ?? null,
    geometryComplete: (!live || live.observation.buildingsState === 'available') && !!measurementResult && overlapFinding(zoningCase, measurementResult.result).complete,
    scenario: currentScenario, screening: currentScreening,
    assumptions: currentAssumptions, settings: effectiveSettings, mapped: mappedZoning, lookup: currentZoning, zoningBusy, zoningError: currentZoningError,
    propertyScan: propertyScan.result, propertyScanBusy: propertyScan.busy, propertyScanError: propertyScan.error, scenarioError: currentScenarioError, screeningError: currentScreeningError, onRetryAvailable: !!zoningKey }) : null
  if (computedSummary && model.model_id === 'wcch-ch-studio') computedSummary.checks.splice(1, 0, {
    label: 'Permanent dwelling suitability', status: 'unknown',
    detail: 'C.H. Studio Pod body dimensions support a footprint comparison. Permanent residential suitability has not been established.',
    gap: { missing: 'A provider-confirmed permanent residential configuration and its supporting documents.',
      affects: 'Space on the property does not establish eligibility for a garden suite.',
      next: 'Ask West Coast Container Homes which residential configuration, foundation and documentation it can supply for this locality.', owner: 'West Coast Container Homes, then City reviewer' },
  })
  // Pending input identities apply before effects/debounce; retained findings
  // are display-only and excluded from exports and readiness.
  const checksPending = geometryPending || buffersPending || !!measurementResult && !currentAssumptions ||
    !!scenarioKey && !currentScenario && !currentScenarioError ||
    !!requestKey && !currentScreening && !currentScreeningError ||
    !!zoningKey && !currentZoning && !currentZoningError || propertyScan.busy
  const evaluationInputKey = JSON.stringify([geometryPending, placementRevision, currentAssumptions, scenarioKey, requestKey, zoningKey, propertyScan.result, propertyScan.error, estimateBuffers, foundationAllowanceM, use])
  const displayResult = useRetainedResult({ scopeKey: geometryRevision ? JSON.stringify([geometryRevision, model.model_id, modelSnapshot(model)]) : null,
    inputKey: evaluationInputKey, current: computedSummary ? { summary: computedSummary, useQualification: enquiryUseQualification(use, pathway.proposed_use) } : null, pending: checksPending })
  const baseSummary = displayResult.result?.summary ?? null
  const separation = currentScenario?.additional_checks?.find(check => check.id === 'separation')
  const mainOutline = measurementResult?.site.site.buildings.find(building => building.id === currentAssumptions?.principal_building_id.value)
  const buildingMove = separation?.status === 'conflict' && separation.unit === 'm' && !currentAssumptions?.measurements.principal_separation && mainOutline && measurementResult && separation.threshold !== null
    ? buildingClearanceMove(mainOutline, measurementResult.result.input.placement, separation.threshold) : null
  const summary = baseSummary && { ...baseSummary, checks: baseSummary.checks.map(check => check.label === 'Distance from the main building' && check.status === 'conflict' && pathway.proposed_use === 'garden_suite' && buildingMove ? { ...check, resolutions: [{ edgeId: 'main-building', moveM: buildingMove.distance, detail: `Try moving ${buildingMove.distance} m away from the selected main outline to clear its approximate ${separation!.threshold} m candidate comparison. This conservative suggestion may cross a boundary or approach another building; recheck all gaps. Rooflines and legal applicability remain unverified.` }] } : check) }
  const conflictKey = (check: import('../conditional_screening/HomeownerSummary').SummaryCheck) => findingAcknowledgementKey(check, { geometryRevision, measurement: measurementResult, assumptions: currentAssumptions, streets: streetAdjacency, settings: effectiveSettings, buffers: estimateBuffers, foundation: foundationAllowanceM, installedHeight: scoutingHeight?.key === additionalKey ? scoutingHeight.value : null, intendedUse: use, scan: propertyScan.result })
  const findings = summary ? summaryFindings(summary) : []
  useEffect(() => {
    // Prune old acknowledgements after a coherent input change. Pending request
    // labels are not input changes and cannot erase unrelated reviews.
    if (!currentAssumptions || !measurementResult || checksPending) return
    setAcknowledgedConflicts(previous => {
      const retained = previous.filter(key => {
        const stored = JSON.parse(key) as unknown[]
        const check = findings.find(item => item.label === stored[1])
        if (!check) return true
        const current = JSON.parse(conflictKey(check)) as unknown[]
        return JSON.stringify(stored.slice(0, 3)) === JSON.stringify(current.slice(0, 3))
      })
      return retained.length === previous.length ? previous : retained
    })
  }, [geometryRevision, placementRevision, currentAssumptions, effectiveSettings, streetAdjacency, estimateBuffers, foundationAllowanceM, scoutingHeight, use, propertyScan.result, checksPending])
  const includedFindings = findings.filter(check => !['checked', 'probable'].includes(check.status) && acknowledgedConflicts.includes(conflictKey(check)))
  const currentAcknowledgements = includedFindings.filter(check => check.status === 'conflict')
  const currentOpenQuestions = includedFindings.filter(check => check.status !== 'conflict')
  const outstandingFindings = findings.filter(check => !['checked', 'probable'].includes(check.status) && !includedFindings.includes(check))
  const readinessBusy = !measurementResult || checksPending
  const reviewReadiness = summary ? { total: findings.length, addressed: findings.length - outstandingFindings.length, busy: readinessBusy, ready: findings.length > 0 && outstandingFindings.length === 0 && !readinessBusy, targetId: outstandingFindings[0]?.targetId } : undefined
  const readinessSignature = JSON.stringify(reviewReadiness)
  const playback = useWalkthrough(visible, stop =>
    stop === 'model' || stop === 'property' || !!measurementResult && !checksPending &&
      (stop !== 'moved' && stop !== 'result' && stop !== 'enquiry' ||
        measurementResult.result.input.placement.centre_xy[0] === Number(movedExamplePosition().x) &&
        measurementResult.result.input.placement.centre_xy[1] === Number(movedExamplePosition().y)) &&
      (stop !== 'result' && stop !== 'enquiry' || use === demoEnquiryAnswers.intendedUse), geometryFailure)
  const playbackActive = !!playback.state && visible
  playbackLayoutRef.current = playbackActive
  const playbackStop = playback.state?.stop
  const playbackRun = playback.state?.run
  const playbackApplied = useRef('')
  useEffect(() => {
    if (!playbackActive || !playbackStop) return
    const key = `${playbackRun}:${playbackStop}`
    if (playbackApplied.current === key) return
    playbackApplied.current = key
    if (playbackStop === 'model') openJourneyStep('model', true, true)
    if (playbackStop === 'property') openJourneyStep('property', true, true)
    if (playbackStop === 'initial' || playbackStop === 'moved') openJourneyStep('placement', true, true)
    if (playbackStop === 'result') {
      setStreetDecisionFor(geometryRevision) // Deliberately unknown; no street roles supplied.
      setDemoAnswers(demoEnquiryAnswers)
      changeIntendedUse(demoEnquiryAnswers.intendedUse, true)
      setProjectSettings(previous => {
        const next = applyIntendedUse(previous, demoEnquiryAnswers.intendedUse)
        return { ...next, evidence: { ...next.evidence, proposed_use: { ...next.evidence.proposed_use, origin: 'demo_supplied', note: 'Garden suite is a demo-supplied scenario, not an inferred property fact.' } } }
      })
      setProjectContext(previous => ({ ...previous, relationship: demoEnquiryAnswers.relationship, nextStep: demoEnquiryAnswers.nextStep }))
      openJourneyStep('checks', true, true)
    }
    if (playbackStop === 'enquiry') openJourneyStep('enquiry', true, true)
  }, [playbackActive, playbackStop, playbackRun])
  useEffect(() => {
    if (!playbackActive) return
    // Navigation outside this mounted assessment is also a takeover. Tab itself
    // is only focus movement; edits and activation cancel before their handlers.
    const takeover = (event: Event) => {
      const target = event.target as Element | null
      if (!target?.closest || target.closest('[data-playback-controls]')) return
      if (event.type === 'pointerdown') { playback.halt(); return }
      if (event.type === 'pointerup') {
        if (target.closest('svg')) window.setTimeout(playback.cancel, 0)
        return
      }
      if (event.type === 'keydown') {
        const key = (event as KeyboardEvent).key
        if (!['Enter', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) return
      }
      playback.cancel()
    }
    for (const event of ['pointerdown', 'pointerup', 'click', 'input', 'change', 'keydown']) document.addEventListener(event, takeover, true)
    return () => { for (const event of ['pointerdown', 'pointerup', 'click', 'input', 'change', 'keydown']) document.removeEventListener(event, takeover, true) }
  }, [playbackActive])
  const currentDemoAnswers = Object.fromEntries(Object.entries(demoAnswers ?? {}).filter(([key, value]) =>
    value === (key === 'streetContext' ? streetDecisionFor === geometryRevision && !streetAdjacency.all_marked && streetAdjacency.edge_ids.length === 0 ? 'Not sure' : '' : key === 'intendedUse' ? use : projectContext[key as 'relationship' | 'nextStep']))) as EnquiryInput['demoAnswers']
  const contextComplete = !!(use.trim() && projectContext.relationship.trim() && projectContext.nextStep.trim())
  const enquiryDoc = contextComplete && !checksPending ? makeEnquiryDoc() : null
  const exportMeasurement: OccupiedMeasurement | null = checksPending ? null : measurementResult ?? (manual?.assessment && manual.site ? {
    site: { case_id: 'manual', label: manual.facts.address || 'User-entered local sketch', site: manual.site }, model,
    widthOrigin: 'user', depthOrigin: 'user', result: { ...manual.assessment, checks: manual.assessment.checks.map(check => ({ ...check, source_feature_ids: [], margin_m: null, comparison: null })) },
  } : null)
  const drawingKey = exportMeasurement ? JSON.stringify([exportMeasurement, currentAssumptions, currentScenario, mode, use, selectedParcelPid]) : ''
  drawingRevision.current = drawingKey
  const drawingAssets = drawingExport?.key === drawingKey ? drawingExport.assets : null
  function generateDrawing(measured: OccupiedMeasurement) {
    const style = getComputedStyle(document.documentElement)
    const token = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback
    const labelled = selectedParcelPid ? { ...measured, site: { ...measured.site, label: `${measured.site.label} · PID ${selectedParcelPid}` } } : measured
    return renderDrawing(placementDrawing(labelled, currentAssumptions, pathway.proposed_use === 'garden_suite' ? currentScenario : null, mode === 'example', {
      ink: token('--ink', '#203238'), danger: token('--danger', '#9a3e35'), parcelFill: token('--map-parcel-fill', '#245b6833'), parcelStroke: token('--map-parcel-stroke', '#245b68'), roofFill: token('--map-roof-fill', '#665a9a55'), roofStroke: token('--map-roof-stroke', '#564881'), zoneFill: token('--map-zone-fill', '#c58a4a33'), zoneStroke: token('--map-zone-stroke', '#91602f'),
    }, enquiryUseQualification(use, pathway.proposed_use)))
  }
  useEffect(() => {
    // Render only after explicit context answers and a current measurement exist.
    // This prepares a local artifact for website handoff without downloading or sending it.
    if (!contextComplete || !exportMeasurement || drawingAssets || typeof Image === 'undefined') return
    let cancelled = false
    setExportBusy(true); setExportMessage('Preparing your approximate placement sketch…')
    const timer = setTimeout(() => { void generateDrawing(exportMeasurement).then(assets => {
      if (!cancelled && drawingRevision.current === drawingKey) { setDrawingExport({ key: drawingKey, assets }); setExportMessage('Placement sketch ready to download or share.') }
    }).catch(error => { if (!cancelled) setExportMessage(error instanceof Error ? error.message : 'Could not prepare drawing. Use the download buttons to retry.') })
      .finally(() => { if (!cancelled) setExportBusy(false) }) }, 300)
    return () => { cancelled = true; clearTimeout(timer); setExportBusy(false) }
  }, [drawingKey, contextComplete])
  if (enquiryDoc && drawingAssets) {
    const paragraphs = ['I have an approximate proposed placement sketch available. Please let me know the best way to share it.']
    enquiryDoc.sections.push({ heading: 'Placement sketch', paragraphs, emailSummary: paragraphs[0], siteDetails: true })
  }
  const reportDoc = hasSite && !checksPending ? screeningDocument(selection, { question, intendedUse: use, timing, budget, access, services, ...projectContext, propertyConcern }, measurementResult, imported, live, manual, mode === 'example', foundationAllowanceM, currentScreening, currentAssumptions, pathway, currentScenario, effectiveSettings, propertyScan.result, model) : null
  if (reportDoc && !checksPending && currentAcknowledgements.length) {
    const paragraphs = currentAcknowledgements.map(check => `${check.label}: ${check.detail} Acknowledged by the user for discussion with the City/provider. The conflict remains unresolved; City agreement or an exception is not established.`)
    reportDoc.sections.push({ heading: 'Acknowledged conflicts for discussion', paragraphs, emailSummary: paragraphs.join(' ') })
  }
  if (reportDoc && currentOpenQuestions.length) {
    const paragraphs = currentOpenQuestions.map(check => `${check.label}: ${statusLabels[check.status]}. ${check.detail} Included by the user as an open question for City/provider discussion; no answer or clearance is established.`)
    reportDoc.sections.push({ heading: 'Open questions included for discussion', paragraphs, emailSummary: paragraphs.join(' ') })
  }
  if (Object.keys(currentDemoAnswers ?? {}).length) {
    const labels = { streetContext: 'street context', intendedUse: 'intended use', relationship: 'relationship', nextStep: 'requested response' }
    const paragraph = `Demo-supplied answers: ${Object.keys(currentDemoAnswers!).map(key => labels[key as keyof typeof labels]).join(', ')}. These illustrate an example enquiry; they are not facts about your property. Other answers retain their stated defaults or user attribution.`
    for (const doc of [enquiryDoc, reportDoc]) if (doc) doc.sections.unshift({ heading: 'Example answers', paragraphs: [paragraph], emailSummary: paragraph })
  }
  const draftText = enquiryDoc ? enquiryPlainText(enquiryDoc) : ''
  function applyBuffer(edgeId: string, value: number) {
    if (checksPending || buffersPending || !geometryRevision || !currentAssumptions || !summary?.checks.some(check => check.resolutions?.some(item => item.edgeId === edgeId && item.bufferM === value))) return
    setBufferSuggestion({ edgeId, value, token: ++suggestionSequence.current, geometryRevision, placementRevision })
    setReadyFor(null)
  }
  function applyMove(edgeId: string, distance: number) {
    if (checksPending || buffersPending || !geometryRevision || !summary?.checks.some(check => check.resolutions?.some(item => item.edgeId === edgeId && item.moveM === distance))) return
    if (edgeId === 'main-building' && buildingMove && distance === buildingMove.distance) {
      setMoveSuggestion({ dx: buildingMove.dx, dy: buildingMove.dy, token: ++suggestionSequence.current, geometryRevision })
      setReadyFor(null)
      openJourneyStep('placement')
      return
    }
    const edge = currentAssumptions?.edges.find(edge => edge.id === edgeId)
    const edges = currentAssumptions?.edges ?? []
    if (!edge || !distance || edges.length !== 4) return
    const vx = edge.end[0] - edge.start[0], vy = edge.end[1] - edge.start[1], length = Math.hypot(vx, vy)
    if (!length) return
    const cx = edges.reduce((sum, item) => sum + item.start[0], 0) / edges.length
    const cy = edges.reduce((sum, item) => sum + item.start[1], 0) / edges.length
    const direction = (-vy * (cx - edge.start[0]) + vx * (cy - edge.start[1])) >= 0 ? 1 : -1
    setMoveSuggestion({ dx: -vy / length * direction * distance, dy: vx / length * direction * distance, token: ++suggestionSequence.current, geometryRevision })
    setReadyFor(null)
    openJourneyStep('placement')
  }
  const nextJourneyStep: JourneyStep = !placementComplete ? 'placement' : journeyStep === 'checks' ? 'enquiry' : journeyStep === 'purpose' ? 'checks' : journeyStep === 'details' ? 'purpose' : boundaryMode === 'front' ? 'boundaries' : boundaryMode === 'waterfront' ? 'details' : boundaryMode === 'rear' ? 'details' : streetAdjacency.all_marked ? 'boundaries' : 'streets'
  const continuation = nextJourneyStep === 'placement' ? { label: 'Place model', hint: 'Place the unit on the map to continue.' }
    : nextJourneyStep === 'streets' ? { label: 'Mark street edges', hint: 'Position saved. Next, mark the street edges you know, or choose Not sure.' }
    : nextJourneyStep === 'boundaries' ? { label: 'Review boundaries', hint: 'Review suggested boundary roles and buffers, or leave uncertain roles unknown. Save any buffer edits before continuing.' }
    : nextJourneyStep === 'details' ? { label: 'Review property details', hint: 'Next, answer the property questions you know. You can leave the rest unknown.' }
    : nextJourneyStep === 'purpose' ? { label: 'Intended purpose', hint: 'Next, choose how you would use the unit, or keep Not sure.' }
    : nextJourneyStep === 'enquiry' ? { label: 'Prepare enquiry', hint: 'Review concerns or carry them as open questions into your enquiry. Continuing does not resolve a concern.' }
    : { label: 'Review quick checks', hint: 'Next, review what looks promising and which questions to include in your enquiry.' }
  const mapConcerns = findings.filter(check => check.status === 'conflict' && ['Distance to boundaries', 'Distance from the main building', 'Front boundary distance', 'Located behind the main building', 'Share of the rear yard'].includes(check.label))
  const placementResolutions = findings.flatMap(check => check.resolutions ?? [])
  const placementConcernsPanel = mapConcerns.length || placementResolutions.length ? <><p hidden={!checksPending} role="status">Updating checks · previous concerns below are awaiting the new measurements.</p><ul>{mapConcerns.map(check => <li key={check.label}><strong>{check.label}: </strong>{check.detail}</li>)}</ul>{placementResolutions.length > 0 && <FindingResolutions resolutions={placementResolutions} onApplyBuffer={applyBuffer} onMove={applyMove} disabled={checksPending || buffersPending} />}</> : undefined
  function continueWithPlacementConcerns() {
    if (checksPending) return
    const concerns = findings.filter(check => check.status === 'conflict' && (check.label === 'Space within the property' || mapConcerns.includes(check)))
    setAcknowledgedConflicts(previous => [...new Set([...previous, ...concerns.map(conflictKey)])])
    advanceJourneyStep(nextJourneyStep)
  }
  function acknowledgeFinding(check: import('../conditional_screening/HomeownerSummary').SummaryCheck) {
    if (checksPending) return
    const key = conflictKey(check)
    const removing = acknowledgedConflicts.includes(key)
    setAcknowledgedConflicts(previous => removing ? previous.filter(item => item !== key) : [...previous, key])
    setReadyFor(null)
    if (removing) return
    const index = findings.findIndex(item => item.label === check.label)
    const next = [...findings.slice(index + 1), ...findings.slice(0, index)].find(item =>
      !['checked', 'probable'].includes(item.status) && !acknowledgedConflicts.includes(conflictKey(item)))
    requestAnimationFrame(() => focusSummaryTarget(document, next?.targetId ?? 'builder-enquiry-title', 'start'))
  }
  const summaryPanel = summary && <>{!checksRevealed && <p className="builder-checks-preview">Your preliminary checks will appear after property details and intended purpose.</p>}<div id="builder-checks-disclosure" hidden={!checksRevealed}><HomeownerSummary updating={displayResult.updating} useQualification={displayResult.result?.useQualification} onApplyBuffer={applyBuffer} onMove={applyMove} actionsDisabled={buffersPending || checksPending} acknowledged={includedFindings.map(check => check.label)} onAcknowledge={acknowledgeFinding} summary={summary} onNavigate={navigateFlag} continuation={{ ...continuation, onContinue: () => advanceJourneyStep(nextJourneyStep) }} />{journeyStep === 'checks' && <FloatingNext active sectionId="builder-quick-checks"><div className="homeowner-summary__continue"><p>{continuation.hint}</p><button className="builder-continue" type="button" disabled={buffersPending || checksPending} onClick={() => advanceJourneyStep(nextJourneyStep)}>Next: {continuation.label}<span aria-hidden="true"> →</span></button></div></FloatingNext>}</div></>
  const placementContinuation = summary && ['placement', 'streets', 'boundaries'].includes(journeyStep) && <div className="homeowner-summary__continue"><p className="placement-action-status">{buffersPending ? 'Save planning buffers before continuing' : journeyStep === 'streets' ? streetAdjacency.all_marked ? `${streetAdjacency.edge_ids.length} street${streetAdjacency.edge_ids.length === 1 ? '' : 's'} marked · saved` : 'Mark the streets you know, or choose Not sure. Unknown street context can continue.' : journeyStep === 'boundaries' ? 'Review or accept suggested roles and buffers. Unknown roles can remain unresolved; save any buffer edits to continue.' : continuation.hint}</p><div className="step-action"><button className="builder-continue" type="button" disabled={buffersPending} onClick={() => advanceJourneyStep(nextJourneyStep)}>Next: {continuation.label}<span aria-hidden="true"> →</span></button><StepInfo label={continuation.label}>{continuation.hint} You can continue with open questions. Existing findings and unanswered questions remain in your enquiry.</StepInfo></div></div>
  function changeProperty() {
    if (mode === 'live') { siteEdited(); setLive(null); setPropertyReset(value => value + 1) }
    else changeMode('live')
    setExpanded({ property: true, placement: false, next: false, email: false })
    requestAnimationFrame(() => focusSummaryTarget(document, 'sd-address'))
  }
  function advanceJourneyStep(step: JourneyStep) {
    if (journeyStep === 'streets' && ['boundaries', 'details', 'purpose', 'checks', 'enquiry', 'email'].includes(step) && !streetAdjacency.all_marked && streetDecisionFor !== geometryRevision) { setStreetSkipTarget(step); return }
    if (journeyStep === 'boundaries') setReviewedBoundariesFor(boundaryReviewRevision)
    if (journeyStep === 'details') setReviewedDetailsFor(detailsReviewRevision)
    if (journeyStep === 'purpose') setReviewedPurposeFor(use)
    if (journeyStep === 'checks') setReviewedChecksFor(reviewRevision)
    openJourneyStep(step)
  }
  function openJourneyStep(step: JourneyStep, answered = false, playbackTransition = false) {
    if (!answered && zoningCase && ['boundaries', 'details', 'purpose', 'checks', 'enquiry', 'email'].includes(step) && !streetAdjacency.all_marked && streetDecisionFor !== geometryRevision) { setStreetSkipTarget(step); return }
    if (!propertyComplete && step !== 'model' && step !== 'property') step = 'property'
    if (!zoningCase && (step === 'streets' || step === 'boundaries' || step === 'details')) step = 'placement'
    setJourneyStep(step)
    if (step === 'checks') setChecksRevealed(true)
    if (step === 'streets') changeBoundaryMode('front')
    if (step === 'boundaries') changeBoundaryMode('rear', true)
    if (step === 'placement' || step === 'details' || step === 'purpose') setBoundaryMode('place')
    setExpanded({ property: step === 'property', placement: !['property', 'model', 'enquiry', 'email'].includes(step), next: step === 'enquiry', email: step === 'email' })
    const targets: Record<JourneyStep, string> = { model: 'builder-title', property: 'sd-address', placement: 'builder-placement-title', streets: 'placement-action-front', boundaries: 'placement-action-rear', details: 'builder-property-details', purpose: 'builder-intended-use', checks: 'builder-quick-checks', enquiry: 'builder-enquiry-title', email: contextComplete ? 'builder-provider-website' : 'builder-contact-context' }
    if (playbackTransition) return // Playback owns one scroll after the target renders.
    requestAnimationFrame(() => {
      if (playbackActive || !visible) return
      focusSummaryTarget(document, step === 'details' ? 'building-type' : targets[step], 'start')
      if (step === 'purpose') document.getElementById('builder-purpose')?.scrollIntoView({ block: 'center', behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
      if (step === 'checks') { const details = document.querySelector<HTMLDetailsElement>('.homeowner-summary__checks'); if (details) details.open = true }
    })
  }
  function navigateFlag(target: string) {
    const propertyFact = ['building-type', 'existing-suites', 'principal-building', 'waterfront-lot', 'zsa-floor-area', 'separation-measurement-choice', 'scouting-height', 'scouting-area-buffer'].includes(target)
    if (!propertyFact && !['street-side', 'boundary-roles', 'boundary-offsets', 'placement-map', 'builder-intended-use'].includes(target)) setChecksRevealed(true)
    setJourneyStep(propertyFact ? 'details' : target === 'street-side' ? 'streets' : target === 'boundary-roles' || target === 'boundary-offsets' ? 'boundaries' : target === 'placement-map' ? 'placement' : 'checks')
    if (propertyFact || target === 'placement-map') setBoundaryMode('place')
    if (target === 'boundary-roles' || target === 'boundary-offsets') { changeBoundaryMode('rear'); setBoundaryEditorOverride(true) }
    if (target === 'street-side') { changeBoundaryMode('front'); target = 'placement-action-front' }
    if (target === 'builder-intended-use') { openJourneyStep('purpose'); return }
    if (target === 'zoning-retry') { setZoningRetry(value => value + 1); return }
    if (target === 'retry-scenario') { setScenarioRetry(value => value + 1); return }
    if (target === 'retry-screening') { setConditionalRetry(value => value + 1); return }
    setExpanded({ property: false, placement: true, next: false, email: false })
    requestAnimationFrame(() => focusSummaryTarget(document, target, 'start'))
  }
  const placementSummary = currentMeasurement
    ? `Measured observation · ${currentMeasurement.checks.some(check => check.relation === 'outside' || check.relation === 'touches' || check.relation === 'positive_area_overlap') ? 'conflict observed' : 'review captured geometry'}${measurementResult?.result.checks.some(check => check.comparison === 'shortfall') ? ' · clearance shortfall' : ''} · ${currentScreening ? 'conditional candidate zoning checks available' : 'zoning comparison unresolved'}. Expand to review distances and findings.`
    : 'No current measurement. Placement can remain unknown in your enquiry.'

  const enquiryReady = !!enquiryDoc && readyFor === draftText
  const progressCallback = useRef(onProgressChange)
  progressCallback.current = onProgressChange
  useEffect(() => { progressCallback.current?.({ reviewReadiness, checksAvailable: checksRevealed, model: true, property: propertyComplete, placement: placementComplete, streets: !!geometryRevision && (streetAdjacency.all_marked || streetDecisionFor === geometryRevision), boundaries: reviewedBoundariesFor === boundaryReviewRevision, details: reviewedDetailsFor === detailsReviewRevision, purpose: reviewedPurposeFor === use, checks: reviewedChecksFor === reviewRevision, enquiry: enquiryReady, email: !!draftText && (websiteRequestedFor === draftText || emailRequestedFor === JSON.stringify([draftText, recipient, includeSiteDetails])), handoff: websiteRequestedFor === draftText ? 'website' : 'email', current: journeyStep, mapAvailable: propertyComplete ? !!zoningCase : undefined }) }, [checksRevealed, zoningCase, propertyComplete, placementComplete, enquiryReady, geometryRevision, streetDecisionFor, streetAdjacency.all_marked, reviewedBoundariesFor, reviewedDetailsFor, reviewedChecksFor, reviewRevision, detailsReviewRevision, boundaryReviewRevision, reviewedPurposeFor, use, websiteRequestedFor, emailRequestedFor, draftText, recipient, includeSiteDetails, journeyStep, readinessSignature])
  useEffect(() => { setReadyFor(null) }, [draftText])
  const emailBody = enquiryDoc ? enquiryEmailBody(enquiryDoc, includeSiteDetails) : ''
  const emailSubject = enquiryDoc?.example ? `Saved example only — ${model.name} question` : includeSiteDetails ? enquiryDoc?.title ?? `${model.name} feasibility enquiry` : `${model.name} feasibility enquiry`
  useEffect(() => { setEmailMessage('') }, [emailBody, emailSubject])
  const emailTooLong = !!enquiryDoc && (!emailDraftUrl('mailto', recipient, emailSubject, emailBody) || !emailDraftUrl('gmail', recipient, emailSubject, emailBody)) && validRecipient(recipient)
  const shortEmailBody = enquiryDoc?.example
    ? `SAVED EXAMPLE ONLY — not my property. I will paste the full reviewed ${model.name} enquiry into this draft before sending.`
    : `I have prepared a ${model.name} enquiry. I will paste the full reviewed text into this draft before sending.`
  function openDraft(kind: 'mailto' | 'gmail') {
    if (checksPending || !enquiryDoc) return
    const url = emailDraftUrl(kind, recipient, emailSubject, emailTooLong ? shortEmailBody : emailBody)
    if (!url) { setEmailMessage('Enter one valid email address without line breaks.'); return }
    try {
      if (kind === 'mailto') window.location.href = url
      else window.open(url, '_blank', 'noopener,noreferrer')
      setEmailRequestedFor(JSON.stringify([draftText, recipient, includeSiteDetails]))
      setWebsiteRequestedFor(null)
      setJourneyStep('email')
      setEmailMessage(emailTooLong
        ? 'Short placeholder draft requested. If no compose window opens, copy the full email body above into a new message. Nothing was sent.'
        : 'Email draft requested. If no compose window opens, copy the email body above into a new message. Nothing was sent.')
    } catch {
      setEmailMessage('The browser could not request an email draft. Copy the email body above into a new message. Nothing was sent.')
    }
  }
  async function copyEmailBody() {
    if (checksPending || !enquiryDoc) return
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(emailBody)
      setEmailMessage('Full email body copied.')
    } catch { setEmailMessage('Clipboard unavailable. Select and copy the email body above.') }
  }
  const technicalEvidence = { schema_version: 'builder-evidence.v1', demo_answer_provenance: Object.fromEntries(Object.entries(currentDemoAnswers ?? {}).map(([key, value]) => [key, { value, origin: 'demo_supplied' }])), evaluation_state: checksPending ? 'updating' : 'current', planning_comparison_scope: { selected_use: pathway.proposed_use, garden_suite_comparisons_applied: pathway.proposed_use === 'garden_suite', raw_scenario_results: 'Exploratory candidate comparisons; withheld from homeowner findings and recipient documents when intended use is unknown or outside the garden-suite scenario.' }, enquiry_inputs: { question, intendedUse: use, timing, budget, access, services, ...projectContext }, model_catalogue: { snapshot_id: modelSnapshot(model), model }, acknowledged_conflicts_for_discussion: currentAcknowledgements, open_questions_for_discussion: currentOpenQuestions, review_readiness: reviewReadiness, foundation_scenario: { allowance_m: foundationAllowanceM, basis: 'planning_assumption', used_in_preliminary_height: currentScenario?.additional_checks?.some(check => check.id === 'height' && check.basis.startsWith('advertised height')) ?? false }, selection, live, manual, example: mode === 'example' ? exampleCase : null, measurement: measurementResult, zoning_site_assumptions: currentAssumptions, project_settings: zoningCase ? effectiveSettings : null, municipal_zoning_lookup: currentZoning, municipal_zoning_error: currentZoningError || null, property_scan: propertyScan.result, property_scan_error: propertyScan.error || null, placement_scenario_request: scenarioRequest, placement_scenario_result: currentScenario, conditional_screening: currentScreening }
  const exportIdentity = JSON.stringify([geometryRevision, model.model_id, modelSnapshot(model), checksPending, enquiryDoc, reportDoc, drawingKey, technicalEvidence])
  const latestExportIdentity = useRef(exportIdentity); latestExportIdentity.current = exportIdentity
  function downloadMarkdown(report = false) {
    if (checksPending) return
    if (!report) { void exportPlacement('markdown'); return }
    if (!reportDoc) return
    downloadFile('prefab-supporting-report.md', enquiryMarkdown(reportDoc) + '\nComplete coordinates, inputs and calculations are available in the separate technical evidence JSON download.\n', 'text/markdown;charset=utf-8')
  }
  async function exportPlacement(kind: 'enquiry-pdf' | 'png' | 'pdf' | 'package' | 'email' | 'markdown') {
    if (!contextComplete || !enquiryDoc || checksPending || exportBusy) return
    if (kind === 'email' && !validRecipient(recipient)) { setExportMessage('Enter a valid recipient email.'); return }
    const capturedKey = drawingKey
    const capturedIdentity = exportIdentity
    const assertCurrent = () => { if (latestExportIdentity.current !== capturedIdentity) throw new Error('Inputs changed during export. Save the updated enquiry when checks finish.') }
    setExportBusy(true); setExportMessage('Preparing export…')
    try {
      let assets = drawingAssets
      const attach = kind !== 'email' || includeSiteDetails
      if (exportMeasurement && attach && !assets) {
        assets = await generateDrawing(exportMeasurement)
        if (drawingRevision.current !== capturedKey) throw new Error('Placement changed during export. Generate the current sketch again.')
      }
      assertCurrent()
      if (kind === 'enquiry-pdf') {
        const bytes = await renderEnquiryPdf(enquiryDoc, assets)
        assertCurrent()
        downloadFile('prefab-enquiry.pdf', new Uint8Array(bytes).buffer, 'application/pdf')
      } else if (kind === 'png' || kind === 'pdf') {
        if (!assets) throw new Error('Measure a current placement first.')
        downloadFile(`prefab-placement.${kind}`, new Uint8Array(assets[kind]).buffer, kind === 'png' ? 'image/png' : 'application/pdf')
      } else if (kind === 'markdown') {
        downloadFile('prefab-enquiry.md', enquiryMarkdown(withPlacementSketch(enquiryDoc, assets ? 'An approximate proposed placement sketch is included below; it is not a survey or approved site plan.' : null)) + (assets ? `\n## Approximate proposed placement\n\n![Approximate proposed placement](${assets.pngUrl})\n` : ''), 'text/markdown;charset=utf-8')
      } else if (kind === 'email') {
        const attachedDoc = withPlacementSketch(enquiryDoc, assets && includeSiteDetails ? 'I’ve attached an approximate proposed placement sketch for discussion. It is not a survey or approved site plan.' : null)
        const body = enquiryEmailBody(attachedDoc, includeSiteDetails)
        downloadFile('prefab-enquiry.eml', attachedEmail(recipient, emailSubject, body, assets && includeSiteDetails ? assets.png : undefined), 'message/rfc822')
        setEmailRequestedFor(JSON.stringify([draftText, recipient, includeSiteDetails])); setWebsiteRequestedFor(null)
      } else {
        const { zipSync } = await import('fflate')
        assertCurrent()
        const files = enquiryPackageFiles(enquiryDoc, reportDoc, [...preparationChecklist({ intendedUse: use, timing, budget, access, services, ...projectContext }), ...currentOpenQuestions.map(item => `${item.label}: unresolved; included for discussion.`)], technicalEvidence, assets)
        downloadFile('prefab-enquiry-package.zip', new Uint8Array(zipSync(files)).buffer, 'application/zip')
      }
      if (assets) setDrawingExport({ key: capturedKey, assets })
      setExportMessage(kind === 'email' ? 'Unsent .eml draft downloaded. Open it in your email app and check the recipient, body and attachment before sending. Some clients open .eml as a message rather than an editable draft; use the text and drawing downloads if needed.' : 'Export downloaded. Review the approximate drawing and enquiry before sharing.')
    } catch (error) { setExportMessage(error instanceof Error ? error.message : 'Export failed. Please try again.') }
    finally { setExportBusy(false) }
  }
  const playbackCaptions = {
    model: 'Explore aux box Model 300: nominal provider dimensions, unreviewed.',
    property: 'City of Victoria Parcel 87: saved, partial map outlines; this is not your property.',
    initial: 'Check the starting position against the mapped parcel and roofline.',
    moved: 'Move away from the mapped overlap. The current evaluator checks this new position.',
    result: `${measurementResult?.result.checks.some(check => check.kind === 'containment' && check.status === 'observed' && check.relation === 'contained') && measurementResult.result.checks.filter(check => check.kind === 'building_overlap').every(check => check.status === 'observed' && check.relation === 'separate') ? 'This position avoids the mapped overlap. ' : 'Inspect the current placement findings. '}Garden suite is an example scenario. Street context stays Not sure; planning questions still need review.`,
    enquiry: 'Review this editable, unsent enquiry. The builder can advise which information to gather next.',
  }
  const playbackScrolled = useRef('')
  useEffect(() => {
    const expectedStep = playbackStop === 'initial' || playbackStop === 'moved' ? 'placement' : playbackStop === 'result' ? 'checks' : playbackStop
    if (journeyStep !== expectedStep) return
    const scrollKey = `${playbackRun}:${playbackStop}`
    if (playbackScrolled.current === scrollKey) return
    if (!playbackActive || !playbackStop || playback.state?.paused) return
    const target = playbackStop === 'model' ? 'builder-title' : playbackStop === 'property' ? 'builder-property-title' : playbackStop === 'result' ? 'builder-quick-checks' : playbackStop === 'enquiry' ? 'builder-unsent-preview' : 'placement-map'
    const frame = requestAnimationFrame(() => {
      if (!playbackLayoutRef.current || !journeyVisible.current) return
      const element = target === 'placement-map' ? document.querySelector<HTMLElement>('#placement-map svg') : document.getElementById(target)
      if (element && !element.closest('[hidden]')) { playbackScrolled.current = scrollKey; element.scrollIntoView?.({ block: 'start', behavior: 'auto' }) }
    })
    return () => { if (typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(frame) }
  }, [playbackActive, playbackStop, playbackRun, playback.state?.paused, journeyStep, expanded, !!enquiryDoc])
  return <PlaybackLayout.Provider value={playbackActive}><div className="builder-demo" data-playback={playbackActive || undefined}>
    {playbackActive && <section data-playback-controls className="builder-playback" aria-label="Walkthrough controls">
      <p aria-live="polite">{playback.state!.finished ? 'Walkthrough complete. ' : ''}{playbackCaptions[playbackStop!]}{geometryFailure ? ' Placement check unavailable. Playback paused; retry or take over.' : !['model', 'property'].includes(playbackStop!) && (!measurementResult || checksPending) ? ' Waiting for current checks; you can pause, retry in the assessment, or take over.' : ''}</p>
      <div className="sr-actions">
        <button hidden={playback.state!.finished} type="button" onClick={playback.pause}>{playback.state!.paused ? 'Resume' : 'Pause'}</button>
        {playback.reducedMotion && !playback.state!.finished && <button type="button" disabled={!playback.ready} onClick={playback.next}>Next</button>}
        <button hidden={playback.state!.finished} type="button" onClick={playback.skip}>Skip to result</button>
        <button type="button" onClick={() => { playback.cancel(); requestAnimationFrame(() => focusSummaryTarget(document, playbackStop === 'enquiry' ? 'builder-use' : playbackStop === 'model' ? 'builder-model-choice' : 'placement-map')) }}>Let me try</button>
      </div>
    </section>}
    {mode === 'example' && !playbackActive && <button type="button" onClick={() => setPendingEntry({ example: true, modelId: 'aux-300', walkthrough: true })}>Replay walkthrough</button>}
    <dialog ref={streetDialog} aria-labelledby="street-context-title" aria-describedby="street-context-reason" className="builder-street-dialog" onCancel={() => setStreetSkipTarget(null)}>
      <h2 id="street-context-title">Street context needed</h2>
      <p id="street-context-reason">Street frontage can affect legal front, side and rear classifications, required distances, and where a garden suite may be placed. If you’re unsure, you can continue—but checks that depend on street context will remain unresolved.</p>
      <p>Your marks record your observations; they do not establish legal frontage.</p>
      <div className="builder-street-dialog-actions">
        <button type="button" onClick={() => { setStreetSkipTarget(null); openJourneyStep('streets'); }}>Mark streets</button>
        <button type="button" onClick={() => { const target = streetSkipTarget; toggleStreet(null); setStreetSkipTarget(null); if (target) openJourneyStep(target, true); }}>I’m not sure—continue</button>
        <button type="button" onClick={() => { const target = streetSkipTarget; clearDemoAnswer('streetContext'); setStreetDecisionFor(geometryRevision); setStreetMarks({ revision: geometryRevision, data: { edge_ids: [], all_marked: true, completion_method: 'explicit_confirmation', origin: 'user' } }); setReadyFor(null); setStreetSkipTarget(null); if (target) openJourneyStep(target, true); }}>No edges border a street</button>
      </div>
    </dialog>
    <dialog ref={entryDialog} onCancel={() => { setPendingEntry(null); requestAnimationFrame(() => document.getElementById('builder-model-choice')?.focus()) }} aria-labelledby="example-replace-title">
      <h2 id="example-replace-title">Open the example assessment?</h2>
      <p>This replaces your selected model, property, placement and property review answers with Model 300 on a saved Victoria property. Example inputs replace the local project answers too. Nothing is sent; you can keep your current assessment.</p>
      <div className="sr-actions"><button type="button" autoFocus onClick={() => { entryDialog.current?.close(); setPendingEntry(null); document.getElementById('builder-model-choice')?.focus() }}>Keep current assessment</button><button type="button" onClick={() => { if (pendingEntry) applyEntry(pendingEntry); entryDialog.current?.close(); setPendingEntry(null); document.getElementById('builder-model-choice')?.focus() }}>Load example assessment</button></div>
    </dialog>
    <section className="builder-hero" id="builder-model" aria-labelledby="builder-title">
      <label htmlFor="builder-model-choice">Choose a model</label>
      <select id="builder-model-choice" value={modelId} onChange={event => switchModel(event.target.value)}>{journeyCatalogue.models.map(item => <option key={item.model_id} value={item.model_id}>{item.provider} · {item.name}</option>)}</select>
      <p className="eyebrow">{mode === 'example' ? 'Example assessment' : 'Assessment'} · {model.provider}</p>
      <h1 id="builder-title">Explore {model.name} on your site</h1>
      <p>Explore a placement, review potential concerns, and prepare a question for the provider.</p>
      <p className="notice">Preliminary exploration · nothing is sent automatically.</p>
      <p><strong>{model.name}</strong> · {original('nominal_exterior_width')} × {original('nominal_exterior_depth')} · advertised height {original('advertised_overall_height')}. Provider dimensions are unreviewed.</p>
      <details className="builder-model-overview"><summary>About {model.name} · photos, price and specifications</summary>
      <ModelImage model={model} />
      <PriceTiming model={model} />
      {model.model_id === 'wcch-ch-studio' && <p className="notice">Observational footprint comparison only. Permanent dwelling suitability is unconfirmed; ask West Coast Container Homes about this exact configuration before pursuing residential use.</p>}
      <details><summary>Configuration and what to confirm next</summary><p>{model.configuration}</p><p>{model.intended_use_note}</p><p>{model.installation_note}</p><ul>{model.missing_facts.map(item => <li key={item}>{item}</li>)}</ul><p>Public-source observations, unreviewed. Demo availability is separate from accepted data publication.</p></details>
      <details className="builder-model-details"><summary>Model photos, specifications and sources</summary>
      <div className="builder-specs" aria-label="Captured model information">
        <div><strong>{original('nominal_exterior_width')} × {original('nominal_exterior_depth')}</strong><span>Provider nominal exterior rectangle · {metres('nominal_exterior_width')} × {metres('nominal_exterior_depth')}</span></div>
        <div><strong>{original('advertised_overall_height')}</strong><span>Advertised exterior height; installed regulatory height and datum unknown</span></div>
        <div><strong>{original('manufacturer_footprint')}</strong><span>Provider footprint; roof projections and regulatory area unverified</span></div>
      </div>
      <p className="metadata">{model.provider} · {model.name} public product page · captured {readableDate(model.sources[0]?.captured_at)} · {model.review_status}; manufacturer revision unknown. <a href={model.provider_url} target="_blank" rel="noreferrer">Provider source page</a>.</p>
      <p className="metadata">{model.footprint_note} {model.height_note} {model.service_area_note}</p>
      <TechnicalDetails title="Catalogue source and exact model record"><pre>{JSON.stringify({ snapshot_id: modelSnapshot(model), model }, null, 2)}</pre></TechnicalDetails>
      </details>
      </details>
    </section>

    {checksPending && <p role="status">Updating checks. {summary ? 'Previous findings are shown for reference; ' : ''}copy and save will use the updated results when ready.</p>}
    <EnquiryRecovery enquiry={!checksPending && (expanded.next || enquiryReady) ? draftText : null} report={reportDoc ? enquiryPlainText(reportDoc) : null} technicalEvidence={JSON.stringify(technicalEvidence, null, 2)} />
    <section className="builder-stage" id="builder-property" aria-labelledby="builder-property-title">
    <p className="eyebrow">Property</p><h2 id="builder-property-title">Could this fit on your property?</h2>
    <p>{propertyComplete ? (mode === 'example' ? 'Saved Victoria example selected.' : live ? live.address.label : `${manual?.facts.address || selection?.candidate?.address.value || selection?.manual.address.value || 'Site description'} · user-supplied; unverified.`) : 'Choose an address result or confirm a manual site description to continue.'}</p>
    {propertyComplete && <button type="button" aria-expanded={expanded.property} aria-controls="builder-property-content" onClick={() => toggleStep('property')}>{expanded.property ? 'Collapse property' : 'Review or change property'}</button>}
    <div id="builder-property-content" hidden={propertyComplete && !expanded.property}>
    {mode === 'live' && <SiteDiscovery autoProceed resetKey={propertyReset} inspectKey={propertyInspect} onConfirm={next => { siteEdited(); setLive(next) }} onManual={() => changeMode('manual')} />}
    {mode === 'example' && <p>Example property—not your property. <button type="button" onClick={() => changeMode('live')}>Enter your address instead</button></p>}
    {mode === 'manual' && <button type="button" onClick={() => changeMode('live')}>Back to address search</button>}
    {mode === 'retained' && <SitePreparation draft={draft} onDraftChange={next => { setDraft(next); setReadyFor(null) }} selection={selection}
      onEdit={siteEdited} onConfirm={next => { setSelection(next); setImported(false); setMeasurementResult(null); setReadyFor(null); setRevision(value => value + 1) }} />}
      {mode === 'manual' && <ManualSiteInput onChange={value => { if (JSON.stringify(value) !== JSON.stringify(manual)) { setManual(value); setReadyFor(null) } }} footprint={{ widthM: Number(measurement('nominal_exterior_width')?.quantity?.value) || null, depthM: Number(measurement('nominal_exterior_depth')?.quantity?.value) || null, label: `${model.provider} ${model.name} · unreviewed nominal dimensions` }} />}
      {mode === 'manual' && hasSite && <button type="button" onClick={() => setManualConfirmedFor(manualSignature)} disabled={propertyComplete}>Confirm my site description</button>}
    </div>
    </section>
    {!propertyComplete && <p className="builder-journey-preview">Find property → Place unit → Review → Contact provider</p>}
    {propertyComplete && live && !expanded.property ? <SelectedProperty value={live} onChangeProperty={changeProperty} onInspectAlternatives={() => { setPropertyInspect(value => value + 1); setExpanded(previous => ({ ...previous, property: true })); setJourneyStep('property'); requestAnimationFrame(() => focusSummaryTarget(document, 'sd-parcels')); }} /> : propertyComplete && !live && <div className="builder-selected-property"><strong>Property: {mode === 'example' ? 'Saved Victoria example · not your property' : manual?.facts.address || 'User-supplied site'}</strong><span>Approximate and unreviewed</span><button type="button" onClick={changeProperty}>Wrong property? Change</button></div>}
    <section hidden={!propertyComplete} className="builder-stage" id="builder-placement" aria-labelledby="builder-placement-title">
      <p className="eyebrow">Placement</p><h2 id="builder-placement-title">Explore one approximate placement</h2>
      <p>{propertyComplete ? zoningCase ? 'Place the unit and see what is worth exploring.' : placementSummary : 'Choose a property to explore placement.'}</p>
      <button type="button" aria-expanded={expanded.placement && propertyComplete} aria-controls="builder-placement-content" disabled={!propertyComplete} onClick={() => toggleStep('placement')}>{expanded.placement ? 'Collapse placement' : 'Explore placement'}</button>
      <div id="builder-placement-content" hidden={!expanded.placement || !propertyComplete}>
      {mode === 'manual' && <p>Your manual sketch and placement controls are in Property. Reopen that step to adjust them.</p>}

      {hasSite && <EvidenceAtFooter targetId={zoningCase ? 'intended-purpose-below-map' : undefined}><section className="builder-stage" id="builder-purpose" aria-labelledby="builder-purpose-title" hidden={!['purpose', 'checks', 'enquiry', 'email'].includes(journeyStep)}>
        <h3 id="builder-purpose-title">Intended purpose</h3>
        <p>{use || 'Not answered yet. You can choose Not sure.'}</p>
        {journeyStep !== 'purpose' && <button type="button" onClick={() => openJourneyStep('purpose')}>Review intended purpose</button>}
        <div hidden={journeyStep !== 'purpose'}>
          <IntendedUseControl value={use} onChange={changeIntendedUse} />
          <FloatingNext active={journeyStep === 'purpose'} sectionId="builder-purpose"><div className="homeowner-summary__continue"><p>Choose an intended use if known, or keep Not sure or unanswered and continue. Dependent planning checks remain unresolved.</p><button className="builder-continue" type="button" onClick={() => advanceJourneyStep(zoningCase ? 'checks' : 'enquiry')}>Next: {zoningCase ? 'Review quick checks' : 'Prepare enquiry'}<span aria-hidden="true"> →</span></button></div></FloatingNext>
        </div>
      </section></EvidenceAtFooter>}
      {mode === 'example' && <ExampleProperty onFailureChange={setGeometryFailure} playbackPosition={playbackStop === 'moved' ? { token: playbackRun!, position: movedExamplePosition() } : undefined} model={model} showPlacementConcerns={journeyStep === 'boundaries'} placementConcerns={placementConcernsPanel} onContinueUnresolved={checksPending ? undefined : continueWithPlacementConcerns} moveSuggestion={moveSuggestion?.geometryRevision === geometryRevision ? moveSuggestion : undefined} evidenceTargetId="builder-geometry-evidence" key={revision} placementContinuation={placementContinuation} placementSummary={summaryPanel} boundaryInteraction={boundaryInteraction} onAssessmentPending={setGeometryPending} onMeasurement={value => { setMeasurementResult(value); setReadyFor(null) }} />}
      {mode === 'live' && (liveCase ? <OccupiedLots catalogue={journeyCatalogue} key={revision} showPlacementConcerns={journeyStep === 'boundaries'} placementConcerns={placementConcernsPanel} onContinueUnresolved={checksPending ? undefined : continueWithPlacementConcerns} placementContinuation={placementContinuation} placementSummary={summaryPanel} moveSuggestion={moveSuggestion?.geometryRevision === geometryRevision ? moveSuggestion : undefined} evidenceTargetId="builder-geometry-evidence" compactPlacement suppliedCase={liveCase} boundaryInteraction={boundaryInteraction} allowedModelIds={[MODEL_ID]} initialModelId={MODEL_ID} onAssessmentPending={setGeometryPending} onMeasurement={value => { setMeasurementResult(value); setReadyFor(null) }} showHandoff={false} /> : <p>Select a Victoria property above to open its captured parcel sketch. Available geometry is approximate and unreviewed.</p>)}

    {zoningCase && <><EvidenceAtFooter targetId="builder-rule-evidence"><section className="builder-placement-results" aria-label="Current placement results">
      <details className="builder-how-checked"><summary>Candidate rules, assumptions and exact evidence</summary>
        <ConditionalScreen compact result={currentScreening} busy={!!requestKey && conditionalBusy && !currentScreening} error={currentScreeningError} onRetry={() => setConditionalRetry(value => value + 1)} boundaryEvidence={<PlacementScenarios assumptions={currentAssumptions} request={scenarioRequest} result={currentScenario} legalResult={currentScreening} busy={!!scenarioKey && scenarioBusy && !currentScenario} error={currentScenarioError} frontEdge={streetEdge} rearEdge={rearEdge} boundaryMode={boundaryMode} onBoundaryMode={changeBoundaryMode} onRetry={() => setScenarioRetry(value => value + 1)} />} />
      </details></section></EvidenceAtFooter>
      <PropertyScan scan={propertyScan} />
      <ProjectDetails settings={effectiveSettings} mapped={mappedZoning} lookup={currentZoning} busy={!!zoningKey && zoningBusy && !currentZoning} error={currentZoningError} onRetry={() => setZoningRetry(value => value + 1)} onChange={next => { setProjectSettings(next); if (next.proposal.proposed_use !== projectSettings.proposal.proposed_use) { clearDemoAnswer('intendedUse'); setReviewedPurposeFor(null); setUse(next.proposal.proposed_use === 'garden_suite' ? 'Garden suite' : next.proposal.proposed_use === 'other' ? 'Other use' : 'Not sure'); } setReadyFor(null) }} />
</>}
    {selection && <section className="builder-optional" aria-labelledby="builder-optional-title">
      <p className="eyebrow">Optional placement</p><h2 id="builder-optional-title">Import a retained example only if useful</h2>
      <p>Three captured lots are examples with their own parcel and roofline geometry. They are not citywide address coverage. Importing one does not match it to your address or parcel lead.</p>
      {!imported ? <button type="button" onClick={() => { setImported(true); setReadyFor(null) }}>Import a separate retained example for placement</button>
        : <><button type="button" onClick={() => { setImported(false); setMeasurementResult(null); setReadyFor(null); setRevision(value => value + 1) }}>Remove example</button>
          <OccupiedLots catalogue={journeyCatalogue} key={revision} allowedModelIds={[MODEL_ID]} initialModelId={MODEL_ID} onAssessmentPending={setGeometryPending} onMeasurement={value => { setMeasurementResult(value); setReadyFor(null) }} showHandoff={false} /></>}
    </section>}
    {mode === 'retained' && !selection && <p>Confirm a site lead above to consider a separate retained placement example. An example is never matched to your site lead.</p>}
      <details className="builder-optional"><summary>Illustrate model height and foundation</summary><p>This illustration is separate from the installed-height comparison above. A foundation allowance does not establish average grade.</p><HeightView key={`height-${heightRevision}`} model={model} foundationAllowanceM={foundationAllowanceM} onFoundationAllowanceChange={value => { setFoundationAllowanceM(value); setReadyFor(null) }} /></details>
      </div>
      {propertyComplete && <button className="builder-continue" type="button" onClick={() => openJourneyStep('enquiry')}>Prepare enquiry{placementComplete ? '' : ' with placement unknown'}</button>}
    </section>
    <section hidden={!propertyComplete} className="builder-stage builder-enquiry" id="builder-next" aria-labelledby="builder-enquiry-title">
      <p className="eyebrow">Take away · local draft</p><h2 id="builder-enquiry-title">Prepare a useful question</h2>
      <p>Review your enquiry, then copy it into the provider’s website form or use an email contact you already have. Nothing is sent automatically.</p>
      {enquiryReady && !expanded.next && <p role="status">Enquiry confirmed. You can edit it again; no message has been sent.</p>}
      <button type="button" aria-expanded={expanded.next} aria-controls="builder-enquiry-content" onClick={() => toggleStep('next')}>{expanded.next ? 'Collapse enquiry' : enquiryReady ? 'Edit enquiry' : 'Review enquiry'}</button>
      <div id="builder-enquiry-content" hidden={!expanded.next}>
      {!hasSite && <p>Add a property or your known site facts above to prepare an unsent enquiry. Your answers stay local to this journey.</p>}
      {hasSite && <><p>Complete the three required fields to prepare your draft. Unknown, Not sure or Prefer not to say are accepted answers. All other fields are optional. These answers stay local until you share the enquiry.</p>
      <p id="builder-required-help">Highlighted fields still need an answer. You can explicitly choose Unknown rather than supplying details you don’t know.</p>
      <div className="builder-questions">
        <label className="builder-required-label" htmlFor="builder-use">How would you use {model.name}? <span>Required</span></label><input required aria-describedby="builder-required-help" className={`builder-required-input${!use.trim() ? ' is-missing' : ''}`} id="builder-use" list="builder-use-options" value={use} onChange={event => changeIntendedUse(event.target.value)} placeholder="Choose a suggestion or type your answer" />
        <datalist id="builder-use-options">{['a home for myself', 'family accommodation', 'a rental suite', 'an office', 'Still deciding', 'Unknown', 'Prefer not to say'].map(value => <option key={value} value={value} />)}</datalist>
        <label className="builder-required-label" htmlFor="builder-relationship">Relationship to the property <span>Required</span></label><input required aria-describedby="builder-required-help" className={`builder-required-input${!projectContext.relationship.trim() ? ' is-missing' : ''}`} id="builder-relationship" list="builder-relationship-options" value={projectContext.relationship} onChange={event => { clearDemoAnswer('relationship'); setProjectContext(previous => ({ ...previous, relationship: event.target.value })) }} placeholder="Choose a suggestion or type your answer" />
        <datalist id="builder-relationship-options">{['I own the property', 'I am considering buying it', 'I am helping the owner', 'Unknown', 'Prefer not to say'].map(value => <option key={value} value={value} />)}</datalist>
        <label className="builder-required-label" htmlFor="builder-nextStep">What response would be most useful? <span>Required</span></label><input required aria-describedby="builder-required-help" className={`builder-required-input${!projectContext.nextStep.trim() ? ' is-missing' : ''}`} id="builder-nextStep" list="builder-response-options" value={projectContext.nextStep} onChange={event => { clearDemoAnswer('nextStep'); setProjectContext(previous => ({ ...previous, nextStep: event.target.value })) }} placeholder="Choose a suggestion or type your answer" />
        <datalist id="builder-response-options">{['Please advise whether this is worth investigating further.', 'I would like to arrange an initial call.', 'Please share standard pricing and inclusions.', 'Unknown', 'Prefer not to say'].map(value => <option key={value} value={value} />)}</datalist>
        <label htmlFor="builder-question">Your question for the builder (optional)</label><textarea id="builder-question" value={question} onChange={event => setQuestion(event.target.value)} placeholder="Ask about suitability, next steps or additional costs." />
        <label htmlFor="builder-timing">Possible timing (optional)</label><input id="builder-timing" value={timing} onChange={event => setTiming(event.target.value)} placeholder="e.g. next year; unknown is fine" />
        <label htmlFor="builder-budget">Budget range, optional</label><input id="builder-budget" value={budget} onChange={event => setBudget(event.target.value)} placeholder="Leave blank if unknown" />
      </div>
      <details className="builder-optional-site"><summary>Optional site details</summary>
        <p>Leave these blank if you’re unsure—the builder can help identify what’s needed.</p>
        <div className="builder-questions">
          <label htmlFor="builder-access">Anything the builder should know about access?</label><input id="builder-access" value={access} onChange={event => setAccess(event.target.value)} placeholder="For example, a narrow driveway, overhead wires or limited space." />
          <label htmlFor="builder-services">Anything you know about water, sewer or electricity connections?</label><input id="builder-services" value={services} onChange={event => setServices(event.target.value)} placeholder="Share existing connections or questions, if known." />
        </div>
      </details>
      <details><summary>Optional project context and closing</summary><div className="builder-questions">
        {([['stage', 'Project stage'], ['configuration', 'Configuration or upgrades'], ['contact', 'Sender name and contact details']] as const).map(([key, label]) => <Fragment key={key}><label htmlFor={`builder-${key}`}>{label}</label><input id={`builder-${key}`} value={projectContext[key]} onChange={event => setProjectContext(previous => ({ ...previous, [key]: event.target.value }))} /></Fragment>)}
      </div></details>
      {!contextComplete && <p role="status">Answer intended use, relationship to the property and the response wanted to generate your enquiry. Unknown and Prefer not to say are accepted answers.</p>}
      <section className="builder-preparation" aria-label="Your preparation checklist"><h3>Your preparation checklist</h3><p>For you to work through; these prompts are kept out of the provider message.</p><ul>{preparationChecklist({ intendedUse: use, timing, budget, access, services, ...projectContext }).map(item => <li key={item}>{item}</li>)}</ul>{currentOpenQuestions.length > 0 && <><h4>Questions you included for later review</h4><ul>{currentOpenQuestions.map(item => <li key={item.label}><strong>{item.label}</strong>: {item.detail}</li>)}</ul></>}</section>
      {enquiryDoc && <div id="builder-unsent-preview"><EnquiryPreview document={enquiryDoc} /></div>}
      {reportDoc && <details><summary>Supporting screening report · calculations, sources and uncertainty</summary><EnquiryPreview document={reportDoc} /><button type="button" onClick={() => downloadMarkdown(true)}>Download readable supporting report</button><button type="button" onClick={() => downloadFile('prefab-technical-evidence.json', JSON.stringify(technicalEvidence, null, 2), 'application/json')}>Download technical evidence JSON</button></details>}
      {enquiryDoc && <section className="builder-drawing-export" aria-label="Placement drawing and enquiry exports"><h3>Share your proposed placement</h3><p>Approximate proposed placement—not a survey or approved site plan. The drawing includes captured outlines, marked edges, gaps, buffers and sources. Access and entrance locations are not established.</p>
        {drawingAssets && <img className="builder-export-preview" src={drawingAssets.pngUrl} alt="Approximate proposed placement with measurements, assumptions and sources" />}
        {!exportMeasurement && <p>No current measured placement is available. Add or recheck a placement to include a drawing.</p>}
        <EnquirySaveOptions onSave={kind => void exportPlacement(kind)} disabled={checksPending || !contextComplete} busy={exportBusy} hasPlacement={!!exportMeasurement} />
        <p className="metadata">The package keeps the Markdown enquiry and its image together, plus a PDF, supporting evidence and your separate preparation checklist. Standalone Markdown embeds a generated drawing; some Markdown readers do not display embedded images.</p>
        <p role="status">{exportMessage}</p></section>}
      <div className="builder-enquiry-actions">
        {enquiryDoc && <>
        <CopyableRecord id="builder-enquiry-text" label="Plain-text enquiry to copy" value={draftText} />
        </>}
      </div>
      <FloatingNext active={journeyStep === 'enquiry'} sectionId="builder-enquiry-content"><div className="builder-enquiry-confirm">
        <h3>Happy with your enquiry?</h3><p>Complete the three required answers and review your draft to continue. Explicit unknown answers are accepted.</p>
        <button className="builder-continue" type="button" disabled={!contextComplete || checksPending || exportBusy} onClick={() => { if (!enquiryDoc || checksPending) return; setReadyFor(draftText); openJourneyStep('email') }}>Confirm enquiry &amp; continue →</button>
        <p role="status">{enquiryReady ? 'Enquiry confirmed. No message has been sent.' : 'Draft in progress. Review before continuing.'}</p>
      </div></FloatingNext>
      <TechnicalDetails title="Complete site selection, sources and measurements"><CopyableRecord id="builder-technical-record" label="Complete technical evidence export" value={JSON.stringify(technicalEvidence, null, 2)} /></TechnicalDetails>
      </>}
      </div>
    </section>
    {hasSite && <>
      <section className="builder-stage builder-email" id="builder-email" aria-labelledby="builder-email-title">
        <p className="eyebrow">Contact provider · unsent enquiry</p><h2 id="builder-email-title">Contact {model.provider}</h2>
        <button type="button" aria-expanded={expanded.email} aria-controls="builder-email-content" onClick={() => toggleStep('email')}>{expanded.email ? 'Collapse provider contact' : 'Review provider contact'}</button>
        <div id="builder-email-content" hidden={!expanded.email}>
        {!contextComplete || checksPending ? <><p>{checksPending ? 'Updating checks. Your current provider message will be available when they finish.' : 'Provide the three context answers before preparing your provider message.'}</p>{!contextComplete && <button id="builder-contact-context" type="button" onClick={() => openJourneyStep('enquiry')}>Add enquiry context</button>}</> : <>
        <p>Review your prepared draft, then open the provider website or download an email draft. You send or submit it yourself.</p>
        <p>{model.provider} uses an official contact page{model.provider === 'aux box' ? ' with a central enquiry form' : ''}. Copy your prepared enquiry, then review the provider’s requested information. Checked October 7, 2026.</p>
        <p className="metadata">Opening the website does not send your enquiry or attach your report. This independent demonstration has no affiliation with {model.provider}.</p>
        <label htmlFor="builder-provider-text">Your enquiry to paste into the form</label><textarea id="builder-provider-text" readOnly rows={8} value={draftText} />
        <div className="builder-email-buttons">
          <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(draftText); setEmailMessage('Enquiry copied. Paste it into the provider form and review it before submitting.'); } catch { setEmailMessage('Clipboard unavailable. Select and copy the enquiry text above.'); } }}>Copy enquiry for provider</button>
          <a id="builder-provider-website" className="builder-email-primary" href={modelContact(model)} target="_blank" rel="noreferrer" onClick={() => { setEmailRequestedFor(null); setWebsiteRequestedFor(draftText) }}>Continue to provider website →</a>
        </div>
        <p role="status">{emailMessage}</p>
        <details className="builder-email-optional"><summary>I already have an email contact</summary>
        <p>Use an email address you know is appropriate for this enquiry. These buttons open an editable draft; only you can send it.</p>
        <label htmlFor="builder-email-recipient">Recipient email (optional; edit before opening)</label>
        <input id="builder-email-recipient" type="email" autoComplete="email" value={recipient} onChange={event => { setRecipient(event.target.value); setEmailMessage('') }} aria-invalid={!validRecipient(recipient)} />
        {!validRecipient(recipient) && <p role="alert">Enter one valid email address without line breaks.</p>}
        <label className="builder-email-choice"><input type="checkbox" checked={includeSiteDetails} onChange={event => { setIncludeSiteDetails(event.target.checked); setEmailMessage('') }} /> Include site details in the email</label>
        <p className="metadata">{includeSiteDetails ? 'The property summary below may include an address or site description.' : 'The automatic property summary is excluded. Your question is still included; check it for any address or personal details you typed. The full copy and download include property details.'}</p>
        <label htmlFor="builder-email-subject">Subject</label><input id="builder-email-subject" readOnly value={emailSubject} />
        <label htmlFor="builder-email-body">Exact email body to share</label><textarea id="builder-email-body" readOnly rows={12} value={emailBody} />
        {emailTooLong && <p role="status">The full email is too long for a reliable draft link. The buttons request a short placeholder draft. Copy the complete text above and paste it into your email app before sending; no content is silently shortened.</p>}
        <div className="builder-email-buttons">
          <button className="builder-email-primary" type="button" disabled={!validRecipient(recipient) || exportBusy} onClick={() => void exportPlacement('email')}>Download email draft{includeSiteDetails && exportMeasurement ? ' with placement attachment' : ''}</button>
          <button type="button" disabled={!validRecipient(recipient)} onClick={() => openDraft('mailto')}><span aria-hidden="true">✉ </span>Create email draft</button>
          <button type="button" disabled={!validRecipient(recipient)} onClick={() => openDraft('gmail')}>Open in Gmail</button>
          <button type="button" onClick={() => void copyEmailBody()}>Copy email body</button>
        </div>
        <p className="metadata">The downloaded .eml includes the placement PNG when site details are selected and a current placement exists. Ordinary email/Gmail links cannot attach files; download the drawing and attach it yourself. Check your email client’s handling of the unsent draft before sending.</p><p role="status">{exportMessage}</p>
        <p className="metadata">If no compose window opens, use Copy email body and paste the exact text shown above into a new message. Check the recipient and subject there before sending.</p>
        </details>
        </>}
        </div>
      </section>
    </>}
    {propertyComplete && <footer className="builder-stage"><details><summary>Sources &amp; technical evidence</summary><p>Source records, exact geometry and candidate comparisons for the current placement. Review individual checks above for the main findings.</p><div id="builder-geometry-evidence" /><div id="builder-rule-evidence" /></details></footer>}
  </div></PlaybackLayout.Provider>
}
