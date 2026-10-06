# Email draft handoff and recovery

Issue [#211](https://github.com/QuinnPaterson96/ShovelReady/issues/211) follows the client handoff checks in [#205](https://github.com/QuinnPaterson96/ShovelReady/issues/205).

## Implemented

The Model 300 enquiry shows an editable recipient, subject and exact email body before a visitor requests a draft in the default email app or Gmail. The recipient remains blank by default. Automatic property and placement details remain excluded unless the visitor opts in; the visitor's own question is always included and needs review. Invalid recipient input disables the launch buttons. An overlong URL requests only a labelled short placeholder draft, while the complete body remains visible and copyable.

After a launch request, the page says **requested**, not **opened** or **sent**. Neither assigning a `mailto:` URL nor calling `window.open` confirms that an email client displayed a compose window. In particular, a null return from `window.open` with `noopener,noreferrer` is not reliable evidence that a popup was blocked, so opener isolation remains in place. A browser exception produces a separate request-failed message. The page always offers **Copy email body** beside the launch buttons and tells the visitor to paste the exact preview into a new message if no compose window appears. The Markdown download remains available as a fuller, separately labelled enquiry export; it may contain site details even when the email body's automatic site summary is excluded. The app does not send a message or create a contact record.

Changing the email body, subject, recipient or site-detail choice clears the prior handoff message. Existing draft readiness invalidation still applies to edited inputs.

## Verification boundary

Source review can establish the visible copy, validation, URL length fallback, status language and lack of a send operation. Frontend checks exercise URL encoding and privacy serialization. A browser/client smoke check is still required to establish what actually opens in a particular environment. The [#205 public-release QA record](https://github.com/QuinnPaterson96/ShovelReady/issues/205) observed Gmail compose, clipboard copy and Markdown delivery on application/frontend commit `68a727cf19c55f834b875940a29d2d534360cdab`; it does not verify this change or a default mail client.

For #211's local worktree, `npm test` passed 91 frontend tests, `npm run typecheck` passed, and `npm run build` completed. Source inspection confirmed that both launch paths use requested language, the copy fallback stays visible, and the Gmail call retains `noopener,noreferrer` without interpreting its return value. The Codex in-app browser refused the local Vite URL with `net::ERR_BLOCKED_BY_CLIENT` before the page rendered; this is an environment limit, not an observed product failure. No email app was opened or message sent in this check.

Keep #205 open until a human tests a configured default mail client, an unconfigured client and a blocked-popup browser in a normal environment. Use synthetic recipient and question content, inspect the unsent draft and recovery text, and record browser/client versions and deployed commit. Do not send. If the browser prevents a handoff, record that limit rather than bypassing policy.
