# Railway observational demo

The owner selected Railway on October 2, 2026, reusing the personal workspace with
a separate ShovelReady project. The domain is shovelready.ca, registered at GoDaddy.
This supersedes the older requirement to wait for accepted zoning publication before
hosting an observational demo. It does not complete the persistent pilot in SR-14 or
the immutable-image delivery/restore criteria in SR-15.

## Deployment

- Deploy the repository Dockerfile from trusted main; enable Railway's Wait for CI.
- The container serves the frontend and API on port 8000. Set PORT=8000 and domain
  target port to 8000. Configure health path /health, timeout 120 seconds and restart
  policy On Failure with 3 retries in the Railway service settings.
- Railway's dashboard says new services cannot opt into railway.json Config as Code
  after August 28, 2026. Use the documented dashboard settings for this single service;
  do not introduce the larger Infrastructure as Code workflow just for this demo.
- The image defaults to SHOVELREADY_ENV=demo. Startup requires a built frontend and
  refuses SHOVELREADY_DATABASE_URL or enabled draft database evaluations. No database,
  migration, volume, source publication, contact storage or automatic ingestion runs.
- Railway's RAILWAY_GIT_COMMIT_SHA provides the application/frontend identity when
  explicit ShovelReady commit variables are absent. The same Docker build produces both.
- The BC geocoder and Victoria APIs are queried on demand. Provider failure remains
  visible and manual entry remains available. Do not include secrets in frontend builds.
- /health is process liveness, not a promise of upstream availability or zoning accuracy.
  Check /, a generated /assets/ URL, /api/identity and the live/manual builder journey.

Railway rebuilds a commit after CI; this is not deployment of the exact image digest
built by GitHub Actions. Keep SR-15 open for image promotion, a practiced rollback,
and any future database/data-release compatibility checks. Keep PR environments off.

## Domain and operations

Add the custom domains in Railway, then copy its exact DNS target and verification
records to GoDaddy. Inspect existing records before editing. Preserve mail, NS, TXT
and other unrelated records. Verify DNS and HTTPS for both apex and www independently.
Do not guess a destination IP or switch nameservers merely to connect hosting.

Use Railway deployment/build logs and metrics for failures; avoid logging submitted
addresses or request bodies. Roll back to a known-good retained deployment, then
verify health, assets and commit identity. This stateless demo has no customer data
to restore; adding persistence requires backups and an isolated restore exercise.

Resource usage adds to the existing workspace bill. Review incremental CPU, memory
and egress after a week; low traffic does not eliminate idle memory charges. Avoid
changing workspace-wide limits that could stop Spontaniius. No new plan upgrade or
paid database is required for this deployment.

## Verification status

Implementation: explicit demo startup and commit identity; Railway settings runbook.
Local startup/API integration checks cover frontend serving, refusal of incomplete
or persistent demo configuration, and Railway identity. Hosting/DNS/HTTPS verification
must be recorded after remote deployment; configuration files alone do not prove it.

Remaining: accepted zoning publication, independently reviewed inputs, durable saved
assessments, human builder validation and production operating controls. This is a
public observational demonstration, not a complete professional assessment service.

## Browser-tab recovery (October 7, 2026)

Preparing an enquiry now retains its text, supporting report and complete historical
technical evidence in versioned `sessionStorage`. On refresh, reopen Model 300 and
use Recover your previous enquiry. Old findings are displayed as a historical
snapshot; no geometry, answers, acknowledgements or review ticks are restored as
current. Storage denial/corruption must not block the journey. Storage is limited
to 2,000,000 characters; a failed save directs the user to copy/download. A clear
control removes the stored copy, and future prepared edits can create another.

This is a bounded text-recovery improvement, not durable saved assessments or full
editable-journey recovery. Closing the tab, browser storage policy or data clearing
may remove it. SR-14 still needs a complete typed input checkpoint, source/revision
compatibility checks, fresh evaluation on restore, and the hosted backup/isolated
restore evidence for any persistent pilot. SR-15 remains open as described above.
