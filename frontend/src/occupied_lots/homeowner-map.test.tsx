import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { exampleCase, initialExamplePosition } from '../builder_demo/example'
import { initialAssumptions } from '../zoning_site_assumptions/model'
import { BoundaryMapTools } from '../zoning_site_assumptions/BoundaryMapTools'
import { OccupiedLotPreview, PlacementConcerns } from './OccupiedLots'
import { parseResult } from './contract'

const fixture = parseResult(JSON.parse(readFileSync('src/scenario_handoff/retained-assessment.fixture.json', 'utf8')))
const interaction = { edges: initialAssumptions(exampleCase, 'geometry', 'position').edges,
  mainBuilding: exampleCase.site.buildings[0], mainBuildingAssumed: true, mode: 'place' as const,
  frontId: null, rearId: null, streetPattern: 'unknown' as const, onModeChange: () => {}, onSelect: () => {} }

test('placement plan identifies selected full roofline and proposed model with distinct labels', () => {
  const html = renderToStaticMarkup(createElement(OccupiedLotPreview, { selected: exampleCase,
    placement: initialExamplePosition(), onMove: () => {}, nudgeMetres: 1, boundaryInteraction: interaction, modelLabel: 'Model 300' }))
  assert.match(html, /data-main-building="true"/)
  assert.match(html, /Main building · assumed · R1/)
  assert.match(html, /Model 300 · proposed position/)
  assert.match(html, /Open full-size placement preview/)
  assert.match(html, /<dialog[^>]+aria-label="Full-size approximate placement preview"/)
  assert.match(html, /R labels identify captured rooflines, not building walls/)
})

test('tiny observed overlap and entered-target shortfall stay material beside the map', () => {
  // Positive source area and negative margin remain conflicts below ordinary
  // display precision. The sign and finding define the independent expectation.
  const result = { ...fixture, checks: fixture.checks.map(check => check.kind === 'building_overlap'
    ? { ...check, relation: 'positive_area_overlap', area_m2: .00001 }
    : check.kind === 'requirement' ? { ...check, comparison: 'shortfall', margin_m: -.000001 } : check) }
  const before = JSON.stringify(result)
  const html = renderToStaticMarkup(createElement(PlacementConcerns, { site: exampleCase, result,
    additional: createElement('p', null, 'Candidate rear distance concern remains unresolved.'), onContinueUnresolved: () => {} }))
  assert.match(html, /&lt; 0\.1 m² overlap/)
  assert.match(html, /falls short/)
  assert.match(html, /&lt; 0\.01 m/)
  assert.match(html, /Candidate rear distance concern remains unresolved/)
  assert.match(html, /Continue with unresolved placement concerns/)
  assert.match(html, /Continuing does not resolve a conflict/)
  assert.equal(JSON.stringify(result), before)
})

test('partial street marks retain unknown completion and role help uses accessible disclosure', () => {
  const html = renderToStaticMarkup(createElement(BoundaryMapTools, { interaction: { ...interaction,
    mode: 'front', streetIds: [interaction.edges[0].id], allStreetsMarked: false } }))
  assert.match(html, /partial marks; completion not confirmed/)
  assert.match(html, /Not sure · clear street marks/)
  assert.match(html, /<summary>What do front, rear, side and street-side mean\?/)
  assert.match(html, /a street mark alone does not establish a legal lot-line role/)
  assert.doesNotMatch(html, /type="checkbox"[^>]*checked/)
})
