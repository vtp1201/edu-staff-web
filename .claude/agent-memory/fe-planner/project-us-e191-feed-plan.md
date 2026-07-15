---
name: project-us-e191-feed-plan
description: US-E19.1 Social Feed 7-phase plan — cross-story reuse of US-E19.2 moderation factories, mock-first pin/unpin seam, pin-copy resolution
metadata:
  type: project
---

US-E19.1 (Social Feed, `src/features/feed/`) plan written to
`docs/stories/epics/E19-social/US-E19.1-social-feed/plan.md` (Phase 0 domain →
Phase 6 pagination/a11y/i18n). Key structural decisions:

- Feed does NOT define its own submit-report/remove-content use-case, dialog,
  or moderation-failure union — it calls `makeSubmitReportUseCase()` /
  `makeRemoveContentUseCase()` from `src/bootstrap/di/moderation.di.ts`
  (US-E19.2) directly from its own thin `'use server'` actions
  (`reportContentAction`/`removeContentAction`). Also reuses
  `DestructiveConfirmDialog` (`src/components/shared/destructive-confirm-dialog/`)
  for the Remove confirm step (moderation-screen.tsx already uses this same
  component — confirmed via grep before planning).
- Feed's OWN domain is narrow: `FeedPostEntity`/`FeedCommentEntity`,
  `FeedFailure` union, `IFeedRepository`, use-cases for list/create/react/
  comment/toggle-pin-mock, plus two pure policy functions `can-post.ts` and
  `menu-visibility.ts` (kept domain-pure and unit-tested standalone so the
  UC-1905 role×author matrix isn't buried in JSX conditionals).
- Pin/unpin (INT-190-07) has no BE endpoint (US-101 in_progress) — mock-only,
  modeled as a repo method with zero HTTP call, verified in tests by asserting
  zero HTTP client invocations (not just "returns success").
- Endpoint file `feed.endpoint.ts` uses `/social/api/v1/...` prefix — same
  convention as `MODERATION_EP`, NOT integration.md's abbreviated
  `/api/v1/...` paths (integration.md predates this codebase convention).
- **Resolved (non-blocking) the AC-1909.3 pin-copy open question inline**
  rather than stalling the story: recommended vi string "Chỉ hiển thị tạm thời
  trên thiết bị này" / en "Only shown temporarily on this device" under
  `feed.pin.notPersisted`, flagged as a one-key edit if `ba-lead` later
  disagrees — Why: avoids blocking a 7-phase story on a microcopy round-trip
  when the packet already proposed this exact wording. How to apply: same
  pattern for future stories with an open microcopy question already
  carrying a recommended string in the packet — implement the recommendation,
  note it's swappable, don't block.
- Reuse ledger item flagged, not fixed: `ReportContentDialog` (US-E19.2)
  should be checked for `use-dialog-return-focus.ts` (US-E11.7 hook) usage;
  if missing, flag to `fe-lead`, do not patch a shared component from inside
  this story.

See also [project-us-e192-moderation-plan](project-us-e192-moderation-plan.md)
(the upstream story this one depends on).
