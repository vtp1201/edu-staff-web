# US-E11.7 — Student Assignments — Use Cases & Acceptance Criteria

Source: `requirements.md` (TR-117, FR-001…FR-009 + FR-007b, NFR-001…006),
`integration.md` (INT-117-01/02/03, `AssignmentFailure` union), design-spec
`docs/product/design-spec.jsonc` → `screens.lms.assignments`, mockup
`design_src/edu/assignments.jsx`, i18n namespace `assignments` in
`src/bootstrap/i18n/messages/{vi,en}.json` (lines ~675-765).

**Single-role note:** every use case below applies to the `student` role only.
There is **no** teacher/principal/parent variant in this story (confirmed by
`requirements.md` §1 and the actor catalogue below) — this is stated once here
and not repeated per-UC.

## 1. Use Case Scope Summary

- **Total use cases:** 9 (UC-1171…UC-1179).
- **Actor:** `student` (authenticated, already gated by the existing
  `(app)/student/**` route guard — no new authorization boundary).
- **Boundaries:** covers the filter tab-bar + 4 UI states for the assignment
  list, card anatomy and status/badge mapping (including the overdue special
  case), status-driven CTA→sheet routing, the submit sheet's file/textarea/
  draft/submit interactions, the overdue confirmation dialog, the
  pending→submitted transition (mock-first), the graded feedback sheet, and
  the error/retry paths for both the list fetch and the submit action.
  Out-of-scope (per requirements.md): real `lms` BE endpoint, real file
  upload, teacher/principal assignment authoring/grading screens, a detail
  sub-route, and the optional subject-filter chip row.

## 2. Actor Catalogue

| Actor/Role | Type | Capabilities (this story) |
| --- | --- | --- |
| Student | Human, authenticated | View own-class assignments filtered by tab; submit an assignment (optional file + optional text); save a draft without submitting; confirm an overdue submission; view own submission; view score + teacher comment + optional graded-file link once graded |
| (System) simulated-async submit | Internal, mock-first | Transitions pending→submitted locally (decision `0014`); no real BE call exists yet |

## 3. Use Case Catalogue

### UC-1171: View assignment list (filter tabs + 4 UI states)
- **Primary actor:** student.
- **Preconditions:** student authenticated, route `(app)/student/assignments` resolved.
- **Main success scenario:**
  1. Student navigates to the Assignments screen.
  2. System renders a `role='tablist'` with 4 fixed tabs (Tất cả/Chưa nộp/Đã nộp/Đã chấm), defaulting to "Tất cả".
  3. System fetches assignments for the active tab (INT-117-01).
  4. EduSkeleton (4 rows) shown while pending; on success, cards render for the active tab's matching assignments; page-header subtitle reflects the current `pendingCount`.
- **Alternative flows:**
  - A1 — Student switches tabs → previous tab's list unmounts, the new tab's own loading→(empty|error|success) cycle begins independently.
  - A2 — `pendingCount` reaches 0 → subtitle copy reflects "no pending" phrasing (still non-empty subtitle, per `assignments.page.subtitle` interpolation with `count=0`).
- **Exception flows:**
  - E1 — Fetch fails, `AssignmentFailure "network-error"` (retryable) → EduError + "Thử lại" retry re-triggers the same fetch.
  - E2 — Fetch fails, `AssignmentFailure "unknown"` → EduError with the same generic retry copy (no distinct treatment vs. E1 at the list level, since INT-117-01 maps both to EduError+retry).
- **Business rules:** exactly one primary state visible at a time (loading XOR empty XOR error XOR success) per active tab; each of the 4 tabs has its own distinct empty copy.
- **Non-functional constraints:** skeleton visible ≤320ms (NFR-004); tabs scroll horizontally at 320–375px (NFR-003); `role='tablist'`/`'tab'`/`aria-selected` + arrow-key navigation (NFR-001).

### UC-1172: Assignment card anatomy + status/badge mapping
- **Primary actor:** student (observes system rendering).
- **Preconditions:** assignment data loaded for the active tab.
- **Main success scenario:**
  1. Each assignment renders as a card: course-color icon box, "Bài tập: {title}", meta line "{subject} · Lớp {className} · GV: {teacherName}", due line "Hạn nộp: {date}".
  2. A days-left/status badge renders per the fixed mapping: pending ≤1 day → error, ≤3 days → warning, >3 days → success; submitted → primary; graded → success — every badge pairs an icon with text.
  3. The correct CTA renders per status (see UC-1174).
- **Alternative flows:**
  - A1 — Assignment is due today (0 days left, still pending) → distinct label "Hết hạn hôm nay" (`assignments.card.daysLeft.dueToday`), same error tone as the ≤1-day bucket.
  - A2 — `status === graded` → card additionally shows the `AsgScoreChip` (icon award + score/max, color per score mapping) alongside the "Đã chấm" badge.
- **Exception flows:** none (pure rendering rule — no network call at the card level beyond the list fetch already covered by UC-1171).
- **Business rules:** badge color mapping is fixed by the design system (not proposed per-story); status is server-authoritative except "overdue," which is a client-derived visual state (see UC-1173), never a separate `status` enum value.
- **Non-functional constraints:** every badge is icon+text, never color-only (NFR-001); title-row wraps to place the badge under the title at ≤480px (NFR-003).

### UC-1173: Overdue card special-case styling
- **Primary actor:** student (observes system rendering).
- **Preconditions:** an assignment has `status === pending` and `dueDate < now`.
- **Main success scenario:**
  1. Card renders with an error/40 border tint instead of the default border.
  2. The due line renders in `--edu-error-text` (bold), not the default muted color.
  3. The badge renders "Quá hạn {n} ngày" (icon `alertTriangle` + text) instead of the normal days-left badge.
- **Alternative flows:** none — this is a single derived boolean (`pending && dueDate < now`).
- **Exception flows:** none.
- **Business rules:** overdue styling applies ONLY when `status === pending`; a `submitted` or `graded` assignment whose `dueDate` has passed NEVER shows overdue styling (submission already happened, or grading already happened — the deadline is moot).
- **Non-functional constraints:** the overdue badge is never color-only (icon `alertTriangle` + text, decision `0013`); overdue text uses `--edu-error-text` per ADR `0049`, not raw `--edu-error`.

### UC-1174: Status-driven CTA → correct sheet opens
- **Primary actor:** student.
- **Preconditions:** card rendered with a resolved status.
- **Main success scenario:**
  1. `status === pending` → student clicks "Nộp bài" (primary) → the submit sheet opens in edit mode (UC-1175).
  2. `status === submitted` → student clicks "Xem bài đã nộp" (secondary) → the same submit-sheet shell opens in a read-only submitted view (submittedAt + fileName, no edit controls).
  3. `status === graded` → student clicks "Xem điểm & nhận xét" (secondary) → the graded feedback sheet opens (UC-1178).
- **Alternative flows:** none beyond the 3-way status branch (a status can only be one of pending/submitted/graded at open time).
- **Exception flows:**
  - E1 — Sheet data fetch fails (e.g. stale card reopened after the underlying assignment was concurrently modified) → the sheet shows an inline error (per the applicable `AssignmentFailure` — `not-found`/`forbidden`), and does NOT silently open an empty sheet.
- **Business rules:** exactly one sheet component opens per click; the submit sheet and the graded sheet are separate components (never both open simultaneously).
- **Non-functional constraints:** the sheet is `role='dialog' aria-modal='true' aria-labelledby`, focus-trapped, Escape closes with focus restored to the triggering CTA (NFR-001, NFR-002).

### UC-1175: Submit sheet interaction (file, textarea, draft vs. submit)
- **Primary actor:** student.
- **Preconditions:** assignment `status === pending`, submit sheet open in edit mode.
- **Main success scenario:**
  1. Sheet shows the read-only assignment title + description + due line.
  2. Student optionally clicks "Đính kèm tệp" (mock file-picker) → a native file input opens; on selection, a filename chip renders with a remove (x) control.
  3. Student optionally types free text into "Nội dung bài làm" (not required).
  4. Student clicks "Lưu nháp" → draft (file/text) persists locally (mock-first, no network call), toast "Đã lưu nháp." (role='status'), sheet remains open.
  5. Student clicks "Nộp bài" → proceeds to submit (direct if not overdue, via confirm dialog if overdue — UC-1176/UC-1177).
- **Alternative flows:**
  - A1 — Student clicks the remove (x) on an attached file chip → chip disappears, file-picker control resets to its empty state.
  - A2 — Student reopens the sheet after a prior "Lưu nháp" → the previously saved file chip/text is pre-populated.
- **Exception flows:**
  - E1 — Attached file exceeds the 20MB mock limit → inline `role='alert'` validation message "Tệp đính kèm vượt quá dung lượng cho phép (tối đa 20MB)." renders; "Nộp bài" is blocked (disabled or blocked-on-click) until resolved.
- **Business rules:** the file-too-large validation blocks ONLY "Nộp bài" — "Lưu nháp" remains available even with an oversized file attached (draft-save is local-only and lenient; see Edge Case Matrix decision).
- **Non-functional constraints:** file-picker control ≥44px min-height (touch target, NFR-002); remove-file control has a Vietnamese `aria-label` ("Xoá tệp đính kèm"); sheet becomes full-bleed (`maxWidth: 100vw`) at <520px (NFR-003).

### UC-1176: Overdue confirmation dialog
- **Primary actor:** student.
- **Preconditions:** assignment is overdue (`pending` + `dueDate` passed), submit sheet open.
- **Main success scenario:**
  1. Student clicks "Nộp bài" inside the sheet.
  2. System opens a confirmation dialog: title "Nộp bài trễ hạn?", body "Bạn đang nộp bài trễ hạn, bạn có muốn tiếp tục?", actions "Huỷ" / "Tiếp tục nộp bài".
  3. Student clicks "Tiếp tục nộp bài" → submit proceeds (UC-1177) with `overdueConfirmed: true` sent to `submitAssignment` (INT-117-02).
- **Alternative flows:**
  - A1 — Assignment is NOT overdue → clicking "Nộp bài" skips this dialog entirely and submits directly.
- **Exception flows:**
  - E1 — Student clicks "Huỷ" (or presses Escape) → dialog closes, returns to the submit sheet unchanged (file/text state preserved), no submission occurs, focus returns to the "Nộp bài" button inside the sheet.
- **Business rules:** overdue-ness is (re)computed AT THE MOMENT "Nộp bài" is clicked, not when the sheet was first opened (see Edge Case Matrix — "becomes overdue while sheet is open").
- **Non-functional constraints:** the confirm dialog is a nested modal (focus-trapped within itself while open); its prompt uses `--edu-error-text` color + `alertTriangle` icon, never color-only (NFR-001).

### UC-1177: Successful submit (pending → submitted transition)
- **Primary actor:** student.
- **Preconditions:** submit sheet open, no blocking validation error (e.g. file-too-large) present.
- **Main success scenario:**
  1. Student confirms submission (directly, or via the overdue-confirm dialog).
  2. CTA area shows the submitting sub-state: spinner + "Đang nộp bài…", disabled, `aria-busy`.
  3. Simulated-async completes → assignment transitions `pending → submitted` locally (mock-first, decision `0014`), `submittedAt` set to now.
  4. Sheet closes automatically; the card flips in place to its submitted state (badge, CTA, submitted line) without a full list refetch; page-header `pendingCount` decrements by 1.
  5. An auto-dismissing toast (role='status', "Nộp bài thành công.") appears.
- **Alternative flows:** none beyond the two submit-trigger paths already covered by UC-1176.
- **Exception flows:**
  - E1 — Simulated `AssignmentFailure "network-error"` → sheet stays open, inline error ("Lỗi kết nối. Vui lòng thử lại."), submitted state NOT applied, file/text preserved for retry, same "Nộp bài" click can be retried.
  - E2 — `AssignmentFailure "already-submitted"` (concurrent transition, e.g. a stale reopened sheet) → inline error ("Bài tập này đã được nộp."), submit blocked, sheet closes back to an auto-refreshed list reflecting the true current state.
  - E3 — `AssignmentFailure "not-found"` (assignment removed/reassigned concurrently) → inline error ("Không tìm thấy bài tập."), sheet closes back to an auto-refreshed list.
  - E4 — `AssignmentFailure "forbidden"` (defense-in-depth; should not occur given the list is already student-scoped) → inline error ("Bạn không có quyền xem bài tập này."), no retry offered.
  - E5 — `AssignmentFailure "unknown"` → inline error, generic copy ("Đã có lỗi xảy ra. Vui lòng thử lại."), retry available.
- **Business rules:** the submit action is idempotent from the UI's perspective only via explicit retry (no silent auto-retry); rapid double-activation of "Nộp bài" must not fire two submissions (see Edge Case Matrix).
- **Non-functional constraints:** submitting-state spinner animation is motion-safe-gated (`prefers-reduced-motion: reduce` → no animation, NFR-001/accessibility.md); toast auto-dismisses (~3.2s per design-spec) without requiring user action.

### UC-1178: Graded feedback sheet
- **Primary actor:** student.
- **Preconditions:** assignment `status === graded`.
- **Main success scenario:**
  1. Student clicks "Xem điểm & nhận xét" → the graded sheet opens (`role='dialog' aria-modal='true'`, same shell/a11y as the submit sheet, fully read-only).
  2. Score chip renders "{score}/{max}" with icon `award`, colored per mapping: score ≥8 → success, <5 → error, else → text-primary.
  3. Teacher comment block renders under "Nhận xét của giáo viên"; if `teacherComment` is an empty string, the fallback copy "Giáo viên chưa để lại nhận xét." renders instead.
  4. If `gradedFileName` is present, a graded-file link renders (icon `download`, primary color).
  5. Timestamps render: "Đã nộp lúc {submittedAt}" (icon check) and "Đã chấm lúc {gradedAt}" (icon award).
- **Alternative flows:**
  - A1 — `gradedFileName` absent → the graded-file link section does not render at all (not shown disabled).
- **Exception flows:** none beyond UC-1174's E1 (sheet-open data-fetch failure, not re-modeled here).
- **Business rules:** the graded sheet has no edit controls and no "Nộp bài"/"Lưu nháp" actions — it is exclusively read-only; clicking the graded-file link does NOT attempt any real download (see resolved Open Question 2 in §6 and AC-1178.6).
- **Non-functional constraints:** same focus-trap/Escape/focus-restore contract as the submit sheet (NFR-001); score chip color is never the sole differentiator — the numeric value + "/{max}" text is always present alongside the color.

### UC-1179: Error/retry paths (list fetch + submit failure)
- **Primary actor:** student.
- **Preconditions:** either the list fetch (INT-117-01) or the submit action (INT-117-02) has failed.
- **Main success scenario (list fetch):**
  1. List fetch fails → EduError renders with title "Không thể tải danh sách bài tập", description "Đã có lỗi xảy ra. Vui lòng thử lại.", and a "Thử lại" button.
  2. Student clicks "Thử lại" → the exact same fetch re-triggers; EduSkeleton reappears while pending.
- **Main success scenario (submit failure):** see UC-1177 E1–E5 (inline sheet error, state preserved, retry available except for `forbidden`).
- **Alternative flows:** none beyond the retryable/non-retryable branch already covered in UC-1171/UC-1177.
- **Exception flows:** none beyond UC-1171 E1/E2 and UC-1177 E1–E5 (this UC exists to assert the retry mechanics themselves, not to introduce new failure branches).
- **Business rules:** exactly one of loading/empty/error/success is visible for the list at any time; a retry click does not stack a second concurrent fetch (disabled while pending).
- **Non-functional constraints:** the "Thử lại" button shows a busy/disabled state while its own retry request is in flight (prevents duplicate fetch, consistent with the project's standard retry-button pattern).

## 4. Acceptance Criteria

```
UC-1171: View assignment list (filter tabs + 4 UI states)
  AC-1171.1 Loading — Given the Assignments screen is navigated to, When the active tab's fetch is pending, Then EduSkeleton renders exactly 4 rows and no other primary state is visible.
  AC-1171.2 Empty (Tất cả) — Given the "Tất cả" tab's fetch succeeds with assignments=[], Then EduEmpty renders "Bạn chưa có bài tập nào." (assignments.empty.allTab).
  AC-1171.3 Empty (Chưa nộp) — Given the "Chưa nộp" tab's fetch succeeds with assignments=[], Then EduEmpty renders "Không có bài tập nào cần nộp 🎉" (assignments.empty.pendingTab).
  AC-1171.4 Empty (Đã nộp) — Given the "Đã nộp" tab's fetch succeeds with assignments=[], Then EduEmpty renders "Chưa có bài nộp nào." (assignments.empty.submittedTab).
  AC-1171.5 Empty (Đã chấm) — Given the "Đã chấm" tab's fetch succeeds with assignments=[], Then EduEmpty renders "Chưa có bài nộp nào." (assignments.empty.gradedTab).
  AC-1171.6 Error (retryable) — Given the active tab's fetch fails with AssignmentFailure "network-error" or "unknown", When rendering completes, Then EduError renders with title/description/"Thử lại" per assignments.error.*, and clicking "Thử lại" re-triggers the same fetch.
  AC-1171.7 Success — Given the active tab's fetch succeeds with assignments.length > 0, Then exactly one card renders per matching assignment and the page-header subtitle reflects the current pendingCount (assignments.page.subtitle).
  AC-1171.8 Default tab — Given first navigation to the screen, Then "Tất cả" is the active tab (aria-selected="true"), and the other 3 tabs are aria-selected="false".
  AC-1171.9 Tab switch — Given the user is viewing "Tất cả", When they activate "Chưa nộp", Then the "Tất cả" list unmounts, and "Chưa nộp"'s own loading→(empty|error|success) cycle begins independently.
  AC-1171.10 Keyboard — Given the tablist has focus, When the user presses arrow keys, Then focus moves between tabs per the WCAG tablist pattern, and Enter/Space activates the focused tab.
  AC-1171.11 Responsive — Given the viewport is ≤375px and the 4 tabs overflow the tab-bar width, Then the tab-bar scrolls horizontally (overflow-x auto) without breaking layout at 320px.

UC-1172: Assignment card anatomy + status/badge mapping
  AC-1172.1 Pending ≤1 day — Given a pending assignment with 1 day left, Then the badge renders "Còn 1 ngày" with icon clock, color error.
  AC-1172.2 Pending ≤3 days — Given a pending assignment with 2–3 days left, Then the badge renders "Còn {n} ngày" with icon clock, color warning.
  AC-1172.3 Pending >3 days — Given a pending assignment with >3 days left, Then the badge renders "Còn {n} ngày" with icon clock, color success.
  AC-1172.4 Due today — Given a pending assignment due today (0 days left), Then the badge renders "Hết hạn hôm nay" (assignments.card.daysLeft.dueToday), color error, icon alertTriangle.
  AC-1172.5 Submitted — Given a submitted assignment, Then the badge renders "Đã nộp" (assignments.card.status.submitted / cta context), color primary, icon check, and the submittedAt line "Đã nộp lúc: {date}" renders.
  AC-1172.6 Graded — Given a graded assignment, Then the badge renders "Đã chấm", color success, icon checkSquare, AND the AsgScoreChip renders on the card with the mapped score color (UC-1178 mapping).
  AC-1172.7 Never color-only — Given any of the badges above, Then each one exposes both an icon AND a text label — never color alone.
  AC-1172.8 Meta line — Given any assignment card, Then the meta line renders exactly "{subject} · Lớp {className} · GV: {teacherName}" (assignments.card.meta).
  AC-1172.9 CTA per status — Given pending/submitted/graded respectively, Then the CTA renders "Nộp bài"(primary,icon upload) / "Xem bài đã nộp"(secondary,icon eye) / "Xem điểm & nhận xét"(secondary,icon award).
  AC-1172.10 Responsive reflow — Given the viewport is ≤480px, Then the title row wraps so the badge moves below the title instead of staying inline, and the meta line wraps without breaking the card layout.

UC-1173: Overdue card special-case styling
  AC-1173.1 Border tint — Given a pending assignment whose dueDate has passed, Then the card border renders with an error/40 tint instead of the default border color.
  AC-1173.2 Due-line color — Given the same precondition, Then the due line "Hạn nộp: {date}" renders in --edu-error-text (bold), not the default muted color.
  AC-1173.3 Overdue badge — Given the same precondition, Then the badge renders "Quá hạn {n} ngày" with icon alertTriangle, replacing the normal days-left badge entirely (not both shown).
  AC-1173.4 Not applied post-submission — Given an assignment whose dueDate has passed but status is "submitted" or "graded", Then NONE of the overdue styling (border/due-line/badge) applies — the card renders its normal submitted/graded appearance.
  AC-1173.5 Non-color-only — Given the overdue badge, Then it exposes icon alertTriangle + text "Quá hạn {n} ngày", never color alone.

UC-1174: Status-driven CTA → correct sheet opens
  AC-1174.1 Pending → submit sheet — Given a pending assignment card, When "Nộp bài" is clicked, Then the submit sheet opens in edit mode with focus moved inside (role='dialog' aria-modal='true').
  AC-1174.2 Submitted → read-only view — Given a submitted assignment card, When "Xem bài đã nộp" is clicked, Then the same sheet shell opens showing a read-only card with submittedAt + fileName and NO edit controls (no file-picker, no textarea, no Lưu nháp/Nộp bài buttons).
  AC-1174.3 Graded → graded sheet — Given a graded assignment card, When "Xem điểm & nhận xét" is clicked, Then the graded feedback sheet opens (UC-1178), and the submit-sheet component does NOT open.
  AC-1174.4 Sheet-open data failure — Given a card whose underlying assignment was concurrently removed/modified, When its CTA is clicked, Then the sheet opens showing an inline error (per the applicable AssignmentFailure), never an empty/blank sheet.
  AC-1174.5 Focus restore — Given any sheet opened from a card CTA, When the sheet is closed (Escape or close button), Then focus returns to the CTA that triggered it.

UC-1175: Submit sheet interaction
  AC-1175.1 File attach — Given the submit sheet is open in edit mode, When the student selects a file via "Đính kèm tệp", Then a filename chip renders (fileText icon + name + remove control).
  AC-1175.2 File remove — Given an attached file chip, When the remove (x) control is activated, Then the chip disappears and the file-picker control resets to empty; the remove control exposes aria-label "Xoá tệp đính kèm".
  AC-1175.3 File-too-large validation — Given the student attaches a file >20MB, Then an inline role="alert" message "Tệp đính kèm vượt quá dung lượng cho phép (tối đa 20MB)." renders, and "Nộp bài" is blocked until the file is removed or replaced with a valid one.
  AC-1175.4 File-too-large does NOT block draft — Given the same oversized-file state as AC-1175.3, When the student clicks "Lưu nháp", Then the draft save proceeds normally (toast "Đã lưu nháp.") — ONLY "Nộp bài" is blocked by this validation, per the Edge Case Matrix decision (§5).
  AC-1175.5 Optional textarea — Given the student leaves "Nội dung bài làm" empty, When they submit (with or without a file), Then no validation error blocks the submission on account of empty text (textarea is optional per assignments.submit.answerHelper).
  AC-1175.6 Save draft happy path — Given valid (non-oversized) file/text state, When "Lưu nháp" is clicked, Then a toast "Đã lưu nháp." (role='status') appears, the sheet remains open, and the assignment's status is unchanged (still pending).
  AC-1175.7 Draft persistence — Given a draft was saved and the sheet was later closed and reopened, Then the previously saved file chip/text pre-populates the sheet.
  AC-1175.8 Submitting sub-state — Given "Nộp bài" was confirmed, When the simulated submit is in flight, Then the primary CTA is replaced by a spinner + "Đang nộp bài…", is disabled, and exposes aria-busy="true"; the spinner animation is gated behind prefers-reduced-motion.
  AC-1175.9 Responsive — Given the viewport is <520px, Then the sheet renders full-bleed (maxWidth: 100vw) instead of the default 520px width.

UC-1176: Overdue confirmation dialog
  AC-1176.1 Trigger — Given the open assignment is overdue (pending + dueDate passed) and the sheet is open, When "Nộp bài" is clicked, Then a confirm dialog opens with title "Nộp bài trễ hạn?" and body "Bạn đang nộp bài trễ hạn, bạn có muốn tiếp tục?", actions "Huỷ" and "Tiếp tục nộp bài".
  AC-1176.2 Confirm accepts — Given the confirm dialog is open, When "Tiếp tục nộp bài" is clicked, Then the submit proceeds per UC-1177 with overdueConfirmed: true sent to submitAssignment.
  AC-1176.3 Confirm cancels — Given the confirm dialog is open, When "Huỷ" is clicked (or Escape is pressed), Then the dialog closes, the submit sheet returns to its prior state unchanged (file/text preserved, status still pending, no submission attempted), and focus returns to the "Nộp bài" button.
  AC-1176.4 Non-overdue skip — Given the open assignment is NOT overdue, When "Nộp bài" is clicked, Then the confirm dialog does NOT appear and submission proceeds directly.
  AC-1176.5 Non-color-only prompt — Given the confirm dialog is open, Then its prompt uses icon alertTriangle + --edu-error-text color, never color alone.
  AC-1176.6 Recompute at submit-time — Given the sheet was opened while the assignment was NOT yet overdue, and the deadline passes while the sheet remains open, When "Nộp bài" is then clicked, Then overdue-ness is recomputed at that moment and the confirm dialog DOES appear (see Edge Case Matrix §5 for the full decision).

UC-1177: Successful submit (pending → submitted)
  AC-1177.1 Happy path (non-overdue) — Given a non-overdue pending assignment with valid submit state, When "Nộp bài" is clicked and the simulated submit resolves, Then the assignment transitions to submitted with submittedAt = now, the sheet closes, the card flips to its submitted appearance, pendingCount decrements by 1, and a toast "Nộp bài thành công." (role='status') auto-dismisses after ~3.2s.
  AC-1177.2 Happy path (overdue-confirmed) — Given the overdue-confirm flow (UC-1176) was accepted, Then the same transition/toast/card-flip sequence as AC-1177.1 occurs.
  AC-1177.3 Simulated network failure — Given the simulated submit returns AssignmentFailure "network-error", Then the sheet stays open with an inline error "Lỗi kết nối. Vui lòng thử lại.", the assignment remains pending, and the file/text state is preserved so the same "Nộp bài" click can be retried.
  AC-1177.4 Already-submitted (concurrent) — Given AssignmentFailure "already-submitted" is returned, Then an inline error "Bài tập này đã được nộp." appears, the sheet closes, and the list auto-refreshes to reflect the true current (submitted) state.
  AC-1177.5 Not-found (concurrent) — Given AssignmentFailure "not-found" is returned, Then an inline error "Không tìm thấy bài tập." appears and the sheet closes back to an auto-refreshed list.
  AC-1177.6 Forbidden — Given AssignmentFailure "forbidden" is returned, Then an inline error "Bạn không có quyền xem bài tập này." appears with NO retry action offered.
  AC-1177.7 Unknown — Given AssignmentFailure "unknown" is returned, Then a generic inline error "Đã có lỗi xảy ra. Vui lòng thử lại." appears with a retry action available.
  AC-1177.8 Double-click guard — Given the submitting sub-state (AC-1175.8) is active, When the student clicks "Nộp bài" again (or presses Enter again) before it resolves, Then no second submission is triggered — the disabled/aria-busy CTA absorbs the extra activation (see Edge Case Matrix §5).

UC-1178: Graded feedback sheet
  AC-1178.1 Score chip — score ≥8 — Given a graded assignment with score=9, max=10, Then the score chip renders "9/10" with success color and icon award.
  AC-1178.2 Score chip — score <5 — Given a graded assignment with score=3, max=10, Then the score chip renders "3/10" with error color.
  AC-1178.3 Score chip — mid-range — Given a graded assignment with score=6, max=10, Then the score chip renders "6/10" with text-primary color (neither success nor error).
  AC-1178.4 Comment present — Given teacherComment is a non-empty string, Then it renders verbatim under the "Nhận xét của giáo viên" section.
  AC-1178.5 Comment empty fallback — Given teacherComment is an empty string, Then the fallback copy "Giáo viên chưa để lại nhận xét." renders instead of a blank block.
  AC-1178.6 Graded-file link + mock-download signal — Given gradedFileName is present, Then a download-styled link/button renders (icon download, aria-label "Tải xuống tệp giáo viên đính kèm"); When the student activates it, Then NO real download is attempted and a toast (role='status') informs the student this is a demo/mock with no real file to download — see resolved Open Question 2 (§6) for the exact copy, which is a NEW i18n key not yet staged.
  AC-1178.7 Graded-file link absent — Given gradedFileName is NOT present, Then the graded-file link section does not render at all (absent, not disabled).
  AC-1178.8 Timestamps — Given a graded assignment, Then "Đã nộp lúc {submittedAt}" (icon check) and "Đã chấm lúc {gradedAt}" (icon award) both render.
  AC-1178.9 Read-only — Given the graded sheet is open, Then no edit controls (file-picker, textarea, Lưu nháp, Nộp bài) render anywhere in it.
  AC-1178.10 Focus/Escape — Given the graded sheet is open, Then it is role='dialog' aria-modal='true', focus-trapped, and Escape closes it with focus restored to the "Xem điểm & nhận xét" CTA.

UC-1179: Error/retry paths
  AC-1179.1 List error copy — Given the list fetch fails (network-error or unknown), Then EduError renders title "Không thể tải danh sách bài tập" and description "Đã có lỗi xảy ra. Vui lòng thử lại." with a "Thử lại" button.
  AC-1179.2 List retry re-fetch — Given the EduError state is shown, When "Thử lại" is clicked, Then the exact same fetch re-triggers and EduSkeleton reappears while it is pending.
  AC-1179.3 List retry double-click guard — Given a retry request is already in flight, When "Thử lại" is clicked again, Then no second concurrent fetch is triggered (button disabled/busy while pending).
  AC-1179.4 Submit inline error preserves state — Given any of UC-1177's submit-failure ACs (AC-1177.3–1177.7), Then the sheet's file/text form state is preserved as-is for the student to review/retry (except the auto-close cases AC-1177.4/1177.5, where preservation is moot since the sheet closes by design).
  AC-1179.5 Mutually exclusive states — Given the list is in any one of loading/empty/error/success, Then no other of those states renders simultaneously.
```

## 5. Edge Case Matrix

| Use case / feature | Empty | Max-length / oversized | Concurrent | Auth-expired | Network-error | Wrong-role |
| --- | --- | --- | --- | --- | --- | --- |
| UC-1171 List | AC-1171.2–1171.5 (4 distinct per-tab EduEmpty copies) | N/A | Rapid tab-switch mid-fetch → prior tab's in-flight request result is discarded on unmount (stale-response guard; standard TanStack Query key-change behavior, not a new mechanism) | Handled by the existing http interceptor/session refresh, not surfaced as a list-specific error | AC-1171.6 EduError + Thử lại | N/A — screen is student-only; non-student roles never reach this route via the existing route guard (NFR-006) |
| UC-1175 Submit sheet (file) | N/A | AC-1175.3 file-too-large blocks Nộp bài; AC-1175.4 does NOT block Lưu nháp (decision below) | Draft saved on one device is NOT synced elsewhere (client-local only, per INT-117-03 decision) — reopening on another device/session will not show the draft | Same interceptor pattern (moot for INT-117-03 since it's a local-only write) | AC-1177.3 simulated network-error on submit → inline error, state preserved | N/A |
| UC-1176 Overdue confirm | N/A | N/A | AC-1176.6 assignment becomes overdue while sheet is already open → recomputed at submit-click time, not at sheet-open time (decision below) | N/A | N/A | N/A |
| UC-1177 Submit | N/A | N/A | AC-1177.4/1177.5 already-submitted/not-found (concurrent external change) → inline error, sheet auto-closes to refreshed list; AC-1177.8 rapid double-click guarded by the disabled/aria-busy submitting sub-state | Same interceptor pattern | AC-1177.3/1177.7 inline error + retry (except forbidden, no retry) | N/A |
| UC-1178 Graded sheet | AC-1178.5 comment-empty fallback copy; AC-1178.7 graded-file link absent when no file | N/A | N/A (read-only, no mutation) | Same interceptor pattern | N/A (no submit call from this sheet) | N/A |

### Specific edge-case decisions (as requested)

| # | Edge case | Decision | Rationale |
| --- | --- | --- | --- |
| 1 | File-too-large during "Lưu nháp" — block draft-save too, or only "Nộp bài"? | **Only "Nộp bài" is blocked.** "Lưu nháp" proceeds normally even with an oversized file attached. | FR-005's errorCondition explicitly scopes the block to "submit blocked until resolved"; FR-007b's postcondition has no such validation clause. Draft-save is local-only/lenient by design (INT-117-03) — forcing the student to fix the file before merely saving progress adds friction with no integrity benefit (no bytes ever leave the client either way). |
| 2 | Rapid double-click on "Nộp bài" | **Guarded — the submitting sub-state (spinner + disabled + aria-busy) engages on the FIRST click**, so a second rapid click/Enter is absorbed by the disabled control and never fires a second `submitAssignment` call. | FR-009's submitting sub-state already specifies "disabled"; this AC (AC-1177.8) makes the double-click guard explicit and testable. |
| 3 | Tab switch while a sheet is open | **Not reachable / no special-case behavior needed.** The submit/graded sheet is a focus-trapped modal (NFR-001) over a scrim — the tab-bar sits behind the scrim and is excluded from the focus-trap's tab order, so a student cannot activate a filter tab while a sheet is open (must close it first, e.g. Escape). | Consistent with the existing sheet a11y contract (focus-trap + scrim) already specified for both sheets in design-spec.jsonc; no new interaction rule was needed once the a11y contract is honored correctly. |
| 4 | Assignment becomes overdue while its sheet is already open | **Recomputed at submit-click time, not at sheet-open time** (AC-1176.6). | Matches the task's explicit guidance and is the only behavior consistent with FR-006's trigger definition ("clicks 'Nộp bài' ... while the assignment is overdue") — the trigger is evaluated at click time by construction, so no extra polling/recompute-on-open logic is needed inside the sheet. |

## 6. Open Questions

- `[OPEN QUESTION #1 — i18n gap found, NOT silently invented]` The staged
  `assignments` namespace does NOT support an interpolated overdue-days count.
  `assignments.card.daysLeft.overdue` = `"Quá hạn"` (vi.json line 694) has no
  `{n}`/`{days}` placeholder, but FR-003 and `design-spec.jsonc`
  `card.daysLeftBadge.labelPattern`/`card.overdue.badge` both require
  **"Quá hạn {n} ngày"** (with the day count). This is a genuine, pre-existing
  gap in the already-staged namespace, not something this document invents —
  flagging for `ba-spec-writer`/`fe-lead` to register a key change (e.g.
  amending `daysLeft.overdue` to accept a `{days}` param, or adding a sibling
  key such as `daysLeft.overdueWithDays: "Quá hạn {days} ngày"`) in BOTH
  `vi.json` and `en.json` before `fe-nextjs-engineer` implements AC-1173.3/
  AC-1172's overdue badge. Do not invent the final key name here — that's a
  `ba-lead`/`uiux-ux-writer` copy decision per `.claude/rules/i18n.md`.
- `[OPEN QUESTION #2 — RESOLVED, new key needed]` Mock graded-file download
  behavior (carried from requirements.md/integration.md): **resolved as
  "clicking it never attempts a real download and shows a toast telling the
  student it's a demo with no real file"** (AC-1178.6) — chosen over a
  disabled/no-op link because a silent no-op could read as a broken feature,
  while an honest toast matches this repo's existing mock-signal pattern
  (e.g. US-E19.1's non-persisted-pin signal). **However, no such toast copy
  key currently exists** in the `assignments.graded.*` namespace (only
  `attachedFileLabel`/`downloadAriaLabel` are staged) — `ba-spec-writer` must
  register a new key (e.g. `assignments.graded.mockDownloadToast`) in both
  `vi.json`/`en.json` before implementation; suggested copy direction "Đây là
  bản demo — không có tệp thật để tải." but the final microcopy should go
  through `ba-lead`/`uiux-ux-writer`, not be hardcoded by `fe-nextjs-engineer`.
- `[OPEN QUESTION]` (carried from integration.md, informational only — no AC
  impact in this story) Whether a future real `lms` endpoint will send
  `statusFilter` server-side or expect client-side filtering, and whether it
  will paginate the assignment list — both are repository-swap-only concerns
  for a future story, not something this story's AC needs to anticipate.
- `[OPEN QUESTION]` (carried from integration.md, informational only) Field
  names in `INT-117-01/02` are inferred, not confirmed against a published
  `lms` OpenAPI spec (none exists yet) — whoever wires the real repository
  later must reconcile shape drift as a decision, not a silent rename; no AC
  in this document depends on the exact wire field names since everything is
  mock-first.
