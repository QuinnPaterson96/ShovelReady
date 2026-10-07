import { PropertyScan, usePropertyScan, type PropertyScanResult } from '../conditional_screening/PropertyScan'
import { StepInfo } from '../StepInfo'
import { AdditionalInputs } from '../conditional_screening/AdditionalInputs'
import { useEffect, useMemo, useRef, useState } from 'react'
import { SiteDiscovery } from '../site_discovery/SiteDiscovery'
import type { Confirmed } from '../site_discovery/flow'
import { placementCase } from '../site_discovery/placement'
import { ManualSiteInput } from '../manual_site/ManualSiteInput'
import type { ManualSiteOutput } from '../manual_site/model'
import { measurementWithUnit } from '../measurements'
import { bundledCatalogue } from '../model_catalogue/model'
import { PriceTiming, priceTimingParagraphs } from '../model_catalogue/PriceTiming'
import { CopyableRecord, publicSourceUrl, readableDate, TechnicalDetails } from '../ReadableProvenance'
import { SitePreparation } from '../site_preparations/SitePreparation'
import { emptySiteInput, type SiteInputDraft, type SitePreparationSelection } from '../site_preparations/types'
import OccupiedLots, { type OccupiedMeasurement } from '../occupied_lots/OccupiedLots'
import { overlapFinding } from '../occupied_lots/observations'
import { HeightView } from './height_view/HeightView'
import { ModelImage } from './model_image/ModelImage'
import { ExampleProperty } from './ExampleProperty'
import { exampleCase, exampleSourcePage } from './example'
import { SiteAssumptionsEditor } from '../zoning_site_assumptions/SiteAssumptions'
import { ordinaryFourEdgeBoundary, type StreetAdjacency, type BoundaryMapMode, type SiteAssumptions } from '../zoning_site_assumptions/model'
import type { BoundaryMapInteraction } from '../zoning_site_assumptions/BoundaryMapTools'
import { ConditionalScreen } from '../conditional_screening/ConditionalScreen'
import { ProjectDetails } from '../conditional_screening/ProjectDetails'
import { applyMappedZoning, initialProjectSettings, withFloorAreaBasis } from '../conditional_screening/projectSettings'
import type { ProjectSettings } from '../conditional_screening/projectSettings'
import { parseZoningLookup, selectedParcelRef, zoningProjection, type ZoningLookup } from '../conditional_screening/victoriaZoning'
import { PlacementScenarios } from '../conditional_screening/PlacementScenarios'
import { HomeownerSummary, statusLabels } from '../conditional_screening/HomeownerSummary'
import { homeownerSummary } from '../conditional_screening/victoriaSummaryAdapter'
import { focusSummaryTarget } from '../conditional_screening/summaryNavigation'
import { parseScenarioResult, type ScenarioRequest, type ScenarioResult } from '../conditional_screening/scenarios'
import { currentPlacementRevision, expectedPropertyRevision, parseScreeningResult, propertyGeometryRevision, screeningCheckTitle, screeningIdentity, type Pathway, type ScreeningRequest, type ScreeningResult } from '../conditional_screening/model'
import { EnquiryPreview, emailDraftUrl, enquiryEmailBody, enquiryMarkdown, enquiryPlainText, validRecipient, type EnquiryDocument } from './enquiry'

const MODEL_ID = 'aux-300' as const
const foundModel = bundledCatalogue.models.find(item => item.model_id === MODEL_ID)
if (!foundModel) throw new Error('The Model 300 catalogue record is unavailable')
const model = foundModel

const measurement = (name: string) => model.measurements.find(item => item.name === name)
const original = (name: string) => measurement(name)?.quantity?.original_text ?? 'unknown'
const metres = (name: string) => measurement(name)?.quantity?.unit === 'm'
  ? measurementWithUnit(measurement(name)!.quantity!.value, 'length') : 'unknown'
const fact = (value: string | number | null) => value === null || value === '' ? 'unknown' : String(value)
const field = (value: string) => value.trim() || 'unknown'

export function enquiryDocument(selection: SitePreparationSelection | null, input: {
  question?: string; intendedUse: string; timing: string; budget: string; access: string; services: string
}, measured: OccupiedMeasurement | null, exampleImported = false, live: Confirmed | null = null, manual: ManualSiteOutput | null = null, savedExample = false, foundationAllowanceM: string | null = null,
  conditional: ScreeningResult | null = null, siteAssumptions: SiteAssumptions | null = null, pathway: Pathway | null = null, scenarios: ScenarioResult | null = null, settings: ProjectSettings | null = null, scan: PropertyScanResult | null = null) {
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
  const conditionalSummary = conditional
    ? `Candidate Victoria garden-suite comparison for this supplied placement: ${conditional.coverage.meets_under_assumptions} checks meet under stated assumptions; ${conditional.coverage.apparent_conflict_under_assumptions} apparent conflicts; ${conditional.coverage.needs_information} need information; ${conditional.coverage.unsupported} outside scope. Candidate source/currentness and site facts remain unreviewed; no approval or complete bylaw review.`
    : 'Conditional zoning findings are not current for these inputs. No legal compatibility conclusion is available.'
  const scenarioSummary = scenarios
    ? `Approximate candidate Victoria setback scenario for this nominal placement: ${scenarios.reason} ${scenarios.scenarios.length} coherent edge assignments tested for side, rear and possible flanking street distances. ${Object.keys(siteAssumptions?.measurements.boundary ?? {}).length} user wall-to-line measurements replaced approximate edge comparisons; these values are unverified and the captured distances remain in technical evidence. See the additional scouting checks for front distance, approximate rear yard, and measured or estimated height/area. Site-specific rules, current applicability and legal boundary measurements remain unresolved. Source: ${scenarios.sources.map(item => `${item.provider}, ${item.record_label}, ${item.locator}, captured ${item.capture_date ?? 'date unknown'}, ${item.review_status}; ${item.url}`).join(' ')}`
    : 'No current approximate setback scenario finding for this placement.'
  const conditionalCheckDetails = conditional?.checks.map(check => `${screeningCheckTitle(check)}: ${check.status.replace(/_/g, ' ')}${check.normalized_observed !== null && check.normalized_threshold !== null ? `; supplied ${check.normalized_observed} ${check.normalized_unit ?? ''}, candidate threshold ${check.normalized_threshold} ${check.normalized_unit ?? ''}` : ''}. ${check.reasons.join(' ')} Source: ${check.rule.source.provider}, ${check.rule.source.record_label}, ${check.rule.source.locator}, captured ${check.rule.source.capture_date ?? 'date unknown'}, ${check.rule.source.review_status}; ${check.rule.source.url}.`) ?? []
  const sourceCaveat = conditional?.checks[0]?.rule.source.currentness_limitations.join(' ') ?? ''
  const mappedSource = settings?.evidence.confirmed_zone.source
  const settingSourceSummary = mappedSource ? ` Mapped zoning observation: ${mappedSource.provider}, ${mappedSource.record_label}, ${mappedSource.locator}, captured ${readableDate(mappedSource.capture_date)}, ${mappedSource.review_status}; ${mappedSource.url}.` : ''
  const streetSummary = siteAssumptions?.street_adjacency ? ` Street-adjacent edges: ${siteAssumptions.street_adjacency.edge_ids.length} marked by the user; ${siteAssumptions.street_adjacency.all_marked ? 'user says all street edges are marked' : 'remaining street adjacency unknown'}. Road bands are diagrammatic, not surveyed road locations or access points. Boundary suggestions are inferred from your marks; review them against your property plan.` : ''
  const mapAssumptions = siteAssumptions ? ` Main outline: ${siteAssumptions.principal_building_id.value ? `Outline ${siteAssumptions.observed_buildings.findIndex(b => b.id === siteAssumptions.principal_building_id.value) + 1} · ${siteAssumptions.principal_building_id.origin === 'journey_default' ? 'assumed from largest usable outline' : 'your selection'}` : 'unknown'}. Waterfront edges: ${(siteAssumptions.waterfront_edge_ids ?? []).map(id => `Edge ${siteAssumptions.edges.findIndex(edge => edge.id === id) + 1}`).join(', ') || 'not marked'}; physical observations, not legal frontage.` : ''
  const planningSummary = siteAssumptions && scenarios ? siteAssumptions.edges.map((edge, i) => {
    const manual = siteAssumptions.measurements.boundary[edge.id]
    const distance = scenarios.edge_distances_m[edge.id]
    const buffer = siteAssumptions.planning_buffers_m?.[edge.id] ?? 0
    const checks = scenarios.scenarios.flatMap(s => s.checks.filter(c => c.edge_id === edge.id))
    return `Edge ${i + 1}: ${manual ? `measured override ${measurementWithUnit(manual.value, 'length')}; planning buffer not applied` : distance === undefined ? 'distance unavailable' : `captured ${measurementWithUnit(distance, 'length')}; assumed buffer ${measurementWithUnit(buffer, 'length')}; planning clearance ${measurementWithUnit(Math.max(0, distance - buffer), 'length')}`}. ${checks.some(c => !c.meets) ? 'See raw scenario conflicts/uncertainty.' : checks.some(c => c.planning_meets === false) ? 'Needs review: buffer shortfall only, no observed conflict.' : checks.length ? 'Likely fine under the tested planning assumptions.' : 'See the separate front-distance check.'}`
  }) : []
  const assumptionsSummary = siteAssumptions
    ? `Property assumptions: main building ${(siteAssumptions.building_type.value === null ? 'unknown' : { single_detached: 'single-family detached home', duplex: 'duplex', other: 'other' }[siteAssumptions.building_type.value] + ' (your answer)')}; existing garden suites ${siteAssumptions.existing_garden_suites.value ?? 'unknown'} (${siteAssumptions.existing_garden_suites.value === null ? 'unknown' : siteAssumptions.existing_garden_suites.evidence_state === 'user_confirmed' ? 'user-confirmed, not independently verified' : siteAssumptions.existing_garden_suites.origin === 'journey_default' ? 'default assumption' : 'your assumption'}); waterfront ${siteAssumptions.waterfront.value === null ? 'unknown' : siteAssumptions.waterfront.origin === 'journey_default' ? 'assuming not waterfront (planning default)' : siteAssumptions.waterfront.value ? 'yes (your answer)' : 'no (your answer)'}; ${siteAssumptions.edges.filter(edge => edge.role.value && edge.role.value !== 'unknown').length} parcel edges classified by the user. Project settings: use ${pathway?.proposed_use ?? 'unknown'} (${settings?.evidence.proposed_use.origin ?? 'unattributed'}), foundation ${pathway?.foundation_attached === null || pathway?.foundation_attached === undefined ? 'unknown' : pathway.foundation_attached ? 'scenario attached' : 'scenario unattached'} (${settings?.evidence.foundation_attached.origin ?? 'unattributed'}), lot/zone/instrument ${pathway?.legal_lot_confirmed ? 'assumed legal lot' : 'unknown or incompatible'} / ${pathway?.confirmed_zone ?? 'unknown'} (${settings?.evidence.confirmed_zone.origin ?? 'unattributed'}) / ${pathway?.confirmed_instrument ?? 'unknown'} (${settings?.evidence.confirmed_instrument.origin ?? 'unattributed'}).${settingSourceSummary}${streetSummary}${mapAssumptions} Assumptions and user confirmations remain distinct from source observations.`
    : 'Property boundary roles and zoning pathway facts remain unknown.'
  const lines = [
    'UNSENT DRAFT · Model 300 enquiry for preliminary investigation',
    'Prepared independently with ShovelReady; no affiliation with or contact to aux box.',
    `Design: aux box Model 300; public page captured ${readableDate(source?.captured_at)}; unreviewed; manufacturer revision ${model.source_revision ?? 'unknown'}. Nominal exterior ${original('nominal_exterior_width')} × ${original('nominal_exterior_depth')} (${metres('nominal_exterior_width')} × ${metres('nominal_exterior_depth')}). Advertised exterior height ${original('advertised_overall_height')}; regulatory installed height and datum unknown. Source: ${model.provider_url}.`,
    savedExample ? `Example property / saved data: City of Victoria ${exampleCase.site.parcel.source.record_label}; captured ${readableDate(exampleCase.site.parcel.source.capture_date)}; ${exampleCase.site.parcel.source.review_status}. Parcel source: ${exampleSourcePage(exampleCase.site.parcel.source.reference)} (${exampleCase.site.parcel.source.record_label}). Roofline source: ${exampleSourcePage(exampleCase.site.buildings[0]?.source.reference ?? null)} (${exampleCase.site.buildings[0]?.source.record_label ?? 'record unavailable'}). Contains information licensed under the Open Government Licence – City of Victoria: https://opendata.victoria.ca/pages/open-data-licence. Full source record links are in the technical evidence export. This is not the sender's property or a verified address.` :
    live ? `Site lead: ${live.address.label}; ${live.parcel.label}. ${live.schema_version === 'site-discovery.selected.v1' ? 'Source-selected City of Victoria observation; identity, ownership and legal boundaries are not confirmed' : 'User-confirmed City of Victoria source observation'}; source join and parcel identity remain unreviewed. Captured ${readableDate(live.observation.source.capturedAt)}. Source: ${live.observation.source.url}. ${live.observation.issues.join(' ')}` :
      manual ? `User-supplied site: ${field(manual.facts.address)}; stated area ${measurementWithUnit(manual.facts.statedAreaM2, 'area')}; notes ${field(manual.facts.notes)}. Approximate local sketch only, with no verified address, survey position or orientation.` :
      `Site lead: ${candidate ? 'City of Victoria retained parcel observation' : 'manual facts without a matched parcel'}. Source address ${candidate ? fact(candidate.address.value) : 'unknown'}; manual address ${fact(selection?.manual.address.value ?? null)}; manual approximate area ${measurementWithUnit(selection?.manual.lot_area_m2.value, 'area')}. Manual notes: ${fact(selection?.manual.notes.value ?? null)}. Manual entries are unverified and separate from source observations. Exact parcel identifiers remain in technical evidence.`,
    ...(candidate ? [`Parcel source: City of Victoria; captured ${readableDate(candidate.pid.evidence.captured_at)}; ${candidate.pid.evidence.review_status}; ${publicSourceUrl(candidate.pid.evidence.source_url) ?? 'source link unavailable'}.`] : []),
    `Use: ${field(input.intendedUse)}. Timing: ${field(input.timing)}. Budget, if shared: ${field(input.budget)}.`,
    `Access and crane questions/known facts: ${field(input.access)}. Utility/services questions/known facts: ${field(input.services)}.`,
    measured && p ? `${savedExample ? `Illustrative placement on the saved example ${measured.site.label}` : live ? `Placement on the selected source property ${measured.site.label}` : `Optional, separately imported retained example ${measured.site.label} (not linked to the site lead)`}: nominal rectangle ${measurementWithUnit(p.width_m, 'length')} × ${measurementWithUnit(p.depth_m, 'length')} (width ${measured.widthOrigin === 'catalogue' ? 'catalogue nominal' : 'user edited'}; depth ${measured.depthOrigin === 'catalogue' ? 'catalogue nominal' : 'user edited'}), rotation ${Number(p.angle_degrees.toFixed(2))}°. ${observed(containment) ? `Parcel containment ${containment?.relation?.replace(/_/g, ' ') ?? 'unknown'}.` : 'Parcel containment unresolved.'} ${overlapText} ${observed(boundary) && boundary?.distance_m != null ? `Observed parcel boundary distance ${measurementWithUnit(boundary.distance_m, 'length')}.` : 'Parcel boundary distance unresolved.'} Captured ${readableDate(measured.site.site.parcel.source.capture_date)}; ${measured.site.site.parcel.source.review_status}; approximate captured geometry only.`
      : manual?.assessment ? `Measured user sketch: tested user-supplied rectangle ${measurementWithUnit(manual.assessment.input.placement.width_m, 'length')} × ${measurementWithUnit(manual.assessment.input.placement.depth_m, 'length')}; edits may differ from the model dimensions above. ${manual.assessment.checks.filter(c => c.status === 'observed').map(c => `${c.kind.replace(/_/g, ' ')}: ${c.relation?.replace(/_/g, ' ') ?? measurementWithUnit(c.distance_m, 'length')}`).join('; ')}. Obstruction coverage remains partial or unknown; no zoning or site fit assessed.`
      : savedExample ? 'Saved example placement has no current measurement; measure again after edits. Zoning remains unassessed.'
      : live || manual?.site ? 'No current placement measurement. Position the footprint and measure again after edits. Zoning remains unassessed.'
      : `${exampleImported ? 'Imported example has no current measurement; remeasure after edits. ' : ''}Geometry and zoning unassessed for this site. An address or area does not define a usable parcel shape.`,
    `Foundation scenario allowance: ${foundationAllowanceM === null ? 'not supplied' : measurementWithUnit(foundationAllowanceM, 'length') + ' planning assumption (default or edited)'}. This allowance is used only in the labelled preliminary height estimate; installed height remains unverified.`,
    `Provider service/installation: ${model.service_area_note} ${model.installation_note}`,
    'Questions: Please confirm the current controlled Model 300 drawing/revision, installed envelope and height datum; roof projections and site clearances; local delivery/crane access, foundation and utility requirements; and what site information you need before discussing this property.',
    'Legal lot lines, building walls and roles, other obstructions, zoning and setbacks, installed height and datum, current controlled provider dimensions, access and services remain unresolved.',
    'Preliminary screening · limited checks. Ask the provider about the open questions and requirements not covered.',
  ]
  const offset = candidate ? 1 : 0
  const question = input.question?.trim() || `I’m exploring aux box Model 300${input.intendedUse.trim() ? ` for ${input.intendedUse.trim()}` : ''}. Could you confirm the current design, installation requirements, and what you would need to discuss a possible site?`
  return {
    title: savedExample ? 'UNSENT DRAFT · SAVED EXAMPLE ONLY · Model 300' : 'UNSENT DRAFT · Model 300 enquiry',
    question,
    example: savedExample,
    sections: [
      ...(planningSummary.length ? [{ heading: 'Boundary planning assumptions', paragraphs: planningSummary, emailSummary: planningSummary.join(' ') }] : []),
      ...(scenarios?.additional_checks?.length ? [{ heading: 'Additional scouting checks', paragraphs: scenarios.additional_checks.map(check => `${check.label}: ${statusLabels[check.status]}. ${check.detail} Basis: ${check.basis}. Source: ${check.source.url} (${check.source.locator}).`), emailSummary: scenarios.additional_checks.map(check => `${check.label}: ${statusLabels[check.status]}. ${check.detail}`).join(' ') }] : []),
      ...(scan ? [{ heading: 'Preliminary property scan', paragraphs: [...scan.findings.map(row => `${row.label}: ${row.status === 'probably_clear' ? 'likely fine in searched scope' : row.status === 'review' ? 'records need review' : 'unknown'}. ${row.detail}${row.source ? ` Source: ${row.source.provider}, ${row.source.record_label}, captured ${row.source.captured_at_utc.slice(0, 10)}, unreviewed; ${row.source.source_url.split('?')[0]}.` : ''}`), ...scan.limitations], emailSummary: scan.findings.map(row => `${row.label}: ${row.status === 'probably_clear' ? 'Likely fine in searched scope' : row.status === 'review' ? 'Needs review' : 'Unknown'}.`).join(' ') + ' Permit documents, title, projections and servicing remain unsearched.' }] : []),
      { heading: 'Price & timing', paragraphs: priceTimingParagraphs(model), emailSummary: priceTimingParagraphs(model).join(' ') },
      { heading: 'Model', paragraphs: [lines[1], lines[2], lines[8 + offset]], emailSummary: `aux box Model 300; nominal exterior ${original('nominal_exterior_width')} × ${original('nominal_exterior_depth')}; source ${model.provider_url}; current controlled revision and installed height unknown.` },
      { heading: 'Property', paragraphs: [lines[3], ...(candidate ? [lines[4]] : []), lines[4 + offset], lines[5 + offset]], emailSummary: savedExample ? 'Saved City of Victoria example only; this is not my property.' : live ? `Selected Victoria source lead: ${live.address.label}. Identity, ownership and legal boundaries remain unverified.` : manual ? `User-supplied site: ${field(manual.facts.address)}; facts and sketch unverified.` : `Site lead: ${candidate ? fact(candidate.address.value) : fact(selection?.manual.address.value ?? null)}; identity and dimensions unverified.` },
      { heading: 'Placement', paragraphs: [lines[6 + offset], lines[7 + offset], ...(clearanceText ? [clearanceText] : [])], emailSummary: measured ? `Approximate measured rectangle ${measurementWithUnit(p?.width_m, 'length')} × ${measurementWithUnit(p?.depth_m, 'length')}; ${measured.widthOrigin === 'user' || measured.depthOrigin === 'user' ? 'custom size, provider availability unknown; ' : ''}geometry observations recorded; ${conditional ? 'see separate conditional zoning checks' : 'zoning comparison unresolved'}. ${clearanceText}` : manual?.assessment ? `User sketch measured at ${measurementWithUnit(manual.assessment.input.placement.width_m, 'length')} × ${measurementWithUnit(manual.assessment.input.placement.depth_m, 'length')}; unverified geometry; zoning unassessed.` : 'No current placement measurement; geometry and zoning unassessed.' },
      { heading: 'Approximate setbacks', paragraphs: [scenarioSummary], emailSummary: scenarioSummary },
      { heading: 'Conditional zoning', paragraphs: [assumptionsSummary, conditionalSummary, ...(sourceCaveat ? [sourceCaveat] : []), ...conditionalCheckDetails], emailSummary: conditional ? `${conditionalSummary} ${sourceCaveat} ${conditionalCheckDetails.join(' ')}` : 'No current conditional zoning findings.' },
      { heading: 'Still to confirm', paragraphs: [lines[9 + offset], lines[10 + offset]], emailSummary: `Current drawing and revision, installed envelope and height, site access, foundations, utilities, legal boundaries and zoning. Timing: ${field(input.timing)}. Budget: ${field(input.budget)}. Access: ${field(input.access)}. Services: ${field(input.services)}.` },
    ],
    closing: lines[11 + offset],
  } satisfies EnquiryDocument
}

export function enquiry(...args: Parameters<typeof enquiryDocument>) { return enquiryPlainText(enquiryDocument(...args)) }

export type BuilderProgress = import('../navigation/BuilderJourneyNav').BuilderJourneyCompletion
type JourneyStep = import('../navigation/BuilderJourneyNav').JourneyStep
export default function BuilderDemo({ onProgressChange }: { onProgressChange?: (progress: BuilderProgress) => void } = {}) {
  const [expanded, setExpanded] = useState({ property: true, placement: false, next: false })
  const [journeyStep, setJourneyStep] = useState<JourneyStep>('property')
  const [boundaryEditorOverride, setBoundaryEditorOverride] = useState(false)
  const [reviewedBoundariesFor, setReviewedBoundariesFor] = useState<string | null>(null)
  const [reviewedDetailsFor, setReviewedDetailsFor] = useState<string | null>(null)
  const [reviewedChecksFor, setReviewedChecksFor] = useState<string | null>(null)
  const [emailRequestedFor, setEmailRequestedFor] = useState<string | null>(null)
  const toggleStep = (step: keyof typeof expanded) => setExpanded(value => ({ ...value, [step]: !value[step] }))
  const [foundationAllowanceM, setFoundationAllowanceM] = useState<string | null>('0.30')
  const [estimateBuffers, setEstimateBuffers] = useState({ area: 10, height: 10 })
  const [heightRevision, setHeightRevision] = useState(0)
  const [mode, setMode] = useState<'live' | 'manual' | 'retained' | 'example'>('live')
  const [propertyReset, setPropertyReset] = useState(0)
  const [live, setLive] = useState<Confirmed | null>(null)
  const [manual, setManual] = useState<ManualSiteOutput | null>(null)
  const liveCase = useMemo(() => live ? placementCase(live) : undefined, [live])
  const [draft, setDraft] = useState<SiteInputDraft>({ ...emptySiteInput, kind: 'address' })
  const [selection, setSelection] = useState<SitePreparationSelection | null>(null)
  const [imported, setImported] = useState(false)
  const [measurementResult, setMeasurementResult] = useState<OccupiedMeasurement | null>(null)
  const [buffersPending, setBuffersPending] = useState(false)
  const [siteAssumptions, setSiteAssumptions] = useState<SiteAssumptions | null>(null)
  const [projectSettings, setProjectSettings] = useState(initialProjectSettings)
  const [zoningState, setZoningState] = useState<{ key: string; result: ZoningLookup } | null>(null)
  const [zoningError, setZoningError] = useState<{ key: string; message: string } | null>(null)
  const [zoningBusy, setZoningBusy] = useState(false)
  const [zoningRetry, setZoningRetry] = useState(0)
  const [conditionalState, setConditionalState] = useState<{ key: string; result: ScreeningResult } | null>(null)
  const [conditionalError, setConditionalError] = useState<{ key: string; message: string } | null>(null)
  const [conditionalBusy, setConditionalBusy] = useState(false)
  const [conditionalRetry, setConditionalRetry] = useState(0)
  const [streetMarks, setStreetMarks] = useState<{ revision: string | null; data: StreetAdjacency }>({ revision: null, data: { edge_ids: [], all_marked: false, origin: 'user' } })
  const [markingRole, setMarkingRole] = useState<import('../zoning_site_assumptions/model').EdgeRole | null>(null)
  const [boundaryMark, setBoundaryMark] = useState<{ id: string; role: import('../zoning_site_assumptions/model').EdgeRole } | null>(null)
  const [selectedBoundary, setSelectedBoundary] = useState<string | null>(null)
  const [rearEdge, setRearEdge] = useState<string | null>(null)
  const [waterfrontMarks, setWaterfrontMarks] = useState<{ revision: string | null; ids: string[] }>({ revision: null, ids: [] })
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
  const [question, setQuestion] = useState('')
  const [readyFor, setReadyFor] = useState<string | null>(null)
  const [manualConfirmedFor, setManualConfirmedFor] = useState<string | null>(null)
  const [recipient, setRecipient] = useState('')
  const [includeSiteDetails, setIncludeSiteDetails] = useState(false)
  const [emailMessage, setEmailMessage] = useState('')
  function siteEdited() { setSelection(null); setImported(false); setMeasurementResult(null); setSiteAssumptions(null); setProjectSettings(initialProjectSettings()); setStreetMarks({ revision: null, data: { edge_ids: [], all_marked: false, origin: 'user' } }); setRearEdge(null); setSelectedBoundary(null); setBoundaryMark(null); setMarkingRole(null); setBoundaryMode('place'); setReadyFor(null); setRevision(value => value + 1) }
  function changeMode(next: typeof mode) {
    setFoundationAllowanceM('0.30'); setHeightRevision(value => value + 1)
    setExpanded({ property: next !== 'example', placement: next === 'example', next: false })
    setMode(next); siteEdited(); setLive(null); setManual(null)
    setDraft({ ...emptySiteInput, kind: 'address' })
    setQuestion(''); setUse(''); setTiming(''); setBudget(''); setAccess(''); setServices('')
    setReadyFor(null); setManualConfirmedFor(null); setIncludeSiteDetails(false); setEmailMessage('')
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
        if (!controller.signal.aborted) { setZoningState({ key: zoningKey, result }); setZoningError(null); setZoningBusy(false) }
      } catch (error) {
        if (!controller.signal.aborted || controller.signal.reason === 'timeout') { setZoningError({ key: zoningKey, message: controller.signal.reason === 'timeout' ? 'Timed out.' : error instanceof Error ? error.message : 'Unavailable.' }); setZoningBusy(false) }
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
  function toggleStreet(id: string | null) {
    if (id && !currentAssumptions?.edges.some(edge => edge.id === id && edge.ring === 0)) return
    setStreetMarks({ revision: geometryRevision, data: { origin: 'user', all_marked: false, edge_ids: id === null ? [] : streetAdjacency.edge_ids.includes(id) ? streetAdjacency.edge_ids.filter(edge => edge !== id) : [...streetAdjacency.edge_ids, id] } }); setReadyFor(null)
  }
  function completeStreetMarks() { setStreetMarks({ revision: geometryRevision, data: { ...streetAdjacency, all_marked: true, completion_method: 'advance' } }); setReadyFor(null) }
  function changeBoundaryMode(next: BoundaryMapMode) {
    setBoundaryEditorOverride(false)
    setJourneyStep(next === 'front' ? 'streets' : next === 'place' ? 'placement' : 'boundaries')
    if (next === 'front') setStreetMarks({ revision: geometryRevision, data: { ...streetAdjacency, all_marked: false } })
    else if (next === 'rear' || boundaryMode === 'front') completeStreetMarks()
    setBoundaryMode(next)
  }
  function selectBoundary(id: string | null) { setSelectedBoundary(id); if (id && markingRole) setBoundaryMark({ id, role: markingRole }) }
  const additionalKey = JSON.stringify([geometryRevision, placementRevision, revision])
  const scenarioRequest: ScenarioRequest | null = measurementResult && currentAssumptions && zoningCase && measurementResult.site.site.parcel.id === zoningCase.site.parcel.id
    ? { schema_version: 'placement-scenarios.request.v1', geometry: measurementResult.result.input, assumptions: currentAssumptions,
      model_revision: `catalogue-record:${model.model_id}@${bundledCatalogue.snapshot_id}`, proposal: pathway, proposal_evidence: effectiveSettings.evidence,
      street_edge_id: streetEdge, rear_edge_id: rearEdge, street_pattern: streetPattern,
      additional_inputs: { height_from_average_grade_m: scoutingHeight?.key === additionalKey ? scoutingHeight.value : null,
        nominal_footprint_area_m2: currentAssumptions.measurements.floor_area?.basis === 'rough_floor_area_estimate' ? currentAssumptions.measurements.floor_area.value : measurementResult.result.input.placement.width_m * measurementResult.result.input.placement.depth_m,
        advertised_height_m: Number(measurement('advertised_overall_height')?.quantity?.value) || null,
        area_buffer_percent: estimateBuffers.area, height_buffer_percent: estimateBuffers.height,
        foundation_allowance_m: foundationAllowanceM === null ? null : Number(foundationAllowanceM) } } : null
  const scenarioKey = scenarioRequest ? JSON.stringify([scenarioRequest, scenarioRetry]) : null
  const currentScenario = scenarioKey && scenarioState?.key === scenarioKey ? scenarioState.result : null
  const currentScenarioError = scenarioKey && scenarioError?.key === scenarioKey ? scenarioError.message : ''
  const boundaryInteraction: BoundaryMapInteraction | undefined = zoningCase ? {
    editor: <SiteAssumptionsEditor detailsStep={journeyStep === 'details'} forceBoundaryEditor={boundaryEditorOverride || selectedBoundary !== null} onPlanningBuffersPending={setBuffersPending} waterfrontMarks={waterfrontMarks.revision === geometryRevision ? waterfrontMarks.ids : []} onWaterfrontChange={yes => { if (yes) changeBoundaryMode('waterfront'); else { if (boundaryMode === 'waterfront') changeBoundaryMode('place'); setWaterfrontMarks({ revision: geometryRevision, ids: [] }) } }} onBoundaryDismiss={() => { setSelectedBoundary(null); setMarkingRole(null); document.getElementById('boundary-roles')?.focus() }} edgeDistances={currentScenario?.edge_distances_m} homeownerDefaults streetAdjacency={streetAdjacency} markingRole={markingRole} onMarkingRoleChange={setMarkingRole} boundaryMark={boundaryMark} sharedMode={boundaryMode} selectedBoundary={selectedBoundary} onBoundarySelect={selectBoundary} site={zoningCase} geometryRevision={geometryRevision!} placementRevision={placementRevision} frontEdge={streetEdge} rearEdge={rearEdge} streetPattern={streetPattern} onChange={next => { setSiteAssumptions(next); setReadyFor(null) }} />,
    mainBuilding: zoningCase.site.buildings.find(b => b.id === currentAssumptions?.principal_building_id.value), mainBuildingAssumed: currentAssumptions?.principal_building_id.origin === 'journey_default', waterfront: currentAssumptions?.waterfront.value === true, waterfrontIds: currentAssumptions?.waterfront_edge_ids,
    suggestedRoles: currentAssumptions?.boundary_role_suggestions?.roles, streetIds: streetAdjacency.edge_ids, allStreetsMarked: streetAdjacency.all_marked, onStreetComplete: all_marked => { setStreetMarks({ revision: geometryRevision, data: { ...streetAdjacency, all_marked, completion_method: 'explicit_confirmation' } }); setReadyFor(null) }, selectedId: selectedBoundary, edges: currentAssumptions?.edges ?? [], mode: boundaryMode, frontId: streetEdge, rearId: rearEdge,
    streetPattern, onModeChange: changeBoundaryMode,
    onSelect: id => { if (boundaryMode === 'front') toggleStreet(id); else if (boundaryMode === 'rear') selectBoundary(id); else if (boundaryMode === 'waterfront') { if (id && !currentAssumptions?.edges.some(edge => edge.id === id && edge.ring === 0)) return; const ids = waterfrontMarks.revision === geometryRevision ? waterfrontMarks.ids : []; setWaterfrontMarks({ revision: geometryRevision, ids: id === null ? [] : ids.includes(id) ? ids.filter(edge => edge !== id) : [...ids, id] }); setReadyFor(null) } },
  } : undefined
  useEffect(() => {
    if (!scenarioRequest || !scenarioKey) { setScenarioBusy(false); return }
    const controller = new AbortController()
    setScenarioBusy(true)
    const timeout = window.setTimeout(() => {
      controller.abort()
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
        if (!controller.signal.aborted) { setScenarioState({ key: scenarioKey, result }); setScenarioError(null); setScenarioBusy(false) }
      } catch (error) {
        if (!controller.signal.aborted) { setScenarioError({ key: scenarioKey, message: error instanceof Error ? error.message : 'Approximate setback screen unavailable.' }); setScenarioBusy(false) }
      } finally {
        window.clearTimeout(timeout)
      }
    }, 300)
    return () => { controller.abort(); window.clearTimeout(timer); window.clearTimeout(timeout) }
  }, [scenarioKey])
  const screeningRequest: ScreeningRequest | null = measurementResult && currentAssumptions && zoningCase && measurementResult.site.site.parcel.id === zoningCase.site.parcel.id
    ? { schema_version: 'conditional-screening.api.v1', assumptions: currentAssumptions, model_revision: `catalogue-record:${model.model_id}@${bundledCatalogue.snapshot_id}`, proposal: pathway, proposal_evidence: effectiveSettings.evidence } : null
  const requestKey = screeningRequest ? JSON.stringify([screeningIdentity(screeningRequest), conditionalRetry]) : null
  const currentScreening = requestKey && conditionalState?.key === requestKey ? conditionalState.result : null
  const currentScreeningError = requestKey && conditionalError?.key === requestKey ? conditionalError.message : ''
  useEffect(() => {
    if (!screeningRequest || !requestKey) { setConditionalBusy(false); return }
    const controller = new AbortController()
    const timeout = window.setTimeout(() => {
      controller.abort('timeout')
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
        if (!controller.signal.aborted) { setConditionalState({ key: requestKey, result }); setConditionalError(null); setConditionalBusy(false) }
      } catch (error) {
        if (!controller.signal.aborted) { setConditionalError({ key: requestKey, message: error instanceof Error ? error.message : 'Conditional screen unavailable.' }); setConditionalBusy(false) }
      } finally {
        window.clearTimeout(timeout)
      }
    }, 300)
    return () => { controller.abort(); window.clearTimeout(timer); window.clearTimeout(timeout) }
  }, [requestKey])
  const enquiryDoc = hasSite ? enquiryDocument(selection, { question, intendedUse: use, timing, budget, access, services }, measurementResult, imported, live, manual, mode === 'example', foundationAllowanceM, currentScreening, currentAssumptions, pathway, currentScenario, effectiveSettings, propertyScan.result) : null
  const draftText = enquiryDoc ? enquiryPlainText(enquiryDoc) : ''
  const manualSignature = JSON.stringify({ facts: manual?.facts ?? null, site: manual?.site ?? null })
  const propertyComplete = mode === 'example' || !!(live || selection || mode === 'manual' && manual && manualConfirmedFor === manualSignature)
  const placementComplete = !!(measurementResult || mode === 'manual' && manual?.assessment)
  const previousPropertyComplete = useRef(false)
  useEffect(() => {
    if (propertyComplete && !previousPropertyComplete.current) { setExpanded({ property: false, placement: true, next: false }); setJourneyStep('placement') }
    if (!propertyComplete && previousPropertyComplete.current) { setExpanded({ property: true, placement: false, next: false }); setJourneyStep('property') }
    previousPropertyComplete.current = propertyComplete
  }, [propertyComplete])
  useEffect(() => {
    function revealStep(event: MouseEvent) {
      const anchor = event.target instanceof Element ? event.target.closest('a') : null
      if (event.defaultPrevented || !anchor?.closest('.builder-journey-rail') || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
      const routes: Record<string, JourneyStep> = { '#builder-model': 'model', '#builder-property': 'property', '#builder-placement': 'placement', '#placement-action-front': 'streets', '#placement-action-rear': 'boundaries', '#builder-property-details': 'details', '#builder-quick-checks': 'checks', '#builder-next': 'enquiry', '#builder-email': 'email' }
      const step = routes[anchor.getAttribute('href') ?? '']
      if (step) { event.preventDefault(); openJourneyStep(step) }
    }
    document.addEventListener('click', revealStep)
    return () => document.removeEventListener('click', revealStep)
  })
  // Review milestones apply to the current placement and editable assumptions;
  // neither visiting a step nor requesting an email establishes a passing check.
  const reviewRevision = JSON.stringify([geometryRevision, placementRevision, currentAssumptions, effectiveSettings])
  const currentMeasurement = measurementResult?.result ?? manual?.assessment
  const summary = zoningCase ? homeownerSummary({ geometry: measurementResult?.result ?? null,
    geometryComplete: (!live || live.observation.buildingsState === 'available') && !!measurementResult && overlapFinding(zoningCase, measurementResult.result).complete,
    scenario: currentScenario, screening: currentScreening,
    assumptions: currentAssumptions, settings: effectiveSettings, mapped: mappedZoning, lookup: currentZoning, zoningBusy, zoningError: currentZoningError,
    propertyScan: propertyScan.result, propertyScanBusy: propertyScan.busy, propertyScanError: propertyScan.error, scenarioError: currentScenarioError, screeningError: currentScreeningError, onRetryAvailable: !!zoningKey }) : null
  const nextJourneyStep: JourneyStep = !placementComplete ? 'placement' : journeyStep === 'checks' ? 'enquiry' : journeyStep === 'details' ? 'checks' : boundaryMode === 'front' ? 'boundaries' : boundaryMode === 'waterfront' ? 'boundaries' : boundaryMode === 'rear' ? 'details' : streetAdjacency.all_marked ? 'boundaries' : 'streets'
  const continuation = nextJourneyStep === 'placement' ? { label: 'Place model', hint: 'Choose an approximate position on the map.' }
    : nextJourneyStep === 'streets' ? { label: 'Mark street edges', hint: 'Happy with this position? Next, mark every edge adjoining a street.' }
    : nextJourneyStep === 'boundaries' ? { label: 'Review boundaries', hint: 'Next, review the suggested front, rear and side edges and the planning buffers.' }
    : nextJourneyStep === 'details' ? { label: 'Review property details', hint: 'Next, answer the property questions you know. You can leave the rest unknown.' }
    : nextJourneyStep === 'enquiry' ? { label: 'Prepare enquiry', hint: 'Next, turn these findings and open questions into an editable enquiry.' }
    : { label: 'Review quick checks', hint: 'Next, review what looks promising and which questions to include in your enquiry.' }
  const summaryPanel = summary && <HomeownerSummary summary={summary} onNavigate={navigateFlag} continuation={{ ...continuation, onContinue: () => openJourneyStep(nextJourneyStep) }} />
  const placementContinuation = summary && <div className="homeowner-summary__continue"><p>{buffersPending ? 'Save your planning buffers to apply them before continuing.' : continuation.hint}</p><div className="step-action"><button className="builder-continue" type="button" disabled={buffersPending} onClick={() => openJourneyStep(nextJourneyStep)}>Next: {continuation.label}<span aria-hidden="true"> →</span></button><StepInfo label={continuation.label}>{continuation.hint} Existing findings and unanswered questions remain in your enquiry.</StepInfo></div><p className="homeowner-summary__continue-note">You can continue with open questions. Your placement and findings stay with your enquiry.</p></div>
  function changeProperty() {
    if (mode === 'live') { siteEdited(); setLive(null); setPropertyReset(value => value + 1) }
    else changeMode('live')
    setExpanded({ property: true, placement: false, next: false })
    requestAnimationFrame(() => focusSummaryTarget(document, 'sd-address'))
  }
  function openProgress(step: 'property' | 'placement' | 'checks' | 'enquiry') {
    openJourneyStep(step)
  }
  function openJourneyStep(step: JourneyStep) {
    if (!propertyComplete && step !== 'model' && step !== 'property') step = 'property'
    if (!zoningCase && (step === 'streets' || step === 'boundaries' || step === 'details')) step = 'placement'
    if (boundaryMode === 'front' && step !== 'streets' && step !== 'property') completeStreetMarks()
    if (boundaryMode === 'rear' && (step === 'details' || step === 'checks' || step === 'enquiry' || step === 'email')) setReviewedBoundariesFor(reviewRevision)
    if (journeyStep === 'checks' && (step === 'enquiry' || step === 'email')) setReviewedChecksFor(reviewRevision)
    if (journeyStep === 'details' && (step === 'checks' || step === 'enquiry' || step === 'email')) setReviewedDetailsFor(reviewRevision)
    setJourneyStep(step)
    if (step === 'streets') changeBoundaryMode('front')
    if (step === 'boundaries') changeBoundaryMode('rear')
    if (step === 'placement' || step === 'details') setBoundaryMode('place')
    setExpanded(previous => ({ ...previous, ...(step === 'property' ? { property: true } : step === 'enquiry' || step === 'email' ? { next: true } : { placement: true }) }))
    const targets: Record<JourneyStep, string> = { model: 'builder-title', property: 'builder-site-mode', placement: 'placement-map', streets: 'placement-action-front', boundaries: 'placement-action-rear', details: 'builder-property-details', checks: 'builder-quick-checks', enquiry: 'builder-question', email: 'builder-email-recipient' }
    requestAnimationFrame(() => {
      focusSummaryTarget(document, targets[step])
      if (step === 'checks') { const details = document.querySelector<HTMLDetailsElement>('.homeowner-summary__checks'); if (details) details.open = true }
    })
  }
  function navigateFlag(target: string) {
    const propertyFact = ['building-type', 'existing-suites', 'principal-building', 'waterfront-lot', 'zsa-floor-area', 'separation-measurement-choice'].includes(target)
    setJourneyStep(propertyFact ? 'details' : target === 'street-side' ? 'streets' : target === 'boundary-roles' || target === 'boundary-offsets' ? 'boundaries' : target === 'placement-map' ? 'placement' : 'checks')
    if (boundaryMode === 'front' && target !== 'street-side') completeStreetMarks()
    if (propertyFact || target === 'placement-map') setBoundaryMode('place')
    if (target === 'boundary-roles' || target === 'boundary-offsets') { changeBoundaryMode('rear'); setBoundaryEditorOverride(true) }
    if (target === 'street-side') { changeBoundaryMode('front'); target = 'placement-action-front' }
    if (target === 'zoning-retry') { setZoningRetry(value => value + 1); return }
    if (target === 'retry-scenario') { setScenarioRetry(value => value + 1); return }
    if (target === 'retry-screening') { setConditionalRetry(value => value + 1); return }
    setExpanded(previous => ({ ...previous, placement: true }))
    requestAnimationFrame(() => focusSummaryTarget(document, target))
  }
  const placementSummary = currentMeasurement
    ? `Measured observation · ${currentMeasurement.checks.some(check => check.relation === 'outside' || check.relation === 'touches' || check.relation === 'positive_area_overlap') ? 'conflict observed' : 'review captured geometry'}${measurementResult?.result.checks.some(check => check.comparison === 'shortfall') ? ' · clearance shortfall' : ''} · ${currentScreening ? 'conditional candidate zoning checks available' : 'zoning comparison unresolved'}. Expand to review distances and findings.`
    : 'No current measurement. Placement can remain unknown in your enquiry.'

  const enquiryReady = !!enquiryDoc && readyFor === draftText
  const progressCallback = useRef(onProgressChange)
  progressCallback.current = onProgressChange
  useEffect(() => { progressCallback.current?.({ model: true, property: propertyComplete, placement: placementComplete, streets: !!geometryRevision && streetAdjacency.all_marked, boundaries: reviewedBoundariesFor === reviewRevision, details: reviewedDetailsFor === reviewRevision, checks: reviewedChecksFor === reviewRevision, enquiry: enquiryReady, email: emailRequestedFor === JSON.stringify([draftText, recipient, includeSiteDetails]), current: journeyStep, mapAvailable: propertyComplete ? !!zoningCase : undefined }) }, [zoningCase, propertyComplete, placementComplete, enquiryReady, geometryRevision, streetAdjacency.all_marked, reviewedBoundariesFor, reviewedDetailsFor, reviewedChecksFor, reviewRevision, emailRequestedFor, draftText, recipient, includeSiteDetails, journeyStep])
  useEffect(() => { setReadyFor(null) }, [draftText])
  const emailBody = enquiryDoc ? enquiryEmailBody(enquiryDoc, includeSiteDetails) : ''
  const emailSubject = enquiryDoc?.example ? 'Saved example only — Model 300 question' : 'Model 300 preliminary enquiry'
  useEffect(() => { setEmailMessage('') }, [emailBody, emailSubject])
  const emailTooLong = !!enquiryDoc && (!emailDraftUrl('mailto', recipient, emailSubject, emailBody) || !emailDraftUrl('gmail', recipient, emailSubject, emailBody)) && validRecipient(recipient)
  const shortEmailBody = enquiryDoc?.example
    ? 'SAVED EXAMPLE ONLY — not my property. I will paste the full reviewed Model 300 enquiry into this draft before sending.'
    : 'I have prepared a Model 300 enquiry. I will paste the full reviewed text into this draft before sending.'
  function openDraft(kind: 'mailto' | 'gmail') {
    const url = emailDraftUrl(kind, recipient, emailSubject, emailTooLong ? shortEmailBody : emailBody)
    if (!url) { setEmailMessage('Enter one valid email address without line breaks.'); return }
    try {
      if (kind === 'mailto') window.location.href = url
      else window.open(url, '_blank', 'noopener,noreferrer')
      setEmailRequestedFor(JSON.stringify([draftText, recipient, includeSiteDetails]))
      setJourneyStep('email')
      setEmailMessage(emailTooLong
        ? 'Short placeholder draft requested. If no compose window opens, copy the full email body above into a new message. Nothing was sent.'
        : 'Email draft requested. If no compose window opens, copy the email body above into a new message. Nothing was sent.')
    } catch {
      setEmailMessage('The browser could not request an email draft. Copy the email body above into a new message. Nothing was sent.')
    }
  }
  async function copyEmailBody() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(emailBody)
      setEmailMessage('Full email body copied.')
    } catch { setEmailMessage('Clipboard unavailable. Select and copy the email body above.') }
  }
  function downloadMarkdown() {
    if (!enquiryDoc) return
    const objectUrl = URL.createObjectURL(new Blob([enquiryMarkdown(enquiryDoc)], { type: 'text/markdown;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = objectUrl; anchor.download = 'model-300-enquiry.md'; anchor.click()
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
  }
  return <div className="builder-demo">
    <section className="builder-hero" id="builder-model" aria-labelledby="builder-title">
      <p className="eyebrow">Independent sample journey · aux box</p>
      <h1 id="builder-title">Explore Model 300 on your site</h1>
      <p>Start with a site lead or the facts you know. Find a Victoria property, or sketch your own approximate lot, then test one placement and take away an unsent enquiry.</p>
      <p className="notice">See whether Model 300 looks plausible enough to discuss with the provider. This independent aux box example prepares an enquiry; nothing is sent automatically.</p>
      <p><strong>Model 300</strong> · {original('nominal_exterior_width')} × {original('nominal_exterior_depth')} · advertised height {original('advertised_overall_height')}. Provider dimensions are unreviewed.</p>
      <ModelImage />
      <PriceTiming model={model} />
      <details className="builder-model-details"><summary>Model photos, specifications and sources</summary>
      <div className="builder-specs" aria-label="Captured model information">
        <div><strong>{original('nominal_exterior_width')} × {original('nominal_exterior_depth')}</strong><span>Provider nominal exterior rectangle · {metres('nominal_exterior_width')} × {metres('nominal_exterior_depth')}</span></div>
        <div><strong>{original('advertised_overall_height')}</strong><span>Advertised exterior height; installed regulatory height and datum unknown</span></div>
        <div><strong>{original('manufacturer_footprint')}</strong><span>Provider footprint; roof projections and regulatory area unverified</span></div>
      </div>
      <p className="metadata">aux box · Model 300 public product page · captured {readableDate(model.sources[0]?.captured_at)} · {model.review_status}; manufacturer revision unknown. <a href={model.provider_url} target="_blank" rel="noreferrer">Provider source page</a>.</p>
      <p className="metadata">{model.footprint_note} {model.height_note} {model.service_area_note}</p>
      <TechnicalDetails title="Catalogue source and exact model record"><pre>{JSON.stringify({ snapshot_id: bundledCatalogue.snapshot_id, model }, null, 2)}</pre></TechnicalDetails>
      </details>
    </section>
    <section className="builder-stage" id="builder-property" aria-labelledby="builder-property-title">
    <p className="eyebrow">Property</p><h2 id="builder-property-title">Start with what you know</h2>
    <p>{propertyComplete ? (mode === 'example' ? 'Saved Victoria example selected.' : `${live?.address.label || manual?.facts.address || selection?.candidate?.address.value || selection?.manual.address.value || 'Site description'} · ${live ? 'source-selected; identity and ownership unverified' : 'user-supplied; unverified'}.`) : 'Choose a property or enter the facts you know.'}</p>
    <button type="button" aria-expanded={expanded.property} aria-controls="builder-property-content" onClick={() => toggleStep('property')}>{expanded.property ? 'Collapse property' : 'Review or change property'}</button>
    <div id="builder-property-content" hidden={!expanded.property}>
    <div className="builder-entry-choices"><div><strong>Use my own property</strong><p>Search a Victoria address or enter known facts.</p><button type="button" onClick={() => changeMode('live')}>Use my own property</button></div>
      <div><strong>Try an example property</strong><p>Open a saved parcel and roofline with an illustrative Model 300 placement.</p><button type="button" onClick={() => changeMode('example')}>Try an example property</button></div></div>
    <p className="metadata">Changing property mode clears the current placement, answers and unsent draft. Copy any question you want to keep first.</p>
    <label htmlFor="builder-site-mode">How would you like to enter your property?</label>
    <select id="builder-site-mode" value={mode} onChange={event => changeMode(event.target.value as typeof mode)}>
      <option value="live">Search a Victoria address</option><option value="manual">Enter facts or sketch manually</option><option value="retained">Use the retained example workflow</option><option value="example">Example property / saved data</option>
    </select>
    {mode === 'live' && <SiteDiscovery autoProceed resetKey={propertyReset} onConfirm={next => { siteEdited(); setLive(next) }} onManual={() => changeMode('manual')} />}
    {mode === 'retained' && <SitePreparation draft={draft} onDraftChange={next => { setDraft(next); setReadyFor(null) }} selection={selection}
      onEdit={siteEdited} onConfirm={next => { setSelection(next); setImported(false); setMeasurementResult(null); setReadyFor(null); setRevision(value => value + 1) }} />}
      {mode === 'manual' && <ManualSiteInput onChange={value => { if (JSON.stringify(value) !== JSON.stringify(manual)) { setManual(value); setReadyFor(null) } }} footprint={{ widthM: Number(measurement('nominal_exterior_width')?.quantity?.value) || null, depthM: Number(measurement('nominal_exterior_depth')?.quantity?.value) || null, label: 'aux box Model 300 · unreviewed nominal dimensions' }} />}
      {mode === 'manual' && hasSite && <button type="button" onClick={() => setManualConfirmedFor(manualSignature)} disabled={propertyComplete}>Confirm my site description</button>}
    </div>
    </section>
    <nav className="builder-progress" aria-label="Journey quick links"><ol>
      <li><button type="button" onClick={() => openProgress('property')}><strong>Property</strong><span>{propertyComplete ? 'Selected' : 'Choose property'}</span></button><StepInfo label="Property">Choose the property you want to explore. Source matches are leads; you can correct them or enter your own property facts.</StepInfo></li>
      <li><button type="button" disabled={!propertyComplete} onClick={() => openProgress('placement')}><strong>Placement</strong><span>{placementComplete ? 'Measured' : 'Explore position'}</span></button><StepInfo label="Placement">Move the unit on the map to test this position against captured outlines. Changing a boundary mark does not move the unit.</StepInfo></li>
      <li><button type="button" disabled={!summary} onClick={() => openProgress('checks')}><strong>Quick checks</strong><span>Review findings</span></button><StepInfo label="Quick checks">Review conflicts and missing information beside the map. Use the correction actions to supply facts you know.</StepInfo></li>
      <li><button type="button" disabled={!hasSite} onClick={() => openProgress('enquiry')}><strong>Enquiry</strong><span>{enquiryReady ? 'Draft ready' : 'Prepare draft'}</span></button><StepInfo label="Enquiry">Prepare a useful provider question with the current findings and open questions. The draft stays local until you choose to share it.</StepInfo></li>
    </ol></nav>
    {propertyComplete && <div className="builder-selected-property"><strong>Property: {mode === 'example' ? 'Saved Victoria example · not your property' : live?.address.label || manual?.facts.address || 'User-supplied site'}</strong><span>{live ? `${live.parcel.label} · source match, identity and ownership unverified` : 'Approximate and unreviewed'}</span><button type="button" onClick={changeProperty}>Wrong property? Change</button></div>}
    <section className="builder-stage" id="builder-placement" aria-labelledby="builder-placement-title">
      <p className="eyebrow">Placement</p><h2 id="builder-placement-title">Explore one approximate placement</h2>
      <p>{propertyComplete ? zoningCase ? 'Place the unit and see what is worth exploring.' : placementSummary : 'Choose a property to explore placement.'}</p>
      <button type="button" aria-expanded={expanded.placement && propertyComplete} aria-controls="builder-placement-content" disabled={!propertyComplete} onClick={() => toggleStep('placement')}>{expanded.placement ? 'Collapse placement' : 'Explore placement'}</button>
      <div id="builder-placement-content" hidden={!expanded.placement || !propertyComplete}>
      {mode === 'manual' && <p>Your manual sketch and placement controls are in Property. Reopen that step to adjust them.</p>}
      {mode === 'example' && <ExampleProperty key={revision} placementContinuation={placementContinuation} placementSummary={summaryPanel} boundaryInteraction={boundaryInteraction} onMeasurement={value => { setMeasurementResult(value); setReadyFor(null) }} />}
      {mode === 'live' && (liveCase ? <OccupiedLots key={revision} placementContinuation={placementContinuation} placementSummary={summaryPanel} compactPlacement suppliedCase={liveCase} boundaryInteraction={boundaryInteraction} allowedModelIds={[MODEL_ID]} initialModelId={MODEL_ID} onMeasurement={value => { setMeasurementResult(value); setReadyFor(null) }} showHandoff={false} /> : <p>Select a Victoria property above to open its captured parcel sketch. Available geometry is approximate and unreviewed.</p>)}

    {zoningCase && <><section className="builder-placement-results" aria-label="Current placement results">
      <details className="builder-how-checked"><summary>How we checked · sources, assumptions and exact evidence</summary>
        <ConditionalScreen compact result={currentScreening} busy={!!requestKey && conditionalBusy && !currentScreening} error={currentScreeningError} onRetry={() => setConditionalRetry(value => value + 1)} boundaryEvidence={<PlacementScenarios assumptions={currentAssumptions} request={scenarioRequest} result={currentScenario} legalResult={currentScreening} busy={!!scenarioKey && scenarioBusy && !currentScenario} error={currentScenarioError} frontEdge={streetEdge} rearEdge={rearEdge} boundaryMode={boundaryMode} onBoundaryMode={changeBoundaryMode} onRetry={() => setScenarioRetry(value => value + 1)} />} />
      </details></section>
      <PropertyScan scan={propertyScan} />
      <AdditionalInputs key={additionalKey} buffers={estimateBuffers} onBuffers={setEstimateBuffers} foundation={foundationAllowanceM} onFoundation={setFoundationAllowanceM} onHeight={value => { setScoutingHeight({ key: additionalKey, value }); setReadyFor(null) }} result={currentScenario} />
      <ProjectDetails settings={effectiveSettings} mapped={mappedZoning} lookup={currentZoning} busy={!!zoningKey && zoningBusy && !currentZoning} error={currentZoningError} onRetry={() => setZoningRetry(value => value + 1)} onChange={next => { setProjectSettings(next); setReadyFor(null) }} />
</>}
    {selection && <section className="builder-optional" aria-labelledby="builder-optional-title">
      <p className="eyebrow">Optional placement</p><h2 id="builder-optional-title">Import a retained example only if useful</h2>
      <p>Three captured lots are examples with their own parcel and roofline geometry. They are not citywide address coverage. Importing one does not match it to your address or parcel lead.</p>
      {!imported ? <button type="button" onClick={() => { setImported(true); setReadyFor(null) }}>Import a separate retained example for placement</button>
        : <><button type="button" onClick={() => { setImported(false); setMeasurementResult(null); setReadyFor(null); setRevision(value => value + 1) }}>Remove example</button>
          <OccupiedLots key={revision} allowedModelIds={[MODEL_ID]} initialModelId={MODEL_ID} onMeasurement={value => { setMeasurementResult(value); setReadyFor(null) }} showHandoff={false} /></>}
    </section>}
    {mode === 'retained' && !selection && <p>Confirm a site lead above to consider a separate retained placement example. An example is never matched to your site lead.</p>}
      <details className="builder-optional"><summary>Illustrate model height and foundation</summary><p>This illustration is separate from the installed-height comparison above. A foundation allowance does not establish average grade.</p><HeightView key={`height-${heightRevision}`} model={model} foundationAllowanceM={foundationAllowanceM} onFoundationAllowanceChange={value => { setFoundationAllowanceM(value); setReadyFor(null) }} /></details>
      </div>
      {propertyComplete && <button className="builder-continue" type="button" onClick={() => openJourneyStep('enquiry')}>Prepare enquiry{placementComplete ? '' : ' with placement unknown'}</button>}
    </section>
    <section className="builder-stage builder-enquiry" id="builder-next" aria-labelledby="builder-enquiry-title">
      <p className="eyebrow">Take away · local draft</p><h2 id="builder-enquiry-title">Prepare a useful question</h2>
      <p>Review a summary for the builder, then open an editable email draft. Nothing is sent automatically.</p>
      <button type="button" aria-expanded={expanded.next} aria-controls="builder-enquiry-content" onClick={() => toggleStep('next')}>{expanded.next ? 'Collapse enquiry' : 'Review enquiry'}</button>
      <div id="builder-enquiry-content" hidden={!expanded.next}>
      {!hasSite && <p>Add a property or your known site facts above to prepare an unsent enquiry. Your answers stay local to this journey.</p>}
      {hasSite && <><p>Leave unknown answers blank. This text stays in your browser until you copy it; no provider request or contact record is created.</p>
      <div className="builder-questions">
        <label htmlFor="builder-question">Your question</label><textarea id="builder-question" value={question} onChange={event => setQuestion(event.target.value)} placeholder="What would you like to ask the builder? Leave blank for a suggested question." />
        <label htmlFor="builder-use">Intended use</label><input id="builder-use" value={use} onChange={event => setUse(event.target.value)} placeholder="e.g. family accommodation; unknown is fine" />
        <label htmlFor="builder-timing">Possible timing</label><input id="builder-timing" value={timing} onChange={event => setTiming(event.target.value)} placeholder="e.g. next year; unknown is fine" />
        <label htmlFor="builder-budget">Budget range, optional</label><input id="builder-budget" value={budget} onChange={event => setBudget(event.target.value)} placeholder="Leave blank if unknown" />
        <label htmlFor="builder-access">Access or crane questions</label><input id="builder-access" value={access} onChange={event => setAccess(event.target.value)} placeholder="Known access facts or questions" />
        <label htmlFor="builder-services">Services or utility questions</label><input id="builder-services" value={services} onChange={event => setServices(event.target.value)} placeholder="Known services or questions" />
      </div>
      {enquiryDoc && <EnquiryPreview document={enquiryDoc} />}
      <div className="builder-enquiry-actions">
        <CopyableRecord id="builder-enquiry-text" label="Plain-text enquiry to copy" value={draftText} />
        <button type="button" onClick={downloadMarkdown}>Download Markdown enquiry</button>
        <button type="button" onClick={() => setReadyFor(draftText)} disabled={enquiryReady}>Mark enquiry ready</button>
        <span role="status">{enquiryReady ? 'Ready for your review and optional handoff. No message has been sent.' : 'Draft in progress. Review before marking ready.'}</span>
      </div>
      <div className="step-action"><button className="builder-continue" type="button" onClick={() => { setReadyFor(draftText); openJourneyStep('email') }}>Next: Review email draft →</button><StepInfo label="Review email draft">Review your enquiry first. Next opens the recipient and exact email text for your review; nothing is sent.</StepInfo></div>
      <section className="builder-email" id="builder-email" aria-labelledby="builder-email-title">
        <h3 id="builder-email-title">Open an editable email draft</h3>
        <p>Review the recipient and exact text below. These buttons ask your browser to open an editable draft; your browser or email setup may prevent it. Only you can send it. This demonstration has no affiliation with aux box.</p>
        <p className="metadata">The <a href="https://www.auxbox.ca/contact" target="_blank" rel="noreferrer">official aux box contact page</a> directs general enquiries to a form. Its published email addresses are for privacy, media or careers, so no product enquiry recipient is prefilled. Checked 2026-10-05.</p>
        <label htmlFor="builder-email-recipient">Recipient email (optional; edit before opening)</label>
        <input id="builder-email-recipient" type="email" autoComplete="email" value={recipient} onChange={event => { setRecipient(event.target.value); setReadyFor(null); setEmailMessage('') }} aria-invalid={!validRecipient(recipient)} />
        {!validRecipient(recipient) && <p role="alert">Enter one valid email address without line breaks.</p>}
        <label className="builder-email-choice"><input type="checkbox" checked={includeSiteDetails} onChange={event => { setIncludeSiteDetails(event.target.checked); setReadyFor(null); setEmailMessage('') }} /> Include site details in the email</label>
        <p className="metadata">{includeSiteDetails ? 'The property summary below may include an address or site description.' : 'The automatic property summary is excluded. Your question is still included; check it for any address or personal details you typed. The full copy and download include property details.'}</p>
        <label htmlFor="builder-email-subject">Subject</label><input id="builder-email-subject" readOnly value={emailSubject} />
        <label htmlFor="builder-email-body">Exact email body to share</label><textarea id="builder-email-body" readOnly rows={12} value={emailBody} />
        {emailTooLong && <p role="status">The full email is too long for a reliable draft link. The buttons request a short placeholder draft. Copy the complete text above and paste it into your email app before sending; no content is silently shortened.</p>}
        <div className="builder-email-buttons">
          <button className="builder-email-primary" type="button" disabled={!validRecipient(recipient)} onClick={() => openDraft('mailto')}><span aria-hidden="true">✉ </span>Create email draft</button>
          <button type="button" disabled={!validRecipient(recipient)} onClick={() => openDraft('gmail')}>Open in Gmail</button>
          <button type="button" onClick={() => void copyEmailBody()}>Copy email body</button>
        </div>
        <p className="metadata">If no compose window opens, use Copy email body and paste the exact text shown above into a new message. Check the recipient and subject there before sending.</p>
        <p role="status">{emailMessage}</p>
      </section>
      <TechnicalDetails title="Complete site selection, sources and measurements"><CopyableRecord id="builder-technical-record" label="Complete technical evidence export" value={JSON.stringify({ schema_version: 'builder-evidence.v1', foundation_scenario: { allowance_m: foundationAllowanceM, basis: 'planning_assumption', used_in_preliminary_height: currentScenario?.additional_checks?.some(check => check.id === 'height' && check.basis.startsWith('advertised height')) ?? false }, selection, live, manual, example: mode === 'example' ? exampleCase : null, measurement: measurementResult, zoning_site_assumptions: currentAssumptions, project_settings: zoningCase ? effectiveSettings : null, municipal_zoning_lookup: currentZoning, municipal_zoning_error: currentZoningError || null, property_scan: propertyScan.result, property_scan_error: propertyScan.error || null, placement_scenario_request: scenarioRequest, placement_scenario_result: currentScenario, conditional_screening: currentScreening }, null, 2)} /></TechnicalDetails>
      </>}
      </div>
    </section>
  </div>
}
