import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildPlacement, buildSite } from './model'

test('manual geometry needs explicit positive metre dimensions and keeps unknown obstructions', () => {
  assert.equal(buildSite('', '', [], 'unknown'), null)
  assert.equal(buildSite('400', '', [], 'unknown'), null) // An area cannot determine a shape.
  assert.equal(buildSite('20', '0', [], 'unknown'), null)
  const partial = buildSite('20', '30', [{ label: 'house', x: '1', y: '2', width: '', depth: '4' }], 'partial')!
  assert.equal(partial.buildings.length, 0)
  assert.match(partial.capture.limitations.join(' '), /Incomplete structure entries/)
  const site = buildSite('20', '30', [], 'unknown')!
  assert.equal(site.projected_metre_crs, 'LOCAL:METRE')
  assert.equal(site.parcel.shape.crs, 'LOCAL:METRE')
  assert.equal(site.capture.completeness, 'unknown')
  assert.deepEqual(site.buildings, [])
  assert.equal(buildPlacement({ x: '10', y: '15', width: '2', depth: '-4', angle: '0' }), null)
  assert.deepEqual(buildPlacement({ x: '10', y: '15', width: '2', depth: '4', angle: '0' })?.centre_xy, [10, 15])
})
