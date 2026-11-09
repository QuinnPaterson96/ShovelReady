import { useEffect, useState } from 'react'
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

export type FinancialGoal = 'cost' | 'rental'

function FinancialInterests({ goals, onChange }: { goals: FinancialGoal[] | null; onChange: (goals: FinancialGoal[]) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<FinancialGoal[]>(goals ?? [])
  useEffect(() => { setDraft(goals ?? []); setEditing(false) }, [goals])
  return <section className="alternative-comparison__interests" aria-label="Financial interests">
    {goals === null || editing ? <fieldset>
      <legend>What would you like to understand about the finances?</legend>
      <p>Optional · choose either or both for this project. You can change this as you explore.</p>
      <div className="alternative-comparison__choices">{([['cost', 'Project cost'], ['rental', 'Potential rental income']] as const).map(([value, label]) => <label key={value}>
        <input type="checkbox" checked={draft.includes(value)} onChange={event => setDraft(previous => event.target.checked ? [...previous, value] : previous.filter(goal => goal !== value))} />{label}
      </label>)}</div>
      <div className="alternative-comparison__actions"><button type="button" onClick={() => { onChange(draft); setEditing(false) }}>Save interests</button>
        <button type="button" onClick={() => { onChange([]); setEditing(false) }}>Skip for now</button></div>
    </fieldset> : <div className="alternative-comparison__interest-answer"><p><strong>Financial interests:</strong> {goals.length ? goals.map(goal => goal === 'cost' ? 'Project cost' : 'Potential rental income').join(' and ') : 'Still exploring · skipped for now'}.</p><button type="button" onClick={() => setEditing(true)}>Edit financial interests</button></div>}
  </section>
}

function CostBasis({ alternative }: { alternative: ComparisonAlternative }) {
  const { model, budget } = alternative
  const result = calculateBudget({ ...budget.draft, scope: 'whole_project' }, budget.context)
  const quotes = budget.draft.items.filter(item => item.category === 'unit' && item.basis === 'quote' && result.counted_ids.includes(item.id))
  return quotes.length ? <>{quotes.map(quote => <div key={quote.id}><p><strong>{displayMoney(quote.money!)} · building quote</strong></p>
    <p className="metadata">{quote.evidence.provider} · {quote.evidence.label} · captured {readableDate(quote.evidence.captured_at)} · unreviewed.</p>
    <p>Included: {quote.inclusions.join(', ') || 'not specified'}. Excluded: {quote.exclusions.join(', ') || 'not specified'}. Tax: {quote.tax_status}.</p>
  </div>)}</> : model.prices?.length ? <>{model.prices.map((price, index) => <div key={index}><p><strong>{priceSummary(price)}</strong> · {model.provider} {price.scope === 'model' ? 'model price' : 'provider-wide claim'}{!price.currency && '; currency needs confirmation'}.</p>
    <p className="metadata">Captured {readableDate(model.sources.find(source => source.source_id === price.source_id)?.captured_at)} · {model.review_status}. Scope and exclusions in model details.</p></div>)}</>
    : <p><strong>Model price unknown</strong> · {model.provider} has no price in the captured sources.</p>
}

function CostCoverage({ alternative }: { alternative: ComparisonAlternative }) {
  const { draft, context } = alternative.budget
  const result = calculateBudget(draft, context)
  const whole = calculateBudget({ ...draft, scope: 'whole_project' }, context)
  return whole.complete ? <p><strong>Whole-project estimate: {whole.subtotals.map(displayMoney).join('; ')}.</strong> Under supplied assumptions.</p>
    : <><p><strong>Installed cost incomplete.</strong> {result.subtotals.length ? `Priced-components subtotal (${scopeLabels[draft.scope]}): ${result.subtotals.map(displayMoney).join('; ')}.` : 'No usable priced-components subtotal.'}</p>
      <p>Still needed: {whole.missing.length ? whole.missing.slice(0, 3).map(category => categories[category]).join(', ') : 'reconciled scope, tax or bounded amounts'}{whole.missing.length > 3 ? `, plus ${whole.missing.length - 3} cost areas in the details` : ''}.</p></>
}

function CompactFindings({ alternative }: { alternative: ComparisonAlternative }) {
  if (alternative.placement === 'needs_recheck') return <p><strong>Recheck this scenario.</strong> Property inputs changed or checks are updating; retained findings are not current.</p>
  if (!alternative.summary) return <p>No current suitability findings. Open this model to explore a position.</p>
  const findings = summaryFindings(alternative.summary)
  const concerns = findings.filter(check => check.status === 'conflict')
  const questions = findings.filter(check => ['review', 'unknown', 'unsupported'].includes(check.status))
    .sort((a, b) => Number(b.status === 'unknown') - Number(a.status === 'unknown'))
  return <>{concerns.length ? <p className="alternative-comparison__concerns"><strong>Preliminary concern: {concerns.map(check => check.label).join('; ')}.</strong></p> : <p>{alternative.summary.conclusion}</p>}
    {questions.length > 0 && <p>Open questions: {questions.slice(0, 2).map(check => `${check.label} · ${statusLabels[check.status]}`).join('; ')}{questions.length > 2 ? `; ${questions.length - 2} more in model details` : ''}.</p>}
    {findings.some(check => check.status === 'probable') && <p>Likely fine under disclosed assumptions; see this model’s findings.</p>}
  </>
}

function ScenarioFindings({ alternative }: { alternative: ComparisonAlternative }) {
  const { measurement, summary, placement } = alternative
  const findings = summary ? summaryFindings(summary) : []
  const concerns = findings.filter(check => check.status === 'conflict')
  const open = findings.filter(check => ['review', 'unknown', 'unsupported'].includes(check.status))
  const questions = findings.filter(check => ['review', 'unknown'].includes(check.status))
  const plausible = findings.filter(check => ['checked', 'probable'].includes(check.status))
  const p = measurement?.result.input.placement
  return <>
    {placement === 'needs_recheck' ? <p><strong>Recheck this scenario.</strong> Shared property inputs changed or checks are updating; retained findings are not current.</p>
      : summary ? <><p><strong>{summary.conclusion}</strong></p><p>{summary.next}</p>
        {concerns.length > 0 && <ul className="alternative-comparison__concerns">{concerns.map(check => <li key={check.label}><strong>{check.label} · {statusLabels[check.status]}.</strong> {check.detail}</li>)}</ul>}
        <p>{plausible.length} checks looking plausible; {open.length} questions or checks not covered. These counts describe coverage, not a suitability score.</p>
        {questions.length > 0 && <p><strong>Priority questions:</strong> {questions.slice(0, 3).map(check => check.label).join('; ')}{questions.length > 3 ? `; ${questions.length - 3} more in the details below` : ''}.</p>}
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

export function AlternativeComparison({ alternatives, activeModelId, onSelectModel, financialGoals, onFinancialGoalsChange, onPrepareQuote }: {
  alternatives: ComparisonAlternative[]; activeModelId: string; onSelectModel: (modelId: string) => void
  financialGoals: FinancialGoal[] | null; onFinancialGoalsChange: (goals: FinancialGoal[]) => void; onPrepareQuote: (modelId: string) => void
}) {
  useEffect(() => { void import('./alternative-comparison.css') }, [])
  const active = alternatives.find(item => item.model.model_id === activeModelId)
  // Defensive boundary: never compare a stale alternative from another property.
  const sameSite = active ? alternatives.filter(item => item.propertyKey === active.propertyKey) : []
  const positions = sameSite.map(item => item.measurement?.result.input.placement).filter(item => item !== undefined)
  const differentPositions = new Set(positions.map(p => JSON.stringify([p.centre_xy, p.angle_degrees]))).size > 1
  const rental = financialGoals?.includes('rental') ?? false
  return <div className="alternative-comparison-workspace">
    <FinancialInterests goals={financialGoals} onChange={onFinancialGoalsChange} />
    <details className="alternative-comparison" id="builder-alternative-comparison">
    <summary>Compare model costs and suitability{sameSite.length > 1 ? ` · ${sameSite.length} explored` : ''}</summary>
    <div className="alternative-comparison__body">
      {active && <section className="alternative-comparison__lead" aria-label="Current model financial next step">
        <h3>{rental ? `What could I earn from renting ${active.model.name}?` : `What would it cost to build ${active.model.name}?`}</h3>
        <CostBasis alternative={active} />
        <CostCoverage alternative={active} />
        <div className="alternative-comparison__quote"><button type="button" onClick={() => onPrepareQuote(active.model.model_id)}>Prepare quote request for {active.model.name}</button><span>Optional · opens your unsent enquiry.</span></div>
        {rental && <p><strong>For rental income:</strong> estimate local rent, when the unit could be occupied and your running costs. Compare what you could keep against the cost to install the unit.</p>}
        <CompactFindings alternative={active} />
      </section>}
      <section className="alternative-comparison__overview" aria-label="Explored model overview">
        <h3>Explored models at a glance</h3>
        <p>{active?.propertyLabel || 'Select a property to compare retained alternatives.'} · preliminary costs and suitability. Prices keep their own scope; no return ranking.</p>
        {sameSite.length < 2 && <p>Explore another model using the selector above, then return here. Your enquiry remains available without completing a comparison.</p>}
        {sameSite.length > 0 && <table><thead><tr><th scope="col">Model</th><th scope="col">Price basis</th><th scope="col">Installed-cost coverage</th><th scope="col">Suitability and placement</th></tr></thead>
          <tbody>{sameSite.map(alternative => <tr key={alternative.model.model_id}>
            <th scope="row"><span>{alternative.model.provider}</span><strong>{alternative.model.name}</strong>{alternative.model.model_id === activeModelId && <span className="alternative-comparison__active">Currently open</span>}
              <a href={`#comparison-evidence-${alternative.model.model_id}`}>Details and sources</a>
              {alternative.model.model_id !== activeModelId && <button type="button" onClick={() => onSelectModel(alternative.model.model_id)}>Open {alternative.model.name}</button>}
            </th>
            <td><span className="alternative-comparison__cell-label">Price basis</span><CostBasis alternative={alternative} /></td>
            <td><span className="alternative-comparison__cell-label">Installed-cost coverage</span><CostCoverage alternative={alternative} /></td>
            <td><span className="alternative-comparison__cell-label">Suitability and placement</span><CompactFindings alternative={alternative} />
              <p>{alternative.measurement ? `Retained trial position · rotation ${Number(alternative.measurement.result.input.placement.angle_degrees.toFixed(2))}°.` : 'No measured placement retained.'}</p></td>
          </tr>)}</tbody></table>}
      </section>
      {sameSite.length > 1 && <p>{differentPositions ? 'These models use different retained positions or rotations. Their findings are not an equivalent fit test.' : 'Each model uses its own dimensions and scenario. A shared position alone does not make the suitability checks equivalent.'} Compare the use, configuration and foundation assumptions alongside the findings.</p>}
      <p className="metadata">Your model work and financial interests stay in this open assessment; reloading starts again. Starting prices, partial subtotals and owner preferences remain separate from whole-project estimates. Missing costs are not zero.</p>
      {rental && <details className="alternative-comparison__next"><summary>Inputs for a rental-return comparison later</summary><p>First choose the question, such as annual cash flow or return on total project cost, then gather consistent assumptions for the plausible alternatives:</p>
        <ul><li><strong>Provider and local installer:</strong> a matching dated quote, currency, inclusions and site-specific delivery, foundation, connections, fees and tax scope.</li>
          <li><strong>Homeowner with local rental evidence:</strong> achievable rent, occupancy and when renting could start for the intended use.</li>
          <li><strong>Homeowner or property manager:</strong> recurring owner-paid expenses, maintenance and replacement allowances.</li>
          <li><strong>Homeowner and lender, if financing matters to the chosen measure:</strong> equity, borrowing terms and debt payments.</li></ul></details>}
      <h3>Model details and evidence</h3>
      <div className="alternative-comparison__options">{sameSite.map(alternative => <article key={alternative.model.model_id} aria-label={`${alternative.model.name} comparison`}>
        <span id={`comparison-evidence-${alternative.model.model_id}`} tabIndex={-1} />
        <header><h4>{alternative.model.provider} · {alternative.model.name}</h4>{alternative.model.model_id === activeModelId ? <p className="alternative-comparison__active">Currently open</p> : <button type="button" onClick={() => onSelectModel(alternative.model.model_id)}>Open {alternative.model.name}</button>}</header>
        <dl><dt>Scenario</dt><dd><p>Use: {alternative.intendedUse.trim() || 'not supplied'}. Configuration: {alternative.configuration.trim() || alternative.model.configuration}.</p><p>Foundation allowance: {alternative.foundationAllowanceM === null ? 'not supplied' : `${measurementWithUnit(alternative.foundationAllowanceM, 'length')} · planning assumption`}.</p><p>Affordability preference: {alternative.affordabilityPreference.trim() || 'not supplied'} · owner preference, separate from estimated cost.</p></dd>
          <dt>Provisional suitability and placement</dt><dd><ScenarioFindings alternative={alternative} /></dd>
          <dt>Captured price</dt><dd><CapturedPrices model={alternative.model} configuration={alternative.configuration} /></dd>
          <dt>Cost coverage</dt><dd><Costs alternative={alternative} /></dd>
        </dl>
      </article>)}</div>
    </div>
  </details></div>
}
