import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Confirmed } from '../site_discovery/flow'
import { parseAddresses, parseParcels, parseObservation } from '../site_discovery/transport'
import addresses from '../site_discovery/may-street-api.fixture.json'
import mapped from '../site_discovery/municipal-api.fixture.json'
import { ReplacementPlans } from './ReplacementPlans'

test('an incomplete building capture offers plans and their sources without promoting a clearance winner', () => {
  const address = parseAddresses(addresses).candidates[0]
  const parcel = parseParcels(mapped.search).candidates[0]
  const observation = { ...parseObservation(mapped.observation, parcel), roofs: [], buildingsState: 'unavailable' }
  const selected: Confirmed = { schema_version: 'site-discovery.selected.v1', selection_basis: 'sole_candidate',
    identity_attestation: 'not_confirmed', review: 'unreviewed', screening: 'not_performed', address, parcel, observation }
  const html = renderToStaticMarkup(createElement(ReplacementPlans, { selected, onBack() {} }))
  assert.match(html, /Plans to explore/)
  assert.match(html, /Partial map check/)
  assert.doesNotMatch(html, /Most room around it|Largest plan with a sampled position/)
  assert.match(html, /Concord specifications at Pacific Homes/)
  assert.equal((html.match(/type="radio"/g) ?? []).length, 3)
})
