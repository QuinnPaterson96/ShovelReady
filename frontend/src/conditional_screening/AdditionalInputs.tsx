import { useState } from 'react'
import { MeasurementInput } from '../MeasurementInput'
import type { ScenarioResult } from './scenarios'

export function AdditionalInputs({ onHeight, result }: { onHeight: (height: number | null) => void; result: ScenarioResult | null }) {
  const [height, setHeight] = useState('')
  return <section className="project-details" aria-label="Additional site checks">
    <h3>Complete the remaining checks</h3>
    <label htmlFor="scouting-height">Height (m)</label>
    <p className="metadata">Installed height from average ground level, using the Victoria definition. Leave blank if you only know the manufacturer's exterior height.</p>
    <MeasurementInput id="scouting-height" dimension="length" type="number" min="0" step="any" value={height} onChange={event => {
      const value = event.target.value; setHeight(value)
      onHeight(value.trim() && Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : null)
    }} placeholder="Unknown" />
    <details><summary>Height definition and source</summary><p>Victoria Zoning Bylaw 2018, Part 2.1: average grade uses the lower of natural or finished grade at building contact points. Flat roofs use the highest roof point; pitched roofs use the midpoint between the highest ridge and highest eave; gambrel roofs use the midpoint between ridge and hip line. Listed rooftop items are excluded. Part 3.1(28)(e) limits garden-suite height to 4.2 m. A foundation allowance alone does not establish this measurement.</p><a href="https://www.victoria.ca/media/file/zoning-bylaw-2018" target="_blank" rel="noreferrer">City bylaw · candidate scouting revision 2026-10-06-1</a></details>
    <details><summary>Additional checks: measurements and sources</summary>
      <p>These are approximate scouting comparisons using your chosen main building and boundary roles. Rooflines, nominal footprints and a constructed rear-yard polygon are not surveyed walls or legal yard boundaries. No overall approval is calculated.</p>
      {result?.additional_checks?.map(check => <div key={check.id}><strong>{check.label}</strong><p>{check.detail}</p><p>{check.basis}. Exact compared value: {check.observed ?? 'unknown'} {check.unit}; threshold: {check.threshold ?? 'containment only'}.</p><a href={check.source.url} target="_blank" rel="noreferrer">{check.source.provider} · {check.source.locator}</a></div>)}
    </details>
  </section>
}
