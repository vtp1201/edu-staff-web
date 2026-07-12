# US-E19.1 — Social Feed — Use Cases & Acceptance Criteria

Source: `requirements.md` (TR-190), `integration.md` (INT-190-01…07). This
document models FR-001–FR-011 as testable use cases. It does **not** redefine
the shared Report dialog's own contract (reason list, quote preview, submit
semantics, i18n) — that AC lives exclusively in
`docs/stories/epics/E19-social/US-E19.2-content-moderation/use-cases.md`
(UC-1921/UC-1922). This story only asserts that its "…" menu **Report** entry
point invokes that shared contract (see UC-1906 / AC-1906.3).

## 1. Use Case Scope Summary

- **Total use cases:** 10 (UC-1901…UC-1910).
- **Actors:** teacher, principal, student, parent (all authenticated,
  tenant-scoped); indirectly, the shared `ReportContentDialog` and
  moderate-delete confirm flow owned by US-E19.2 are referenced, not modeled.
- **Boundaries:** covers feed scope tabs, composer, post card, reactions,
  comments, "…" menu entry points (pin/unpin, remove, report), pinned
  ordering, pagination, and all 4 required UI states (loading/empty/error/
  end-of-feed) plus the implicit "success" (populated) state. Pin/unpin
  persistence and Remove's authorization/confirm/audit are explicitly
  out-of-scope for this story's own AC (mock-first / delegated respectively).

## 2. Actor Catalogue

| Actor/Role | Type | Capabilities (this story) |
| --- | --- | --- |
| Teacher | Human, authenticated | Post (school + own-class scope), react, comment, report others' content, pin/unpin + remove entry points on own-class posts (menu visibility only) |
| Principal | Human, authenticated | Post (school + any class scope), react, comment, report others' content, pin/unpin + remove entry points on any post (menu visibility only) |
| Student | Human, authenticated | Post (own-class scope only, no school scope), react, comment, report others' content |
| Parent | Human, authenticated | View-only feed (no composer), react, comment, report others' content |
| (Referenced, not modeled) `ReportContentDialog` | Shared component (US-E19.2) | Invoked by UC-1906; its own AC live in US-E19.2 |
| (Referenced, not modeled) Moderate-delete confirm flow | Shared flow (US-E19.2) | Invoked by UC-1910's menu entry; its own AC live in US-E19.2 |

## 3. Use Case Catalogue

### UC-1901: View feed (scope tabs + 4 UI states)
- **Primary actor:** any authenticated role.
- **Preconditions:** user authenticated, tenant resolved.
- **Main success scenario:**
  1. User navigates to the Feed screen.
  2. System renders a tablist: "Toàn trường" + "Lớp <tên>" (listbox if >1 class).
  3. System fetches posts for the active scope (INT-190-01/02).
  4. Skeleton shown while pending; on success, posts render ordered pinned-first then by `createdAt` desc.
- **Alternative flows:**
  - A1 — User switches scope tab → re-fetch for new scope, previous scope's list unmounted, loading state re-shown for the new scope only.
  - A2 — User belongs to >1 class → class tab becomes a listbox/select rather than a flat tab.
- **Exception flows:**
  - E1 — Fetch fails transiently (`FeedFailure "fetch-failed"`, retryable) → EduError + retry button.
  - E2 — Fetch fails with tenant mismatch (`FeedFailure "forbidden"`) → EduError, no retry, distinct copy.
  - E3 — Class scope 404 (`FeedFailure "scope-not-found"`) → EduError, distinct copy, no retry.
- **Business rules:** exactly one primary state visible at a time (loading XOR empty XOR error XOR populated/end-of-feed).
- **Non-functional constraints:** skeleton visible ≤320ms (NFR-003); scope tabs scroll horizontally at 320px (NFR-002); WCAG 2.1 AA tablist semantics (`role=tablist`/`tab`/`tabpanel`, arrow-key navigation).

### UC-1902: Compose a post (role/scope-gated)
- **Primary actor:** teacher, principal, student (per scope); parent excluded.
- **Preconditions:** `canPost` true for active role+scope.
- **Main success scenario:**
  1. Composer renders above the feed when `canPost` is true for the active scope.
  2. User types non-empty text (+ optional single mock image attach).
  3. User submits → optimistic prepend + POST (INT-190-03).
  4. On success: toast "Đã đăng bài viết", composer clears.
- **Alternative flows:**
  - A1 — Composer not rendered at all (not disabled) when `canPost` is false — e.g. parent in any scope, student in school scope.
  - A2 — Student switches from class scope (composer visible) to school scope (composer hidden) — no error, just absence.
- **Exception flows:**
  - E1 — 422 `VALIDATION_ERROR` (empty content/oversized) → inline field error, content preserved for retry, no optimistic prepend performed until valid.
  - E2 — 403 `FORBIDDEN` (server-side re-check of FR-002) → inline error distinct from validation, content preserved.
  - E3 — Retryable transient failure → inline error with retry, content preserved, no toast.
- **Business rules:** school scope composer = teacher/principal only; class scope composer = teacher/principal/student; parent never sees a composer in any scope.
- **Non-functional constraints:** composer textarea has an associated `<label>`/`aria-label`; submit button `aria-busy` while pending.

### UC-1903: React to a post
- **Primary actor:** any authenticated role.
- **Preconditions:** post visible in the current feed.
- **Main success scenario:**
  1. User clicks a reaction chip (👍/❤️/🎉/👏).
  2. Chip toggles to the user's own reaction state (visually distinct from others' aggregate counts), count updates optimistically.
  3. PUT/DELETE call fires (INT-190-04) in the background.
- **Alternative flows:**
  - A1 — User clicks a different reaction chip while one is already active → previous reaction replaced (single active reaction per user).
  - A2 — User clicks their own active chip again → reaction removed (DELETE), chip un-toggles.
- **Exception flows:**
  - E1 — Reaction call fails (any reason) → rollback optimistic toggle to prior state silently (no toast, per FR-004/INT-190-04).
  - E2 — 404 `POST_NOT_FOUND` (post removed concurrently by a moderator) → rollback reaction AND remove the post from the local feed list, no blocking dialog.
- **Business rules:** reaction is optimistic-only from the user's perspective; no loading skeleton per chip.
- **Non-functional constraints:** each chip has `aria-pressed` + Vietnamese `aria-label` naming reaction + count (NFR-001).

### UC-1904: Comment on a post
- **Primary actor:** any authenticated role.
- **Preconditions:** post visible.
- **Main success scenario:**
  1. User clicks the comments toggle → thread expands, GET fires (INT-190-05).
  2. Skeleton row(s) shown while loading; comments render on success.
  3. User types a non-empty comment and submits → POST, comment appended to the thread.
- **Alternative flows:**
  - A1 — Thread has zero comments → inline "chưa có bình luận" text within the expanded section (NOT a full-screen `EduEmpty` — this is a sub-section state, per INT-190-05).
- **Exception flows:**
  - E1 — 422 empty comment → inline field error, retry.
  - E2 — Retryable transient failure on list or add → inline error, retry, existing thread state preserved.
  - E3 — 404 `POST_NOT_FOUND` (post no longer available) → inline error "post no longer available", thread collapses.
- **Business rules:** comment submit requires non-empty content, same as post composer.
- **Non-functional constraints:** comment input has an associated label; thread expand/collapse is keyboard-operable (Enter/Space on the toggle).

### UC-1905: Open the "…" menu (role-gated entry points)
- **Primary actor:** any authenticated role, on any post/comment.
- **Preconditions:** post/comment rendered.
- **Main success scenario:**
  1. User activates the "…" trigger on a post or comment.
  2. Menu opens showing only items the current role/author-relationship is entitled to:
     - **Report** — shown when current user is NOT the content's author.
     - **Pin/Unpin** — shown only for principal (any post) or teacher (own-class posts only, per ASSUMPTION) — see UC-1909.
     - **Remove** — shown only for principal or teacher-own-class (menu visibility only; authorization enforced by US-E19.2) — see UC-1910.
  3. Menu supports Escape + outside-click dismiss, ARIA menu/menuitem roles.
- **Alternative flows:**
  - A1 — Content's own author opens their own "…" menu → Report item absent (cannot report own content); Pin/Remove still shown if the author is also a moderator for that scope.
  - A2 — Parent or student (non-moderator) opens "…" menu on someone else's post → only Report shown.
- **Exception flows:**
  - E1 — No entitled items at all (e.g. own post, non-moderator role) → "…" trigger itself is not rendered (not an empty menu) — consistent with FR-002's "hide not disable" pattern.
- **Business rules:** author cannot report own content; Pin/Remove visibility per moderator rule (principal = any scope; teacher = own-class only, per assumption — see Open Questions).
- **Non-functional constraints:** menu trigger has `aria-label` ("Thêm tùy chọn cho bài viết của {author}"), Escape closes and returns focus to the trigger.

### UC-1906: Report a post/comment (entry point → shared dialog)
- **Primary actor:** any role except the content's own author.
- **Preconditions:** "…" menu open, Report item visible.
- **Main success scenario:**
  1. User selects "Báo cáo" from the menu.
  2. System opens the SHARED `ReportContentDialog` (contract owned by US-E19.2, `moderation.reportDialog.*`), passing `kind` (post|comment), `contentId`, `authorName`, and a quoted preview of the content.
  3. All subsequent dialog behavior (reason selection, note requirement, submit, toast, error handling) is owned and tested by US-E19.2 — not re-asserted here.
  4. Reported content remains visible to the reporter (not hidden).
- **Alternative flows:** none beyond the shared dialog's own (out of this story's scope).
- **Exception flows:** none beyond the shared dialog's own (out of this story's scope).
- **Business rules:** the menu passes the correct `kind` discriminator (`post` vs `comment`) and never renders a second, feed-local report dialog.
- **Non-functional constraints:** none beyond correctly invoking the shared contract (focus moves into the dialog on open — dialog's own a11y AC live in US-E19.2).

### UC-1907: Pinned-post ordering
- **Primary actor:** system (rendering), observed by all roles.
- **Preconditions:** feed has ≥1 post with `pinned=true`.
- **Main success scenario:**
  1. Feed renders pinned posts before all non-pinned posts, regardless of `createdAt`.
  2. Each pinned post shows a visually distinct accent border AND an icon + text label ("Đã ghim") — not color alone.
- **Alternative flows:**
  - A1 — Multiple pinned posts → ordered among themselves by `createdAt` desc (most recently pinned/created first).
- **Exception flows:** none (pure rendering rule).
- **Business rules:** pinned ordering recalculates immediately on any pin/unpin toggle (including the mock toggle, UC-1909).
- **Non-functional constraints:** pinned marker is icon+label per NFR-001 (not color-only).

### UC-1908: Pagination and end-of-feed
- **Primary actor:** any authenticated role.
- **Preconditions:** feed has posts, cursor pagination active.
- **Main success scenario:**
  1. User clicks "Tải thêm bài viết".
  2. Next page fetched via cursor (INT-190-01/02 with `cursor`), appended to the existing list.
  3. When `hasMore=false`, the button is replaced by the end marker "Bạn đã xem hết bảng tin".
- **Alternative flows:**
  - A1 — Initial page already has `hasMore=false` → end marker shown immediately below the first page, no load-more button ever rendered.
- **Exception flows:**
  - E1 — Load-more call fails → inline retry affordance in place of the button; existing (already-loaded) posts remain unaffected/untouched.
- **Business rules:** pagination is additive-append only — never replaces already-rendered posts.
- **Non-functional constraints:** load-more button shows `aria-busy` while its own request is pending; existing scroll position preserved on append.

### UC-1909: Pin/Unpin entry point (MOCK-FIRST, FR-011)
- **Primary actor:** principal (any post) or teacher (own-class posts, per assumption).
- **Preconditions:** "…" menu open, Pin/Unpin item visible (per UC-1905 gating).
- **Main success scenario:**
  1. User selects "Ghim bài viết" (or "Bỏ ghim" if already pinned).
  2. System flips `pinned` locally (optimistic, client-only — NO HTTP call, INT-190-07), feed re-sorts per UC-1907.
  3. A non-blocking, non-toast UI signal communicates the toggle is not yet durably persisted (exact copy TBD — see Open Questions).
- **Alternative flows:**
  - A1 — Toggling Unpin on an already-unpinned post is not reachable (menu item label is context-sensitive: "Ghim" vs "Bỏ ghim").
- **Exception flows:**
  - E1 (test note, not a runtime error) — because this is mock-first (BE US-101 `in_progress`), there is no failure path to test; QA must instead verify the toggle does NOT survive a full page reload (local-only state), confirming it is NOT silently treated as durably wired.
- **Business rules:** pin/unpin here never issues a network request; it is a local reducer/cache mutation only, swappable behind `IFeedRepository` once US-101 ships.
- **Non-functional constraints:** the "not yet persisted" indicator must not rely on color alone and must not be a blocking modal (non-blocking per FR-011).

### UC-1910: Remove entry point (menu item only, delegates to US-E19.2)
- **Primary actor:** principal (any post) or teacher (own-class posts, per assumption).
- **Preconditions:** "…" menu open, Remove item visible.
- **Main success scenario:**
  1. User selects "Gỡ nội dung" from the menu.
  2. System hands off to the shared moderate-delete confirm flow (owned by US-E19.2: confirm dialog, authorization enforcement, audit trail) — this story does not implement a second delete call or a second confirm dialog.
  3. On successful removal (per US-E19.2's own postconditions), the removed post/comment disappears from this feed's list on next fetch/refetch.
- **Alternative flows:** none — the entire confirm/authorization/audit flow is out of scope here.
- **Exception flows:** none modeled here — see US-E19.2 `INT-191-05`/UC-1928 for the 403-vs-transient distinction; this story only needs to not crash if the underlying post disappears mid-session (same handling as UC-1903/E2, react-to-a-removed-post).
- **Business rules:** exactly one moderate-delete implementation exists in the codebase (US-E19.2's); this story's menu item is a pure entry point.
- **Non-functional constraints:** none beyond correctly triggering the shared flow.

## 4. Acceptance Criteria

```
UC-1901: View feed (scope tabs + 4 UI states)
  AC-1901.1 Loading — Given the Feed screen is navigated to, When the school/class feed fetch is pending, Then EduSkeleton renders exactly 3 rows and no other primary state is visible.
  AC-1901.2 Empty — Given the active scope's fetch succeeds with posts=[] and no filters applied, When rendering completes, Then EduEmpty renders, and its CTA to post is shown ONLY if canPost is true for the active role+scope (e.g. shown for teacher/principal/student in class scope; NOT shown for parent, or for student in school scope).
  AC-1901.3 Error (retryable) — Given the fetch fails with a retryable error, When rendering completes, Then EduError renders with a retry button that re-triggers the same fetch on click.
  AC-1901.4 Error (forbidden, non-retryable) — Given the fetch fails with FeedFailure "forbidden" (tenant mismatch) or "scope-not-found" (404 on class scope), When rendering completes, Then EduError renders WITHOUT a retry button and with copy distinct from the generic transient-error copy.
  AC-1901.5 Success — Given the fetch succeeds with posts.length > 0, When rendering completes, Then the posts render pinned-first then createdAt desc, and exactly one primary state (populated/end-of-feed) is visible.
  AC-1901.6 Scope switch — Given the user is viewing "Toàn trường", When they activate a "Lớp <tên>" tab (or select one from the listbox if the user belongs to >1 class), Then the previous scope's posts unmount and the new scope's own loading→(empty|error|success) state cycle begins independently.
  AC-1901.7 Keyboard — Given the scope tablist has focus, When the user presses arrow keys, Then focus moves between tabs per WCAG tablist pattern, and Enter/Space activates the focused tab.

UC-1902: Compose a post
  AC-1902.1 Composer visibility (role×scope matrix) — Given the active scope is "school", When the user is teacher or principal, Then the composer renders; When the user is student or parent, Then the composer is NOT rendered (absent from the DOM, not merely disabled).
  AC-1902.2 Composer visibility (class scope) — Given the active scope is a class, When the user is teacher, principal, or student (member of that class), Then the composer renders; When the user is parent, Then the composer is NOT rendered.
  AC-1902.3 Happy path — Given an eligible user has typed non-empty text, When they submit, Then the new post is optimistically prepended to the feed and a toast "Đã đăng bài viết" appears on server confirmation.
  AC-1902.4 Loading — Given submit is pending, Then the submit button shows aria-busy + a spinner/disabled state, and the composer text remains editable-disabled until resolution.
  AC-1902.5 Validation error — Given the user submits empty content (or content exceeding the max length), When the server returns 422 VALIDATION_ERROR, Then an inline field error appears (from error.fields[]), content is preserved in the textarea, and no post is prepended.
  AC-1902.6 Forbidden — Given a server-side re-check rejects the post (403 FORBIDDEN, e.g. a role/scope edge case not caught client-side), When the response returns, Then a distinct inline error (not the validation-error copy) appears and content is preserved for retry.
  AC-1902.7 Transient failure — Given a retryable transient error occurs on submit, Then an inline error with a retry affordance appears, content is preserved, and no toast is shown.

UC-1903: React to a post
  AC-1903.1 Happy path (add) — Given a post with no reaction from the current user, When the user clicks the ❤️ chip, Then the chip shows aria-pressed="true" with the user's own state visually distinct from other roles' aggregate counts, and the count increments optimistically.
  AC-1903.2 Replace reaction — Given the user already reacted 👍, When they click ❤️, Then 👍 un-toggles and ❤️ toggles (single active reaction per user), both counts adjust optimistically.
  AC-1903.3 Remove reaction — Given the user has an active reaction, When they click the same chip again, Then it un-toggles and the count decrements optimistically (DELETE call fires).
  AC-1903.4 Silent rollback — Given the reaction call fails for any reason, When the failure resolves, Then the chip and count silently revert to the pre-click state with NO toast or blocking error shown.
  AC-1903.5 Concurrent removal — Given the reaction call returns 404 POST_NOT_FOUND (post removed by a moderator mid-session), When the failure resolves, Then the reaction rolls back AND the post is removed from the local feed list without a blocking dialog.
  AC-1903.6 Accessibility — Given any reaction chip, Then it exposes aria-pressed and a Vietnamese aria-label naming the reaction type and current count (e.g. "Thích, 12 lượt").

UC-1904: Comment on a post
  AC-1904.1 Loading — Given the user expands a post's comment thread, When the comment-list fetch is pending, Then skeleton row(s) render within the expanded section only (not a full-screen skeleton).
  AC-1904.2 Empty (sub-section) — Given the thread fetch succeeds with comments=[], Then the section shows inline text "Chưa có bình luận" — NOT a full EduEmpty component (this is a sub-section state).
  AC-1904.3 Success — Given the thread fetch succeeds with comments.length > 0, Then all comments render with author/content/createdAt.
  AC-1904.4 Add comment happy path — Given the user types non-empty text and submits, When the POST succeeds, Then the new comment appends to the visible thread immediately.
  AC-1904.5 Validation error — Given the user submits empty content, When the server returns 422, Then an inline field error appears and no comment is appended.
  AC-1904.6 Transient failure — Given a retryable error occurs on list or add, Then an inline error with retry appears and the existing thread state is preserved.
  AC-1904.7 Post gone — Given the comment call returns 404 POST_NOT_FOUND, Then an inline error "Bài viết không còn tồn tại" appears and the thread section collapses.

UC-1905: Open the "…" menu (role-gated entry points)
  AC-1905.1 Teacher, own-class post, not own content — Given a teacher viewing another user's post in a class they teach, When they open "…", Then Pin/Unpin, Remove, and Report all render.
  AC-1905.2 Teacher, own post — Given a teacher viewing their OWN post, When they open "…", Then Pin/Unpin and Remove render (if moderator-eligible for that scope) but Report does NOT render.
  AC-1905.3 Principal, any post — Given a principal viewing any post in any scope, When they open "…", Then Pin/Unpin and Remove always render (any-scope moderator), plus Report unless it is the principal's own post.
  AC-1905.4 Student/parent, others' post — Given a student or parent viewing another user's post, When they open "…", Then ONLY Report renders (no Pin/Unpin/Remove for non-moderator roles).
  AC-1905.5 Student/parent, own post — Given a student or parent viewing their OWN post, When they attempt to open "…", Then the "…" trigger itself is not rendered (no entitled items at all).
  AC-1905.6 Keyboard/dismiss — Given the menu is open, When the user presses Escape or clicks outside, Then the menu closes and focus returns to the "…" trigger.
  AC-1905.7 ARIA — Given the menu is open, Then it exposes role="menu" with role="menuitem" children and correct roving tabindex/arrow-key navigation.

UC-1906: Report a post/comment (entry point → shared dialog) [cross-story]
  AC-1906.1 Entry point renders for eligible roles — Given any role except the content's own author views a post or comment, When they open "…", Then "Báo cáo" renders as a menu item.
  AC-1906.2 Entry point absent for own content — Given the current user IS the content's own author, When they open "…" on their own post/comment, Then "Báo cáo" does NOT render.
  AC-1906.3 [CROSS-STORY] Invokes the shared contract — Given a user selects "Báo cáo" on a post or comment, When the action fires, Then the SAME `ReportContentDialog` component/contract owned by US-E19.2 opens (not a feed-local re-implementation), receiving { kind: "post"|"comment", contentId, authorName, content preview } as props — this AC asserts ONLY that the correct shared component is invoked with the correct props; the dialog's own internal behavior (reason radiogroup, note-required-for-"Khác", submit, toast, error states) is specified and tested exclusively in US-E19.2's use-cases.md (UC-1921/UC-1922) and MUST NOT be re-asserted here.
  AC-1906.4 Reported content stays visible — Given a report is successfully submitted (per US-E19.2's own flow), Then the reported post/comment remains visible in the reporter's feed (not auto-hidden) — this AC is feed-observable behavior, distinct from the dialog's own submit AC.

UC-1907: Pinned-post ordering
  AC-1907.1 Single pinned post — Given a feed with one post pinned=true created before other non-pinned posts, When rendered, Then the pinned post appears first regardless of createdAt.
  AC-1907.2 Multiple pinned posts — Given ≥2 pinned posts, When rendered, Then they appear before all non-pinned posts, ordered among themselves by createdAt desc.
  AC-1907.3 Non-color marker — Given a pinned post, Then it shows BOTH an accent border AND an icon + text label "Đã ghim" (never color-only).
  AC-1907.4 Re-order on toggle — Given a post is pinned via the mock toggle (UC-1909), When the toggle completes, Then the feed immediately re-sorts to reflect the new pinned-first order without a page reload.

UC-1908: Pagination and end-of-feed
  AC-1908.1 Load more happy path — Given hasMore=true and the user clicks "Tải thêm bài viết", When the next page resolves, Then those posts append below the existing list (existing posts untouched) and the button re-evaluates hasMore.
  AC-1908.2 End of feed reached — Given the loaded page's meta.pagination.hasMore=false, Then the "Tải thêm bài viết" button is replaced by "Bạn đã xem hết bảng tin" and no further fetch is triggered.
  AC-1908.3 Immediately exhausted — Given the FIRST page already returns hasMore=false, Then the end marker shows directly under that first page with no load-more button ever rendered.
  AC-1908.4 Load-more failure — Given the load-more call fails, Then an inline retry affordance replaces the button in place, and all previously loaded posts remain visible and unaffected.
  AC-1908.5 Loading indicator — Given a load-more request is in flight, Then the button shows aria-busy + a spinner and is disabled against double-submission.

UC-1909: Pin/Unpin entry point (MOCK-FIRST)
  AC-1909.1 Toggle happy path (mock) — Given an eligible moderator selects "Ghim bài viết", When the action fires, Then the post's pinned state flips to true LOCALLY with no network request made (INT-190-07 confirms no HTTP call), and the feed re-sorts per UC-1907.
  AC-1909.2 Unpin — Given a pinned post, When the moderator selects "Bỏ ghim", Then pinned flips to false locally and the post re-sorts out of the pinned group.
  AC-1909.3 Non-blocking "not durable" signal — Given the pin/unpin toggle completes, Then a non-blocking, non-toast, non-color-only indicator communicates the state is not yet persisted server-side (exact copy is an [OPEN QUESTION] below — AC to be finalized once ba-lead confirms wording).
  AC-1909.4 [TEST NOTE — mock-first boundary, not a failure path] Given a pin toggle was performed, When the page is fully reloaded (simulating a new session/fetch), Then the pinned state reverts to whatever the (mocked) fetch response returns — QA must explicitly verify non-persistence across reload as proof this is mock, NOT verify a "successful persistence" claim. This is a scope-boundary assertion, not an error-path AC.

UC-1910: Remove entry point (menu item only, delegates to US-E19.2)
  AC-1910.1 Entry point present — Given an eligible moderator (principal any scope, teacher own-class) opens "…", Then "Gỡ nội dung" renders as a menu item.
  AC-1910.2 Delegates, does not reimplement — Given "Gỡ nội dung" is clicked, When the action fires, Then it triggers the SAME shared moderate-delete confirm flow described in US-E19.2 (no second confirm dialog, no second DELETE call implemented in this story's codebase paths).
  AC-1910.3 Post disappears post-removal — Given a post/comment was successfully removed via US-E19.2's flow, When the feed next fetches/refetches, Then that post/comment no longer appears in the list (same non-blocking handling pattern as UC-1903.5, no crash if it disappears mid-session).
```

## 5. Edge Case Matrix

| Use case / feature | Empty | Max-length | Concurrent | Auth-expired | Network-error | Wrong-role |
| --- | --- | --- | --- | --- | --- | --- |
| UC-1901 View feed | AC-1901.2 EduEmpty, role-gated CTA | N/A | Scope switch mid-fetch → prior request result discarded (stale-response guard, [OPEN QUESTION: exact cancel/ignore strategy for fe-state-engineer]) | 401 handled by http interceptor refresh; redirect to login on persistent failure, not surfaced as feed error | AC-1901.3 EduError + retry | N/A (feed itself has no role gate beyond composer) |
| UC-1902 Compose post | N/A (composer absent, not empty state) | AC-1902.5 422 oversized → inline field error | Two tabs submit simultaneously → each resolves independently, no dedupe modeled | Same interceptor pattern as feed fetch | AC-1902.7 inline error + retry | AC-1902.1/1902.2 composer hidden entirely for ineligible role×scope |
| UC-1903 React | N/A | N/A | AC-1903.5 post removed concurrently by moderator → rollback + remove from list | Same interceptor pattern | AC-1903.4 silent rollback, no toast | Any role can react — no wrong-role case |
| UC-1904 Comment | AC-1904.2 inline "Chưa có bình luận" | AC-1904.5 422 empty/oversized → inline field error | Post removed while thread open → AC-1904.7 | Same interceptor pattern | AC-1904.6 inline error + retry | Any role can comment — no wrong-role case |
| UC-1905 "…" menu | AC-1905.5 trigger absent when zero entitled items | N/A | N/A | N/A (menu is client-only visibility logic) | N/A | AC-1905.1–1905.4 role×author-relationship matrix |
| UC-1906 Report entry point | N/A | N/A (owned by US-E19.2) | N/A (owned by US-E19.2) | N/A (owned by US-E19.2) | N/A (owned by US-E19.2) | AC-1906.2 absent for own content |
| UC-1907 Pinned ordering | N/A (no pinned posts = normal createdAt-desc order, not an empty state) | N/A | AC-1907.4 re-order on toggle mid-session | N/A | N/A | N/A |
| UC-1908 Pagination | AC-1908.3 immediately exhausted | N/A | Rapid double-click load-more → button disabled while pending (AC-1908.5) guards against duplicate page fetch | Same interceptor pattern | AC-1908.4 inline retry, existing posts unaffected | N/A |
| UC-1909 Pin/unpin (mock) | N/A | N/A | Two moderators toggle pin "simultaneously" (mock, single-session only — no cross-session sync since it's local state, [OPEN QUESTION] flagged) | N/A (no HTTP call) | N/A (mock cannot fail, AC-1909.4 test note) | Menu item hidden for non-moderator roles (see UC-1905) |
| UC-1910 Remove entry point | N/A | N/A | N/A (delegated to US-E19.2) | N/A (delegated) | N/A (delegated) | Menu item hidden for non-moderator roles (see UC-1905); actual 403 handling lives in US-E19.2 UC-1928 |

## 6. Open Questions

- `[OPEN QUESTION]` (carried from requirements.md) Exact copy/placement for the pin/unpin "not yet persisted" indicator (AC-1909.3) — needs product/ba-lead confirmation before `fe-nextjs-engineer` implements the exact string; recommend a small inline caption (e.g. "Chỉ hiển thị tạm thời trên thiết bị này") near the pin badge, non-blocking, icon+text — but the final microcopy must go through `ba-lead`/`uiux-ux-writer` before it's added to `messages/{vi,en}.json`.
- `[OPEN QUESTION]` (carried from requirements.md) Confirm whether teacher's pin/remove moderator scope is strictly "classes they teach" vs "any class they can view" — affects AC-1905.1/1905.2/1909/1910's exact role-gating boundary for teachers specifically (principal's any-scope gate is already unambiguous).
- `[OPEN QUESTION]` Stale-response guard strategy on rapid scope-tab switching (UC-1901 edge case) — whether `fe-state-engineer` uses TanStack Query's built-in query-key change (automatic) or needs an explicit cancellation — flagging so AC-1901.6 isn't silently assumed race-free; not expected to change the AC's observable behavior (last-selected-tab's data wins) but noted for implementation awareness.
- `[OPEN QUESTION]` Whether the "single active reaction per user" rule (AC-1903.2) is confirmed by the `social` BE contract or is a UI-only convention pending BE confirmation — flagged in integration.md's open questions re: `reactionType` enum handling; escalate if BE allows multi-reaction-per-user.
