import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildingClearanceMove } from './buildingMove'
import type { Building } from '../occupied_lots/contract'

test('building suggestion separates projected extents, including an overlapping footprint', () => {
  // Independent geometry: building ends at x=10, proposed west wall at x=9.
  // A 2.4 m gap requires a 3.4 m eastward translation.
  const building = { shape: { geometry: { type: 'Polygon', coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]] } } } as Building
  const placement = { centre_xy: [11, 5] as [number, number], width_m: 4, depth_m: 2, angle_degrees: 0 }
  assert.deepEqual(buildingClearanceMove(building, placement, 2.4), { dx: 3.4, dy: 0, distance: 3.4 })
  assert.equal(buildingClearanceMove(building, { ...placement, centre_xy: [5, 5] }, 2.4), null, 'coincident centres do not invent a move direction')
  assert.equal(buildingClearanceMove(building, { ...placement, centre_xy: [20, 5] }, 2.4), null, 'already clear extents need no move')
})
