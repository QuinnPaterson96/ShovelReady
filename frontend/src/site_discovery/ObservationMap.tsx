import React from 'react'
import { publicSourceUrl, readableDate } from '../ReadableProvenance'
import type { Address, Observation, Parcel, Polygon } from './flow'

type Point = [number, number]

function parts(geometry: Polygon): number[][][][] {
  return geometry.type === 'Polygon'
    ? [geometry.coordinates as number[][][]]
    : geometry.coordinates as number[][][][]
}

function points(geometry: Polygon): Point[] {
  return parts(geometry).flat(2) as Point[]
}

function path(geometry: Polygon, minX: number, maxY: number, pad: number): string {
  return parts(geometry).map(part => part.map(ring => ring.map(([x, y], index) =>
    `${index ? 'L' : 'M'}${x - minX + pad} ${maxY - y + pad}`).join(' ') + ' Z').join(' ')).join(' ')
}

function scaleLength(width: number): number {
  const target = width / 4
  const magnitude = 10 ** Math.floor(Math.log10(target))
  return [5, 2, 1].map(step => step * magnitude).find(length => length <= target) ?? magnitude
}

/** A source observation only; this diagram does not measure buildable space. */
export function ObservationMap({ observation, address, parcel }: { observation: Observation; address?: Address; parcel?: Parcel }) {
  React.useEffect(() => { void import('./ObservationMap.css') }, [])
  const allPoints = [observation.parcel.geometry, ...observation.roofs.map(roof => roof.geometry)].flatMap(points)
  const valid = allPoints.length > 0 && allPoints.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y))
  const minX = valid ? Math.min(...allPoints.map(([x]) => x)) : 0
  const maxX = valid ? Math.max(...allPoints.map(([x]) => x)) : 0
  const minY = valid ? Math.min(...allPoints.map(([, y]) => y)) : 0
  const maxY = valid ? Math.max(...allPoints.map(([, y]) => y)) : 0
  const width = maxX - minX
  const height = maxY - minY
  const drawable = valid && width > 0 && height > 0 && observation.crs === 'EPSG:3157'
  const extent = Math.max(width, height)
  const pad = extent * .15
  const viewWidth = width + pad * 2
  const viewHeight = height + pad * 2
  const scale = drawable ? scaleLength(width) : 0
  const fontSize = Math.max(extent * .033, 1)
  const partial = observation.buildingsState !== 'available'
  const roofCount = observation.roofs.length
  const parcelUrl = publicSourceUrl(observation.source.url)
  const roofUrl = publicSourceUrl(observation.roofSource?.url)

  return <figure className="observation-map" aria-label="Observed property map">
    <figcaption>
      <strong>Observed property · {parcel?.label ?? 'parcel label unavailable'}</strong>
      {address && <span>Address lead: {address.label}. Address and parcel identity require confirmation.</span>}
      {parcel && <span>Parcel match: {parcel.match}</span>}
    </figcaption>
    {partial && <p className="observation-map__partial" role="status">Partial building observation: {observation.buildingsState.replace(/_/g, ' ')}. Missing or incomplete rooflines do not establish open space.</p>}
    {drawable ? <svg viewBox={`0 0 ${viewWidth} ${viewHeight}`} role="img" aria-label={`Projected parcel outline and ${roofCount} captured roofline ${roofCount === 1 ? 'outline' : 'outlines'}. North is up. Scale shown in metres.`}>
      <path className="observation-map__parcel" d={path(observation.parcel.geometry, minX, maxY, pad)} fillRule="evenodd" />
      {observation.roofs.map((roof, index) => {
        const roofPoints = points(roof.geometry)
        const xs = roofPoints.map(([x]) => x), ys = roofPoints.map(([, y]) => y)
        const labelX = (Math.min(...xs) + Math.max(...xs)) / 2 - minX + pad
        const labelY = maxY - (Math.min(...ys) + Math.max(...ys)) / 2 + pad
        return <g key={`${roof.id}-${index}`}>
          <path className="observation-map__roof" d={path(roof.geometry, minX, maxY, pad)} fillRule="evenodd" />
          <text className="observation-map__roof-label" x={labelX} y={labelY} fontSize={fontSize} textAnchor="middle" dominantBaseline="middle">R{index + 1}</text>
        </g>
      })}
      <g className="observation-map__direction" fontSize={fontSize}>
        <text x={viewWidth - pad / 2} y={pad / 2} textAnchor="middle">N</text>
        <path d={`M${viewWidth - pad / 2} ${pad * .65} v${fontSize * 1.35} m${-fontSize * .35} ${-fontSize * .9} l${fontSize * .35} ${-fontSize * .45} ${fontSize * .35} ${fontSize * .45}`} />
      </g>
      <g className="observation-map__scale" fontSize={fontSize}>
        <path d={`M${pad} ${viewHeight - pad / 2} v${-fontSize * .35} h${scale} v${fontSize * .35}`} />
        <text x={pad + scale / 2} y={viewHeight - pad / 2 + fontSize * 1.2} textAnchor="middle">{scale} m</text>
      </g>
    </svg> : <p className="observation-map__partial" role="status">Map geometry is unavailable or cannot be drawn in projected metres. Check the source record.</p>}
    <ul className="observation-map__legend" aria-label="Map legend">
      <li><span className="observation-map__key observation-map__key--parcel" aria-hidden="true" />Captured parcel boundary</li>
      <li><span className="observation-map__key observation-map__key--roof" aria-hidden="true" />Captured rooflines ({roofCount === 1 ? 'R1' : roofCount ? `R1–R${roofCount}` : 'none returned'}; not walls)</li>
    </ul>
    <p className="observation-map__note">Approximate mapped parcel area: {observation.parcel.areaM2 === null ? 'unknown' : `${Number(observation.parcel.areaM2.toFixed(1))} m²`}. {roofCount} roofline {roofCount === 1 ? 'outline' : 'outlines'} returned. {roofCount === 0 ? 'No rooflines shown does not mean no buildings exist. ' : ''}North is up; scale uses EPSG:3157 metres. Approximate source outlines; no basemap, surveyed wall positions, legal yards or fit assessment.</p>
    <p className="observation-map__source">Parcel source: {observation.source.provider} · {observation.source.record} · captured {readableDate(observation.source.capturedAt)} · {observation.source.review}. {parcelUrl && <a href={parcelUrl} target="_blank" rel="noreferrer">Source</a>}</p>
    {observation.roofSource && <p className="observation-map__source">Roofline source: {observation.roofSource.provider} · {observation.roofSource.record} · captured {readableDate(observation.roofSource.capturedAt)} · {observation.roofSource.review}. {roofUrl && <a href={roofUrl} target="_blank" rel="noreferrer">Source</a>}</p>}
    {observation.issues.length > 0 && <p className="observation-map__source">Source limitations: {observation.issues.map(issue => issue.replace(/_/g, ' ').replace(/[.\s]+$/, '')).join('; ')}.</p>}
    {address?.point && <p className="observation-map__source">Address marker unavailable: the address point uses {address.crs ?? 'an unknown coordinate system'}, while this map uses EPSG:3157 metres.</p>}
  </figure>
}
