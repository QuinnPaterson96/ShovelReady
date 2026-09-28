import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { parseResult, parseSites } from './contract'
import { overlapFinding } from './observations'

// The fixture is a retained VIC-087 geometry-engine response for a contained
// placement separate from its captured roofline. Removing producer rows models
// a partial response; it must not become an affirmative no-overlap observation.
const site = parseSites(JSON.parse(readFileSync('../app/scouting_sites/data/sites.json', 'utf8')))[0]
const assessed = parseResult(JSON.parse(readFileSync('src/scenario_handoff/retained-assessment.fixture.json', 'utf8')))

test('no-overlap wording requires affirmative parcel and every captured roofline observation', () => {
  const complete = overlapFinding(site, assessed)
  assert.equal(complete.complete, true)
  assert.equal(complete.conflicts.length, 0)

  for (const kind of ['containment', 'building_overlap']) {
    const partial = parseResult({ ...assessed, checks: assessed.checks.filter(check => check.kind !== kind) })
    assert.equal(overlapFinding(site, partial).complete, false, `missing ${kind}`)
  }
  assert.equal(overlapFinding(site, parseResult({ ...assessed, checks: [] })).complete, false)
  const additionalRoof = { ...site.site.buildings[0], id: 'additional-captured-roof' }
  const siteWithSecondRoof = { ...site, site: { ...site.site, buildings: [...site.site.buildings, additionalRoof] } }
  assert.equal(overlapFinding(siteWithSecondRoof, assessed).complete, false)
})

test('an observed conflict remains visible when another measurement is unresolved', () => {
  const crossing = assessed.checks.find(check => check.kind === 'containment')!
  const partial = parseResult({ ...assessed, checks: [{ ...crossing, relation: 'outside', area_m2: 1 }] })
  const finding = overlapFinding(site, partial)
  assert.equal(finding.complete, false)
  assert.equal(finding.conflicts.length, 1)
  assert.equal(finding.conflicts[0].relation, 'outside')
})
