import type { CatalogueModel, CommercialClaim, Price, Timing, ValueRange } from './model'
import { publicSourceUrl, readableDate } from '../ReadableProvenance'

const range = (value: ValueRange) => value.maximum === null || value.maximum === value.minimum
  ? value.minimum : `${value.minimum}–${value.maximum}`
const money = (value: string) => {
  // Group decimal strings without rounding or passing money through binary floats.
  if (!/^\d+(\.\d+)?$/.test(value)) return value
  const [whole, fraction] = value.split('.')
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (fraction === undefined ? '' : `.${fraction}`)
}
export const priceSummary = (price: Price) => `${price.basis === 'starting' ? 'Starting at' : price.basis === 'fixed' ? 'Fixed' : 'Estimated'} ${price.amount
  ? `${price.currency ?? 'Currency unknown'} ${money(price.amount.minimum)}${price.amount.maximum !== null && price.amount.maximum !== price.amount.minimum ? `–${money(price.amount.maximum)}` : ''}` : 'price unknown'}`
const stageLabels: Record<Timing['stage'], string> = {
  production_lead_time: 'Production lead time', delivery: 'Delivery transit',
  on_site_installation: 'On-site installation', contract_to_delivery: 'Contract to delivery',
}
export const timingSummary = (timing: Timing) => `${stageLabels[timing.stage]}: ${timing.basis === 'estimated' ? 'roughly ' : ''}${timing.duration
  ? `${range(timing.duration)} ${timing.duration.minimum === '1' && timing.duration.maximum === null ? timing.unit?.replace(/s$/, '') : timing.unit}` : timing.wording}${timing.scope === 'provider' ? ' · provider-wide' : ''}`

function sourceText(model: CatalogueModel, claim: CommercialClaim) {
  const source = model.sources.find(item => item.source_id === claim.source_id)
  return `${model.provider} · ${claim.scope === 'provider' ? 'provider-wide statement' : model.name} · ${source?.locator ?? 'source locator unknown'} · captured ${readableDate(source?.captured_at)} · ${model.review_status}; source revision ${source?.upstream_revision ?? 'unknown'}; updated ${source?.updated_at ?? 'date unknown'}. Source: ${source?.url ?? 'unknown'}`
}
function qualifications(claim: CommercialClaim) {
  return `Configuration: ${claim.configuration ?? 'not specified'}. Region: ${claim.region ?? 'not specified'}. ${claim.qualifications.join(' ')}`
}
const caveat = 'Model price is not total project cost. Installation duration is not the full project timeline. Confirm a current quote and site-specific schedule with the provider.'

export function priceTimingParagraphs(model: CatalogueModel): string[] {
  const prices = model.prices ?? []
  const timings = model.timings ?? []
  return [caveat,
    ...(prices.length ? prices.map(price => `${priceSummary(price)}. ${qualifications(price)} Inclusions: ${price.inclusions.join('; ') || 'not specified'}. Additional costs/exclusions: ${price.exclusions.join('; ') || 'not specified'}. Tax treatment: ${price.tax_treatment ?? 'unknown'}. Manufacturer wording: “${price.wording}”. ${sourceText(model, price)}`) : ['Price unknown in the captured catalogue sources.']),
    ...timings.map(timing => `${timingSummary(timing)}. ${qualifications(timing)} Clock starts: ${timing.clock_start ?? 'not specified'}. Prerequisites/dependencies: ${timing.prerequisites.join('; ') || 'not specified'}. Manufacturer wording: “${timing.wording}”. ${sourceText(model, timing)}`),
    ...(['production_lead_time', 'delivery', 'on_site_installation'] as const).filter(stage => !timings.some(timing => timing.stage === stage && timing.duration !== null))
      .map(stage => `${stageLabels[stage]}: unknown in the captured catalogue sources.`),
  ]
}

export function PriceTiming({ model }: { model: CatalogueModel }) {
  const claims = [...(model.prices ?? []), ...(model.timings ?? [])]
  const sources = model.sources.filter(source => claims.some(claim => claim.source_id === source.source_id))
  return <section className="sr-price-timing" aria-label="Price & timing">
    <h3>Price &amp; timing</h3>
    <ul className="sr-price-timing-summary">
      {(model.prices?.length ? model.prices.map((price, index) => <li key={`price-${index}`}><strong>{priceSummary(price)}</strong>{price.scope === 'provider' ? ' · provider-wide' : ' · model price'}</li>) : <li>Price unknown in captured sources</li>)}
      {(model.timings ?? []).map((timing, index) => <li key={`timing-${index}`}>{timingSummary(timing)}</li>)}
    </ul>
    {(model.prices ?? []).map((price, index) => <p className="metadata" key={`costs-${index}`}>
      Additional costs/exclusions: {price.exclusions.join(', ') || 'not specified'}. Tax treatment: {price.tax_treatment ?? 'unknown'}.
    </p>)}
    {sources.length > 0 && <p className="metadata">{model.provider} · price and process pages · captured {[...new Set(sources.map(source => readableDate(source.captured_at)))].join('; ')} · {model.review_status}.</p>}
    <p className="metadata">{caveat}</p>
    <details><summary>Price &amp; timing details and sources</summary>
      {priceTimingParagraphs(model).slice(1).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
      {sources.map(source => <p className="metadata" key={source.source_id}>
        {publicSourceUrl(source.url) ? <a href={publicSourceUrl(source.url)!} target="_blank" rel="noreferrer">{model.provider} · {source.locator}</a> : 'Source link unavailable'}
      </p>)}
    </details>
  </section>
}
