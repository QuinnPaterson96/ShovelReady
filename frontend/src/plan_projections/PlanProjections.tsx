import { useState } from 'react'
import { MeasurementInput } from '../MeasurementInput'
import { measurementWithUnit } from '../measurements'
import type { CatalogueModel } from '../model_catalogue/model'
import type { Case } from '../occupied_lots/contract'
import { measureProjection, type PlacedRectangle, type ProjectionBasis, type ProjectionClearance } from './geometry'

export function projectionPilotModel(model?: CatalogueModel | null): boolean {
  return model?.model_id === 'aux-240' && model.configuration === 'Bath + Kitchen'
}

const planUrl = 'https://images.squarespace-cdn.com/content/v1/5fac3c101547270b1b7fda04/1612934344071-4QME3GF6R0R5IWHHPIGK/model_240_floorplan.jpg'
const providerQuestion = 'Does the 10 ft width include the outer gutter on this side? If it ends at the wall, how far does the gutter extend on the installed Bath + Kitchen plan?'

function edgeLabel(value: ProjectionClearance) {
  return value.edge.ring ? `inner ring ${value.edge.ring}, edge ${value.edgeNumber}` : `mapped edge ${value.edgeNumber}`
}

function finding(value: ProjectionClearance | null) {
  if (!value) return 'Mapped clearance is unavailable for this parcel outline or position.'
  if (value.status === 'crosses') return `Extends outside the mapped parcel near ${edgeLabel(value)}.`
  if (value.status === 'touches') return `Touches ${edgeLabel(value)} of the parcel.`
  return `About ${measurementWithUnit(value.distance, 'length')} to ${edgeLabel(value)} of the parcel.`
}

export function usePlanProjections(enabled: boolean, site: Case, placed: PlacedRectangle | null, editedDimensions: boolean) {
  const [basis, setBasis] = useState<ProjectionBasis>('unknown')
  const [depth, setDepth] = useState('0.30')
  if (!enabled) return { modelLayer: null, parcelLayer: null, panel: null, legend: null }

  const enteredDepth = depth.trim() ? Number(depth) : NaN
  const addedDepth = basis === 'wall_face' && Number.isFinite(enteredDepth) && enteredDepth >= 0
    ? enteredDepth : basis === 'includes_projection' ? 0 : null
  const nominal = placed ? measureProjection(site, placed, 0) : null
  const projection = placed && addedDepth !== null
    ? addedDepth === 0 ? nominal : measureProjection(site, placed, addedDepth)
    : null
  const mappedFinding = projection ?? nominal
  const edge = mappedFinding?.edge
  const conflict = projection && projection.status !== 'clear'
  const face = placed ? placed.width / 2 : 0
  const modelLayer = placed && <g className="plan-projection-map" data-plan-projection-layer={basis}
    data-projection-added-depth-m={addedDepth ?? undefined} data-projection-status={projection?.status} pointerEvents="none">
    <title>{basis === 'unknown' ? 'Illustrated long face' : 'Illustrated eave and gutter scenario'}</title>
    {addedDepth !== null && addedDepth > 0 && <rect x={face} y={-placed.depth / 2} width={addedDepth} height={placed.depth} className="plan-projection-map-strip"
      data-conflict={conflict || undefined} vectorEffect="non-scaling-stroke" />}
    <line x1={face} x2={face} y1={-placed.depth / 2} y2={placed.depth / 2} className="plan-projection-map-face"
      vectorEffect="non-scaling-stroke" />
  </g>

  const parcelLayer = mappedFinding && edge && <line x1={edge.start[0]} y1={-edge.start[1]} x2={edge.end[0]} y2={-edge.end[1]}
    className="plan-projection-map-edge" data-conflict={conflict || undefined} vectorEffect="non-scaling-stroke" pointerEvents="none">
    <title>{edgeLabel(mappedFinding)}</title>
  </line>
  const panel = <section className="plan-projections" id="placement-projections" tabIndex={-1} aria-labelledby="placement-projections-title">
    <h4 id="placement-projections-title">Eave and gutter clearance</h4>
    <p>The Model 240 Bath + Kitchen floor plan measures 9 ft 11 in across the drawn outer sides. The published exterior width is 10 ft. Use the marked long side to explore where the gutter might end.</p>
    <div className="plan-projection-controls">
      <div><label htmlFor="placement-projections-basis">{editedDimensions ? 'What does the sketch width include?' : 'What does the nominal width include?'}</label>
        <select id="placement-projections-basis" value={basis} onChange={event => setBasis(event.target.value as ProjectionBasis)}>
          <option value="unknown">Not sure</option>
          <option value="wall_face">Assume width ends at the walls</option>
          <option value="includes_projection">Assume width includes the eave and gutter</option>
        </select>
      </div>
      {basis === 'wall_face' && <div><label htmlFor="placement-projections-depth">Example projection past the wall (m)</label>
        <MeasurementInput dimension="length" id="placement-projections-depth" type="number" min="0" step="any" value={depth}
          onChange={event => setDepth(event.target.value)} />
      </div>}
    </div>
    <p className="plan-projection-finding"><strong>{editedDimensions ? 'Gap from the edited sketch face.' : 'Gap from the nominal long face.'}</strong> {placed ? finding(nominal) : 'Place the model to measure its gap to a mapped parcel edge.'}</p>
    <p className="plan-projection-finding" data-projection-clearance={projection?.status ?? 'unknown'}>
      <strong>Physical eave and gutter clearance.</strong>{' '}
      {basis === 'unknown' ? 'Unknown until the width basis and projection extent are known. To explore a what-if, choose an assumption.'
        : basis === 'wall_face' && addedDepth === null ? 'Enter an example projection of zero or more metres to check the mapped clearance.'
          : `${basis === 'wall_face' ? 'Using your example projection. ' : 'Using the placed line with no extra depth. '}${finding(projection)}`}
    </p>
    <p className="metadata">Setback treatment and any permitted encroachment still need separate confirmation.</p>
    <p><strong>Ask the provider.</strong> {providerQuestion}</p>
    <details>
      <summary>Plan sources and exact map measurements</summary>
      <p>The advertised exterior length is 24 ft 1 in. The dimensioned floor plan includes the covered-deck and mechanical-storage ends in that length. It shows 9 ft 11 in across the drawn outer sides, compared with the advertised 10 ft width. The plan gives no eave or gutter dimension. {editedDimensions ? ' This sketch uses your edited dimensions.' : ' The map keeps the nominal placement dimensions.'}</p>
      <p>aux box Model 240 public materials · inspected November 19, 2026 · controlled plan revision unknown. <a href="https://www.auxbox.ca/model-240" target="_blank" rel="noreferrer">Model 240 specifications</a> · <a href={planUrl} target="_blank" rel="noreferrer">Dimensioned floor plan</a></p>
      {nominal && <p className="metadata">Exact distance to the mapped boundary from this sketch face: {nominal.distance} m.{projection && ` Scenario: ${projection.distance} m.`}</p>}
    </details>
  </section>

  const legend = placed && <span>Dashed marks · illustration face{edge ? ' and measured parcel edge' : ''}{addedDepth ? ' · shaded projection example' : ''}</span>
  return { modelLayer, parcelLayer, panel, legend }
}
