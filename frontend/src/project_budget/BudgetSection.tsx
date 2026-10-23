import { useEffect, useState } from 'react'
import type { CatalogueModel } from '../model_catalogue/model'
import { publicSourceUrl, readableDate } from '../ReadableProvenance'
import { downloadFile } from '../builder_demo/placementExport'
import { categories, parseBudget, type BudgetDraft, type Category, type Context, type CostItem } from './contract'
import { budgetQuestions, budgetSummary, calculateBudget, catalogueSuggestions, displayMoney, manualItem, replaceItem, scopeLabels, utcToday, type ManualEntry } from './pipeline'
import { victoriaBuildingPermitReference as fee } from './victoriaFee'

const blankEntry = (category: Category): ManualEntry => ({ id: `manual:${category}`, category, label: categories[category], state: 'priced',
  basis: 'allowance', minimum: '', maximum: '', bound: 'exact', currency: '', included_in: '', rationale: '', tax_basis: '',
  provider: '', locator: '', captured_at: '', effective_at: '', expires_at: '', inclusions: [], exclusions: [], treatment: 'capital_cost', tax_status: 'unknown' })

export function BudgetSection({ draft, onChange, context, model, preference, onPreference, projectLabel, victoria, demoSetup, onContinue }: {
  draft: BudgetDraft; onChange: (draft: BudgetDraft) => void; context: Context; model: CatalogueModel
  preference: string; onPreference: (value: string) => void; projectLabel: string; victoria: boolean; demoSetup: boolean; onContinue: () => void
}) {
  const [entry, setEntry] = useState<ManualEntry | null>(null)
  const [error, setError] = useState(''), [message, setMessage] = useState(''), [json, setJson] = useState('')
  const contextKey = JSON.stringify(context)
  useEffect(() => { setEntry(null); setError(''); setMessage('') }, [contextKey])
  const today = utcToday(), result = calculateBudget(draft, context, today)
  const suggestions = catalogueSuggestions(model, context.snapshot_id, context, today)
  function update<K extends keyof ManualEntry>(key: K, value: ManualEntry[K]) { setEntry(previous => previous ? { ...previous, [key]: value } : previous); setError('') }
  function choose(item: CostItem) {
    // Keep provider claims recoverable when choosing another package or a user edit.
    onChange(replaceItem({ ...draft, items: draft.items.map(old => old.category === item.category ? { ...old, selected: false } : old) }, item))
    setMessage(`${item.label} saved. Check the coverage below.`); setError('')
  }
  function edit(category: Category) {
    const current = draft.items.find(item => item.category === category && item.selected && item.evidence.origin !== 'catalogue')
    if (current) {
      setEntry({ ...blankEntry(category), id: current.id, label: current.label, state: current.state,
        basis: current.basis === 'quote' ? 'quote' : 'allowance', minimum: current.money?.minimum ?? '', maximum: current.money?.maximum ?? '',
        bound: !current.money || current.money.maximum === null ? 'minimum' : current.money.minimum === current.money.maximum ? 'exact' : 'range',
        currency: current.money?.currency ?? '', included_in: current.included_in ?? '', rationale: current.rationale,
        tax_basis: current.tax_basis ?? '', tax_status: current.tax_status, provider: current.evidence.provider, locator: current.evidence.locator,
        captured_at: current.evidence.captured_at ?? '', effective_at: current.evidence.effective_at ?? '', expires_at: current.evidence.expires_at ?? '',
        inclusions: current.inclusions, exclusions: current.exclusions, treatment: current.treatment })
    } else setEntry(blankEntry(category))
    setError(''); setMessage('')
    requestAnimationFrame(() => document.getElementById('budget-entry-heading')?.focus())
  }
  return <section className="project-budget" id="project-budget" aria-labelledby="builder-budget-title">
    <h2 id="builder-budget-title" tabIndex={-1}>Budget and cost scope <span>Optional</span></h2>
    <p>{model.provider} {model.name} · {projectLabel}</p>
    <p>Explore the costs you know, then carry the gaps into your enquiry. You can continue with every cost unknown.</p>
    {demoSetup && <p className="metadata">Demo setup: whole-project scope and the captured provider price. No owner allowance or site quote has been supplied.</p>}
    <label htmlFor="builder-budget">Your spending preference (optional)</label>
    <input id="builder-budget" value={preference} onChange={event => onPreference(event.target.value)} placeholder="e.g. around CAD 250,000; scope to discuss" />
    <p className="metadata">An amount you would like to spend, separate from calculated costs. {preference.trim() ? '' : 'Not supplied.'}</p>
    <label htmlFor="budget-scope">What should this cost draft cover?</label>
    <select id="budget-scope" value={draft.scope} onChange={event => onChange({ ...draft, scope: event.target.value as BudgetDraft['scope'] })}>
      {Object.entries(scopeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select>
    <div className="budget-summary" aria-live="polite">
      <p><strong>{result.complete ? 'Scenario range under supplied assumptions' : 'Incomplete · installed total unavailable'}</strong> · {scopeLabels[draft.scope]}</p>
      <p>Spending preference: {preference.trim() || 'Not supplied'}.</p>
      {result.subtotals.length ? result.subtotals.map((money, i) => <p key={i}>{result.complete ? 'Scenario range' : 'Priced-components subtotal'}: {displayMoney(money)}.</p>) : <p>No usable priced components. Unknown costs are not zero.</p>}
      {result.counted_ids.length > 0 && <p>Priced: {draft.items.filter(item => result.counted_ids.includes(item.id)).map(item => `${categories[item.category]} (${item.evidence.origin === 'user_allowance' ? 'your allowance' : item.evidence.origin === 'user_quote' ? 'your quote entry' : 'provider claim'})`).join('; ')}.</p>}
      {result.missing.length > 0 && <p>Unpriced or unresolved: {result.missing.map(c => categories[c]).join(', ')}.</p>}
      {result.included.length > 0 && <p>Included without a second charge: {result.included.join('; ')}.</p>}
      {result.issues.length > 0 && <p className="budget-error">Withheld costs: {[...new Set(result.issues.map(issue => `${draft.items.find(item => item.id === issue.item_id)?.label}: ${issue.message}`))].slice(0, 3).join(' ')}{result.issues.length > 3 ? ' Review all affected entries under Cost coverage.' : ''}</p>}
      {result.subtotals.length > 1 && <p>Currencies stay separate; no combined subtotal.</p>}
      {draft.scope === 'building' && <p>Delivery, site work, services, professional work and fees are outside this building-only scope.</p>}
      {!result.missing.includes('tax') && result.limitations.some(text => text.startsWith('Tax basis')) && <p>Tax basis is still unknown on priced work.</p>}
      <p className="metadata">Provider claims, quote entries and your allowances remain unreviewed. {draft.items.filter(item => result.counted_ids.includes(item.id) && item.evidence.origin === 'catalogue').map(item => <span key={item.id}>{item.evidence.provider} · {item.evidence.label} · captured {readableDate(item.evidence.captured_at)}. </span>)}</p>
    </div>
    <div className="budget-actions"><button className="builder-continue" type="button" onClick={onContinue}>Continue to enquiry with known costs or gaps<span aria-hidden="true"> →</span></button></div>
    <details><summary>Calculation assumptions and limits</summary>{budgetSummary(draft, result).map((text, i) => <p key={i}>{text}</p>)}</details>
    <details open={!draft.items.some(item => item.selected && item.category === 'unit')}><summary>Use a captured model price</summary>
      {suggestions.length ? suggestions.map(item => <div className="budget-suggestion" key={item.id}>
        <p><strong>{item.money ? displayMoney({ ...item.money, maximum: item.basis === 'starting' ? null : item.money.maximum }) : 'Price unknown'}</strong> · {item.basis === 'starting' ? 'Provider starting price' : 'Provider claim'}</p>
        <p className="metadata">{item.evidence.provider} · {item.evidence.label} · captured {readableDate(item.evidence.captured_at)} · unreviewed. Price-effective date and controlled configuration are unconfirmed.</p>
        <p>{item.rationale}</p><p>Inclusions: {item.inclusions.join('; ') || 'not stated'}. Exclusions: {item.exclusions.join('; ') || 'not stated'}. Tax: {item.tax_basis || 'unknown'}.</p>
        <p className="metadata">This is a model-level price reference. Ask the provider to confirm pricing for your chosen configuration and options.</p>
        <button type="button" onClick={() => choose(item)}>Use this price suggestion</button>
      </div>) : <p>No price in this model’s captured catalogue. Leave the building price unknown or enter your own allowance.</p>}
    </details>
    {victoria && <details><summary>Victoria building-permit fee · unresolved</summary>
      <p>The City’s temporary waiver may affect this component. {fee.reason}</p>
      <p>No fee amount has been added. Other charges, services and deposits still need separate scope confirmation.</p>
      <p className="metadata">{fee.authority} · {fee.source_revision} · checked {fee.captured_at} · independent review pending. Adopted {fee.adopted_at}; repeal {fee.repeal_at}.</p>
      <ul>{fee.conditions.map(condition => <li key={condition}>{condition}</li>)}</ul>
      <a href={fee.source} target="_blank" rel="noreferrer">Official waiver and receipt conditions</a>{' · '}<a href={fee.base_source} target="_blank" rel="noreferrer">Base building-permit schedule</a>
    </details>}
    <details open={!!entry}><summary>Cost coverage and optional entries</summary>
      <p>Included work is counted through its package, without a second charge. Use an allowance only for a scope you can describe. Deposits and refundable security are outside this cost draft.</p>
      <ul className="budget-coverage">{(Object.entries(categories) as Array<[Category, string]>).map(([category, label]) => {
        const items = draft.items.filter(item => item.selected && item.category === category)
        return <li key={category}><div><strong>{label}</strong><span>{items.length ? items.map(item => item.state === 'priced' ? `${item.basis === 'allowance' ? 'User allowance' : item.basis === 'quote' ? 'User-entered quote fact' : 'Provider claim'}: ${displayMoney({ ...item.money!, maximum: item.basis === 'starting' ? null : item.money!.maximum })}` : item.state === 'included' ? `Included in ${draft.items.find(parent => parent.id === item.included_in)?.label ?? 'unresolved package'}` : item.state === 'not_applicable' ? `Not applicable: ${item.rationale}` : 'Unpriced').join('; ') : 'Unpriced / unknown'}</span>
          {items.flatMap(item => result.issues.filter(issue => issue.item_id === item.id)).map((issue, i) => <span className="budget-error" key={i}>{issue.message}</span>)}</div>
          <button type="button" onClick={() => edit(category)}>Edit {label.toLowerCase()}</button></li>
      })}</ul>
      {entry && <section className="budget-editor" aria-labelledby="budget-entry-heading">
        <h4 id="budget-entry-heading" tabIndex={-1}>{categories[entry.category]} · your entry</h4>
        <div className="budget-fields">
          <label htmlFor="budget-state">Cost status</label><select id="budget-state" value={entry.state} onChange={event => update('state', event.target.value as ManualEntry['state'])}>
            <option value="priced">Amount or range supplied</option><option value="included">Included in another line</option><option value="unknown">Unpriced / unknown</option><option value="not_applicable">Not applicable</option>
          </select>
          {entry.state === 'priced' && <>
            <label htmlFor="budget-basis">Where does this amount come from?</label><select id="budget-basis" value={entry.basis} onChange={event => update('basis', event.target.value as ManualEntry['basis'])}><option value="allowance">My planning allowance</option><option value="quote">A quote fact I enter (unreviewed)</option></select>
            <label htmlFor="budget-bound">Amount basis</label><select id="budget-bound" value={entry.bound} onChange={event => update('bound', event.target.value as ManualEntry['bound'])}><option value="exact">One stated amount</option><option value="range">Lower and upper amounts</option><option value="minimum">Minimum only; upper amount unknown</option></select>
            <label htmlFor="budget-minimum">{entry.bound === 'exact' ? 'Amount' : 'Lower amount'}</label><input id="budget-minimum" inputMode="decimal" value={entry.minimum} onChange={event => update('minimum', event.target.value)} placeholder="0 is allowed; no commas" />
            {entry.bound === 'range' && <><label htmlFor="budget-maximum">Upper amount (blank if unknown)</label><input id="budget-maximum" inputMode="decimal" value={entry.maximum} onChange={event => update('maximum', event.target.value)} /></>}
            <label htmlFor="budget-currency">Original currency</label><input id="budget-currency" value={entry.currency} onChange={event => update('currency', event.target.value)} placeholder="e.g. CAD; blank stays unknown" maxLength={3} />
          </>}
          {entry.state === 'included' && <><label htmlFor="budget-parent">Included in which priced line?</label><select id="budget-parent" value={entry.included_in} onChange={event => update('included_in', event.target.value)}><option value="">Choose a line</option>{draft.items.filter(item => item.selected && item.state === 'priced' && item.category !== entry.category).map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></>}
          <label htmlFor="budget-rationale">Scope and reason{['included', 'not_applicable'].includes(entry.state) ? ' (required)' : ' (optional)'}</label><textarea id="budget-rationale" rows={2} value={entry.rationale} onChange={event => update('rationale', event.target.value)} placeholder="What does this cover? Why is it included or not applicable?" />
        </div>
        <details><summary>Source, dates, inclusions and tax details</summary><div className="budget-fields">
          <label htmlFor="budget-treatment">Cost or separate cash requirement?</label><select id="budget-treatment" value={entry.treatment} onChange={event => update('treatment', event.target.value as ManualEntry['treatment'])}><option value="capital_cost">Capital cost</option><option value="refundable_security">Refundable deposit / security (outside subtotal)</option></select>
          <label htmlFor="budget-provider">Provider or person supplying this</label><input id="budget-provider" value={entry.provider} onChange={event => update('provider', event.target.value)} />
          <label htmlFor="budget-locator">Source or quote reference</label><input id="budget-locator" value={entry.locator} onChange={event => update('locator', event.target.value)} placeholder="Document/page or public source link; do not enter private access links" />
          {([['captured_at', 'Source captured / quote received'], ['effective_at', 'Effective date, if stated'], ['expires_at', 'Expiry date, if stated']] as const).map(([key, label]) => <div className="budget-date" key={key}><label htmlFor={`budget-${key}`}>{label}</label><input id={`budget-${key}`} type="date" value={entry[key]} onChange={event => update(key, event.target.value)} /></div>)}
          <label htmlFor="budget-inclusions">Included work (one item per line)</label><textarea id="budget-inclusions" rows={2} value={entry.inclusions.join('\n')} onChange={event => update('inclusions', event.target.value.split('\n'))} />
          <label htmlFor="budget-exclusions">Excluded work (one item per line)</label><textarea id="budget-exclusions" rows={2} value={entry.exclusions.join('\n')} onChange={event => update('exclusions', event.target.value.split('\n'))} />
          <label htmlFor="budget-tax-status">Is tax included in this amount?</label><select id="budget-tax-status" value={entry.tax_status} onChange={event => update('tax_status', event.target.value as ManualEntry['tax_status'])}><option value="unknown">Unknown</option><option value="included">Included in this amount</option><option value="excluded">Excluded; establish a separate tax line</option></select>
          <label htmlFor="budget-tax">Tax source wording or scope, if stated</label><input id="budget-tax" value={entry.tax_basis} onChange={event => update('tax_basis', event.target.value)} placeholder="Preserve any stated tax scope; wording alone does not resolve the status" />
        </div></details>
        <div className="budget-actions"><button type="button" onClick={() => {
          try {
            choose(manualItem({ ...entry, inclusions: entry.inclusions.map(s => s.trim()).filter(Boolean), exclusions: entry.exclusions.map(s => s.trim()).filter(Boolean) }, context, today)); setEntry(null)
          } catch (reason) { setError(reason instanceof Error ? reason.message : 'Entry could not be saved. Check amounts and scope. Your prior draft is unchanged.') }
        }}>Save cost entry</button><button type="button" onClick={() => { setEntry(null); setError('') }}>Cancel entry</button></div>
      </section>}
    </details>
    {error && <p role="alert" className="budget-error">{error}</p>}{message && <p role="status">{message}</p>}
    <details><summary>Useful next questions</summary><ul>{budgetQuestions(draft, result, model.name).map(item => <li key={item.question}><strong>{item.answerer}:</strong> {item.question}</li>)}</ul></details>
    <details><summary>Full cost evidence and local draft file</summary>
      <p>Keep quote details local unless you intend to share them. A technical enquiry package includes this full draft. Importing replaces only this budget draft after validation; it does not publish catalogue data.</p>
      {draft.items.map(item => <div className="budget-source" key={item.id}><h4>{item.label} · {item.selected ? 'selected' : 'retained alternative'}</h4>
        <p>{item.evidence.provider} · {item.evidence.label} · {item.evidence.origin === 'user_allowance' ? 'user assumption' : 'unreviewed claim'} · captured {readableDate(item.evidence.captured_at)}. Effective {item.evidence.effective_at ?? 'unknown'}; expires {item.evidence.expires_at ?? 'unknown'}. {item.evidence.locator}</p>
        {publicSourceUrl(item.evidence.locator.split(' — ')[0]) && <a href={publicSourceUrl(item.evidence.locator.split(' — ')[0])!} target="_blank" rel="noreferrer">Source record</a>}
        <p>Scope: {item.rationale || 'Not described'}. Included: {item.inclusions.join('; ') || 'unknown'}. Excluded: {item.exclusions.join('; ') || 'unknown'}. Tax status: {item.tax_status}; source wording: {item.tax_basis || 'not supplied'}.</p>
        <details><summary>Original record and technical identifiers</summary><pre>{JSON.stringify(item, null, 2)}</pre></details>
        <button type="button" onClick={() => onChange({ ...draft, items: draft.items.filter(old => old.id !== item.id) })}>Remove {item.label}</button>
      </div>)}
      <button type="button" onClick={() => downloadFile('project-budget-draft.json', JSON.stringify(draft, null, 2), 'application/json')}>Download budget draft JSON</button>
      <label htmlFor="budget-import">Import a saved budget draft JSON file</label><input id="budget-import" type="file" accept=".json,application/json" onChange={async event => {
        const file = event.target.files?.[0]
        if (!file) return
        try { if (file.size > 1000000) throw new Error('Draft exceeds 1 MB. Existing draft unchanged.'); const text = await file.text(); setJson(text); onChange(parseBudget(JSON.parse(text))); setError(''); setMessage('Budget draft imported. Costs from a different scenario are withheld until rechecked.') }
        catch (reason) { setError(`Import failed; existing draft unchanged. ${reason instanceof Error ? reason.message : 'Invalid JSON'}`) }
        event.target.value = ''
      }} />
      <details><summary>Paste JSON instead</summary><label htmlFor="budget-import-json">Budget draft JSON</label><textarea id="budget-import-json" value={json} onChange={event => setJson(event.target.value)} rows={6} /><button type="button" onClick={() => { try { onChange(parseBudget(JSON.parse(json))); setError(''); setMessage('Budget draft imported; review context and sources.') } catch (reason) { setError(`Import failed; existing draft unchanged. ${reason instanceof Error ? reason.message : 'Invalid JSON'}`) } }}>Validate and replace budget draft</button></details>
    </details>
  </section>
}
