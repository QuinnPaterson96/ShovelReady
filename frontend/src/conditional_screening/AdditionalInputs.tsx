import { useState } from 'react'
import { MeasurementInput } from '../MeasurementInput'
import type { ScenarioResult } from './scenarios'

export function AdditionalInputs({ onHeight, result, buffers, onBuffers, foundation, onFoundation }: {
  onHeight: (height: number | null) => void; result: ScenarioResult | null
  buffers: { area: number; height: number }; onBuffers: (value: { area: number; height: number }) => void
  foundation: string | null; onFoundation: (value: string | null) => void
}) {
  const [height, setHeight] = useState('')
  return <section className="project-details" aria-label="Planning buffers and installed height">
    <h3>Planning buffers &amp; installed height</h3>
    <div id="scouting-area-buffer" tabIndex={-1}>
      <h4>Preliminary measurement allowances</h4>
      <p>Floor area uses the nominal footprint or your rough area estimate plus a buffer. Height uses advertised height plus a buffer and foundation allowance. These estimates do not establish legal measurements.</p>
      <label>Area buffer (%) <MeasurementInput dimension="area" type="number" min="0" max="100" value={String(buffers.area)} onChange={event => { const value = Number(event.target.value); if (event.target.value.trim() && Number.isFinite(value) && value >= 0 && value <= 100) onBuffers({ ...buffers, area: value }) }} /></label>
      <label>Height buffer (%) <MeasurementInput dimension="length" type="number" min="0" max="100" value={String(buffers.height)} onChange={event => { const value = Number(event.target.value); if (event.target.value.trim() && Number.isFinite(value) && value >= 0 && value <= 100) onBuffers({ ...buffers, height: value }) }} /></label>
      <label>Foundation allowance (m) <MeasurementInput dimension="length" type="number" min="0" step="any" value={foundation ?? ''} onChange={event => onFoundation(event.target.value.trim() && Number.isFinite(Number(event.target.value)) && Number(event.target.value) >= 0 ? event.target.value : null)} /></label>
    </div>
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
