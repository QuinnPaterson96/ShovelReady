import { useEffect, useRef, useState } from 'react'
import { measurementWithUnit } from '../measurements'
import { publicSourceUrl, readableDate } from '../ReadableProvenance'
import { drawSetbackGuides, resolveSetbackGuides, setbackPolygonPath, type SetbackContext, type SetbackDrawing } from './geometry'

const roleLabel = (role: string) => role === 'flanking_street' ? 'Street-side' : role === 'rear' ? 'Rear' : role === 'front' ? 'Front' : 'Side'
const show = (value: number) => measurementWithUnit(value, 'length')

export function SetbackLayer({ drawing }: { drawing: SetbackDrawing }) {
  if (drawing.status !== 'ready') return null
  const candidate = setbackPolygonPath(drawing.candidateArea), planning = setbackPolygonPath(drawing.planningArea)
  return <g className="setback-map-layer" aria-hidden="true" pointerEvents="none" data-setback-scenario={drawing.scenarioKey}>
    <path className="setback-map-margin" fillRule="evenodd" d={`${setbackPolygonPath(drawing.parcel)} ${candidate}`} />
    {drawing.lines.some(line => line.buffer > 0) && candidate && <path className="setback-map-planning-margin" fillRule="evenodd" d={`${candidate} ${planning}`} />}
    {drawing.lines.map(line => <g key={line.edgeId} data-setback-edge={line.edgeId}>
      {line.candidate && <>
        <line className="setback-map-line" x1={line.candidate[0][0]} y1={-line.candidate[0][1]} x2={line.candidate[1][0]} y2={-line.candidate[1][1]} vectorEffect="non-scaling-stroke" />
        {(() => {
          const [a, b] = line.candidate
          let angle = Math.atan2(-(b[1] - a[1]), b[0] - a[0]) * 180 / Math.PI
          if (angle > 90) angle -= 180
          if (angle < -90) angle += 180
          return <text className="setback-map-label" transform={`translate(${(a[0] + b[0]) / 2} ${-(a[1] + b[1]) / 2}) rotate(${angle})`} textAnchor="middle" y={-drawing.extent * .012} fontSize={drawing.extent * .034}>{roleLabel(line.role)} · {show(line.minimum)}</text>
        })()}
      </>}
      {line.planning && <line className="setback-map-planning-line" x1={line.planning[0][0]} y1={-line.planning[0][1]} x2={line.planning[1][0]} y2={-line.planning[1][1]} vectorEffect="non-scaling-stroke" />}
    </g>)}
  </g>
}

export function SetbackLegend({ drawing, onScenario }: { drawing: SetbackDrawing; onScenario: (key: string) => void }) {
  if (drawing.status !== 'ready') return <p className="setback-map-status" role="status">{drawing.reason}</p>
  const planning = drawing.lines.filter(line => line.buffer > 0)
  return <div className="setback-map-legend" aria-label="Setback lines and planning margins">
    {drawing.illustrative && <strong>Illustrative garden-suite setbacks</strong>}
    <p><span className="setback-map-key"><span className="setback-map-swatch" aria-hidden="true" />Dashed · candidate setback</span>{planning.length > 0 && <span className="setback-map-key"><span className="setback-map-swatch setback-map-swatch--planning" aria-hidden="true" />Dotted · extra planning margin</span>}</p>
    {drawing.scenarioCount > 1 && <label>Boundary scenario shown <select value={drawing.scenarioKey} onChange={event => onScenario(event.target.value)}>
      {drawing.choices.map((choice, index) => <option key={choice.key} value={choice.key}>Scenario {index + 1} of {drawing.scenarioCount} · front edge {choice.front}</option>)}
    </select></label>}
    <details>
      <summary>Setback distances, assumptions and source</summary>
      <p>One complete boundary scenario is shown: front at edge {drawing.frontEdgeNumber}. Lines are offsets from the approximate captured parcel. The unshaded space is not a model-fit area; the whole unit must still be checked.</p>
      <ul>{drawing.lines.map(line => <li key={line.edgeId}>Edge {line.edgeNumber} · {roleLabel(line.role)}: {show(line.minimum)} candidate setback{line.buffer > 0 ? `, plus ${show(line.buffer)} extra planning margin (${show(line.minimum + line.buffer)} from the mapped edge)` : ''}.{!line.candidate && ' This offset lies beyond the parcel drawing.'}</li>)}</ul>
      {drawing.frontNote && <p>{drawing.frontNote}</p>}
      <p>Use the map controls to correct street and boundary assumptions. See the checklist for the current placement results.</p>
      {drawing.streetUnresolved && <p>Street context is unresolved. This is a hypothetical boundary assignment, not a resolved choice of applicable setbacks.</p>}
      {drawing.lines.some(line => line.manualMeasurement) && <p>Your wall-to-legal-line measurements remain separate: these lines use captured parcel geometry and do not illustrate a surveyed legal line.</p>}
      <p>{drawing.sources.map((source, index) => {
        const url = publicSourceUrl(source.url)
        return <span key={`${source.locator}-${index}`}>{index > 0 ? ' · ' : ''}{source.provider} · {source.record_label} · captured {readableDate(source.capture_date ?? null)} · {source.review_status}. {url && <a href={url} target="_blank" rel="noreferrer">{source.locator}</a>}</span>
      })}</p>
    </details>
  </div>
}

/** Host passes only its current, jurisdiction-supported request/result. A new
 * suggestion may prefer a whole scenario, while later user selection is kept. */
export function useSetbackMap(context?: SetbackContext, preferredScenarioKey?: string) {
  const [selection, setSelection] = useState<{ preference: string | undefined; key: string }>({ preference: undefined, key: '' })
  useEffect(() => { void import('./setback-map.css') }, [])
  const key = selection.preference === preferredScenarioKey ? selection.key || preferredScenarioKey : preferredScenarioKey
  const retained = useRef<ReturnType<typeof resolveSetbackGuides> | null>(null)
  const guides = context ? resolveSetbackGuides(context, retained.current) : null
  useEffect(() => { retained.current = guides?.status === 'ready' ? guides : null }, [guides])
  const drawing = guides ? drawSetbackGuides(guides, key) : null
  return { layer: drawing ? <SetbackLayer drawing={drawing} /> : null,
    legend: drawing ? <SetbackLegend drawing={drawing} onScenario={next => setSelection({ preference: preferredScenarioKey, key: next })} /> : null }
}
