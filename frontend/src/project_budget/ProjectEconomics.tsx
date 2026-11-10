import { FloatingNext } from '../FloatingNext'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { CatalogueModel } from '../model_catalogue/model'
import { readableDate } from '../ReadableProvenance'
import { RentalScenario } from '../rental_scenario/RentalScenario'
import { layoutLabel, markets, money, periodLabel, type calculateRental, type RentalDraft } from '../rental_scenario/model'
import { BudgetEvidenceEditor } from './BudgetSection'
import { categories, type BudgetDraft, type Category, type Context, type CostItem } from './contract'
import { changePlanningAmount, costGroups, economicsMoney, paybackText, usablePlanningAmount, type EconomicsEstimate } from './economics'

type RentalResult = ReturnType<typeof calculateRental>
export type RentalInterest = 'rental' | 'skipped' | null

function costLabel(estimate: EconomicsEstimate) {
  return estimate.wholeProject ? 'Estimated project cost' : 'Project cost subtotal'
}

function costText(estimate: EconomicsEstimate) {
  return estimate.budget.subtotals.length === 1 ? economicsMoney(estimate.budget.subtotals[0])
    : estimate.budget.subtotals.length > 1 ? 'Separate currencies' : 'Not estimated'
}

function spokenMoney(amount: number | null) {
  return amount !== null && amount < 0 ? `negative ${money(-amount)}` : money(amount)
}

function costSource(estimate: EconomicsEstimate) {
  const prefab = estimate.counted.find(item => item.category === 'unit')
  const hasSiteReference = estimate.counted.some(item => item.category !== 'unit' && item.evidence.origin === 'planning_reference')
  const prefabSource = prefab?.evidence.origin === 'planning_reference' || prefab?.basis === 'starting' ? 'Prefab starting price'
    : prefab?.evidence.origin === 'user_quote' ? 'Your prefab quote' : prefab ? 'Prefab estimate' : 'Prefab price needed'
  return [prefabSource, hasSiteReference ? 'site and fee allowances' : null, estimate.wholeProject ? 'stated project scope' : 'some project costs still open'].filter(Boolean).join(' · ')
}

function RentalInterestQuestion({ value, onChange }: { value: RentalInterest; onChange: (value: RentalInterest) => void }) {
  const [editing, setEditing] = useState(false)
  const edit = useRef<HTMLButtonElement>(null)
  const yes = useRef<HTMLButtonElement>(null)
  const restoreFocus = useRef(false)
  const asking = value === null || editing
  useEffect(() => {
    if (restoreFocus.current) {
      restoreFocus.current = false
      if (asking) yes.current?.focus()
      else edit.current?.focus()
    }
  }, [asking])
  function answer(next: RentalInterest) {
    restoreFocus.current = true
    onChange(next)
    setEditing(false)
  }
  return <div className="economics-interest" role="region" aria-label="Rental interest">
    {asking ? <><p id="economics-interest-question">Considering renting this suite?</p><div role="group" aria-labelledby="economics-interest-question">
      <button type="button" ref={yes} onClick={() => answer('rental')}>Include rental income</button>
      <button type="button" onClick={() => answer('skipped')}>Skip rental estimate</button>
    </div></> : <><p>{value === 'rental' ? 'Rental scenario included' : 'Rental income skipped'}</p>
      <button type="button" ref={edit} onClick={() => { restoreFocus.current = true; setEditing(true) }}>Change rental preference</button></>}
  </div>
}

function RentFigures({ estimate, draft, rental }: { estimate: EconomicsEstimate; draft: RentalDraft; rental: RentalResult }) {
  const market = markets.find(m => m.id === draft.marketId)
  const layout = draft.bedrooms === 0 ? 'studio' : layoutLabel(draft.bedrooms).replace(' bedroom', '-bedroom').replace('bedrooms', 'bedroom')
  const basis = draft.monthlyRent === null ? rental.rent !== null ? `${market?.label} metro · ${layout} apartments` : 'Add a monthly rent' : 'Your rent assumption'
  return <dl className="economics-rent-figures">
    <div><dt>Expected monthly rent</dt><dd>{money(rental.rent)}</dd><dd className="metadata">{basis}</dd></div>
    <div><dt>Annual income after running costs</dt><dd>{money(rental.operating)}</dd><dd className="metadata">Before financing and income tax</dd></div>
    <div><dt>Simple payback</dt><dd>{paybackText(estimate.payback)}</dd><dd className="metadata">
      {estimate.payback?.basis === 'whole_project' ? 'Whole-project cost ÷ annual income'
        : estimate.payback ? 'Cost subtotal ÷ annual income' : (rental.operating ?? 0) <= 0 ? 'Needs positive annual income' : 'Add the missing project costs'}</dd></div>
  </dl>
}

export function ProjectEconomicsSummary({ estimate, rental, rentalDraft, interest, onInterest, onOpen, onContinue, timeline }: {
  estimate: EconomicsEstimate; rental: RentalResult | null; rentalDraft: RentalDraft; interest: RentalInterest
  onInterest: (value: RentalInterest) => void; onOpen: (trigger: HTMLAnchorElement) => void; onContinue?: () => void; timeline?: ReactNode
}) {
  return <section className="project-economics" aria-labelledby="builder-budget-title">
    <header className="economics-summary-header">
      <h2 id="builder-budget-title" tabIndex={-1}>Project economics</h2>
      <a id="builder-economics-open" href="#builder-economics-estimate" onClick={event => { event.preventDefault(); onOpen(event.currentTarget) }}>View and adjust estimate <span aria-hidden="true">→</span></a>
    </header>
    <div className={rental ? 'economics-summary-body' : 'economics-summary-body economics-summary-body--cost'}>
      <div className="economics-cost">
        <p className="economics-total"><span>{costLabel(estimate)} {estimate.subtotal && <small>CAD</small>}</span><strong>{costText(estimate)}</strong></p>
        <dl className="economics-breakdown">{estimate.breakdown.filter((group, index) => index < 3 || group.value.length > 0 || group.included).map(group =>
          <div key={group.label}><dt>{group.label}</dt><dd>{group.value.length ? group.value.map(economicsMoney).join(' + ') : group.included ? 'Included' : 'Unknown'}</dd></div>)}</dl>
      </div>
      {rental && <RentFigures estimate={estimate} draft={rentalDraft} rental={rental} />}
    </div>
    <p className="metadata economics-source-line">{costSource(estimate)}{rental?.benchmark && rentalDraft.monthlyRent === null ? ` · Statistics Canada ${periodLabel}` : ''}.</p>
    {timeline}
    <RentalInterestQuestion value={interest} onChange={onInterest} />
    {onContinue && <FloatingNext active><button className="builder-continue" type="button" onClick={onContinue}>Continue to enquiry <span aria-hidden="true">→</span></button></FloatingNext>}
  </section>
}

const quickCostLabels: Record<Category, string> = { ...categories, unit: 'Prefab building', services: 'On-site service connections', fees: 'Development and permit fees', tax: 'Taxes' }

function CostAmount({ items, category, estimate, onChange, onInvalid }: {
  items: CostItem[]; category: Category; estimate: EconomicsEstimate
  onChange: (value: string) => void; onInvalid: () => void
}) {
  const item = items.length === 1 ? items[0] : undefined
  const usable = item && !estimate.budget.issues.some(issue => issue.item_id === item.id)
  const amount = usable && item.money?.currency === 'CAD' && item.money.minimum === item.money.maximum ? item.money.minimum : ''
  const [value, setValue] = useState(amount)
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => { if (document.activeElement !== input.current) setValue(amount) }, [amount, item?.id])
  const id = `economics-cost-${category}`
  const retainedComplex = usable && item && (item.evidence.origin === 'user_quote' || ['included', 'not_applicable'].includes(item.state) || item.money && !amount)
  const invalid = !!value.trim() && !usablePlanningAmount(value)
  const source = !usable && item ? 'Recheck this cost against the current project.'
    : item?.evidence.origin === 'planning_reference' ? category === 'unit' ? `Uses ${item.evidence.provider}’s published starting price.` : item.rationale
    : item?.evidence.origin === 'user_allowance' ? 'Your planning amount.' : category === 'unit' ? 'Enter the building price alone. Leave installation and fees below.' : 'Leave blank while the amount is unknown.'
  if (items.length > 1) return <div className="economics-cost-field">
    <p className="economics-cost-label">{quickCostLabels[category]}</p>
    <p className="metadata">{items.length} entries need reconciliation. Review them under detailed cost entries.</p>
  </div>
  return <div className="economics-cost-field">
    {retainedComplex ? <><p className="economics-cost-label">{quickCostLabels[category]}</p><p>
      {item.money ? economicsMoney(item.money) : item.state === 'included' ? 'Included in another line' : 'Marked not applicable'} <span className="metadata">· Edit under detailed cost entries</span>
    </p></> : <>
      <label htmlFor={id}>{quickCostLabels[category]}</label>
      <div className="economics-money-input"><span aria-hidden="true">$</span><input id={id} type="text" inputMode="decimal" placeholder="Unknown" ref={input} value={value}
        aria-invalid={invalid || undefined} aria-describedby={`economics-cost-currency ${id}-hint`} onChange={event => {
          const raw = event.target.value
          setValue(raw)
          const next = usablePlanningAmount(raw)
          if (next || !raw.trim()) onChange(next)
          else onInvalid()
        }} /></div>
      <p id={`${id}-hint`} className={invalid ? 'economics-field-error' : 'metadata'}>{invalid ? 'Enter a valid CAD amount. The previous value still applies.' : source}</p>
    </>}
  </div>
}

export function ProjectEconomicsDetail({ model, propertyLabel, draft, context, estimate, rentalDraft, rental, victoria, onChange, onImport, onRental, onIncludeRental, onBack, timeline }: {
  model: CatalogueModel; propertyLabel: string; draft: BudgetDraft; context: Context; estimate: EconomicsEstimate
  rentalDraft: RentalDraft; rental: RentalResult | null; victoria: boolean; timeline?: ReactNode
  onChange: (draft: BudgetDraft) => void; onImport: (draft: BudgetDraft) => void; onRental: (draft: RentalDraft) => void; onIncludeRental: () => void; onBack: () => void
}) {
  const missing = estimate.budget.missing.map(category => quickCostLabels[category].toLowerCase())
  const sourceItems = estimate.counted.filter(item => item.evidence.origin === 'planning_reference')
  const hasLocalAllowance = sourceItems.some(item => item.category !== 'unit')
  const focusRental = useRef(false)
  const rentalVisible = !!rental
  const [announcement, setAnnouncement] = useState('')
  const [invalidCostEdit, setInvalidCostEdit] = useState(false)
  const costSummary = invalidCostEdit ? null : `${costLabel(estimate)} ${costText(estimate)}${estimate.subtotal ? ' CAD' : ''}.`
  const operatingValid = rental && !rental.errors.rent && !rental.errors.vacancy && !rental.errors.expenses
  const runningCostsValid = rental && (rentalDraft.expenseMode === 'monthly' ? !rental.errors.expenses : operatingValid)
  const rentSummary = rental && !rental.errors.rent ? `Expected monthly rent ${money(rental.rent)}.` : null
  const runningCostsSummary = runningCostsValid ? `Annual running costs and reserves ${money(rental.runningCosts)}.` : null
  const incomeSummary = operatingValid ? `Annual income after running costs ${spokenMoney(rental.operating)}. Before financing and income tax.` : null
  const paybackSummary = operatingValid && !invalidCostEdit ? `Simple payback${estimate.payback?.basis === 'subtotal' ? ' on priced costs' : ''} ${paybackText(estimate.payback)}.` : null
  const cashFlowSummary = operatingValid && !rental.errors.debt ? `Annual cash flow after debt payments ${spokenMoney(rental.cashFlow)}. Before income tax.` : null
  const lastResult = useRef([costSummary, rentSummary, runningCostsSummary, incomeSummary, paybackSummary, cashFlowSummary])

  useEffect(() => {
    const summaries = [costSummary, rentSummary, runningCostsSummary, incomeSummary, paybackSummary, cashFlowSummary]
    // A null summary is withheld during malformed input. An accepted blank is
    // represented by the same "Not estimated" text as the visible result.
    const changes = summaries.filter((summary, index) => summary !== null && summary !== lastResult.current[index])
    if (!changes.length) return
    const timer = window.setTimeout(() => {
      lastResult.current = summaries.map((summary, index) => summary ?? lastResult.current[index])
      setAnnouncement(changes.join(' '))
    }, 700)
    return () => window.clearTimeout(timer)
  }, [costSummary, rentSummary, runningCostsSummary, incomeSummary, paybackSummary, cashFlowSummary])

  function changeCosts(next: BudgetDraft) {
    setInvalidCostEdit(false)
    onChange(next)
  }

  function goToSection(id: string) {
    const heading = document.getElementById(id)
    heading?.focus({ preventScroll: true })
    heading?.scrollIntoView({ block: 'start' })
  }
  useLayoutEffect(() => {
    if (rentalVisible && focusRental.current) {
      focusRental.current = false
      goToSection('economics-rental-title')
    }
  }, [rentalVisible])
  return <div className="project-economics-detail" id="builder-economics-estimate" role="region" aria-labelledby="economics-detail-title">
    <a className="economics-back" href="#builder-budget-stage" onClick={event => { event.preventDefault(); onBack() }}><span aria-hidden="true">← </span>Back to project</a>
    <header className="economics-detail-header">
      <h1 id="economics-detail-title" tabIndex={-1}>Project economics</h1>
      <p>{model.provider} · {model.name} <span> / </span> {propertyLabel}</p>
    </header>
    {rental && <nav className="economics-jump" aria-label="Estimate sections">
      {[['economics-cost-title', 'Project costs'], ['economics-rental-title', 'Rental income'], ['economics-running-title', 'Running costs and financing']].map(([id, label]) =>
        <a key={id} href={`#${id}`} onClick={event => { event.preventDefault(); goToSection(id) }}>{label}</a>)}
    </nav>}
    <p className="sr-visually-hidden" role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
    <div className="economics-detail-layout">
      <aside className="economics-live" aria-label="Live estimate">
        <p className="economics-total"><span>{costLabel(estimate)} {estimate.subtotal && <small>CAD</small>}</span><strong>{costText(estimate)}</strong></p>
        <p className="metadata">{estimate.wholeProject ? 'Whole project under your stated assumptions.' : 'Subtotal for the priced work in this scenario.'}</p>
        {rental && <RentFigures estimate={estimate} draft={rentalDraft} rental={rental} />}
      </aside>
      <div className="economics-editors">
        <section className="economics-editor-group" aria-labelledby="economics-cost-title">
          <h2 id="economics-cost-title" tabIndex={-1}>Project costs</h2>
          <p><span id="economics-cost-currency">Amounts in CAD.</span> Change any allowance to see its effect on the estimate.</p>
          {hasLocalAllowance && <p className="metadata">Installation assumes a level, accessible lot and nearby usable services. Fee allowances can change with the property and application.</p>}
          {estimate.budget.scope === 'building' && <p className="metadata">The current subtotal covers building costs only. Change scope under detailed cost entries to include site work and fees.</p>}
          {costGroups.map(group => {
            const fields = <div className="economics-cost-fields">
              {group.categories.map(category => <CostAmount key={category} category={category} estimate={estimate}
                items={draft.items.filter(item => item.category === category && item.selected)}
                onChange={amount => changeCosts(changePlanningAmount(draft, context, category, amount))}
                onInvalid={() => setInvalidCostEdit(true)} />)}
            </div>
            return group.categories.length === 1
              ? <div key={group.label} className="economics-cost-group economics-cost-group--single">{fields}</div>
              : <fieldset key={group.label} className="economics-cost-group">
                <legend>{group.label === 'Prefab building' ? 'Prefab package' : group.label}</legend>
                {fields}
              </fieldset>
          })}
          <p className="economics-mobile-result"><strong>{costText(estimate)}</strong> <span>{costLabel(estimate)}</span></p>
          {missing.length > 0 && <p className="metadata">Still open in this scope: {missing.join(', ')}.</p>}
          {sourceItems.length > 0 && <details className="economics-planning-source"><summary>Where the starting amounts come from</summary>
            {sourceItems.some(item => item.category === 'unit') && <p>The estimate uses the published prefab starting price as a scenario amount. Ask the provider to confirm the price and options for your configuration.</p>}
            {hasLocalAllowance && <p>The site and fee amounts are illustrative values within the ranges published by <a href="https://evolvmodular.ca/#:~:text=What%20Your%20Lot%20Decides" target="_blank" rel="noreferrer">Evolv Modular</a> for its Vancouver Island work, captured {readableDate('2026-11-09')} · unreviewed. Budget separately for major service upgrades, difficult access, stairs, decks, landscaping, professional work, taxes and contingency as applicable.</p>}
          </details>}
          <BudgetEvidenceEditor draft={draft} onChange={changeCosts} onImport={next => { setInvalidCostEdit(false); onImport(next) }} context={context} model={model} victoria={victoria} />
        </section>
        {timeline}
        {rental ? <RentalScenario draft={rentalDraft} result={rental} model={model} onChange={onRental}
          localResult={<div className="economics-mobile-result economics-mobile-rental"><RentFigures estimate={estimate} draft={rentalDraft} rental={rental} /></div>} /> :
          <button type="button" className="economics-add-rental" onClick={() => { focusRental.current = true; onIncludeRental() }}>Include rental income</button>}
      </div>
    </div>
    <a className="economics-back economics-back--bottom" href="#builder-budget-stage" onClick={event => { event.preventDefault(); onBack() }}><span aria-hidden="true">← </span>Back to project</a>
  </div>
}
