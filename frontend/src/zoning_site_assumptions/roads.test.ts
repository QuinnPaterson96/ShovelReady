import { test } from 'node:test'
import assert from 'node:assert/strict'
import { roadBands } from './roads'
import type { BoundaryEdge } from './model'

const edges = (points: number[][]): BoundaryEdge[] => points.slice(0, -1).map((start, i) => ({ id: String(i), ring: 0, segment: i, start: start as [number, number], end: points[i + 1] as [number, number], role: { value: 'unknown', origin: 'user', note: null } }))

test('road bands stay outside a square for either winding, including large projected coordinates', () => {
  // A 10 x 10 square has a 0.25 gap and 0.5 schematic band. Its south band
  // must span y=-0.25 to -0.75, independently of polygon winding/translation.
  for (const origin of [0, 5000000]) for (const reverse of [false, true]) {
    let points = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]
    if (reverse) points = points.reverse()
    const boundary = edges(points.map(([x, y]) => [x + origin, y + origin]))
    const south = boundary.find(edge => edge.start[1] === origin && edge.end[1] === origin)!
    const roads = roadBands(boundary, [south.id])
    assert.equal(roads.length, 1)
    assert.deepEqual([...new Set(roads[0].corners.map(point => point[1] - origin))].sort(), [-.25, -.75])
    assert.ok(roads[0].corners.every(([x]) => x > origin && x < origin + 10))
    assert.deepEqual(roadBands(boundary, []), [])
  }
})

test('unsupported concave outlines get no road band rather than an invented exterior', () => {
  assert.deepEqual(roadBands(edges([[0, 0], [10, 0], [3, 3], [0, 10], [0, 0]]), ['0']), [])
})
