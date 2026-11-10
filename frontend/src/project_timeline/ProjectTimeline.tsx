import { useId } from 'react'
import type { calculateRental } from '../rental_scenario/model'
import { money } from '../rental_scenario/model'
import { calendarDate, durationError, firstYearIncome, rangeWeeks, todayLocal, type DurationInput, type StageId, type TimelineDraft, type TimelineResult } from './model'

type Props = { result: TimelineResult; rental: ReturnType<typeof calculateRental> | null; onChange: (draft: TimelineDraft) => void }

function Bounds({ label, value, onChange }: { label: string; value: DurationInput; onChange: (value: DurationInput) => void }) {
  const id = useId()
  const error = durationError(value), unknown = !value.minimum.trim() || !value.maximum.trim()
  return <><div className="timeline-bounds">
    <label htmlFor={`${id}-min`}><span>From <span className="sr-visually-hidden">{label} </span>(weeks)</span>
      <input id={`${id}-min`} type="text" inputMode="decimal" value={value.minimum} aria-invalid={!!error || undefined} aria-describedby={error || unknown ? `${id}-hint` : undefined} onChange={event => onChange({ ...value, minimum: event.target.value, recordedAt: todayLocal() })} /></label>
    <label htmlFor={`${id}-max`}><span>To <span className="sr-visually-hidden">{label} </span>(weeks)</span>
      <input id={`${id}-max`} type="text" inputMode="decimal" value={value.maximum} aria-invalid={!!error || undefined} aria-describedby={error || unknown ? `${id}-hint` : undefined} onChange={event => onChange({ ...value, maximum: event.target.value, recordedAt: todayLocal() })} /></label>
  </div>{(error || unknown) && <p id={`${id}-hint`} className={error ? 'timeline-field-error' : 'metadata'}>{error ?? 'This duration is open while either bound is blank.'}</p>}</>
}

export function TimelineSummary({ result }: { result: TimelineResult }) {
  return <div className="timeline-headline">
    <span>Estimated ready for use</span><strong>{rangeWeeks(result.ready)}</strong>
    <span>{result.readyDates ? `${calendarDate(result.readyDates.earliest)}–${calendarDate(result.readyDates.latest)}` : 'Review the open or invalid timing inputs below.'}</span>
    <span className="metadata">From project start · editable planning scenario</span>
  </div>
}

export function ProjectTimeline({ result, rental, onChange }: Props) {
  const id = useId(), { draft } = result
  const income = firstYearIncome(result, rental)
  function changeStage(stage: StageId, value: DurationInput | null) {
    const overrides = { ...draft.overrides }
    if (value) overrides[stage] = value
    else delete overrides[stage]
    onChange({ ...draft, overrides })
  }
  const profile = result.profile
  return <section className="project-timeline" aria-labelledby={`${id}-title`}>
    <div className="timeline-heading"><h3 id={`${id}-title`}>Project timeline</h3><TimelineSummary result={result} /></div>
    <details className="timeline-details">
      <summary>View and adjust timeline</summary>
      <p>Plan for {result.context.municipality?.name ?? 'your location'}. Timing sources are separate from mapping and zoning coverage. Confirm this schedule with the provider and municipality before booking work.</p>
      <div className="timeline-settings">
        <label htmlFor={`${id}-start`}>Project start date<input id={`${id}-start`} type="date" min="2000-01-01" max="2100-12-31" value={draft.startDate} onChange={event => onChange({ ...draft, startDate: event.target.value })} /></label>
        <label htmlFor={`${id}-pathway`}>Permit planning pathway<select id={`${id}-pathway`} value={draft.pathway} onChange={event => onChange({ ...draft, pathway: event.target.value as TimelineDraft['pathway'], overrides: { ...draft.overrides, permits: undefined } })}>
          <option value="building_permit">Building permit only (assumed)</option><option value="additional_approvals">Allow for additional approvals</option><option value="unknown">Not sure — leave timing open</option>
        </select></label>
        <label htmlFor={`${id}-schedule`}>Manufacturer timing covers<select id={`${id}-schedule`} value={draft.schedule} onChange={event => onChange({ ...draft, schedule: event.target.value as TimelineDraft['schedule'], scheduleOrigin: 'user', overrides: { ...draft.overrides, production: undefined } })}>
          <option value="contract_to_delivery">Contract to delivery</option><option value="production_after_permits">Production after permits</option><option value="production_with_permits">Production alongside permits</option>
        </select></label>
      </div>
      <p className="metadata">Building permit only is a starting assumption. Development permits, variances, tree approvals or other prerequisites may add time; choose additional approvals to allow for them. Changing the pathway resets the permit override; changing manufacturer scope resets its duration.</p>
      {draft.pathway === 'additional_approvals' && <fieldset className="timeline-extra"><legend>Additional approvals before building permit application</legend><Bounds label="Additional approvals" value={draft.additionalApprovals} onChange={value => onChange({ ...draft, additionalApprovals: value })} /><p className="metadata">{draft.additionalApprovals.note}</p></fieldset>}
      {result.errors.length > 0 && <div className="timeline-errors" role="status"><p>Readiness is not estimated yet.</p><ul>{result.errors.map(error => <li key={error}>{error}</li>)}</ul></div>}
      <p className="timeline-overlap">{draft.schedule === 'contract_to_delivery' ? 'The contract-to-delivery bundle runs alongside permits and site work.' : draft.schedule === 'production_with_permits' ? 'Production is assumed to run alongside permits and site work.' : 'Production and site work start after permits and run alongside one another.'} Installation waits for both. Overlapping time is counted once.</p>
      <ol className="timeline-stages">
        {result.stages.map(stage => {
          const override = draft.overrides[stage.id]
          const value = override ?? { minimum: stage.duration ? String(Number((stage.duration.minimum / 7).toFixed(6))) : '', maximum: stage.duration ? String(Number((stage.duration.maximum / 7).toFixed(6))) : '', note: '', recordedAt: todayLocal() }
          return <li key={stage.id}>
            <div className="timeline-stage-heading"><h4>{stage.label}{stage.id === 'production' && draft.schedule === 'contract_to_delivery' ? ' · contract-to-delivery bundle' : ''}</h4><strong>{rangeWeeks(stage.duration)}</strong></div>
            <p className="metadata">{stage.origin === 'user' ? 'Your override' : stage.origin === 'manufacturer_claim' ? 'Manufacturer estimate · unreviewed' : stage.origin === 'source_based_allowance' ? 'Municipal target + planning allowance' : 'Planning allowance'}{stage.start && stage.end ? ` · project week ${Number((stage.start.minimum / 7).toFixed(1))}–${Number((stage.end.maximum / 7).toFixed(1))}` : ''}</p>
            <p>{stage.origin === 'user' && `${stage.scope} `}{stage.note}</p>
            <details className="timeline-stage-edit"><summary>Adjust {stage.label.toLowerCase()}</summary>
              <Bounds label={stage.label} value={value} onChange={next => changeStage(stage.id, next)} />
              <label htmlFor={`${id}-${stage.id}-note`}>Basis or source for {stage.label.toLowerCase()}<input id={`${id}-${stage.id}-note`} type="text" value={value.note} onChange={event => changeStage(stage.id, { ...value, note: event.target.value, recordedAt: todayLocal() })} /></label>
              <p className="metadata">Leave either bound blank for unknown. Values are calendar weeks; zero is an explicit allowance of no time.</p>
              {override && <button type="button" onClick={() => changeStage(stage.id, null)}>Restore {stage.label.toLowerCase()} default</button>}
            </details>
          </li>
        })}
      </ol>
      <div className="timeline-milestones"><p><strong>Delivery / site ready:</strong> {rangeWeeks(result.delivery)} from project start.</p><p><strong>Ready for use:</strong> {rangeWeeks(result.ready)} from project start{result.readyDates && ` · ${calendarDate(result.readyDates.earliest)}–${calendarDate(result.readyDates.latest)}`}, after installation and completion. This does not authorize occupancy.</p></div>
      {rental && <div className="timeline-rental"><label className="timeline-check"><input type="checkbox" checked={draft.includeFirstYear} onChange={event => onChange({ ...draft, includeFirstYear: event.target.checked })} />Estimate rent in the first year from project start</label>
        {draft.includeFirstYear && <><p><strong>{income ? `${money(income.minimum)}–${money(income.maximum)} CAD` : 'Not estimated'}</strong> collected rent after vacancy, before running costs, financing and tax.</p><p className="metadata">{income ? `${income.daysAvailable.minimum}–${income.daysAvailable.maximum} rental days through ${calendarDate(income.endDate)}. ` : 'Complete the timeline, monthly rent and vacancy inputs. '}Assumes renting starts when ready, with no additional letting delay. Full-year economics above remains a stabilized rental year.</p></>}
      </div>}
      <details className="timeline-sources"><summary>Timing sources and assumptions</summary>
        {profile ? <><p><a href={profile.url} target="_blank" rel="noreferrer">{profile.provider} · {profile.label}</a> · captured {profile.capturedAt} · {profile.reviewStatus}; publication date not supplied.</p><p><strong>{profile.businessDays} business days: {profile.milestone === 'initial_response' ? 'initial response target' : 'review target'}, not permit issuance.</strong> {profile.scope}</p></> : <p>No municipal timing profile is available for this location. Permit timing uses an editable planning allowance, with no borrowed city target.</p>}
        {result.manufacturerEvidence.length ? result.manufacturerEvidence.map(({ claim, source }, index) => <div key={index}><p>{claim.wording}</p><p className="metadata">{claim.qualifications.join(' ')} {source ? <><a href={source.url} target="_blank" rel="noreferrer">Manufacturer source</a> · captured {source.captured_at.slice(0, 10)} · unreviewed.</> : 'Source record unavailable.'}</p></div>) : <p>No manufacturer timing is captured for this model. Ask the provider for a schedule; the production duration is a planning allowance.</p>}
        <ul>{result.assumptions.map(note => <li key={note}>{note}</li>)}</ul>
        <p>Published business-day targets use a five-day workweek conversion for planning, without a holiday calendar. Calendar dates round partial days up. Month-based manufacturer ranges use 365.25 ÷ 12 days per month. Sources remain unchanged when you override durations.</p>
      </details>
    </details>
  </section>
}
