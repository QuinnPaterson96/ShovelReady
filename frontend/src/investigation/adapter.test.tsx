import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { geometryPath, parseInvestigation, ringsPath, safeUrl } from './adapter'
import { InertJson } from './RealObservations'
import saved from './observed.test.json'

test('real captured API envelope and version/shape failures', () => {
  const data = parseInvestigation(saved)
  assert.equal(data.spatial.features.length, 10)
  for (const mutate of [
    (v: any) => {
      v.schema_version = 'future'
    },
    (v: any) => {
      v.spatial.source_crs = 'EPSG:4326'
    },
    (v: any) => {
      v.spatial.observations[0].response.features = null
    },
    (v: any) => {
      v.spatial.observations[0].response.features[0].geometry.rings = 'bad'
    },
    (v: any) => {
      v.spatial.features.pop()
    },
    (v: any) => {
      v.spatial.parcels[0].intersections[0].geometry = { type: 'Polygon', coordinates: 'bad' }
    },
    (v: any) => {
      v.sources[0].source_url = 'javascript:alert(1)'
    },
  ]) {
    const changed = structuredClone(saved)
    mutate(changed)
    assert.throws(() => parseInvestigation(changed))
  }
})
test('unknown geometry and empty observations do not become zero or a match', () => {
  const changed = structuredClone(saved)
  changed.spatial.observations[0].response.features[0].geometry = null as any
  changed.spatial.features[0].geometric_area_m2 = null as any
  changed.spatial.features[0].geographic_xy = null as any
  changed.spatial.features[0].status = 'needs_investigation'
  assert.equal(parseInvestigation(changed).spatial.features[0].geometric_area_m2, null)
  changed.spatial.observations = []
  changed.spatial.features = []
  changed.spatial.parcels = []
  assert.equal(parseInvestigation(changed).spatial.parcels.length, 0)
})
test('holes, multiple parts, zero-area contacts and original XY axes', () => {
  const ring = [
    [0, 0],
    [4, 0],
    [4, 4],
    [0, 0],
  ]
  assert.equal((ringsPath([ring, ring]).match(/Z/g) ?? []).length, 2)
  assert.equal(
    (geometryPath({ type: 'MultiPolygon', coordinates: [[ring, ring], [ring]] }).match(/Z/g) ?? [])
      .length,
    3,
  )
  assert.match(geometryPath({ type: 'Point', coordinates: [2, 3] }), /-3/)
  assert.equal(
    geometryPath({
      type: 'LineString',
      coordinates: [
        [0, 0],
        [2, 3],
      ],
    }),
    'M0,0 L2,-3',
  )
})
test('source text is escaped and only licensed HTTPS hosts are linked', () => {
  const text = '<img src=x onerror=alert(1)>'
  const markup = renderToStaticMarkup(createElement(InertJson, { value: { malicious: text } }))
  assert.ok(markup.includes('&lt;img'))
  assert.ok(!markup.includes('<img'))
  for (const url of [
    'javascript:alert(1)',
    'file:///secret',
    'https://maps.victoria.ca@evil.test',
    'https://evil.test',
    'https://maps.victoria.ca/\nx',
  ])
    assert.equal(safeUrl(url), undefined)
  assert.ok(safeUrl('https://maps.victoria.ca/server'))
})
