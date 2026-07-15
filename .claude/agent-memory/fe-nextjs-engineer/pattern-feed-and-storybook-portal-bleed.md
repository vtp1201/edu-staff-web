---
name: pattern-feed-and-storybook-portal-bleed
description: E19.1 social feed — cross-story shared-dialog reuse, optional-field ADR widening, LoadMoreButton promotion, and the Storybook portal pointer-events bleed fix
metadata:
  type: project
---

US-E19.1 Social Feed (`src/features/feed/`) — full net-new feature consuming
US-E19.2's shared pieces. Durable takeaways:

**Storybook portal-bleed fix (important, reusable).** In the browser-mode
Storybook vitest runner, Radix `DropdownMenu`/`Dialog` set
`document.body.style.pointerEvents = "none"` while open. A story whose `play`
fn leaves a menu/dialog OPEN at the end bleeds that lock into the NEXT story in
the shared page → later `userEvent.click` fails with "element has
`pointer-events: none`". Fix in the decorator: `document.body.style.pointerEvents = ""`
before rendering each Story. Also set `retryDelay: 0` in the QueryClient
decorator or a retryable-error story's `findByRole("alert")` times out during
exponential backoff. Assert portal content (menu items, dialogs) via
`within(document.body)`, not the canvas.

**Cross-story shared-dialog reuse (no second impl).** Feed's own thin
`'use server'` `reportContentAction`/`removeContentAction` call
`makeSubmitReportUseCase()`/`makeRemoveContentUseCase()` from
`bootstrap/di/moderation.di.ts` directly; the screen imports
`ReportContentDialog`/`DestructiveConfirmDialog` from `components/shared/` and
mounts ONE instance each at container root (capture target at open time). AC
asserts invocation/props only — never re-test the dialog internals.

**Optional-field ADR widening (ADR 0052).** To let a 2nd caller reuse an
already-shipped repo method, widen the input field to optional in the
`i-*.repository.ts`, make the real repo omit it from the request body when
absent, make the mock short-circuit ok WITHOUT its lookup branch when absent,
and add a test for the absent path. Only touch that one method.

**LoadMoreButton canonical home** = `components/shared/load-more-button/`
(promoted from moderation on 2nd caller). Labels are PROPS (`label`,
`errorLabel`) so any i18n namespace drives it. NOTE: `audit-log` still has its
own richer divergent copy — left untouched (different prop shape).

**Feed conventions:** repo returns `FeedResult<T>` (Result, not throw) matching
moderation; `feedKeys.list(selection)` keyed by scope discriminator; pin toggle
is `setQueryData` flip + fire-and-forget action (INT-190-07 HTTP-free in BOTH
mock and real repo); reaction 404 → drop post from cache silently; create-post
composer preserves content on error via a host `resetSignal` (clears only on
success). Active scope kept as local state (not URL) to stay Storybook-testable.
Relative time via `Intl.RelativeTimeFormat(locale)` (not an i18n key).
