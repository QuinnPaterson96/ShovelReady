import { useEffect } from 'react'
import { readableDate } from '../ReadableProvenance'
import { changeProjectSetting, type MappedZoning, type ProjectSettings, type SettingEvidence } from './projectSettings'
import type { Pathway } from './model'
import type { ZoningLookup } from './victoriaZoning'

const originLabel = (item: SettingEvidence) => item.origin === 'journey_default' ? 'Journey default · editable' :
  item.origin === 'municipal_lookup' ? 'Municipal observation · unreviewed' :
    item.origin === 'user' ? 'Entered by you · unverified' : item.origin === 'derived' ? 'Derived from your choice' : 'Unknown'
const choice = (value: boolean | null) => value === null ? '' : String(value)

export function ProjectDetails({ settings, mapped, lookup, busy, error, onRetry, onChange }: {
  settings: ProjectSettings; mapped: MappedZoning | null; lookup: ZoningLookup | null; busy: boolean; error: string; onRetry: () => void; onChange: (next: ProjectSettings) => void
}) {
  useEffect(() => { void import('./project-details.css') }, [])
  const proposal = settings.proposal
  const change = <K extends keyof Pathway>(key: K, value: Pathway[K]) => onChange(changeProjectSetting(settings, key, value))
  const mappedZoneChoice = mapped?.zone === 'GRD-1' ? 'GRD-1' : 'other'
  const mappedBylawChoice = mapped?.instrument === 'Zoning Bylaw 2018 (No. 18-072)' ? 'Zoning Bylaw 2018' : 'other'
  const manualConflict = mapped?.status === 'single' && (
    settings.evidence.confirmed_zone.origin === 'user' && proposal.confirmed_zone !== null && proposal.confirmed_zone !== mappedZoneChoice ||
    settings.evidence.confirmed_instrument.origin === 'user' && proposal.confirmed_instrument !== null && proposal.confirmed_instrument !== mappedBylawChoice)
  const mappedText = busy ? 'Checking the selected parcel against the City zoning map…' : error ? `Zoning lookup unavailable: ${error}. Zone and bylaw remain unresolved.` : !mapped ? 'No municipal zoning lookup for this property. Zone and bylaw remain unknown unless you enter an assumption.' :
    mapped.status === 'single' ? `Mapped ${mapped.zone} under ${mapped.instrument}; unreviewed parcel observation.` :
      `${mapped.status === 'multiple' ? 'Multiple zones' : mapped.status === 'partial' ? 'Partial zone coverage' : lookup?.status === 'unavailable' ? 'City zoning map unavailable' : lookup?.status.replace(/_/g, ' ') ?? 'Zoning lookup unavailable'}. No zoning settings were taken from this observation. ${lookup?.issues.length ? `Issue: ${lookup.issues.join('; ')}.` : ''}`
  const coverageText = lookup ? `${lookup.zones.length ? lookup.zones.map(zone => `${zone.source_fields.Zoning ?? 'unknown zone'} · ${zone.bylaw_name ?? zone.source_fields.ZoningBylaw ?? 'unknown bylaw'} · ${Math.round(zone.parcel_coverage_fraction * 1000) / 10}% of parcel`).join('; ') : 'No zone polygon returned.'} ${lookup.uncovered_area_m2 !== null ? `Uncovered area: ${lookup.uncovered_area_m2.toFixed(2)} m².` : 'Coverage unresolved.'}` : ''
  return <section className="project-details" aria-label="Project details">
    <h3>Project details</h3>
    <div className="project-details__summary"><strong>Using these settings</strong>
      <p>Use: {proposal.proposed_use === 'garden_suite' ? 'garden suite' : proposal.proposed_use === 'other' ? 'other use' : 'unknown'} ({originLabel(settings.evidence.proposed_use)}). Foundation: {proposal.foundation_attached === true ? 'permanent-foundation scenario' : proposal.foundation_attached === false ? 'not attached' : 'unknown'} ({originLabel(settings.evidence.foundation_attached)}).</p>
      <p>Zoning: {proposal.confirmed_zone ?? 'unknown'} ({originLabel(settings.evidence.confirmed_zone)}). Bylaw: {proposal.confirmed_instrument ?? 'unknown'} ({originLabel(settings.evidence.confirmed_instrument)}). These settings describe a preliminary scenario, not verified legal facts.</p>
      <p>{mappedText}</p>
      {manualConflict && <p role="status"><strong>Your entered zoning differs from the mapped observation.</strong> Both remain visible for review; the entered choice is used only as an unverified scenario assumption.</p>}
      {lookup && <><p>{coverageText}</p>{lookup.source_records.map((source, index) => <p key={`${source.sha256}:${index}`}>{source.provider} · {source.record_label} · captured {readableDate(source.captured_at_utc)} · {source.review_status.replace(/_/g, ' ')}. {source.source_date_limit} <a href={source.source_url} target="_blank" rel="noreferrer">City source record</a></p>)}
        {lookup.issues.length > 0 && <p>Lookup issues: {lookup.issues.join('; ')}.</p>}</>}
    </div>
    <details><summary>Adjust settings</summary>
      <p>Change only what you know. A default lets you explore this garden-suite question; it is not a manufacturer or site confirmation.</p>
      <label>Proposed use <select value={proposal.proposed_use ?? ''} onChange={event => change('proposed_use', event.target.value === '' ? null : event.target.value as Pathway['proposed_use'])}><option value="">Unknown</option><option value="garden_suite">Garden suite</option><option value="other">Another use</option></select></label>
      <label>Installation scenario <select value={choice(proposal.foundation_attached)} onChange={event => change('foundation_attached', event.target.value === '' ? null : event.target.value === 'true')}><option value="">Unknown</option><option value="true">Attached to a permanent foundation</option><option value="false">Not attached to a permanent foundation</option></select></label>
      <div className="project-details__municipal"><strong>Mapped zoning</strong><p>{mappedText}</p>
        {(error || lookup?.status === 'unavailable') && <button type="button" onClick={onRetry}>Retry zoning lookup</button>}
        {mapped?.source && <p>{mapped.source.provider} · {mapped.source.record_label} · {mapped.source.locator} · captured {readableDate(mapped.source.capture_date)} · {mapped.source.review_status.replace(/_/g, ' ')}. <a href={mapped.source.url} target="_blank" rel="noreferrer">Municipal source</a></p>}
      </div>
      <label>Zone, if you have verified it <select value={proposal.confirmed_zone ?? ''} onChange={event => change('confirmed_zone', event.target.value === '' ? null : event.target.value as Pathway['confirmed_zone'])}><option value="">Unknown</option><option value="GRD-1">Enter GRD-1 for this lot</option><option value="other">Another zone or mixed zoning</option></select></label>
      <label>Applicable bylaw, if verified <select value={proposal.confirmed_instrument ?? ''} onChange={event => change('confirmed_instrument', event.target.value === '' ? null : event.target.value as Pathway['confirmed_instrument'])}><option value="">Unknown</option><option value="Zoning Bylaw 2018">Enter Victoria Zoning Bylaw 2018</option><option value="other">Another or uncertain bylaw</option></select></label>
      <details><summary>Legal boundary and projections</summary>
        <p>The captured parcel is already used for the approximate screen. Legal lot identity and roof projections are separate questions; leave them unknown if unsupported.</p>
        <label>Legal lot boundary <select value={choice(proposal.legal_lot_confirmed)} onChange={event => change('legal_lot_confirmed', event.target.value === '' ? null : event.target.value === 'true')}><option value="">Unknown</option><option value="true">I have evidence this outline matches one legal lot</option><option value="false">Known mismatch or multiple lots</option></select></label>
        <label>Projections affecting setbacks <select value={choice(proposal.no_relevant_projections)} onChange={event => change('no_relevant_projections', event.target.value === '' ? null : event.target.value === 'true')}><option value="">Unknown</option><option value="true">I have evidence no relevant projections apply</option><option value="false">Relevant eaves or other projections may apply</option></select></label>
      </details>
      <p>Model 300's published footprint does not resolve roof overhangs, eaves or Victoria's legal measurement basis. Unknown projections remain open in affected checks.</p>
    </details>
  </section>
}
