import { useEffect, useState } from 'react'
import { geometryPath, parseInvestigation, ringsPath, safeUrl } from './adapter'
import type { Investigation, Observation } from './adapter'

export function InertJson({ value }: { value: unknown }) {
  return <pre>{JSON.stringify(value, null, 2)}</pre>
}

function Link({ url, children }: { url: string; children: React.ReactNode }) {
  const safe = safeUrl(url)
  return safe ? (
    <a href={safe} target="_blank" rel="noreferrer">
      {children}
    </a>
  ) : (
    <span>{children} (link unavailable)</span>
  )
}
function Map({
  observations,
  parcel,
}: {
  observations: Observation[]
  parcel: Investigation['spatial']['parcels'][number]
}) {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState([0, 0])
  const [roof, setRoof] = useState(true)
  const [zones, setZones] = useState(true)
  const rings =
    observations.find((o) => o.snapshot_id === parcel.parcel_snapshot_id)?.response.features[
      parcel.parcel_feature_index ?? -1
    ]?.geometry?.rings ?? []
  const points = rings.flat()
  if (!points.length) return <p>Parcel geometry unavailable. No map extent can be established.</p>
  const xs = points.map((p) => p[0]),
    ys = points.map((p) => -p[1])
  const minX = Math.min(...xs),
    minY = Math.min(...ys)
  const width = (Math.max(Math.max(...xs) - minX, 1) * 1.5) / zoom
  const height = (Math.max(Math.max(...ys) - minY, 1) * 1.5) / zoom
  const cx = (Math.max(...xs) + minX) / 2 + pan[0],
    cy = (Math.max(...ys) + minY) / 2 + pan[1]
  return (
    <div>
      <p>
        Original EPSG:3157 XY · metres · north up. Blue: parcel; purple: rooflines; amber: zoning;
        red dashed: intersections.
      </p>
      <div className="map-controls">
        <button onClick={() => setZoom((z) => Math.min(z * 1.5, 8))}>Zoom in</button>
        <button onClick={() => setZoom((z) => Math.max(z / 1.5, 0.25))}>Zoom out</button>
        <button
          onClick={() => {
            setZoom(1)
            setPan([0, 0])
          }}
        >
          Reset view
        </button>
        {(['West', 'East', 'North', 'South'] as const).map((name, i) => (
          <button
            key={name}
            onClick={() =>
              setPan((p) => [
                p[0] + (i === 0 ? -width / 4 : i === 1 ? width / 4 : 0),
                p[1] + (i === 2 ? -height / 4 : i === 3 ? height / 4 : 0),
              ])
            }
          >
            {name}
          </button>
        ))}
        <label>
          <input type="checkbox" checked={roof} onChange={(e) => setRoof(e.target.checked)} />{' '}
          Rooflines
        </label>
        <label>
          <input type="checkbox" checked={zones} onChange={(e) => setZones(e.target.checked)} />{' '}
          Zoning
        </label>
      </div>
      <svg
        className="observation-map"
        role="img"
        aria-label="Captured parcel, rooflines and query-scoped zoning intersections"
        viewBox={`${cx - width / 2} ${cy - height / 2} ${width} ${height}`}
      >
        {observations
          .filter((o) => !o.source_id.endsWith('-rooflines') || roof)
          .filter((o) => !o.source_id.endsWith('-zones') || zones)
          .sort(
            (a, b) =>
              Number(b.source_id.endsWith('-zones')) - Number(a.source_id.endsWith('-zones')),
          )
          .flatMap((o) =>
            o.response.features.map(
              (f, i) =>
                f.geometry?.rings && (
                  <path
                    key={`${o.snapshot_id}/${i}`}
                    d={ringsPath(f.geometry.rings)}
                    fillRule="evenodd"
                    fill={
                      o.source_id.endsWith('-zones')
                        ? '#e5ad2930'
                        : o.source_id.endsWith('-parcel')
                          ? '#2774b530'
                          : '#924cbc60'
                    }
                    stroke={
                      o.source_id.endsWith('-zones')
                        ? '#956600'
                        : o.source_id.endsWith('-parcel')
                          ? '#155c9c'
                          : '#7734a0'
                    }
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                  >
                    <title>
                      {o.source_id} / feature {i}
                    </title>
                  </path>
                ),
            ),
          )}
        {parcel.intersections.map((item, i) => (
          <path
            key={i}
            d={geometryPath(item.geometry)}
            fill="none"
            stroke="#b63121"
            strokeDasharray="5 4"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      <p className="metadata">
        Holes and multiple parts retained. Rooflines are not wall footprints or identified principal
        buildings. The map supplies no legal yards, grade or placement.
      </p>
    </div>
  )
}
export default function RealObservations() {
  const [data, setData] = useState<Investigation>()
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [selected, setSelected] = useState('')
  const [feature, setFeature] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    let active = true
    setData(undefined)
    setError('')
    void (async () => {
      try {
        const response = await fetch('/api/investigation', { signal: controller.signal })
        if (!response.ok)
          throw new Error(
            response.status === 404
              ? 'Selected revision is missing.'
              : response.status === 503
                ? 'Investigation configuration or database unavailable.'
                : 'Investigation response unavailable or invalid.',
          )
        const body = parseInvestigation(await response.json())
        if (active) {
          setData(body)
          setSelected('')
          setFeature('')
        }
      } catch (e) {
        if (active)
          setError(
            e instanceof Error && e.name !== 'AbortError'
              ? e.message
              : 'Investigation request timed out or was interrupted.',
          )
      } finally {
        clearTimeout(timeout)
      }
    })()
    return () => {
      active = false
      clearTimeout(timeout)
      controller.abort()
    }
  }, [attempt])
  const spatial = data?.spatial
  const key = (p: NonNullable<typeof spatial>['parcels'][number]) =>
    `${p.parcel_snapshot_id}/${p.parcel_feature_index ?? 'missing'}`
  const parcel = spatial?.parcels.find((p) => key(p) === selected) ?? spatial?.parcels[0]
  const source = spatial?.observations.find((o) => o.snapshot_id === parcel?.parcel_snapshot_id)
  const lead = source?.source_id.replace(/-parcel$/, '')
  const observations = spatial?.observations.filter((o) => o.source_id.startsWith(`${lead}-`)) ?? []
  const choices = observations.flatMap((o) =>
    o.response.features.map((f, i) => ({ o, f, i, id: `${o.snapshot_id}/${i}` })),
  )
  const chosen = choices.find((c) => c.id === feature) ?? choices[0]
  const assessment = spatial?.features.find(
    (f) => f.snapshot_id === chosen?.o.snapshot_id && f.feature_index === chosen?.i,
  )
  return (
    <section aria-labelledby="real-heading">
      <h2 id="real-heading">Real observations · licensed captured samples</h2>
      <p className="notice">
        No zoning screening has been performed. All captured leads remain investigation cases. No
        accepted dataset, fixed design revision, supplied placement or active publication exists.
      </p>
      {!data && !error && <p role="status">Loading stored observations…</p>}
      {error && <p role="alert">{error} No observations loaded.</p>}
      <button onClick={() => setAttempt((a) => a + 1)}>Reload observations</button>
      {data && spatial && (
        <>
          <p className="metadata">
            Collection: {spatial.identity.logical_id}
            <br />
            Selected observation revision (not a release):{' '}
            <code>{spatial.identity.revision_id}</code>
          </p>
          {!parcel ? (
            <p>No parcel observations in this revision.</p>
          ) : (
            <>
              <label htmlFor="lead">Captured parcel lead / source-scoped feature</label>
              <select
                id="lead"
                value={key(parcel)}
                onChange={(e) => {
                  setSelected(e.target.value)
                  setFeature('')
                }}
              >
                {spatial.parcels.map((p) => (
                  <option key={key(p)} value={key(p)}>
                    {p.parcel_snapshot_id.split(':')[0]} / feature{' '}
                    {p.parcel_feature_index ?? 'missing'} · needs investigation
                  </option>
                ))}
              </select>
              <Map key={key(parcel)} observations={observations} parcel={parcel} />
              <h3>Query-scoped intersections</h3>
              <p>
                Uncovered geometric area: {parcel.uncovered_area_m2 ?? 'unknown'} m². Overlapping
                zone area: {parcel.overlapping_zone_area_m2 ?? 'unknown'} m². These are geometric
                calculations, not regulatory lot areas or exhaustive overlay checks.
              </p>
              {!parcel.intersections.length && (
                <p>No retained intersections. This does not establish a zoning exclusion.</p>
              )}
              <ul>
                {parcel.intersections.map((i, n) => (
                  <li key={n}>
                    {i.classification} · {i.area_m2} m² ·{' '}
                    <code>
                      {i.zoning_snapshot_id} / feature {i.zoning_feature_index}
                    </code>
                  </li>
                ))}
              </ul>
              <h3>Missing facts and geometry issues</h3>
              <ul>
                {parcel.issues.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
              <p>
                Still needed: reviewed legal boundaries and applicability, principal building and
                wall footprint, classified lot lines and legal yards, survey grade, controlled
                design dimensions and a supplied placement. Source capture dates do not establish
                legal effective dates.
              </p>
              <label htmlFor="feature">Inspect captured feature</label>
              <select
                id="feature"
                value={chosen?.id ?? ''}
                onChange={(e) => setFeature(e.target.value)}
              >
                {choices.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.o.source_id} / feature {c.i}
                  </option>
                ))}
              </select>
              {chosen && (
                <article>
                  <p>
                    Original locator: <code>{chosen.id}</code>. OBJECTID is retained below; it is
                    not a permanent site identity.
                  </p>
                  <p>Geometric area: {assessment?.geometric_area_m2 ?? 'unknown'} m².</p>
                  <ul>
                    {assessment?.issues.map((i) => (
                      <li key={i}>{i}</li>
                    ))}
                  </ul>
                  <p>
                    <Link url={chosen.o.layer_url}>Layer</Link> ·{' '}
                    <Link url={chosen.o.request_url}>Original query URL</Link> (external service may
                    have changed since capture)
                  </p>
                  <p>
                    Metadata snapshot: <code>{chosen.o.metadata_snapshot_id}</code>
                    <br />
                    Catalogue snapshot: <code>{chosen.o.catalogue_snapshot_id}</code>
                  </p>
                  <h4>Captured attributes (unreviewed)</h4>
                  <InertJson value={chosen.f.attributes} />
                  <details>
                    <summary>Original captured XYZ rings</summary>
                    <InertJson value={chosen.f.geometry} />
                  </details>
                </article>
              )}
            </>
          )}
          <h3>Pinned licensed source metadata</h3>
          <p>
            Original XY: EPSG:3157. Stored derived longitude/latitude: EPSG:4617; not relabelled
            WGS84 or RFC 7946. Vertical units and datum unknown.
          </p>
          {data.sources.map((s) => (
            <details key={s.snapshot_id}>
              <summary>
                {s.source_id} · captured {s.captured_at}
              </summary>
              <p>
                <code>{s.snapshot_id}</code>
              </p>
              <p>
                SHA-256: <code>{s.sha256}</code>
              </p>
              <p>
                Source date: capture {s.captured_at}; printed revision{' '}
                {s.printed_revision ?? 'unknown'}; legal effective dates unknown.
              </p>
              <p>
                {s.original_crs} · {s.original_units.join('; ')}
              </p>
              <p>{s.attribution}</p>
              <Link url={s.source_url}>Source URL</Link>
            </details>
          ))}
        </>
      )}
    </section>
  )
}
