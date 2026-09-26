# Bounded homeowner preparation walkthrough

This is a session kit for a moderated walkthrough with an actual or likely user, not a completed study or a zoning assessment. It supports planning for [SR-16](../../backlog/SR-16.md); recruitment, outreach, customer-pilot measurement and source review remain separate work. Use the [participant brief](participant-brief.md), [facilitator script](facilitator-script.md), [blank recording sheet](recording-sheet.md) and [withheld rubric](adjudication-rubric.md). Do not send the rubric to a participant.

## Frozen baseline

| Item | Identity / limit |
|---|---|
| Application and frontend | `34d95c322cfa2139ba758f12bfc8508986dcf9e4` |
| Spatial observations | `spatial:sha256:db45fb736cd0fe2455d65b64105b038539bc7695e62666be6b2840474af8aee7` |
| Address packet | `address:sha256:4830a1985952b3150bf01bc276575a08238c5bbb71bf4fc489675231be534e5f` |
| Search scope | Five captured address rows / three parcel leads; exact match, not citywide |
| Case | aux box Model 300 at 1170 MAY ST, City of Victoria; no survey, approved placement or independently measured height |

The application prepares an unreviewed provider-discussion record. It runs no site/model checks and has no accepted zoning release or real-site fit result. Provider catalogue values and retained GIS observations are source leads; manual notes are user supplied. The provisional Victoria clauses are not evaluated against this case. Keep missing values unknown. The participant should use the live browser only, with no synthetic example import, upload, external message or provider contact.

Use one fresh sheet per person and build. Record a later improved-build retest separately, with its own identities and prior-exposure note. Never combine baseline and retest task times or success counts. A virtual participant report, if received, belongs in an attributed **agent rehearsal** record, not a human sheet. Agent wall time is not a human completion-time measure. Preserve its original observations and any later adjudication as separate entries; do not infer human behavior or general accuracy from it.

For a local session, the facilitator supplies a running URL after checking the visible build and selected data identities. The existing demo setup is described in [wave-eleven integration](../../integration-wave-eleven.md) and [local development](../../local-development.md). Do not use the coordinator's existing port 18098 as a setup target or alter its checkout. If the pinned application/data cannot be served, record the session as blocked rather than substituting another build.
