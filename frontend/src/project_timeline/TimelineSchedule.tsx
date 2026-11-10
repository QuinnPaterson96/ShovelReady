import { rangeWeeks, type Range, type TimelineResult } from './model'

const week = (days: number) => days > 0 && days / 7 < .1 ? '<0.1' : Number((days / 7).toFixed(1)).toLocaleString('en-CA')

/** Explain the existing join; never recalculate or round its comparisons. */
export function CompletionDrivers({ result }: { result: TimelineResult }) {
  const production = result.stages.find(stage => stage.id === 'production')!.end
  const site = result.stages.find(stage => stage.id === 'site')!.end
  const driver = (bound: keyof Range) => production![bound] === site![bound] ? 'The manufacturer and site finish together.'
    : production![bound] > site![bound] ? 'The manufacturer schedule finishes later than site work.' : 'Permits and site work finish later than the manufacturer schedule.'
  return <div className="timeline-drivers"><h2>What determines completion?</h2>
    {!result.ready || !production || !site ? <p>Complete the open timing inputs to see which work determines installation.</p> : <>
      {driver('minimum') === driver('maximum') ? <p>{driver('maximum')} It determines when installation can start.</p>
        : <><p><strong>With shorter allowances:</strong> {driver('minimum')}</p><p><strong>With longer allowances:</strong> {driver('maximum')}</p></>}
      <p>Installation waits for both. After that, allow {rangeWeeks(result.stages.find(stage => stage.id === 'installation')!.duration)} for installation and {rangeWeeks(result.stages.find(stage => stage.id === 'completion')!.duration)} for completion.</p>
      <p className="metadata">Shortening work that finishes sooner may leave the completion date unchanged.</p>
    </>}
  </div>
}

export function TimelineSchedule({ result }: { result: TimelineResult }) {
  if (!result.ready) return <section className="timeline-schedule"><h2>How the stages overlap</h2><p>The schedule is open. Adjust the missing or invalid timing inputs below to draw the stage ranges.</p></section>
  const horizon = Math.max(1, Math.ceil(result.ready.maximum / 7)) * 7
  const stages = result.stages.map(stage => ({ id: stage.id as string, label: stage.id === 'production' && result.draft.schedule === 'contract_to_delivery' ? 'Manufacturer bundle' : stage.label, start: stage.start!, end: stage.end!, target: `timeline-stage-${stage.id}` }))
  if (result.draft.pathway === 'additional_approvals') {
    stages.splice(1, 0, { id: 'additional', label: 'Additional approvals', start: result.stages[0].end!, end: result.stages.find(stage => stage.id === 'permits')!.start!, target: 'timeline-additional-approvals' })
  }
  return <section className="timeline-schedule" aria-labelledby="timeline-schedule-title">
    <h2 id="timeline-schedule-title">How the stages overlap</h2>
    <p>Two schedules use the shorter and longer allowances. Shared horizontal positions show work happening at the same time.</p>
    <p className="timeline-legend"><span><i className="timeline-swatch timeline-short" />Shorter allowances</span><span><i className="timeline-swatch timeline-long" />Longer allowances</span></p>
    <p className="metadata">Planning scenarios, not probabilities. Weeks from project start; overlapping time is counted once.</p>
    <div className="timeline-axis" aria-hidden="true"><span>Week 0</span><span>{week(horizon / 2)}</span><span>{week(horizon)}</span></div>
    <ol className="timeline-chart">
      {stages.map(stage => <li key={stage.id}>
        <a href={`#${stage.target}`} onClick={event => { event.preventDefault(); const target = document.getElementById(stage.target); target?.focus({ preventScroll: true }); target?.scrollIntoView({ block: 'start' }) }}>{stage.label}</a>
        <div className="timeline-tracks" aria-hidden="true">{(['minimum', 'maximum'] as const).map((bound, index) => <div className="timeline-track" key={bound}><span className={index ? 'timeline-long' : 'timeline-short'} style={{ left: `${stage.start[bound] / horizon * 100}%`, width: `${(stage.end[bound] - stage.start[bound]) / horizon * 100}%` }} /></div>)}</div>
        <p className="timeline-chart-values"><span>Shorter: week {week(stage.start.minimum)}–{week(stage.end.minimum)}</span><span>Longer: week {week(stage.start.maximum)}–{week(stage.end.maximum)}</span></p>
      </li>)}
    </ol>
  </section>
}
