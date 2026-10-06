import assert from 'node:assert/strict'
import { test } from 'node:test'
import saved from '../builder_demo/example-site.json'
import type { Site } from '../occupied_lots/contract'
import { suggestPlacementOrientation } from './index'

const parcel = (rings: number[][][]) => ({
  projected_metre_crs: 'EPSG:3157',
  parcel: { shape: { crs: 'EPSG:3157', geometry: { type: 'Polygon' as const, coordinates: rings } } },
}) as Site

// Exact rectangle corners are constructed independently from the direction vector.
// The helper must orient the engine's local depth/Y axis along the long side.
function rectangle(degrees: number, width = 10, length = 30): number[][] {
  const r = degrees * Math.PI / 180, u = [Math.cos(r), Math.sin(r)], v = [-Math.sin(r), Math.cos(r)]
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) =>
    [473000 + a * length / 2 * u[0] + b * width / 2 * v[0],
      5362000 + a * length / 2 * u[1] + b * width / 2 * v[1]])
}

test('rotated rectangles follow their long side with depth/Y, independent of ring order', () => {
  for (const [longAxis, expected] of [[0, -90], [30, -60], [90, 0], [135, 45]]) {
    const ring = rectangle(longAxis)
    for (const coordinates of [ring, [...ring].reverse(), [...ring, ring[0]]]) {
      const result = suggestPlacementOrientation(parcel([coordinates]))
      assert.equal(result.status, 'suggested')
      if (result.status === 'suggested') {
        assert.ok(Math.abs(result.angle_degrees - expected) < 1e-7)
        assert.ok(Math.abs(result.aspect_ratio - 3) < 1e-7)
      }
    }
  }
})

test('saved VIC-087 exterior suggests a near north/south long axis without changing coordinates', () => {
  const before = JSON.stringify(saved.site.parcel.shape.geometry.coordinates)
  const result = suggestPlacementOrientation(saved.site as Site)
  assert.equal(result.status, 'suggested')
  if (result.status === 'suggested') {
    // Independent edge direction: atan2(41.5587, 6.9705) = 80.48°, hence depth rotation near -9.52°.
    assert.ok(result.angle_degrees > -10 && result.angle_degrees < -9)
  }
  assert.equal(JSON.stringify(saved.site.parcel.shape.geometry.coordinates), before)
})

test('near-square, holes, multipart and invalid rings do not assert an alignment', () => {
  assert.equal(suggestPlacementOrientation(parcel([rectangle(25, 29, 30)])).status, 'ambiguous')
  assert.equal(suggestPlacementOrientation(parcel([rectangle(30), rectangle(30, 2, 3)])).status, 'unavailable')
  assert.equal(suggestPlacementOrientation(parcel([[[0, 0], [10, 10], [0, 10], [10, 0]]])).status, 'unavailable')
  const multi = parcel([rectangle(30)])
  multi.parcel.shape.geometry.type = 'MultiPolygon' as 'Polygon'
  assert.equal(suggestPlacementOrientation(multi).status, 'unavailable')
})

test('concave single exterior uses its hull, not a concatenation of unrelated rings', () => {
  const concave = [[0, 0], [30, 0], [30, 10], [15, 6], [0, 10], [0, 0]]
  const result = suggestPlacementOrientation(parcel([concave]))
  assert.equal(result.status, 'suggested')
  if (result.status === 'suggested') assert.equal(result.angle_degrees, -90)
})
