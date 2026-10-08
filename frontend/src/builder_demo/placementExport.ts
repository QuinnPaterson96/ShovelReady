import type { OccupiedMeasurement } from '../occupied_lots/OccupiedLots'
import { points } from '../occupied_lots/contract'
import type { SiteAssumptions } from '../zoning_site_assumptions/model'
import type { ScenarioResult } from '../conditional_screening/scenarios'
import { additionalObservation, boundaryObservations, placementConcerns } from './manufacturer'
import { measurementWithUnit } from '../measurements'
import { roadBands } from '../zoning_site_assumptions/roads'
import { readableDate } from '../ReadableProvenance'
import { enquiryMarkdown, withPlacementSketch, type EnquiryDocument } from './enquiry'

const escape = (value: string) => value.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]!))
export type PlacementDrawing = { svg: string; width: number; height: number; breaks: number[] }
export type DrawingAssets = { png: Uint8Array; pngUrl: string; pdf: Uint8Array }

/** Export the measured snapshot, never the interactive DOM or a stale placement. */
export function placementDrawing(measured: OccupiedMeasurement, assumptions: SiteAssumptions | null, scenarios: ScenarioResult | null, example: boolean, colours: Record<string, string>, useQualification: string | null = null): PlacementDrawing {
  const site = measured.site.site, placement = measured.result.input.placement
  const angle = placement.angle_degrees * Math.PI / 180
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => {
    const dx = x * placement.width_m / 2, dy = y * placement.depth_m / 2
    return [placement.centre_xy[0] + dx * Math.cos(angle) - dy * Math.sin(angle), placement.centre_xy[1] + dx * Math.sin(angle) + dy * Math.cos(angle)] as [number, number]
  })
  const all = [site.parcel, ...site.buildings, ...site.named_boundaries].flatMap(points).concat(corners)
  const minX = Math.min(...all.map(p => p[0])), maxX = Math.max(...all.map(p => p[0]))
  const minY = Math.min(...all.map(p => p[1])), maxY = Math.max(...all.map(p => p[1]))
  const factor = Math.min(790 / Math.max(maxX - minX, 1), 600 / Math.max(maxY - minY, 1))
  const x = (v: number) => 95 + (790 - (maxX - minX) * factor) / 2 + (v - minX) * factor
  const y = (v: number) => 170 + (600 - (maxY - minY) * factor) / 2 + (maxY - v) * factor
  const line = (coordinates: [number, number][]) => coordinates.map((p, i) => `${i ? 'L' : 'M'}${x(p[0])} ${y(p[1])}`).join(' ')
  const shape = (feature: typeof site.parcel) => {
    const { type, coordinates } = feature.shape.geometry
    const rings = type === 'LineString' ? [coordinates as [number, number][]] : type === 'Polygon' ? coordinates as [number, number][][] : (coordinates as [number, number][][][]).flat()
    return rings.map(ring => line(ring) + (type === 'LineString' ? '' : ' Z')).join(' ')
  }
  const text = (value: string, px: number, py: number, size = 17, bold = false) => `<text x="${px}" y="${py}" font-size="${size}"${bold ? ' font-weight="700"' : ''}>${escape(value)}</text>`
  const separation = scenarios?.additional_checks?.find(c => c.id === 'separation')
  const yardCheck = scenarios?.additional_checks?.find(c => c.id === 'rear_occupancy')
  const visual = yardCheck?.visual_evidence ?? separation?.visual_evidence
  const mainId = visual?.principal_building_id ?? assumptions?.principal_building_id.value
  const geometryPath = (geometry: { type: string; coordinates: unknown }) => shape({ ...site.parcel, shape: { ...site.parcel.shape, geometry: geometry as typeof site.parcel.shape.geometry } })
  const yardLayer = visual?.rear_yard ? `<path d="${geometryPath(visual.rear_yard)}" fill="#fff1c9" fill-rule="evenodd" stroke="#9b7300" stroke-width="2" stroke-dasharray="7 4"/>` : ''
  const outsideLayer = visual?.outside_rear_yard && (visual.outside_rear_yard_area_m2 ?? 0) > 0 ? `<path d="${geometryPath(visual.outside_rear_yard)}" fill="${escape(colours.danger)}" fill-opacity=".45" fill-rule="evenodd" stroke="${escape(colours.danger)}" stroke-width="3" stroke-dasharray="7 4"/>` : ''
  const gap = (ends: [[number, number], [number, number]], label: string, slot: number, conflict = false, extra = '') => {
    const colour = conflict ? colours.danger : colours.ink
    const a = ends[0], b = ends[1], px = (x(a[0]) + x(b[0])) / 2, py = (y(a[1]) + y(b[1])) / 2
    const tx = slot < 0 ? 65 : 705, ty = slot < 0 ? 470 : 355 + slot * 75
    return `<path d="${line(ends)}" stroke="${escape(colour)}" stroke-width="3"${conflict ? ' stroke-dasharray="6 3"' : ''}/>${ends.map(p => `<circle cx="${x(p[0])}" cy="${y(p[1])}" r="3" fill="${escape(colour)}"/>`).join('')}<path d="M${px} ${py} L${slot < 0 ? tx + 190 : tx - 10} ${ty}" fill="none" stroke="${escape(colour)}" stroke-width="1"/><text x="${tx}" y="${ty}" font-size="14" font-weight="700" paint-order="stroke" stroke="white" stroke-width="4" fill="${escape(colour)}">${escape(label)}</text>${extra ? text(extra, tx, ty + 23, 14) : ''}`
  }
  const gaps = Object.entries(scenarios?.edge_measurement_lines ?? {}).map(([id, ends], i) => gap(ends, `Edge ${(assumptions?.edges.findIndex(e => e.id === id) ?? -1) + 1}: ${measurementWithUnit(scenarios!.edge_distances_m[id], 'length')} mapped gap`, i)).join('') +
    (visual && separation?.observed !== null && separation?.observed !== undefined ? gap(visual.measurement_line, `${measurementWithUnit(separation.observed, 'length')} main-home gap`, -1, separation.status === 'conflict', `Candidate minimum: ${measurementWithUnit(separation.threshold, 'length')}${separation.status === 'conflict' ? ' (concern)' : ''}`) : '')
  const yardLabel = visual?.rear_yard_area_m2 ? text(`Estimated rear yard: ${measurementWithUnit(visual.rear_yard_area_m2, 'area')}${yardCheck?.observed !== null && yardCheck?.observed !== undefined ? ` / unit share ${Number((yardCheck.observed * 100).toFixed(1))}%` : ''}`, 60, 810, 15, true) : ''
  const details = [
    `Site: ${example ? 'Saved example only, not the sender’s property' : measured.site.label}.`,
    ...(useQualification ? [useQualification] : []),
    `${measurementWithUnit(placement.width_m, 'length')} × ${measurementWithUnit(placement.depth_m, 'length')} proposed rectangle; rotation ${Number(placement.angle_degrees.toFixed(2))}°. Dimensions ${measured.widthOrigin === 'user' || measured.depthOrigin === 'user' ? 'edited by the user; model availability unconfirmed' : 'from published nominal dimensions, unreviewed'}.`,
    'Footprint excludes unconfirmed projections and installation space. Purple outlines may be roofs, not walls.',
    ...boundaryObservations(scenarios, assumptions),
    ...[...new Set(measured.result.checks.filter(c => ['nearest_building_distance', 'building_distance'].includes(c.kind) && c.distance_m !== null).map(c => `Approximate gap to ${c.source_feature_ids.map(id => `Building ${site.buildings.findIndex(b => b.id === id) + 1}`).join(', ') || 'unidentified building'}: ${measurementWithUnit(c.distance_m, 'length')}. Roofline-based unless recorded otherwise.`))],
    ...placementConcerns(measured, null, scenarios),
    ...(scenarios?.additional_checks ?? []).filter(check => check.status !== 'conflict').map(additionalObservation),
    `Parcel source: ${site.parcel.source.provider} · ${site.parcel.source.record_label} · captured ${readableDate(site.parcel.source.capture_date)} · ${site.parcel.source.review_status}.`,
    ...[...new Set(site.buildings.map(b => `Building source: ${b.source.provider} · ${b.source.record_label} · captured ${readableDate(b.source.capture_date)} · ${b.source.review_status}.`))],
    ...(scenarios?.sources ?? []).map(source => `Candidate comparison source: ${source.provider} · ${source.record_label} · ${source.locator} · captured ${readableDate(source.capture_date)} · ${source.review_status}. ${source.url}`),
    `Coordinates: ${site.projected_metre_crs}. Boundary roles, street/waterfront marks and buffers are user assumptions.`,
    ...(visual?.principal_crosses_parcel ? ['The mapped main roofline extends beyond the parcel; neither outline is surveyed. The full roofline is retained for the approximate comparisons.'] : []),
    'Main home identification is unverified. Entrance, obstructions, delivery/crane access and utility routes are not established.',
    ...new Set([...site.capture.limitations, ...measured.result.limitations]),
  ]
  const rows = details.flatMap(value => {
    const words = value.split(/\s+/).flatMap(word => word.match(/.{1,100}/gu) ?? []), lines: string[] = []; let current = ''
    for (const word of words) { if ((current + word).length > 100 && current) { lines.push(current); current = '' }; current += `${current ? ' ' : ''}${word}` }
    if (current) lines.push(current)
    return [...lines, '']
  })
  const height = 930 + rows.length * 24
  const conflicting = new Set(measured.result.checks.filter(c => ['positive_area_overlap', 'outside', 'touches'].includes(c.relation ?? '')).flatMap(c => c.source_feature_ids))
  const featurePath = (feature: typeof site.parcel, fill: string, stroke: string) => `<path d="${shape(feature)}" fill="${escape(fill)}" fill-rule="evenodd" stroke="${escape(conflicting.has(feature.id) ? colours.danger : stroke)}" stroke-width="2"${conflicting.has(feature.id) ? ' stroke-dasharray="8 5"' : ''}/>`
  const edges = (assumptions?.edges ?? []).map((edge, i) => {
    const street = assumptions?.street_adjacency?.edge_ids.includes(edge.id), water = assumptions?.waterfront_edge_ids?.includes(edge.id)
    const role = edge.role.value !== 'unknown' && edge.role.value ? edge.role.value : assumptions?.street_adjacency && !assumptions.street_adjacency.all_marked ? 'unclassified' : assumptions?.boundary_role_suggestions?.roles[edge.id] ?? 'unclassified'
    const px = (x(edge.start[0]) + x(edge.end[0])) / 2, py = (y(edge.start[1]) + y(edge.end[1])) / 2
    const road = roadBands(assumptions?.edges ?? [], street ? [edge.id] : [])[0]
    return `${road ? `<path d="${line(road.corners)} Z" fill="#bec9cb" stroke="#81979b"/>` : ''}${water ? `<path d="${line([edge.start, edge.end])}" stroke="${escape(colours.parcelStroke)}" stroke-width="7" fill="none" opacity=".8"/>` : ''}<text x="${px}" y="${py - 10}" font-size="15" text-anchor="middle" paint-order="stroke" stroke="white" stroke-width="4" fill="${escape(colours.ink)}">${escape(`${i + 1} · ${role.replace('flanking_street', 'street-side')}${role === 'unclassified' ? '' : ' (assumed)'}${street ? ' · street mark' : ''}${water ? ' · waterfront mark' : ''}`)}</text>`
  }).join('')
  const scaleM = (maxX - minX) < 50 ? 5 : 10
  return { width: 1000, height, breaks: [880, ...rows.flatMap((row, i) => row === '' ? [946 + i * 24] : [])], svg: `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="${height}" viewBox="0 0 1000 ${height}"><rect width="100%" height="100%" fill="white"/><g font-family="Segoe UI, Arial, sans-serif" fill="${escape(colours.ink)}">${text('Approximate proposed placement', 40, 45, 28, true)}${text('Not a survey or approved site plan · preliminary discussion only', 40, 76)}${text(example ? 'SAVED EXAMPLE ONLY — not the sender’s property' : measured.site.label.slice(0, 85), 40, 106, 18, true)}<rect x="40" y="130" width="920" height="690" fill="#f0f5f4" stroke="${escape(colours.parcelStroke)}"/>${featurePath(site.parcel, colours.parcelFill, colours.parcelStroke)}${yardLayer}${site.buildings.map((b, i) => {
    const coords = points(b), bx = Math.min(...coords.map(p => p[0])), by = Math.max(...coords.map(p => p[1]))
    return featurePath(b, colours.roofFill, colours.roofStroke) + text(b.id === mainId ? `Building ${i + 1} · main home (unverified)` : `Building ${i + 1} · ${b.basis}`, x(bx), y(by) - 8, 15, true)
  }).join('')}${site.named_boundaries.map(b => featurePath(b, 'none', colours.zoneStroke)).join('')}${edges}<path d="${line(corners)} Z" fill="${escape(colours.zoneFill)}" stroke="${escape(colours.zoneStroke)}" stroke-width="3"/>${outsideLayer}${gaps}${yardLabel}${text('Proposed Model 300', x(placement.centre_xy[0]) + 15, y(placement.centre_xy[1]), 16, true)}${text(site.projected_metre_crs === 'LOCAL:METRE' ? 'Local sketch · north unknown' : 'Grid north ↑', 60, 160, 15)}<path d="M60 790 h${scaleM * factor} M60 782 v16 M${60 + scaleM * factor} 782 v16" stroke="${escape(colours.ink)}"/>${text(`${scaleM} m · indicative scale`, 60, 775, 14)}${text('Teal: parcel / Purple: buildings / Copper: unit / Yellow dashed: estimated rear yard', 40, 850, 16)}${text('Red: comparison concern / outside yard · Grey: street marks, not road widths. All gaps approximate.', 40, 875, 16)}${text('Measurements, assumptions & sources', 40, 912, 21, true)}${rows.map((row, i) => text(row, 40, 946 + i * 24, 16)).join('')}</g></svg>` }
}

export async function renderDrawing(drawing: PlacementDrawing): Promise<DrawingAssets> {
  const url = URL.createObjectURL(new Blob([drawing.svg], { type: 'image/svg+xml' }))
  try {
    const image = new Image()
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Drawing export timed out. Please try again.')), 15000)
      image.onload = () => { clearTimeout(timeout); resolve() }; image.onerror = () => { clearTimeout(timeout); reject(new Error('Could not render placement drawing.')) }; image.src = url
    })
    const canvas = document.createElement('canvas'); canvas.width = drawing.width * 2; canvas.height = drawing.height * 2
    const context = canvas.getContext('2d'); if (!context) throw new Error('Drawing export is unavailable in this browser.')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const pngUrl = canvas.toDataURL('image/png'), png = Uint8Array.from(atob(pngUrl.split(',')[1]), c => c.charCodeAt(0))
    const { jsPDF } = await import('jspdf')
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
    // Page one contains the whole map; supporting rows continue at readable size.
    const pageHeightPx = 1338, page = document.createElement('canvas'); page.width = canvas.width; page.height = pageHeightPx * 2
    const pageContext = page.getContext('2d')!
    for (let offset = 0, index = 0; offset < canvas.height; index++) {
      if (index) pdf.addPage()
      const limit = Math.min(canvas.height, offset + page.height)
      const lastBreak = [...drawing.breaks].reverse().find(value => value * 2 > offset && value * 2 <= limit)
      const end = index === 0 ? 1760 : limit === canvas.height || lastBreak === undefined ? limit : lastBreak * 2
      pageContext.fillStyle = 'white'; pageContext.fillRect(0, 0, page.width, page.height)
      pageContext.drawImage(canvas, 0, offset, canvas.width, end - offset, 0, 0, canvas.width, end - offset)
      pdf.addImage(page.toDataURL('image/png'), 'PNG', 7, 7, 196, pageHeightPx * .196)
      pdf.setFontSize(9); pdf.text(`Approximate proposed placement - not a survey or approved site plan | Page ${index + 1}`, 15, 289)
      if (!index) pdf.text('Measurements, assumptions and sources follow on the next page.', 15, 195)
      offset = end
    }
    return { png, pngUrl, pdf: new Uint8Array(pdf.output('arraybuffer')) }
  } finally { URL.revokeObjectURL(url) }
}

export function downloadFile(name: string, bytes: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([bytes], { type })), anchor = document.createElement('a')
  anchor.href = url; anchor.download = name; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const base64 = (bytes: Uint8Array) => {
  let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).match(/.{1,76}/g)!.join('\r\n')
}
export function attachedEmail(recipient: string, subject: string, body: string, png?: Uint8Array): string {
  if (/[\r\n]/.test(recipient)) throw new Error('Invalid recipient')
  const boundary = `shovelready-${crypto.randomUUID()}`
  const chunks: string[] = []; let chunk = ''
  for (const character of subject.replace(/[\r\n]/g, ' ')) {
    if (new TextEncoder().encode(chunk + character).length > 42) { chunks.push(chunk); chunk = '' }
    chunk += character
  }
  if (chunk) chunks.push(chunk)
  const encodedSubject = chunks.map(value => `=?UTF-8?B?${btoa(String.fromCharCode(...new TextEncoder().encode(value)))}?=`).join('\r\n ')
  return [`X-Unsent: 1`, ...(recipient.trim() ? [`To: ${recipient.trim()}`] : []), `Subject: ${encodedSubject}`, 'MIME-Version: 1.0', `Content-Type: multipart/mixed; boundary="${boundary}"`, '', `--${boundary}`, 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', base64(new TextEncoder().encode(body)), ...(png ? [`--${boundary}`, 'Content-Type: image/png; name="model-300-placement.png"', 'Content-Disposition: attachment; filename="model-300-placement.png"', 'Content-Transfer-Encoding: base64', '', base64(png)] : []), `--${boundary}--`, ''].join('\r\n')
}

/** Recipient message, sender prompts and raw evidence remain separate files. */
export function enquiryPackageFiles(document: EnquiryDocument, report: EnquiryDocument | null, preparation: string[], evidence: unknown, assets: DrawingAssets | null): Record<string, Uint8Array> {
  const encode = (value: string) => new TextEncoder().encode(value)
  const files: Record<string, Uint8Array> = {
    'model-300-enquiry.md': encode(enquiryMarkdown(withPlacementSketch(document, assets ? 'An approximate proposed placement sketch is included below; it is not a survey or approved site plan.' : null)) + (assets ? '\n## Approximate proposed placement\n\n![Approximate proposed placement](model-300-placement.png)\n' : '')),
    'your-preparation-checklist.txt': encode(preparation.join('\n\n')),
    'model-300-supporting-report.md': encode((report ? enquiryMarkdown(report) : '# Supporting evidence\n\nNo supporting screening report was available when this package was prepared. Planning feasibility remains unconfirmed.\n') + '\nFull technical evidence: [model-300-technical-evidence.json](model-300-technical-evidence.json).\n' + (assets ? '\nApproximate drawing: [PNG](model-300-placement.png) · [PDF](model-300-placement.pdf). These are not surveys or approved site plans.\n' : '\nNo current placement drawing is included.\n')),
    'model-300-technical-evidence.json': encode(JSON.stringify(evidence, null, 2)),
  }
  files['README.txt'] = encode('Start with model-300-enquiry.md for the unsent provider message.\nReview your-preparation-checklist.txt for the sender’s next actions.\nRead model-300-supporting-report.md for the detailed findings and evidence links.\nComplete source identifiers, exact values and inputs are in model-300-technical-evidence.json.\n' + (assets ? 'The placement PNG and PDF are approximate discussion drawings. Keep the PNG beside the Markdown enquiry so its image link works.\n' : 'No placement drawing is included; prepare or recheck a placement before sharing one.\n') + 'Nothing in this package has been sent. Review the message, sources and any drawing before sharing.\n')
  if (assets) { files['model-300-placement.png'] = assets.png; files['model-300-placement.pdf'] = assets.pdf }
  return files
}
