import { useEffect } from 'react'
import type { CatalogueModel } from '../model_catalogue/model'
import { priceSummary } from '../model_catalogue/PriceTiming'
import { publicSourceUrl, readableDate } from '../ReadableProvenance'
import { measurementWithUnit } from '../measurements'
import type { OccupiedMeasurement } from '../occupied_lots/OccupiedLots'
import { statusLabels, summaryFindings, type Summary } from '../conditional_screening/HomeownerSummary'
import { categories, type BudgetDraft, type Context } from '../project_budget/contract'
import { calculateBudget, displayMoney, scopeLabels } from '../project_budget/pipeline'

/** A view of one coherent retained model scenario, not a new evaluation contract. */
export type ComparisonAlternative = {
  model: CatalogueModel
  propertyKey: string
  propertyLabel: string
  intendedUse: string
  configuration: string
  affordabilityPreference: string
  foundationAllowanceM: string | null
  measurement: OccupiedMeasurement | null
  placement: 'not_placed' | 'needs_recheck' | 'current'
  summary: Summary | null
  budget: { draft: BudgetDraft; context: Context }
}

function ScenarioFindings({ alternative }: { alternative: ComparisonAlternative }) {
  const { measurement, summary, placement } = alternative
  const findings = summary ? summaryFindings(summary) : []
  const concerns = findings.filter(check => check.status === 'conflict')
  const open = findings.filter(check => ['review', 'unknown', 'unsupported'].includes(check.status))
  const plausible = findings.filter(check => ['checked', 'probable'].includes(check.status))
  const p = measurement?.result.input.placement
  return <>
    {placement === 'needs_recheck' ? <p><strong>Recheck this scenario.</strong> Shared property inputs changed or checks are updating; retained findings are not current.</p>
      : summary ? <><p><strong>{summary.conclusion}</strong></p><p>{summary.next}</p>
        {concerns.length > 0 && <ul className="alternative-comparison__concerns">{concerns.map(check => <li key={check.label}><strong>{check.label} · {statusLabels[check.status]}.</strong> {check.detail}</li>)}</ul>}
        <p>{plausible.length} checks looking plausible; {open.length} questions or checks not covered. These counts describe coverage, not a suitability score.</p>
        {findings.some(check => check.status === 'probable') && <ul>{findings.filter(check => check.status === 'probable').map(check => <li key={check.label}><strong>{check.label} · Likely fine.</strong> {check.detail}</li>)}</ul>}
        {open.length > 0 && <details><summary>Open questions and coverage</summary><ul>{open.map(check => <li key={check.label}><strong>{check.label} · {statusLabels[check.status]}.</strong> {check.detail}{check.gap && <> Next: {check.gap.next} · {check.gap.owner}.</>}</li>)}</ul></details>}
      </> : <p>No current suitability findings. Missing checks do not establish a better fit.</p>}
    {p ? <p>Retained approximate rectangle: {measurementWithUnit(p.width_m, 'length')} × {measurementWithUnit(p.depth_m, 'length')}; rotation {Number(p.angle_degrees.toFixed(2))}°.{measurement.widthOrigin === 'user' || measurement.depthOrigin === 'user' ? ' Custom dimensions; provider availability needs confirmation.' : ''}{placement !== 'current' ? ' Placement needs a current check.' : ''}</p>
      : <p>No measured placement retained. Open this model to explore a position, or ask the provider what site information would help.</p>}
  </>
}

function CapturedPrices({ model, configuration }: { model: CatalogueModel; configuration: string }) {
  return model.prices?.length ? <>{model.prices.map((price, index) => {
    const source = model.sources.find(item => item.source_id === price.source_id)
    const url = publicSourceUrl(source?.url)
    return <div key={index} className="alternative-comparison__price">
      <p><strong>{priceSummary(price)}</strong>{price.scope === 'provider' ? ' · provider-wide claim' : ' · captured model claim'}.</p>
      {!price.currency && <p>Currency is unknown; this amount cannot enter a subtotal.</p>}
      <p className="metadata">{model.provider} · {source?.locator ?? 'record label unknown'} · captured {readableDate(source?.captured_at)} · {model.review_status}.{url && <> <a href={url} target="_blank" rel="noreferrer">Price source</a></>}</p>
      <details><summary>Price scope and exclusions</summary><p>Configuration: {price.configuration ?? 'not specified'}. Region: {price.region ?? 'not specified'}.</p>
        <p>Included: {price.inclusions.join('; ') || 'not specified'}. Excluded/additional: {price.exclusions.join('; ') || 'not specified'}. Tax: {price.tax_treatment ?? 'unknown'}.</p>
        {price.qualifications.length > 0 && <p>{price.qualifications.join(' ')}</p>}
        <p>Source wording: {price.wording}</p>
      </details>
    </div>
  })}{configuration.trim() && <p>Confirm that the captured claim covers your chosen configuration before using it as a matching quote.</p>}</>
    : <p><strong>Price unknown in captured sources.</strong> Ask {model.provider} for a dated, configuration-specific quote with currency and included work.</p>
}

function Costs({ alternative }: { alternative: ComparisonAlternative }) {
  const { draft, context } = alternative.budget
  const result = calculateBudget(draft, context)
  // Always show unresolved installed-cost coverage, even if the owner chose building only.
  const whole = calculateBudget({ ...draft, scope: 'whole_project' }, context)
  return <>
    <p>Cost-draft scope: <strong>{scopeLabels[draft.scope]}</strong>.</p>
    {result.subtotals.length ? result.subtotals.map(money => <p key={money.currency}><strong>Priced-components subtotal: {displayMoney(money)}.</strong></p>)
      : <p><strong>No usable priced-components subtotal.</strong> Unknown costs are not zero.</p>}
    {result.subtotals.length > 1 && <p>Currencies remain separate; no currency conversion or combined subtotal.</p>}
    <p><strong>Whole-project estimate: {whole.complete ? whole.subtotals.map(displayMoney).join('; ') : 'unavailable; cost coverage is incomplete'}.</strong>{whole.complete && ' Scenario range under supplied assumptions, not a quote guarantee.'}</p>
    {whole.missing.length > 0 && <p>Installed-cost coverage still needed: {whole.missing.map(category => categories[category]).join(', ')}.</p>}
    {result.issues.length > 0 && <p>Withheld entries: {[...new Set(result.issues.map(issue => `${draft.items.find(item => item.id === issue.item_id)?.label ?? 'Cost entry'}: ${issue.message}`))].join(' ')}</p>}
    {draft.items.length > 0 && <details><summary>Retained cost entries and evidence</summary>{draft.items.map(item => <div key={item.id}>
      <p><strong>{item.label}</strong> · {item.selected ? 'selected' : 'retained, not selected'} · {item.state.replace(/_/g, ' ')}{item.money && <> · {displayMoney(item.money)} · {item.basis}</>}.</p>
      <p className="metadata">{item.evidence.provider} · {item.evidence.label} · {item.evidence.origin === 'user_allowance' ? 'user assumption' : 'unreviewed claim'} · captured {readableDate(item.evidence.captured_at)}; effective {readableDate(item.evidence.effective_at)}; expires {readableDate(item.evidence.expires_at)}.</p>
      <p>Included: {item.inclusions.join('; ') || 'not specified'}. Excluded: {item.exclusions.join('; ') || 'not specified'}. Tax: {item.tax_status}. {item.rationale}</p>
    </div>)}</details>}
  </>
}

export function AlternativeComparison({ alternatives, activeModelId, onSelectModel }: {
  alternatives: ComparisonAlternative[]; activeModelId: string; onSelectModel: (modelId: string) => void
}) {
  useEffect(() => { void import('./alternative-comparison.css') }, [])
  const active = alternatives.find(item => item.model.model_id === activeModelId)
  // Defensive boundary: never compare a stale alternative from another property.
  const sameSite = active ? alternatives.filter(item => item.propertyKey === active.propertyKey) : []
  const positions = sameSite.map(item => item.measurement?.result.input.placement).filter(item => item !== undefined)
  const differentPositions = new Set(positions.map(p => JSON.stringify([p.centre_xy, p.angle_degrees]))).size > 1
  return <details className="alternative-comparison" id="builder-alternative-comparison">
    <summary>Compare models for this property{sameSite.length > 1 ? ` · ${sameSite.length} explored` : ''}</summary>
    <div className="alternative-comparison__body">
      <h3>Choose what to investigate next</h3>
      <p>{active?.propertyLabel || 'Select a property to compare retained alternatives.'} · preliminary suitability and cost coverage. Your model work stays in this open assessment; reloading starts again.</p>
      {sameSite.length < 2 && <p>Explore another model using the selector above, then return here. Your enquiry remains available without completing a comparison.</p>}
      {sameSite.length > 1 && <p>{differentPositions ? 'These models use different retained positions or rotations. Their findings are not an equivalent fit test.' : 'Each model uses its own dimensions and scenario. A shared position alone does not make the suitability checks equivalent.'} Compare the use, configuration and foundation assumptions alongside the findings.</p>}
      <div className="alternative-comparison__options">{sameSite.map(alternative => <article key={alternative.model.model_id} aria-label={`${alternative.model.name} comparison`}>
        <header><h4>{alternative.model.provider} · {alternative.model.name}</h4>{alternative.model.model_id === activeModelId ? <p className="alternative-comparison__active">Currently open</p> : <button type="button" onClick={() => onSelectModel(alternative.model.model_id)}>Open {alternative.model.name}</button>}</header>
        <dl><dt>Scenario</dt><dd><p>Use: {alternative.intendedUse.trim() || 'not supplied'}. Configuration: {alternative.configuration.trim() || alternative.model.configuration}.</p><p>Foundation allowance: {alternative.foundationAllowanceM === null ? 'not supplied' : `${measurementWithUnit(alternative.foundationAllowanceM, 'length')} · planning assumption`}.</p><p>Affordability preference: {alternative.affordabilityPreference.trim() || 'not supplied'} · owner preference, separate from estimated cost.</p></dd>
          <dt>Provisional suitability and placement</dt><dd><ScenarioFindings alternative={alternative} /></dd>
          <dt>Captured price</dt><dd><CapturedPrices model={alternative.model} configuration={alternative.configuration} /></dd>
          <dt>Cost coverage</dt><dd><Costs alternative={alternative} /></dd>
        </dl>
      </article>)}</div>
      {sameSite.length > 0 && <div className="alternative-comparison__next"><h4>For a rental-return comparison later</h4><p>These prices and partial costs do not identify a rental-return winner. First choose the question, such as annual cash flow or return on total project cost, then gather consistent assumptions for the plausible alternatives:</p>
        <ul><li><strong>Provider and local installer:</strong> a matching dated quote, currency, inclusions and site-specific delivery, foundation, connections, fees and tax scope.</li>
          <li><strong>Homeowner with local rental evidence:</strong> achievable rent, occupancy and when renting could start for the intended use.</li>
          <li><strong>Homeowner or property manager:</strong> recurring owner-paid expenses, maintenance and replacement allowances.</li>
          <li><strong>Homeowner and lender, if financing matters to the chosen measure:</strong> equity, borrowing terms and debt payments.</li></ul>
        <p>Ask providers what they need for an initial discussion; you can prepare an enquiry now with these questions still open.</p></div>}
    </div>
  </details>
}
