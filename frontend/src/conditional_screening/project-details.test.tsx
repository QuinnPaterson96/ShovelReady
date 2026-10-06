import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Confirmed } from '../site_discovery/flow'
import { ProjectDetails } from './ProjectDetails'
import { applyMappedZoning, changeProjectSetting, initialProjectSettings, withFloorAreaBasis } from './projectSettings'
import { parseZoningLookup, selectedParcelRef, zoningProjection, type ZoningLookup } from './victoriaZoning'

const ref = { source: 'city-of-victoria-pid-parcels' as const, object_id: 87 }
const selected = { parcel: { id: '87:0', raw: { candidate: { parcel_ref: ref, pid: '001-328-107' } } } } as Confirmed
const source = { provider: 'City of Victoria Open Data', record_label: 'City zoning polygons intersecting selected parcel',
  source_url: 'https://maps.victoria.ca/server/rest/services/OpenData/OpenData_PlanningAndDevelopment/MapServer/12/query',
  captured_at_utc: '2026-10-06T10:00:00Z', review_status: 'unreviewed_live_observation' as const,
  licence_url: 'https://opendata.victoria.ca/', attribution: 'City of Victoria', sha256: 'a'.repeat(64), source_date_limit: 'Feature date unknown.' }
const lookup: ZoningLookup = { schema_version: 'victoria-zoning.v1', status: 'single_covered_mapping', parcel_ref: ref,
  parcel_source_fields: {}, parcel_source_geometry: {}, parcel_area_m2: 500, covered_area_m2: 500, uncovered_area_m2: 0,
  coverage_tolerance_m2: .000001, horizontal_crs: 'EPSG:3157', zones: [{ object_id: 22,
    source_fields: { Zoning: 'GRD-1', ZoningBylaw: 'ZB2018', Title: 'Garden suite district', URL: null },
    source_geometry: {}, intersection_geometry: {}, intersection_area_m2: 500, parcel_coverage_fraction: 1,
    bylaw_name: 'Zoning Bylaw 2018 (No. 18-072)', bylaw_url: 'https://www.victoria.ca/', mapping_status: 'mapped' }],
  source_records: [source, source], issues: [], note: 'Unreviewed map observation.' }

test('exact selected PID parcel reference and complete mapping drive tentative settings', () => {
  assert.deepEqual(selectedParcelRef(selected), { parcel_ref: ref, expected_pid: '001-328-107' })
  const result = parseZoningLookup(lookup, ref)
  const mapped = zoningProjection(result, 'geometry-a')
  const settings = applyMappedZoning(initialProjectSettings(), mapped, 'geometry-a')
  assert.equal(settings.proposal.confirmed_zone, 'GRD-1')
  assert.equal(settings.proposal.confirmed_instrument, 'Zoning Bylaw 2018')
  assert.equal(settings.evidence.confirmed_zone.origin, 'municipal_lookup')
  assert.equal(settings.evidence.proposed_use.origin, 'journey_default')
  assert.equal(settings.evidence.foundation_attached.origin, 'journey_default')
  const html = renderToStaticMarkup(createElement(ProjectDetails, { settings, mapped, lookup: result, busy: false, error: '', onRetry: () => {}, onChange: () => {} }))
  assert.match(html, /City of Victoria Open Data/)
  assert.match(html, /Garden suite district/)
  assert.match(html, /unreviewed live observation/)
  assert.match(html, /100% of parcel/)
})

test('mixed, stale and malformed observations stay unresolved; manual choice stays separate', () => {
  assert.throws(() => parseZoningLookup(lookup, { ...ref, object_id: 88 }), /another parcel/)
  assert.throws(() => parseZoningLookup({ ...lookup, uncovered_area_m2: 2 }, ref), /inconsistent/)
  const split = parseZoningLookup({ ...lookup, status: 'split_zones', zones: [lookup.zones[0], { ...lookup.zones[0], object_id: 23 }] }, ref)
  const mapped = zoningProjection(split, 'geometry-a')
  assert.equal(applyMappedZoning(initialProjectSettings(), mapped, 'geometry-a').proposal.confirmed_zone, null)
  assert.equal(applyMappedZoning(initialProjectSettings(), zoningProjection(lookup, 'geometry-a'), 'geometry-b').proposal.confirmed_zone, null)
  const manual = changeProjectSetting(initialProjectSettings(), 'confirmed_zone', 'other')
  assert.equal(applyMappedZoning(manual, zoningProjection(lookup, 'geometry-a'), 'geometry-a').proposal.confirmed_zone, 'other')
  assert.equal(withFloorAreaBasis(manual, 'rough_floor_area_estimate').proposal.floor_area_definition_acknowledged, null)
  assert.equal(withFloorAreaBasis(manual, 'regulatory_floor_area').proposal.floor_area_definition_acknowledged, true)
})
