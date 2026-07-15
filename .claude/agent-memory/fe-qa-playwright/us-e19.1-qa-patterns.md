---
name: us-e19.1-qa-patterns
description: Social feed (US-E19.1) QA gate — Server Action test gap pattern, sonner Toaster not mounted in Storybook, pin non-persistence proof recipe, ReportContentDialog contentId-via-closure design
metadata:
  type: project
---

Findings from the US-E19.1 (social feed) final QA gate, all as NEW tests (no production
code changed) — 41 Storybook interaction stories (was 20) + 11 new `actions.test.ts` unit
tests, 105 unit/integration total, all green; `tsc`/`bun lint`/`bun build` clean.

- **`app/.../feed/actions.ts` had ZERO test coverage** despite being the exact seam where
  feed delegates into the SHARED US-E19.2 moderation use-cases (`reportContentAction` →
  `makeSubmitReportUseCase`, `removeContentAction` → `makeRemoveContentUseCase`, ADR-0052
  no-`reportId`). Cross-story delegation seams are a recurring high-risk, low-coverage spot
  — check `app/.../actions.ts` files specifically, not just `features/*/domain` unit tests.
  Replicate the `principal/teachers/actions.test.ts` `vi.mock("@/bootstrap/di/...")` +
  factory-returns-`{execute}` pattern.

- **`sonner`'s `<Toaster/>` is only mounted by `src/app/layout.tsx`**, not by any Storybook
  decorator — asserting toast text via `within(document.body).getByText(...)` in a story
  will hang/fail even on a correct implementation. Assert the action-call + optimistic DOM
  state instead, and note in a comment that the toast call itself is only provable by
  reading `feed-screen.tsx`'s `toast.success(...)` line (or delegate to a shared-component
  story if the toast trigger is itself reusable).

- **Pin non-persistence (AC-1909.x "mock-first, doesn't survive reload") proof recipe**:
  Storybook `play()` has no real page-reload primitive. Expose the decorator's
  `QueryClient` on `window.__feedQueryClient` (test-only escape hatch, comment it as such)
  and call `invalidateQueries({queryKey: feedKeys.list(selection)})` mid-`play()` — this is
  functionally equivalent to a fresh fetch on the same query key and correctly reverts an
  optimistic-only mutation while proving the ORIGINAL toggle itself made zero network calls
  (assert `fetchFeedPageAction` was NOT called before the invalidate, but WAS called after).

- **`ReportContentDialog` (shared, owned by US-E19.2) does NOT take `contentId` as a
  prop** — it's captured via closure by the caller's `onSubmit`. The feed's own AC-1906.3
  text says "receiving `{kind, contentId, authorName, contentPreview}` as props", which is
  a slightly stale description vs. the actual (deliberate, documented) shared-component
  design. Not a defect — prove `contentId` correctness by submitting the dialog and
  asserting the resulting `reportContentAction` call args, not by inspecting dialog props.

- Sort-order gotcha when testing pin/remove flows against the shared `SCHOOL_POSTS` fixture:
  `p-pinned` (older but pinned) is ALWAYS `articles[0]`, not `p-plain` — index-based
  `articles[0]` assumptions break when adding a new story reusing that fixture; find the
  target article by its text content instead (existing `PinTogglesNoNetwork` pattern).

- Gaps closed this pass beyond the two Server Action tests: AC-1905.1/.2 (teacher own-class
  menu matrix), AC-1901.7 (scope-tab keyboard nav), AC-1903.2/.3 (reaction replace/remove),
  AC-1903.5 (concurrent-removal drop), AC-1902.3/.4/.5/.6/.7 (composer full lifecycle),
  AC-1904.1(gap noted, not closed)/.4/.5/.6/.7 (comment thread lifecycle), AC-1909.2/.4
  (unpin + non-persistence), AC-1910.2/.3 (remove confirm-to-completion + ADR-0052 no-
  reportId at the UI layer), AC-1906.3/.4 (comment-path report + stays-visible).
  Remaining MINOR gaps (documented, not blocking): AC-1904.1 comment-loading skeleton has
  no dedicated story; AC-1908.2's "transition from load-more button to end marker" isn't
  separately asserted (only the two boundary states are); AC-1909.3's non-blocking caption
  text isn't explicitly queried in any story (component always renders it unconditionally
  while pinned, so risk is low).
