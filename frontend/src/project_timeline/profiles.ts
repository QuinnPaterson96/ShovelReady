/** Timing coverage is independent of parcel, zoning and rent coverage. */
export type TimingProfile = {
  id: string; jurisdictionId: string; provider: string; label: string; url: string
  capturedAt: string; sourceDate: string | null; reviewStatus: 'unreviewed'
  milestone: 'review_target' | 'initial_response'; businessDays: number; scope: string
}

export const timingProfiles: TimingProfile[] = [
  {
    id: 'victoria-residential-review.2026-11-09', jurisdictionId: 'ca-bc-victoria',
    provider: 'City of Victoria', label: 'Single family / duplex building permit review',
    url: 'https://tender.victoria.ca/WebApps/eApply/Prospero/Dashboard/Template/Welcome.aspx?TemplateName=SFD%2FDUPLEX+BUILDING+PERMIT',
    capturedAt: '2026-11-09', sourceDate: null, reviewStatus: 'unreviewed', milestone: 'review_target', businessDays: 20,
    scope: 'Most single-family / duplex submissions have a 20-business-day review target; some smaller scopes have 7. The clock starts when a complete application is accepted. This is a residential planning proxy, not a garden-suite issuance commitment.',
  },
  {
    id: 'saanich-residential-response.2026-11-09', jurisdictionId: 'ca-bc-saanich',
    provider: 'District of Saanich', label: 'Residential building permit initial response',
    url: 'https://www.saanich.ca/EN/main/local-government/inspections-services.html',
    capturedAt: '2026-11-09', sourceDate: null, reviewStatus: 'unreviewed', milestone: 'initial_response', businessDays: 12,
    scope: 'Target for a complete residential application, including garden suites. The response may request more information or include departmental comments. It is not permit issuance.',
  },
]
