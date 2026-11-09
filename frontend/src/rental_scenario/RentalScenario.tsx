import type { CatalogueModel } from '../model_catalogue/model'
import { benchmarks, calculateRental, layoutLabel, markets, money, periodLabel, type Bedrooms, type RentalDraft } from './model'

export function RentalSummary({ draft }: { draft: RentalDraft }) {
  const result = calculateRental(draft)
  return <div className="rental-summary">
    <p><strong>{money(result.rent)} CAD/month</strong> · {draft.monthlyRent === null ? 'regional asking-rent assumption' : 'your rent assumption'}.</p>
    <p>{money(result.operating)} CAD/year after vacancy and running costs · before financing and income tax. Assumes {result.vacancy ?? 'unknown'}% vacancy and {result.expenses === null ? 'unknown running costs' : draft.expenseMode === 'allowance' ? `${result.expenses}% of collected rent for running costs` : `${money(result.expenses)}/month running costs`}.</p>
    <p>{result.cashFlow === null ? `Cash flow after debt: ${draft.financing === 'unknown' ? 'add financing details below' : 'complete the missing assumptions below'}.` : `${money(result.cashFlow)} CAD/year after debt payments, before income tax.`}</p>
    <p className="metadata">{draft.monthlyRent === null && result.benchmark && <><a href={benchmarks.source_url} target="_blank" rel="noreferrer">Statistics Canada · {markets.find(m => m.id === draft.marketId)?.label} · {layoutLabel(draft.bedrooms)} · {periodLabel}</a>. </>}<a href="#rental-assumptions">Edit rental assumptions</a></p>
  </div>
}

export function RentalScenario({ draft, model, onChange }: { draft: RentalDraft; model: CatalogueModel; onChange: (draft: RentalDraft) => void }) {
  const result = calculateRental(draft)
  const update = (patch: Partial<RentalDraft>) => onChange({ ...draft, ...patch })
  const id = `rental-${model.model_id}`
  const area = model.measurements.find(m => m.name === 'manufacturer_interior_area' && m.status === 'known')?.quantity
  const market = markets.find(m => m.id === draft.marketId)
  const field = (key: 'rent' | 'vacancy' | 'expenses' | 'debt', label: string, value: string, change: (value: string) => void, hint?: string) => <div className="rental-field">
    <label htmlFor={`${id}-${key}`}>{label}</label>
    <input id={`${id}-${key}`} type="text" inputMode="decimal" value={value} onChange={e => change(e.target.value)} aria-invalid={!!result.errors[key]} aria-describedby={`${id}-${key}-help`} />
    <small id={`${id}-${key}-help`}>{result.errors[key] || hint || 'Leave blank if unknown; enter 0 only if none.'}</small>
  </div>
  return <section className="rental-scenario" aria-label={`${model.name} rental assumptions`}>
    <h3>Rental assumptions for {model.name}</h3>
    <p>A full year of long-term renting, assuming a self-contained dwelling. {area?.unit === 'm2' ? `Published interior area: ${Number(area.value).toFixed(1)} m². ` : 'Interior rentable area is not established. '}
      Apartment averages are a starting point; no adjustment for this suite’s size, furnishings, parking or utilities is included.</p>
    <div className="rental-fields">
      <div className="rental-field"><label htmlFor={`${id}-market`}>Rental market</label><select id={`${id}-market`} value={draft.marketId} onChange={e => update({ marketId: e.target.value, marketOrigin: 'user', monthlyRent: null })}>
        <option value="">Choose a market, or enter your own rent</option>{markets.map(m => <option key={m.id} value={m.id}>{m.label} metro area</option>)}
      </select><small>Suggested from the municipality when coverage matches. Changing market restores its benchmark.</small></div>
      <div className="rental-field"><label htmlFor={`${id}-bedrooms`}>Rental layout</label><select id={`${id}-bedrooms`} value={draft.bedrooms} onChange={e => update({ bedrooms: Number(e.target.value) as Bedrooms, layoutOrigin: 'user', monthlyRent: null })}>
        {([0, 1, 2, 3] as const).map(n => <option key={n} value={n}>{layoutLabel(n)}</option>)}
      </select><small>{draft.layoutOrigin === 'catalogue_description' ? 'Suggested from the model description; adjust for your configuration.' : draft.layoutOrigin === 'user' ? 'Your selected layout.' : 'Studio assumed; adjust for your configuration.'}</small></div>
      {field('rent', 'Monthly rent (CAD)', draft.monthlyRent ?? (result.rent === null ? '' : String(result.rent)), value => update({ monthlyRent: value }), draft.monthlyRent === null ? `${result.rent === null ? 'No usable benchmark for this selection.' : 'Prefilled regional apartment average.'} You can replace it.` : 'Your override stays with this model. Blank means unknown.')}
      {field('vacancy', 'Vacancy allowance (%)', draft.vacancyPercent, value => update({ vacancyPercent: value }), 'Starts at 5% (about 18 days/year): an illustrative planning allowance, not the local vacancy rate.')}
    </div>
    <button type="button" onClick={() => update({ monthlyRent: null })}>Use regional rent again</button>
    <p className="metadata"><a href={benchmarks.source_url} target="_blank" rel="noreferrer">Statistics Canada · {periodLabel} asking rents</a>{market ? ` · ${market.label} metro area · ${layoutLabel(draft.bedrooms)}` : ''}. {result.benchmark?.monthly_cad !== null && result.benchmark ? `${money(result.benchmark.monthly_cad)} CAD/month. ` : ''}Captured {benchmarks.captured_at.slice(0, 10)} · unreviewed. Advertised rents, not signed leases.</p>
    <details className="rental-expenses"><summary>Running costs and financing</summary>
      <p>The starting running-cost allowance is 25% of collected rent, an illustrative cushion rather than a local estimate. Replace it with your expected costs when known: incremental property tax, insurance, owner-paid utilities, management, maintenance and replacements.</p>
      <div className="rental-fields">
        <div className="rental-field"><label htmlFor={`${id}-expense-mode`}>Running-cost basis</label><select id={`${id}-expense-mode`} value={draft.expenseMode} onChange={e => update({ expenseMode: e.target.value as RentalDraft['expenseMode'], expenses: '' })}>
          <option value="allowance">Percentage of rent after vacancy</option><option value="monthly">My total monthly running costs</option>
        </select></div>
        {field('expenses', draft.expenseMode === 'allowance' ? 'Running-cost allowance (%)' : 'Monthly running costs (CAD)', draft.expenses, value => update({ expenses: value }))}
        <div className="rental-field"><label htmlFor={`${id}-financing`}>Financing</label><select id={`${id}-financing`} value={draft.financing} onChange={e => update({ financing: e.target.value as RentalDraft['financing'] })}>
          <option value="unknown">Not supplied yet</option><option value="cash">No borrowing for this scenario</option><option value="payment">Enter monthly debt payments</option>
        </select><small>Debt payments include principal and interest. Financing is never silently treated as zero.</small></div>
        {draft.financing === 'payment' && field('debt', 'Monthly debt payments (CAD)', draft.monthlyDebt, value => update({ monthlyDebt: value }))}
      </div>
    </details>
    <dl className="rental-calculation" aria-label="Annual rental calculation">
      <div><dt>Rent before vacancy</dt><dd>{money(result.gross)}</dd></div>
      <div><dt>Rent after vacancy</dt><dd>{money(result.collected)}</dd></div>
      <div><dt>Running costs and reserves</dt><dd>{money(result.runningCosts)}</dd></div>
      <div><dt>Income after running costs</dt><dd>{money(result.operating)}</dd></div>
      <div><dt>Cash flow after debt payments</dt><dd>{money(result.cashFlow)}</dd></div>
    </dl>
    <p className="metadata">CAD per full rental year, before income tax. Construction time, rent growth and property appreciation are excluded. This does not turn an incomplete building price into an installed-cost return.</p>
  </section>
}

export function RentalComparison({ alternatives, onSelect }: { alternatives: { model: CatalogueModel; rental?: RentalDraft }[]; onSelect: (id: string) => void }) {
  return <section className="alternative-comparison__overview rental-comparison" aria-label="Rental income comparison">
    <h3>Compare rental scenarios</h3>
    <p>CAD for a full rental year, before income tax. Matching bedroom categories share the same regional benchmark until you change them; no size-based premium or best-model ranking is implied.</p>
    <table><thead><tr><th scope="col">Model</th><th scope="col">Monthly rent</th><th scope="col">Annual income after running costs</th><th scope="col">Annual cash flow after debt</th></tr></thead>
      <tbody>{alternatives.map(({ model, rental }) => {
        const r = rental ? calculateRental(rental) : null
        return <tr key={model.model_id}><th scope="row"><strong>{model.name}</strong><button type="button" onClick={() => onSelect(model.model_id)}>Edit {model.name} rental assumptions</button></th>
          <td><span className="alternative-comparison__cell-label">Monthly rent</span>{money(r?.rent ?? null)}{rental && <p className="metadata">{layoutLabel(rental.bedrooms)} · {rental.monthlyRent === null ? `${markets.find(m => m.id === rental.marketId)?.label ?? 'No regional'} benchmark` : 'Your assumption'}</p>}</td>
          <td><span className="alternative-comparison__cell-label">Annual income after running costs</span>{money(r?.operating ?? null)}</td>
          <td><span className="alternative-comparison__cell-label">Annual cash flow after debt</span>{money(r?.cashFlow ?? null)}{rental?.financing === 'unknown' && <p className="metadata">Financing not supplied</p>}</td></tr>
      })}</tbody></table>
  </section>
}
