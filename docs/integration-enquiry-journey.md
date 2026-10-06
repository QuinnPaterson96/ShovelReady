# Enquiry and journey integration — 2026-10-05

Integrates PRs #201 (749193a), #202 (3c5fdd3), and #203 (46ee3e9) on main ae8d62a. Closes software integration #200 and implementation #196–198. Photo permission #199 remains open.

## Implemented

- One structured enquiry supplies semantic preview, plain-text copy, Markdown export and concise email drafts. Visitors can lead with their own question.
- Editable recipient, default email/Gmail draft links, explicit site-detail opt-in and visible long-link fallback. No message is sent by ShovelReady. The official contact page has no confirmed general-enquiry email, so recipient stays blank.
- Model, Property, Placement and Next steps navigation reflects journey progress. Manual property descriptions require confirmation; edits invalidate confirmation or readiness. Checks are workflow completion, not feasibility.
- Mounted Model 300 image slot with manufacturer source link and honest no-photo fallback. Rights research did not establish permission to reuse an actual photo.
- Integration connects progress callbacks, styles and imagery; question edits, recipient edits and privacy changes invalidate enquiry readiness.

## Verified

At the integration worktree: `npm --prefix frontend test` (91 passed), `npm --prefix frontend run build` (passed; existing bundle-size advisory), `git diff --check`.

Local stateless demo: `SHOVELREADY_ENV=demo python -m uv run --locked uvicorn app.main:app --host 127.0.0.1 --port 18142` after building frontend. Browser walkthrough verified saved-example measurement and four completion checks; question and placement edits clear readiness/results; manual confirmation completes Property and editing the description clears it; switching to own property resets progress; Home navigation preserves state; malformed recipient disables Gmail; email body excludes automatic site summary by default but retains the visitor's question. Narrow viewport 390×844 had no horizontal overflow. Keyboard activation of ready was checked. These are software observations, not human comprehension results.

## Remaining gaps and next actions

- #199: actual Model 300 photograph needs reuse permission and credit from the rights holder. Until supplied, show source link/fallback. No manufacturer contact was made.
- #197/#200: URL construction, encoding and long-body fallback tested, but actual Gmail/default-client draft handoff was not exercised. Markdown serialization passed; browser download capture timed out, so successful download delivery is unverified. Follow up with a real browser/mail-client smoke test without sending.
- #185: human comprehension, keyboard/screen-reader breadth and physical touch-device validation remain separate from agent walkthroughs.
- No changes to zoning interpretation, accepted publication, provider availability or site-fit claims. Existing source/coverage gaps remain.

## Deployed QA follow-up

The #205 worker verified the public release at application/frontend 68a727c: actual UTF-8 Markdown file delivery, custom multiline/Unicode question and source content, editable Gmail drafts with blank or synthetic recipient, automatic site-detail exclusion and explicit inclusion, complete clipboard text and the visible long-body placeholder fallback. No message was sent. See [#205](https://github.com/QuinnPaterson96/ShovelReady/issues/205) for the captured file evidence and exact procedure. This supersedes the earlier unverified download/Gmail checkpoint above.

Default OS mail-client handoff was blocked by the browser policy; configured/unconfigured mail-client and deliberately blocked-popup recovery still need a human smoke check. Keep #205 open. Photo permission #199, human usability #185 and accepted source/rule publication remain separate gaps.
