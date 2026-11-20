import { useEffect, useMemo, useState } from 'react'
import { publicSourceUrl, readableDate } from '../ReadableProvenance'
import { measurementWithUnit } from '../measurements'
import { path, points, type Site } from '../occupied_lots/contract'
import type { Confirmed, Source } from '../site_discovery/flow'
import { placementCase } from '../site_discovery/placement'
import { replacementFootprintNote, replacementPlans, type ReplacementPlan } from './catalogue'
import { defaultRemovalId, rankReplacementPlans, type ReplacementTrial } from './geometry'

type Trial = ReplacementTrial<ReplacementPlan>
const titles = {
  suggested: 'Clear trial position',
  partial: 'Partial map check',
  no_trial: 'No clear position found',
  unavailable: 'Map check unavailable',
} as const

/** Fit the display to the observed outlines. SVG y is inverted so north stays up. */
function TrialMap({ site, trial, removedId }: { site: Site; trial: Trial; removedId: string | null }) {
  if (trial.status === 'unavailable') return <p>A trial drawing is unavailable for these outlines.</p>
  const roofPoints = site.buildings.map(points)
  const extent = [...points(site.parcel), ...roofPoints.flat(), ...(trial.placement ?? [])]
  if (extent.length === 0) return <p>The parcel outline is unavailable for this preview.</p>
  const xs = extent.map(([x]) => x), ys = extent.map(([, y]) => y)
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys)
  const span = Math.max(maxX - minX, maxY - minY)
  if (!Number.isFinite(span) || span <= 0) return <p>The mapped outlines cannot be drawn at this scale.</p>
  const pad = span * .09
  const scale = 10 ** Math.floor(Math.log10(span / 3))
  const left = minX - pad / 2, bottom = -minY + pad * .55
  const viewBox = [minX - pad, -maxY - pad, maxX - minX + 2 * pad, maxY - minY + 2 * pad].join(' ')
  return <figure className="replacement-map">
    <svg viewBox={viewBox} role="img" aria-label={`Mapped parcel and roof outlines. ${trial.plan.name}: ${titles[trial.status]}.`}>
      <path className="replacement-parcel" d={path(site.parcel)} fillRule="evenodd" />
      {site.buildings.map(building => <path key={building.id} d={path(building)} fillRule="evenodd"
        className={building.id === removedId ? 'replacement-removed' : 'replacement-retained'} />)}
      {trial.placement && <polygon className="replacement-trial"
        points={trial.placement.map(([x, y]) => `${x},${-y}`).join(' ')} />}
      {roofPoints.map((ring, index) => {
        if (!ring.length) return null
        const x = ring.map(point => point[0]), y = ring.map(point => point[1])
        return <text key={site.buildings[index].id} className="replacement-roof-label"
          x={(Math.max(...x) + Math.min(...x)) / 2} y={-(Math.max(...y) + Math.min(...y)) / 2}
          fontSize={span * .046} textAnchor="middle" dominantBaseline="middle">R{index + 1}</text>
      })}
      <g className="replacement-map-guide" fontSize={span * .044}>
        <text x={maxX + pad / 2} y={-maxY - pad * .38} textAnchor="end">N ↑</text>
        <path d={`M${left} ${bottom} h${scale}`} />
        <text x={left} y={bottom - span * .012}>{scale} m</text>
      </g>
    </svg>
    <figcaption><ul aria-label="Map legend">
      <li><i className="replacement-parcel" />Parcel boundary</li>
      {site.buildings.some(building => building.id !== removedId) && <li><i className="replacement-retained" />Retained roof</li>}
      {removedId && <li><i className="replacement-removed" />Assumed removed</li>}
      {trial.placement && <li><i className="replacement-trial" />{trial.plan.name} trial</li>}
    </ul></figcaption>
  </figure>
}

function SourceRecord({ source, label }: { source: Source; label: string }) {
  const url = publicSourceUrl(source.url)
  return <p>{label} · {source.provider} · {url ? <a href={url} target="_blank" rel="noreferrer">{source.record}</a> : source.record}
    {' · '}captured {readableDate(source.capturedAt)} · {source.review}</p>
}

export function ReplacementPlans({ selected, onBack }: { selected: Confirmed; onBack: () => void }) {
  useEffect(() => { void import('./replacement-plans.css') }, [])
  const site = useMemo(() => placementCase(selected).site, [selected])
  const suggestedRemoval = useMemo(() => defaultRemovalId(site), [site])
  // undefined follows the mapped default; null is an explicit choice to keep all roofs.
  const [removedOverride, setRemovedOverride] = useState<string | null>()
  const removedId = removedOverride === undefined ? suggestedRemoval : removedOverride
  const trials = useMemo(() => rankReplacementPlans(site, replacementPlans, removedId), [site, removedId])
  const suggested = trials.filter(item => item.status === 'suggested')
  const roomiest = suggested[0]
  const largest = suggested.reduce<Trial | undefined>((best, item) =>
    !best || item.plan.widthM * item.plan.depthM > best.plan.widthM * best.plan.depthM ? item : best, undefined)
  const [chosenId, setChosenId] = useState<string>()
  const trial = trials.find(item => item.plan.id === chosenId) ?? trials[0]
  const plan = trial.plan
  const removedIndex = site.buildings.findIndex(building => building.id === removedId)
  return <section className="replacement-plans" aria-labelledby="replacement-plans-title">
    <h2 id="replacement-plans-title" tabIndex={-1}>Compare replacement house plans</h2>
    <p className="replacement-address">{selected.address.label}</p>
    <p>Explore detached Pacific Homes plans on this parcel. Each trial compares the plan’s outline with the lot edges and retained roofs. Zoning, setbacks and servicing still need review.</p>
    <div className="replacement-workspace">
      <div className="replacement-choices">
        {site.buildings.length > 0 && <div className="replacement-removal">
          <label htmlFor="replacement-removed-roof">Which mapped roof should the trial remove?</label>
          <select id="replacement-removed-roof" value={removedId ?? ''} aria-describedby="replacement-removal-note"
            onChange={event => setRemovedOverride(event.target.value || null)}>
            <option value="">Keep all mapped roofs</option>
            {site.buildings.map((building, index) => <option key={building.id} value={building.id}>R{index + 1}{building.id === suggestedRemoval ? ' · largest mapped roof' : ''}</option>)}
          </select>
          <p id="replacement-removal-note" className="metadata">{removedId
            ? `${removedOverride === undefined ? 'The starting assumption removes' : 'Your trial removes'} R${removedIndex + 1}. The dashed outline stays on the map for reference.`
            : 'This trial keeps all mapped roofs in place.'}</p>
        </div>}
        <fieldset className="replacement-ranks">
          <legend>{roomiest ? 'Plans by mapped clearance' : 'Plans to explore'}</legend>
          {trials.map((item, index) => <label className="replacement-choice" key={item.plan.id}>
            <input type="radio" name="replacement-plan-choice" value={item.plan.id} aria-label={item.plan.name}
              aria-describedby={`replacement-choice-info-${item.plan.id}`}
              checked={item.plan.id === plan.id} onChange={() => setChosenId(item.plan.id)} />
            <span><strong>{roomiest && `${index + 1}. `}{item.plan.name}</strong>{' '}
              <span id={`replacement-choice-info-${item.plan.id}`}>
                <span className="replacement-dimensions">{item.plan.widthFt} × {item.plan.depthFt} ft</span>
                <small>{titles[item.status]}{item.clearanceM !== null && ` · ${measurementWithUnit(item.clearanceM, 'length')} minimum gap`}</small>
                {item === roomiest && suggested.length > 1 && <small className="replacement-distinction">Most room around it</small>}
                {item === largest && item !== roomiest && <small className="replacement-distinction">Largest plan with a sampled position</small>}
              </span>
            </span>
          </label>)}
        </fieldset>
      </div>
      <div className="replacement-preview">
        <div aria-live="polite" aria-atomic="true">
          <h3>{plan.name}</h3>
          <p>{trial.reason}</p>
        </div>
        <TrialMap site={site} trial={trial} removedId={removedId} />
        <p><strong>{plan.widthFt} × {plan.depthFt} ft</strong> · {measurementWithUnit(plan.widthM, 'length')} wide × {measurementWithUnit(plan.depthM, 'length')} deep. {plan.description}</p>
        <p>{replacementFootprintNote}</p>
        <p className="metadata"><a href={plan.sourceUrl} target="_blank" rel="noreferrer">{plan.name} specifications at {plan.provider}</a>
          {' · '}captured {readableDate(plan.capturedAt)} · {plan.reviewStatus}</p>
        <details className="replacement-evidence"><summary>Mapped sources and trial assumptions</summary>
          <SourceRecord source={selected.observation.source} label="Parcel" />
          {selected.observation.roofSource && <SourceRecord source={selected.observation.roofSource} label="Roofs" />}
          <p>Mapped outlines follow roof edges. Confirm building identities, walls and site conditions before commissioning design work.</p>
          <p>The minimum gap runs from the trial rectangle to the nearest recorded lot edge or retained roof. Other positions and angles may produce different gaps.</p>
        </details>
      </div>
    </div>
    <button type="button" onClick={onBack}>Back to property options</button>
  </section>
}
