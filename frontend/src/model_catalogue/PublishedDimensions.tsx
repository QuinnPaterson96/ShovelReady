import type { CatalogueModel } from './model'
import { publicSourceUrl, readableDate } from '../ReadableProvenance'
import { formatMeasurement } from '../measurements'

export function publishedDimensions(model: CatalogueModel) {
  return [
    { name: 'nominal_exterior_width', label: 'Width' },
    { name: 'nominal_exterior_depth', label: 'Length' },
    { name: 'advertised_overall_height', label: 'Exterior height' },
  ].map(({ name, label }) => {
    const measure = model.measurements.find(item => item.name === name)
    const quantity = measure?.status === 'known' ? measure.quantity : null
    const usable = quantity?.dimension === 'length' && quantity.unit === 'm'
      && Number.isFinite(Number(quantity.value)) && Number(quantity.value) > 0
    return { label, sourceId: measure?.source_id,
      text: usable ? `${quantity.original_text} (≈ ${formatMeasurement(quantity.value, 'length')} m)` : 'Not available in captured sources' }
  })
}

export function PublishedDimensions({ model }: { model: CatalogueModel }) {
  const dimensions = publishedDimensions(model)
  const sources = model.sources.filter(source => dimensions.some(dimension => dimension.sourceId === source.source_id))
  return <section className="sr-published-dimensions" aria-label="Published exterior dimensions">
    <h3>Published exterior dimensions</h3>
    <dl>{dimensions.map(dimension => <div key={dimension.label}>
      <dt>{dimension.label}</dt><dd>{dimension.text}</dd>
    </div>)}</dl>
    <p className="metadata">{model.provider} · {model.name} · provider specification, unreviewed. These are source values; your edits below do not change them.</p>
    {sources.map(source => <p className="metadata" key={source.source_id}>
      {publicSourceUrl(source.url) ? <a href={publicSourceUrl(source.url)!} target="_blank" rel="noreferrer">Dimensions source</a> : 'Source link unavailable'}
      {' · '}{source.locator} · captured {readableDate(source.captured_at)}.
    </p>)}
    <p className="metadata">Installed height also depends on the foundation and site grade. A height comparison needs the measurement reference required by the local rule.</p>
  </section>
}
