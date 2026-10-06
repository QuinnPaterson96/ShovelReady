import { test } from 'node:test'
import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import response from './api-response.fixture.json'
import { ConditionalScreen } from './ConditionalScreen'
import { parseScreeningResult } from './model'

const render = (raw: unknown) => renderToStaticMarkup(createElement(ConditionalScreen, { result: parseScreeningResult(raw), busy: false, error: '' }))

test('mixed candidate packet keeps assumptions, measured outcomes, and omitted checks distinct', () => {
  const html = render(response)
  assert.match(html, /Compared checks/)
  assert.match(html, /Apparent conflict.*?Side setback/s)
  assert.match(html, /Supplied 0\.4 m · candidate threshold 0\.6 m/)
  assert.match(html, /Assumed for scenario.*?Current zoning/s)
  assert.match(html, /Rear-yard location/)
  assert.match(html, /Rear-yard occupancy/)
  assert.match(html, /Height/)
  assert.match(html, /Unknown \/ clarification needed/)
  assert.match(html, /Exact evidence and technical identifiers/)
  assert.match(html, /Part 3\.1\(28\)/)
  assert.match(html, /https:\/\/www\.victoria\.ca/)
  assert.doesNotMatch(html, /overall approval|whole.zone result/i)
})

test('unsupported and not applicable remain separate; equal rounded values do not conceal a conflict', () => {
  const base = parseScreeningResult(response)
  const checks = base.checks.map(check => check.rule.fact_id === 'floor_area' ? { ...check, status: 'unsupported' as const } :
    check.rule.kind === 'boundary_min' && check.status === 'apparent_conflict_under_assumptions' ? { ...check, normalized_observed: '0.599' } : check)
  const html = render({ ...base, checks })
  assert.match(html, /Outside supported scope.*?Garden suite floor area/s)
  assert.match(html, /Not applicable.*?Flanking street line presence/s)
  assert.match(html, /candidate threshold 0\.6 m · exact values differ/)
  assert.match(html, /Exact supplied value: 0\.599 m/)
})
