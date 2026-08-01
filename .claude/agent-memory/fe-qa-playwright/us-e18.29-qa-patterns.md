---
name: us-e18.29-qa-patterns
description: invitations BE wiring QA — rare case where the engineer's follow-up fix pass was fully, honestly proven; the review-fix loop worked correctly for once
metadata:
  type: project
---

US-E18.29 (admin invitations list+resend real wiring): tech-lead's initial
Revision-Required (AC-8 forbidden mapping + 2 SHOULD-FIX: retry-gating,
requireRole-on-all-4-actions) plus a11y-auditor's 2 findings (search hint
role=status/aria-live; load-more-next-to-empty sr-only hint) were ALL
genuinely fixed in the follow-up commits, each with a real story/unit-test
proof — not just claimed:

- AC-8 (`ListError`'s `showRetry` prop): `ForbiddenListNoRetry` story asserts
  distinct copy AND `queryByRole("button",{name:"Thử lại"})` is null (DOM
  absence, not just visual hiding).
- A11Y-001/002: `SearchPartialResultsHint` and
  `EmptyWithMorePagesExplainsLoadMore`/`LoadMoreHasNoEmptyHintWhenRowsExist`
  stories assert the exact attributes (`role="status"`, `aria-live="polite"`,
  `aria-describedby` linkage) AND the negative case (hint absent when rows
  exist / describedby absent).
- Retry-gating (`shouldRetryList`): proven via a REAL call-counting mechanism
  (`globalThis.__listRetryCalls`/`__noRetryCalls` incremented inside the
  story's own `onRefresh` mock) in `RetryableListFailureIsRetriedAutomatically`
  / `NonRetryableListFailureIsNotRetried` — not just a unit test on the pure
  predicate (which also exists, `list-retry-policy.test.ts`).
- `requireRole` on all 4 Server Actions: `actions.test.ts` has one it() per
  action (refresh/send/resend/revoke) proving zero-repo-call short-circuit —
  genuinely covers all 4, not just the 2 this US touched.
- Unknown-status fallback change (pending→revoked): the OLD test asserting
  `fromWireStatus("weird") === "pending"` was correctly REWRITTEN (not left
  stale) to assert `"revoked"` in the same commit — no regression left behind.
  Same fix mirrored in sibling `iam-member.mapper.ts` for consistency.
- 429 rate-limited resend: story asserts toast copy (with/without
  Retry-After), NO refetch (call-count spy), row untouched, button re-enabled.
  `parseRetryAfter`/`retryAfterSecondsOf` edge cases (empty/whitespace/0/
  negative/case-insensitive header) unit-tested in `api-envelope.test.ts`.

Lesson: don't assume "reported fixed" needs re-doing from scratch — grep for
the specific story/test names first (they're usually named after the AC/defect
directly, e.g. `ForbiddenListNoRetry`, `ResendRateLimited`) before writing new
tests. This story needed ZERO new test files; verdict was a clean PASS with
443/3191 vitest + 151/1132 storybook-vitest all green, tsc clean.
