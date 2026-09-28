import { CopyableRecord, publicSourceUrl, readableDate, TechnicalDetails } from '../ReadableProvenance'
import type { Case, Check, Result } from '../occupied_lots/contract'

export type ScenarioHandoffProps = { site: Case; model: unknown; assessment: Result | null }

const record = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
const label = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : null
const metres = (value: number | null) => value === null || !Number.isFinite(value) ? 'unknown' : `${Number(value.toFixed(2))} m`
const area = (value: number | null) => value === null || !Number.isFinite(value) ? 'unknown' : `${Number(value.toFixed(2))} m²`
const cleanUrl = (value: unknown) => publicSourceUrl(typeof value === 'string' ? value : null)?.split('?')[0] ?? null

function modelDescription(model: unknown, placement: Result['input']['placement']) {
  const data = record(model)
  if (!data) return 'Nominal design: manually supplied or unconfirmed; provider and model unknown. Dimension origin unconfirmed.'
  const provider = label(data.provider) ?? 'provider unknown'
  const name = label(data.name) ?? label(data.modelName) ?? 'model unknown'
  const measures = Array.isArray(data.measurements) ? data.measurements : null
  const baseline = (kind: string) => {
    const measure = measures?.map(record).find(item => item?.name === kind && item.status === 'known')
    const quantity = record(measure?.quantity)
    return quantity?.unit === 'm' && Number.isFinite(Number(quantity.value)) ? Number(quantity.value) : null
  }
  const width = baseline('nominal_exterior_width'), depth = baseline('nominal_exterior_depth')
  const origin = width === null || depth === null ? 'Dimension edits cannot be determined from the supplied model record.'
    : width === placement.width_m && depth === placement.depth_m ? 'Submitted dimensions match the captured provider nominal dimensions; later user edits cannot be determined.'
      : 'Submitted dimensions differ from the captured provider nominal dimensions; treat them as user edited.'
  return `Nominal design: ${provider} ${name}. ${origin} Manufacturer revision ${label(data.source_revision) ?? 'not supplied'}; review ${label(data.review_status) ?? 'status unknown'}.`
}

function checkDescription(check: Check, site: Case, assessment: Result) {
  const roof = site.site.buildings.findIndex(building => check.source_feature_ids.includes(building.id))
  const roofLabel = roof < 0 ? 'captured building outline' : `captured ${site.site.buildings[roof].basis} ${roof + 1}`
  switch (check.kind) {
    case 'containment': return `Parcel containment: ${check.relation?.replace(/_/g, ' ') ?? 'unknown'}${check.area_m2 ? `; ${area(check.area_m2)} outside` : ''}.`
    case 'building_overlap': return `Overlap with ${roofLabel}: ${check.relation?.replace(/_/g, ' ') ?? 'unknown'}${check.area_m2 !== null ? `; ${area(check.area_m2)}` : ''}.`
    case 'parcel_boundary_distance': return `Distance to captured parcel boundary: ${metres(check.distance_m)}.`
    case 'nearest_building_distance': return `Distance to nearest captured building outline: ${metres(check.distance_m)}.`
    case 'building_distance': return `Distance to ${roofLabel}: ${metres(check.distance_m)}.`
    case 'named_boundary_distance': return `Distance to captured named boundary: ${metres(check.distance_m)}.`
    case 'requirement': {
      const input = record(assessment.input)
      const requirement = (Array.isArray(input?.requirements) ? input.requirements : []).map(record)
        .find(item => item?.id === (label(record(check)?.requirement_id) ?? check.id.replace(/^requirement:/, '')))
      const feature = requirement?.target === 'building' ? site.site.buildings.find(item => item.id === requirement.target_id)
        : requirement?.target === 'named_boundary' ? site.site.named_boundaries.find(item => item.id === requirement.target_id) : null
      const target = requirement?.target === 'parcel_boundary' ? 'captured parcel boundary'
        : requirement?.target === 'nearest_building' ? 'nearest captured building outline'
          : requirement?.target === 'building' ? `captured building outline ${feature?.source.record_label ?? '(record unknown)'}`
            : requirement?.target === 'named_boundary' ? `captured named boundary ${feature?.source.record_label ?? '(record unknown)'}`
              : 'unidentified target'
      const status = label(requirement?.status) ?? label(record(check)?.requirement_status)
      const provenance = status === 'user_assumption' ? 'User-assumed' : status === 'source_reviewed' ? 'Source-backed, reviewed' :
        status === 'source_unreviewed' ? 'Source-backed, unreviewed' : 'Unattributed'
      const minimum = typeof requirement?.minimum_m === 'number' ? metres(requirement.minimum_m) : 'value unavailable'
      const source = record(requirement?.source)
      const sourceLabel = source ? ` Source: ${label(source.provider) ?? 'provider unknown'}; ${label(source.record_label) ?? 'record unknown'}; captured ${readableDate(label(source.capture_date))}; ${label(source.review_status) ?? 'review status unknown'}.` : ''
      if (check.status !== 'compared' || !check.comparison)
        return `${provenance} minimum to ${target} (${minimum}): comparison unresolved (${check.status}${check.reason ? `; ${check.reason.replace(/_/g, ' ')}` : ''}).${sourceLabel}`
      const outcome = check.comparison === 'meets' ? 'meets' : 'falls short of'
      return `${provenance} minimum to ${target} (${minimum}): measured distance ${outcome} this minimum${check.margin_m === null ? '' : ` by ${metres(Math.abs(check.margin_m))}`}.${status === 'user_assumption' ? ' This is not a legal threshold.' : ' Legal applicability requires separate review.'}${sourceLabel}`
    }
    default: return `${check.kind.replace(/_/g, ' ')}: ${check.reason ?? check.relation?.replace(/_/g, ' ') ?? check.status}.`
  }
}

export function scenarioRecord({ site, model, assessment }: ScenarioHandoffProps) {
  if (!assessment || !isCurrentSite(site, assessment)) return null
  return {
    schema_version: 'shovelready.scenario-handoff.v1',
    status: 'local_unreviewed_scouting_scenario',
    scope: 'One user-supplied nominal footprint placement against captured parcel and parcel-intersecting building outlines; no legal or provider fit determination.',
    site, model, assessment,
  }
}

function isCurrentSite(site: Case, assessment: Result) {
  return assessment.input.parcel.id === site.site.parcel.id &&
    assessment.input.projected_metre_crs === site.site.projected_metre_crs &&
    JSON.stringify(assessment.input.parcel) === JSON.stringify(site.site.parcel) &&
    JSON.stringify(record(assessment.input)?.buildings) === JSON.stringify(site.site.buildings) &&
    JSON.stringify(record(assessment.input)?.named_boundaries) === JSON.stringify(site.site.named_boundaries) &&
    JSON.stringify(record(assessment.input)?.capture) === JSON.stringify(site.site.capture)
}

export function providerEnquiry({ site, model, assessment }: ScenarioHandoffProps) {
  if (!assessment || !isCurrentSite(site, assessment)) return null
  const p = assessment.input.placement
  const source = site.site.parcel.source
  const data = record(model)
  const modelSources = Array.isArray(data?.sources) ? data.sources.map(record).filter(item => item !== null) : []
  const modelSource = modelSources[0]
  const links = [cleanUrl(source.reference), cleanUrl(modelSource?.url ?? data?.provider_url)].filter(Boolean)
  const lines = [
    'UNSENT DRAFT — provider enquiry for preliminary investigation',
    `Property/example: ${site.label}. This is a retained scouting example; property identity and legal boundaries require confirmation.`,
    modelDescription(model, p),
    ...(label(data?.service_area_status) || label(data?.service_area_note) ? [`Provider service coverage in captured catalogue: ${label(data?.service_area_status)?.replace(/_/g, ' ') ?? 'status unknown'}; ${label(data?.service_area_note) ?? 'details not supplied'}. Confirm current coverage with the provider.`] : []),
    `Submitted nominal footprint: ${metres(p.width_m)} wide × ${metres(p.depth_m)} deep; centre (${p.centre_xy[0]}, ${p.centre_xy[1]}) in ${assessment.input.projected_metre_crs}; rotation ${p.angle_degrees}°.`,
    `Site source: ${source.provider}; ${source.record_label}; captured ${readableDate(source.capture_date)}; ${source.review_status}. Capture scope: ${site.site.capture.scope}; completeness ${site.site.capture.completeness.replace(/_/g, ' ')}.`,
    ...(modelSource ? [`Design source: ${label(modelSource.locator) ?? 'record label unknown'}; captured ${readableDate(label(modelSource.captured_at))}; ${label(data?.review_status) ?? 'review status unknown'}.`] : ['Design source: capture date and record label unconfirmed.']),
    ...(links.length ? [`Source links: ${links.join(' ; ')}`] : ['Source links unavailable.']),
    'Measurements for this one supplied placement:',
    ...assessment.checks.map(check => `• ${checkDescription(check, site, assessment)}`),
    'Important unknowns: legal parcel lines, walls versus captured rooflines, building roles, current siting rules, other obstructions and services, controlled provider dimensions and installation requirements. No overlap with captured outlines does not certify clear space.',
    ...assessment.limitations.map(limit => `Capture/assessment limit: ${limit}`),
    'Questions for the provider:',
    '1. Can you provide a current controlled drawing with nominal exterior width and depth, installed envelope, and revision date?',
    '2. What clearance, foundation, access and service conditions should be checked for this design on this property?',
    '3. Which installation and service commitments, if any, apply here, and what information would you need to confirm them?',
  ]
  return lines.join('\n')
}

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export default function ScenarioHandoff(props: ScenarioHandoffProps) {
  const scenario = scenarioRecord(props)
  const enquiry = providerEnquiry(props)
  return <section className="scenario-handoff" aria-labelledby="scenario-handoff-title">
    <p className="eyebrow">Keep investigating</p><h3 id="scenario-handoff-title">Save this scenario or prepare an enquiry</h3>
    {!scenario || !enquiry ? <p className="scenario-handoff-notice" role="status">Measure the current site and footprint placement before exporting. A changed site or missing assessment needs a new measurement; no earlier result is exported.</p> : <>
      <p>These local files contain one preliminary geometry observation, not a verified fit or a sent request. The JSON keeps the full source and measurement record.</p>
      <button type="button" onClick={() => download('shovelready-scenario-v1.json', JSON.stringify(scenario, null, 2), 'application/json')}>Download scenario JSON</button>
      <h4>Draft provider enquiry · unsent</h4>
      <p>Review and edit the text after copying it. ShovelReady does not contact a provider.</p>
      <CopyableRecord id="scenario-provider-enquiry" label="Copyable unsent provider enquiry" value={enquiry} />
      <button type="button" onClick={() => download('shovelready-provider-enquiry-draft.txt', enquiry, 'text/plain')}>Download draft text</button>
      <TechnicalDetails title="Full technical scenario and source identifiers · copyable"><CopyableRecord id="scenario-technical-record" label="Complete JSON record" value={JSON.stringify(scenario, null, 2)} /></TechnicalDetails>
    </>}
  </section>
}
