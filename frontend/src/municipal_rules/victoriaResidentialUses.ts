import { supportedGardenSuiteZone } from '../conditional_screening/projectSettings'
import type { ZoningLookup } from '../conditional_screening/victoriaZoning'

// Zone-level permitted uses only. Part 2 defines residential broadly; Part 4.1
// expressly regulates both fewer than three and three or more dwelling units.
const residentialUses = {
  labels: ['Detached home', 'Plex', 'Apartment', 'Garden suite'],
  source: {
    provider: 'City of Victoria',
    title: 'Zoning Bylaw 2018 (No. 18-072)',
    locator: 'Parts 2.1, 3.1(28) and 4.1(1)(h), (1.1) and (2)',
    url: 'https://www.victoria.ca/media/file/zoning-bylaw-2018',
    captured: '2026-11-19',
    printedRevision: 'Amendment list through No. 26-072, October 1, 2026',
    sha256: 'da2e5566d2e60e5b657ac1f97b6b894cf4e6166016012c35da13a040c8889a79',
    review: 'Preliminary interpretation, unreviewed',
  },
}

export function victoriaResidentialUses(lookup?: ZoningLookup | null) {
  if (lookup?.status !== 'single_covered_mapping') return null
  const [zone] = lookup.zones
  if (zone?.bylaw_name !== residentialUses.source.title || zone.source_fields.ZoningBylaw !== 'ZB2018'
    || !supportedGardenSuiteZone(zone.source_fields.Zoning)) return null
  return residentialUses
}
