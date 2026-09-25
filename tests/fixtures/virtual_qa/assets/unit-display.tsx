import { useState } from 'react'
import { preview, readable } from './adapter'
import type { SavedResult, SavedRule } from './adapter'

function Result({ result, rules }: { result: SavedResult; rules: SavedRule[] }) {
  return <article aria-label={`Result ${result.evaluation_id}`}>
    <h3 className="outcome">{readable(result.outcome)}</h3>
    <p><strong>Supplied placement only.</strong> This saved assertion is preliminary, within the stated checks. It is not a permit entitlement or proof of any real fit.</p>
    <dl className="identities">
      <dt>Result</dt><dd>{result.evaluation_id}</dd>
      <dt>Dataset / release</dt><dd>{result.dataset.dataset_id} / <strong>{result.dataset.release_id}</strong></dd>
      {(['design', 'site', 'placement'] as const).map(key => <div className="identity" key={key}><dt>{readable(key)}</dt><dd>{result[key].logical_id} / {result[key].revision_id}</dd></div>)}
    </dl>
    <h4>Checked scope and limits</h4>
    <p><strong>{readable(result.coverage)}</strong> · {readable(result.scope)}</p>
    <p>{result.dataset.coverage}</p>
    <ul>{[...result.scope_exclusions, ...result.dataset.exclusions].map(text => <li key={text}>{text}</li>)}</ul>
    {result.alternatives.map(alternative => <section className="alternative" key={alternative.alternative_id}>
      <h4>Pathway: {alternative.pathway_id} / {alternative.alternative_id}</h4>
      <p>Alternative outcome: <strong>{readable(alternative.outcome)}</strong></p>
      <p>Approval status in this fiction: <strong>{readable(alternative.approval)}</strong>. No actual approval established.</p>
      <h4>Remaining conditions</h4>
      {alternative.conditions.length ? <ul>{alternative.conditions.map(text => <li key={text}>{text}</li>)}</ul> : <p>None recorded within this saved alternative; scope exclusions still apply.</p>}
      {alternative.checks.map(check => <div className="check" key={check.check_id}>
        <h4>{readable(check.status)} · {check.check_id}</h4>
        <p>{check.explanation}</p>
        <p>Rule: {check.rule.logical_id} / {check.rule.revision_id}</p>
        <h4>Missing facts</h4>
        {check.missing_facts.length ? <ul>{check.missing_facts.map(text => <li key={text}>{text}</li>)}</ul> : <p>None recorded for this check. This does not establish complete site information.</p>}
        <details><summary>Inspect rule and source evidence</summary>
          {rules.filter(rule => rule.identity.revision_id === check.rule.revision_id && rule.identity.logical_id === check.rule.logical_id).map(rule => <div key={rule.identity.revision_id}>
            <p>{rule.content.text}</p>
            <p>Runtime support: {rule.content.runtime_support}. Review scope: {rule.review.scope}</p>
            {rule.content.semantics.kind === 'scalar_bound' && 'threshold' in rule.content.semantics && rule.content.semantics.threshold ? <p>
              Threshold: {rule.content.semantics.operator} {rule.content.semantics.threshold.value} {check.check_id === 'synthetic-check-3' ? 'ft' : rule.content.semantics.threshold.unit} (original: {rule.content.semantics.threshold.original_text}).
              {' '}Basis: {rule.content.semantics.threshold.basis ? `${rule.content.semantics.threshold.basis.numerator} / ${rule.content.semantics.threshold.basis.denominator}` : rule.content.semantics.measurement_definition}
            </p> : <p>Unresolved semantics: {'reason' in rule.content.semantics ? rule.content.semantics.reason : ''}</p>}
            {rule.content.references.map(ref => <p key={ref.locator}>{ref.status} reference: {ref.instrument} / {ref.locator}</p>)}
          </div>)}
          {check.evidence.map(evidence => {
            const source = preview.sources.find(source => source.snapshot_id === evidence.snapshot_id)
            return <div className="evidence" key={`${evidence.snapshot_id}-${evidence.locator}`}>
              <h4>{evidence.locator}</h4><blockquote>{evidence.excerpt}</blockquote><p>{evidence.context}</p>
              <p>Snapshot: {evidence.snapshot_id}</p>
              {source ? <><p>{source.instrument}</p><p>Captured: {source.captured_at}</p><p>Legal effective from: {source.effective_from ?? 'Unknown'} · to: {source.effective_to ?? 'Unknown'}</p><p>Retained file: {source.artifact.uri}</p><p>SHA-256: <code>{source.artifact.sha256}</code></p></> : <p>Source metadata unavailable; investigate before relying on this evidence.</p>}
            </div>
          })}
        </details>
      </div>)}
    </section>)}
    <p className="metadata">Contract {result.schema_version} · Projection {result.dataset.projection_version} · Evaluator {result.dataset.evaluator_version} · Spatial snapshots: {result.dataset.spatial_snapshot_ids.join(', ') || 'None'}</p>
  </article>
}

export default function InvestigationPreview() {
  const [selected, setSelected] = useState(preview.scenarios[0].id)
  const scenario = preview.scenarios.find(item => item.id === selected) ?? preview.scenarios[0]
  return <section aria-labelledby="preview-title">
    <p className="eyebrow">Local preview · {preview.fixture_version}</p>
    <h2 id="preview-title">Investigate a saved result</h2>
    <p className="notice"><strong>All examples are synthetic.</strong> Hand-authored saved assertions, not evaluated sites. No real property or manufacturer is represented. No accepted dataset is published.</p>
    <label htmlFor="scenario">Choose a synthetic example</label>
    <select id="scenario" value={selected} onChange={event => setSelected(event.target.value)}>{preview.scenarios.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
    <div key={scenario.id}>
      <h2>{scenario.title}</h2>
      {scenario.correction && <p className="notice"><strong>Archived result pinned to synthetic-release-1.</strong> A corrected saved result is available below. Viewing it does not replace the original.</p>}
      <Result result={scenario.result} rules={scenario.rules} />
      {scenario.correction && <details className="correction"><summary>Compare corrected saved result · synthetic-release-2</summary><Result result={scenario.correction.result} rules={scenario.correction.rules} /></details>}
    </div>
  </section>
}
