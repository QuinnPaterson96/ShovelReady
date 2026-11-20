import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Feature, Site } from '../occupied_lots/contract'
import { defaultRemovalId, rankReplacementPlans } from './geometry'

type Point = [number, number]
function box(x: number, y: number, width: number, depth: number): Point[] {
  return [[x, y], [x + width, y], [x + width, y + depth], [x, y + depth], [x, y]]
}
function feature(id: string, rings: Point[][]): Feature {
  return { id, shape: { crs: 'EPSG:3157', geometry: { type: 'Polygon', coordinates: rings } },
    source: { provider: 'Constructed geometry', record_label: id, capture_date: null, review_status: 'unreviewed', reference: null } }
}
function site(outline: Point[], roofs: Point[][] = [], holes: Point[][] = []): Site {
  return { projected_metre_crs: 'EPSG:3157', parcel: feature('parcel', [outline, ...holes]),
    buildings: roofs.map((ring, index) => ({ ...feature(`R${index + 1}`, [ring]), basis: 'roofline' })),
    named_boundaries: [], capture: { completeness: 'complete_for_declared_scope', scope: 'Tests', limitations: [] } }
}
const plan = (widthM: number, depthM: number) => ({ widthM, depthM })

test('equal-area parcels offer different plans when their dimensions and bearings differ', () => {
  // A 45-degree rotation and UTM translation preserve the 2 m centred gap and edge lengths.
  const rotate = ([x, y]: Point): Point => [450000 + (x - y) / Math.SQRT2, 5360000 + (x + y) / Math.SQRT2]
  const longLot = site(box(0, 0, 12, 48).map(rotate), [box(1, 1, 4, 5).map(rotate)])
  const squareLot = site(box(0, 0, 24, 24), [box(1, 1, 4, 5)])
  const plans = [plan(15, 15), plan(8, 40)]
  const narrowResults = rankReplacementPlans(longLot, plans, 'R1')
  assert.equal(narrowResults[0].plan, plans[1])
  assert.equal(narrowResults[0].status, 'suggested')
  assert.ok(Math.abs(narrowResults[0].clearanceM! - 2) < 1e-8)
  const [first, second, third] = narrowResults[0].placement!
  const sides = [Math.hypot(second[0] - first[0], second[1] - first[1]), Math.hypot(third[0] - second[0], third[1] - second[1])].sort((a, b) => a - b)
  assert.ok(Math.abs(sides[0] - 8) < 1e-8 && Math.abs(sides[1] - 40) < 1e-8)
  assert.equal(narrowResults[1].status, 'no_trial')
  const squareResults = rankReplacementPlans(squareLot, plans, 'R1')
  assert.equal(squareResults[0].plan, plans[0])
  assert.equal(squareResults[1].status, 'no_trial')
})

test('retaining a building can block a plan or translate its trial away from the building', () => {
  const mapped = site(box(0, 0, 30, 20), [box(0, 0, 16, 20), box(24, 3, 1, 1)])
  const original = structuredClone(mapped)
  assert.equal(defaultRemovalId(mapped), 'R1')
  const plans = [plan(22, 12), plan(6, 8)]
  const kept = rankReplacementPlans(mapped, plans, null)
  assert.equal(kept[0].plan, plans[1])
  assert.ok(kept[0].placement!.every(([x]) => x > 16))
  assert.equal(kept[1].status, 'no_trial')
  assert.equal(rankReplacementPlans(mapped, plans, 'R1').find(row => row.plan === plans[0])?.status, 'suggested')
  assert.deepEqual(mapped, original)
})

test('a plan cannot cover an interior roofline or parcel hole, or span a concave notch', () => {
  const model = plan(18, 18), shell = box(0, 0, 20, 20)
  // Every possible axis-aligned placement covers this square, which lies away from the plan centre.
  const inset = box(5, 5, 1, 1)
  const notch: Point[] = [[0, 0], [20, 0], [20, 20], [6, 20], [6, 6], [5, 6], [5, 20], [0, 20], [0, 0]]
  for (const mapped of [site(shell, [inset]), site(shell, [], [inset]), site(notch)])
    assert.equal(rankReplacementPlans(mapped, [model], null)[0].status, 'no_trial')
})

test('partial and previously empty building observations keep the trial provisional', () => {
  const mapped = site(box(0, 0, 20, 20), [box(2, 2, 6, 6)])
  mapped.capture.completeness = 'partial'
  const [trial] = rankReplacementPlans(mapped, [plan(8, 8)], 'R1')
  assert.equal(trial.status, 'partial')
  assert.ok(trial.placement)
  assert.equal(rankReplacementPlans(site(box(0, 0, 20, 20)), [plan(8, 8)], null)[0].status, 'partial')
  assert.equal(rankReplacementPlans(mapped, [plan(8, 8)], 'roof-from-another-site')[0].status, 'unavailable')
})
