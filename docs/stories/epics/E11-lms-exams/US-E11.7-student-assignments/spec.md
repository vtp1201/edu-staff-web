# Feature Spec — Student Assignments (list, submit, graded feedback) (US-E11.7)

Status: Draft   Lane: normal
Sources: `requirements.md` (TR-117, FR-001…FR-009 + FR-007b, NFR-001…006) ·
`integration.md` (INT-117-01/02/03, `AssignmentFailure` union) ·
`use-cases.md` (UC-1171…UC-1179, AC-1171.1…AC-1179.5, 62 AC total) +
`docs/product/design-spec.jsonc` → `screens.lms.assignments` (~line 1212) +
`design_src/edu/assignments.jsx` (`StudentAssignmentsScreen`) ·
DR-020-student-assignments.md

## 1. Scope & Objectives

**Purpose:** Give a `student` a single screen to see assignments assigned to
their own class(es), submit a mock file + optional text answer (with an
explicit overdue-confirmation guardrail), save a draft without submitting, and
view teacher grading feedback (score, comment, optional graded-file link) once
graded — matching DR-020's approved design.

**In scope:**
- Assignment list screen: page header (title + pending-count subtitle), 4
  filter tabs (Tất cả/Chưa nộp/Đã nộp/Đã chấm), vertical assignment card list,
  status-derived badges including the overdue special case.
- Submit sheet: read-only assignment summary, mock file-picker (accept +
  preview + remove, no real upload), optional answer textarea, "Lưu nháp" /
  "Nộp bài" actions, overdue-confirm dialog, submitting sub-state, file-too-
  large (20MB) mock validation.
- Post-submit transition (pending → submitted) as a local, simulated-async
  state change (mock-first, decision `0014`).
- Graded feedback sheet: score chip (mapped color), teacher comment block
  (with empty-comment fallback), optional graded-file mock-download link,
  submittedAt/gradedAt timestamps.
- 4 mandatory async UI states (loading/empty/error/success) with 4 distinct
  per-tab empty copies, plus a submitting sub-state on the submit sheet.

**Out of scope:**
- Real `lms` assignment BE endpoint implementation (mock-first per decision
  `0014` — the `lms` service does not exist yet, no `openapi.yaml`).
- Real file upload/storage integration (mock accept + filename preview only —
  no bytes ever leave the client).
- Teacher/principal-facing assignment creation, editing, or grading screens
  (separate future story).
- A detail sub-route for assignments (submission happens inline via the
  submit sheet, per DR-020's route note).
- The optional subject-filter dropdown/chip row (DR-020 flags this as
  optional/nice-to-have, deferred — not required for MVP).
- Pixel-level UI implementation (owned by `fe-nextjs-engineer` against
  `design-spec.jsonc` `lms.assignments`).

**Definitions:**
- *Overdue* — a client-derived visual state, computed as `status === "pending"
  && dueDate < now`; never a separate server `status` enum value; recomputed
  at the moment "Nộp bài" is clicked (not at sheet-open time).
- *Mock-first* — a client-only, simulated-async state mutation, no real HTTP
  call to a not-yet-existing `lms` endpoint, per decision `0014`.
- *Draft ("Lưu nháp")* — a fully client-local persistence of file/text state,
  not synced across devices, not a network call at all (see INT-117-03).

## 2. Actors & Roles

| Actor/Role | Capability (this story) | Notes |
| --- | --- | --- |
| Student | View own-class assignments filtered by tab; submit (optional file + text); save draft; confirm overdue submission; view own submission; view score + comment + optional graded-file link once graded | Sole actor — no teacher/principal/parent variant in this story |
| (System) simulated-async submit | Internal, mock-first pending→submitted transition | No real BE call exists yet (decision `0014`) |

Role-gated visibility: the entire screen sits under the existing student-role
route family `(app)/student/**`, gated by the pre-existing route guard — this
story introduces **no new authorization boundary** (NFR-006). There is no
per-role variant matrix to model beyond "student only."

## 3. Functional Requirements

### FR-001 — Filter tab-bar
Priority: Must · Source: TR-117/FR-001, UC-1171
The system SHALL render a filter tab-bar with `role='tablist'` and four fixed
tabs (Tất cả/Chưa nộp/Đã nộp/Đã chấm, `role='tab'` + `aria-selected`),
defaulting to "Tất cả", and SHALL show only assignments matching the active
tab's status.
AC:
- Given first navigation to the screen, Then "Tất cả" is the active tab
  (`aria-selected="true"`), and the other 3 tabs are `aria-selected="false"`
  (AC-1171.8).
- Given the user is viewing "Tất cả", When they activate "Chưa nộp", Then the
  "Tất cả" list unmounts and "Chưa nộp"'s own independent
  loading→(empty|error|success) cycle begins (AC-1171.9).
- Given the tablist has focus, When arrow keys are pressed, Then focus moves
  between tabs per the WCAG tablist pattern, and Enter/Space activates the
  focused tab (AC-1171.10).
Dependencies: INT-117-01.

### FR-002 — Assignment card anatomy + status badge mapping
Priority: Must · Source: TR-117/FR-002, UC-1172
The system SHALL render one card per assignment showing course-color icon
box, title ("Bài tập: {title}"), meta line ("{subject} · Lớp {className} ·
GV: {teacherName}"), due-line ("Hạn nộp: {dueDate}"), and a status-derived
days-left badge using the fixed design-system mapping (pending ≤1 day →
error, ≤3 days → warning, >3 days → success; submitted → primary; graded →
success), pairing every badge with an icon (never color-only).
AC:
- Given a pending assignment with 1 day left, Then the badge renders "Còn 1
  ngày" with icon `clock`, color error (AC-1172.1).
- Given a pending assignment due today (0 days left), Then the badge renders
  "Hết hạn hôm nay" (`assignments.card.daysLeft.dueToday`), color error, icon
  `alertTriangle` (AC-1172.4).
- Given a graded assignment, Then the badge renders "Đã chấm", color success,
  icon `checkSquare`, AND the score chip renders with mapped color
  (AC-1172.6).
- Given any badge above, Then it exposes both an icon AND a text label —
  never color alone (AC-1172.7).
Dependencies: FR-001.

### FR-003 — Overdue special-case styling
Priority: Must · Source: TR-117/FR-003, UC-1173
The system SHALL mark an assignment as overdue when its deadline has passed
and it is still unsubmitted, rendering the card with an error/40 border tint,
an error-colored due-line, and a "Quá hạn {n} ngày" badge (icon + text)
instead of the normal days-left badge.
AC:
- Given a pending assignment whose `dueDate` has passed, Then the card border
  renders with an error/40 tint, and the due line renders in
  `--edu-error-text` (bold) (AC-1173.1/.2).
- Given the same precondition, Then the badge renders "Quá hạn {n} ngày" with
  icon `alertTriangle`, replacing the normal days-left badge entirely
  (AC-1173.3).
- Given an assignment whose `dueDate` has passed but `status` is "submitted"
  or "graded", Then NONE of the overdue styling applies (AC-1173.4).
Dependencies: FR-002. **See §8 [GAP] — the badge copy needs an i18n
placeholder fix before this AC can be implemented as written.**

### FR-004 — Status-driven CTA → sheet routing
Priority: Must · Source: TR-117/FR-004, UC-1174
The system SHALL change the card's CTA and supporting content per status:
pending → "Nộp bài" (primary) opens the submit sheet; submitted → "Xem bài đã
nộp" (secondary) opens the submit sheet in read-only submitted view with
`submittedAt`; graded → "Xem điểm & nhận xét" (secondary) opens the graded
feedback sheet.
AC:
- Given a pending card, When "Nộp bài" is clicked, Then the submit sheet
  opens in edit mode with focus moved inside (AC-1174.1).
- Given a submitted card, When "Xem bài đã nộp" is clicked, Then the same
  sheet shell opens read-only with NO edit controls (AC-1174.2).
- Given a card whose underlying assignment was concurrently removed/
  modified, When its CTA is clicked, Then the sheet opens showing an inline
  error, never an empty/blank sheet (AC-1174.4).
Dependencies: FR-002, FR-005, FR-008.

### FR-005 — Submit sheet interaction
Priority: Must · Source: TR-117/FR-005, UC-1175
The system SHALL open a submit sheet (`role='dialog'`, `aria-modal='true'`,
`aria-labelledby`, focus-trapped, Escape-to-close with focus restored to the
triggering CTA) containing the read-only assignment title + description, a
mock file-picker (accept-only, preview filename + remove control, no real
upload), and an optional "Nội dung bài làm" textarea, with "Lưu nháp"
(secondary) and "Nộp bài" (primary) actions.
AC:
- Given the sheet is open in edit mode, When a file is selected, Then a
  filename chip renders (icon + name + remove control) (AC-1175.1).
- Given the student attaches a file >20MB, Then an inline `role="alert"`
  message renders ("Tệp đính kèm vượt quá dung lượng cho phép (tối đa
  20MB).") and "Nộp bài" is blocked until resolved (AC-1175.3).
- Given the same oversized-file state, When "Lưu nháp" is clicked, Then the
  draft save proceeds normally — ONLY "Nộp bài" is blocked (AC-1175.4).
- Given the viewport is <520px, Then the sheet renders full-bleed
  (`maxWidth: 100vw`) (AC-1175.9).
Dependencies: FR-004, FR-006, FR-007, INT-117-02.

### FR-006 — Overdue confirmation dialog
Priority: Must · Source: TR-117/FR-006, UC-1176
The system SHALL show an overdue confirmation dialog ("Bạn đang nộp bài trễ
hạn, bạn có muốn tiếp tục?", title "Nộp bài trễ hạn?", actions Huỷ/Tiếp tục
nộp bài) when the user clicks "Nộp bài" on an assignment whose deadline has
already passed, and SHALL only proceed to submit when the user confirms.
AC:
- Given the open assignment is overdue and the sheet is open, When "Nộp bài"
  is clicked, Then the confirm dialog opens with the specified title/body/
  actions (AC-1176.1).
- Given the dialog is open, When "Huỷ" is clicked (or Escape pressed), Then
  the dialog closes, the sheet returns unchanged, no submission occurs, focus
  returns to "Nộp bài" (AC-1176.3).
- Given the sheet was opened while NOT yet overdue and the deadline passes
  while it remains open, When "Nộp bài" is then clicked, Then overdue-ness is
  recomputed at that moment and the dialog DOES appear (AC-1176.6).
Dependencies: FR-005, FR-007.

### FR-007 — Submit → pending→submitted transition (mock-first)
Priority: Must · Source: TR-117/FR-007, UC-1177
The system SHALL transition an assignment from pending to submitted via a
local, simulated-async state change (mock-first, decision `0014`) on "Nộp
bài" confirmation, closing the sheet, flipping the card to its submitted
state, and showing an auto-dismissing confirmation toast (`role='status'`,
"Nộp bài thành công.").
AC:
- Given a non-overdue pending assignment with valid submit state, When "Nộp
  bài" is clicked and the simulated submit resolves, Then the assignment
  transitions to submitted (`submittedAt = now`), the sheet closes, the card
  flips, `pendingCount` decrements by 1, and the toast auto-dismisses after
  ~3.2s (AC-1177.1).
- Given the simulated submit returns `AssignmentFailure "network-error"`,
  Then the sheet stays open with an inline error, the assignment remains
  pending, and file/text state is preserved for retry (AC-1177.3).
- Given the submitting sub-state (AC-1175.8) is active, When "Nộp bài" is
  clicked again before it resolves, Then no second submission fires — the
  disabled/`aria-busy` CTA absorbs the extra activation (AC-1177.8).
Dependencies: FR-006, INT-117-02.

### FR-007b — Save draft ("Lưu nháp")
Priority: Should · Source: TR-117/FR-007b, UC-1175
The system SHALL allow the student to save a draft answer ("Lưu nháp")
without changing the assignment's submitted status, showing a confirmation
toast ("Đã lưu nháp.") and preserving the draft's file/text locally for the
next time the sheet is opened.
AC:
- Given valid (non-oversized) file/text state, When "Lưu nháp" is clicked,
  Then a toast "Đã lưu nháp." (`role='status'`) appears, the sheet remains
  open, and the assignment's status is unchanged (AC-1175.6).
- Given a draft was saved and the sheet was later closed and reopened, Then
  the previously saved file chip/text pre-populates the sheet (AC-1175.7).
Dependencies: FR-005, INT-117-03.

### FR-008 — Graded feedback sheet
Priority: Must · Source: TR-117/FR-008, UC-1178
The system SHALL open a read-only graded feedback sheet (same dialog shell/
a11y as the submit sheet) showing a score chip (icon `award`, "{score}/
{max}", colored per the existing score mapping: score≥8 success, <5 error,
else text-primary), the teacher's comment block ("Nhận xét của giáo viên",
muted-background card, or the "chưa để lại nhận xét" fallback when empty),
an optional graded-file download link when a graded file exists, and "Đã nộp
lúc"/"Đã chấm lúc" timestamps.
AC:
- Given a graded assignment with score=9, max=10, Then the score chip
  renders "9/10" with success color and icon `award` (AC-1178.1).
- Given `teacherComment` is an empty string, Then the fallback copy "Giáo
  viên chưa để lại nhận xét." renders instead of a blank block (AC-1178.5).
- Given `gradedFileName` is present, Then a download-styled link/button
  renders; When activated, Then NO real download is attempted and a toast
  informs the student it's a demo with no real file (AC-1178.6 — **new i18n
  key needed, see §8**).
- Given `gradedFileName` is NOT present, Then the graded-file link section
  does not render at all (absent, not disabled) (AC-1178.7).
Dependencies: FR-004.

### FR-009 — 4 UI states + submitting sub-state
Priority: Must · Source: TR-117/FR-009, UC-1171, UC-1179
The system SHALL render the four mandatory async UI states for the
assignment list — loading (`EduSkeleton`, 4 rows), empty (`EduEmpty`, 4
distinct per-tab copies), error (`EduError` with a "Thử lại" retry action),
and success (card list) — exactly one visible at a time, plus a submitting
sub-state on the submit sheet (primary CTA replaced by spinner + "Đang nộp
bài…", disabled, motion-safe-gated animation).
AC:
- Given the active tab's fetch is pending, Then `EduSkeleton` renders exactly
  4 rows and no other primary state is visible (AC-1171.1).
- Given the "Chưa nộp" tab's fetch succeeds with `assignments=[]`, Then
  `EduEmpty` renders "Không có bài tập nào cần nộp 🎉" (AC-1171.3).
- Given the active tab's fetch fails with `network-error` or `unknown`, Then
  `EduError` renders with a "Thử lại" retry that re-triggers the same fetch
  (AC-1171.6, AC-1179.1/.2).
- Given "Nộp bài" was confirmed and the simulated submit is in flight, Then
  the CTA is replaced by spinner + "Đang nộp bài…", disabled, `aria-busy`,
  motion-safe-gated (AC-1175.8).
Dependencies: FR-001, FR-007, INT-117-01, INT-117-02.

## 4. Non-Functional Requirements

| NFR | Requirement | Measurable target | QA verification |
| --- | --- | --- | --- |
| NFR-001 Accessibility | Tabs `role='tablist'/'tab'/aria-selected`; sheets `role='dialog' aria-modal='true' aria-labelledby` focus-trapped, Escape-to-close, focus restored; every badge icon+text (never color-only); icon-only controls carry a Vietnamese `aria-label`; toast `role='status'`; validation/overdue-confirm `role='alert'` or error-text+icon; overdue/error text uses `--edu-error-text` (ADR `0049`) | WCAG 2.1 AA; contrast ≥4.5:1 body / ≥3:1 large text & icons; zero critical axe/impeccable violations | `fe-accessibility-auditor` audit + Storybook a11y addon |
| NFR-002 Accessibility (touch) | All interactive controls (CTAs, file-picker trigger, tab items, sheet close) keyboard-operable + touch-target sized | ≥44×44px touch target at <820px viewport for CTAs and file-picker control | Manual/Storybook viewport check |
| NFR-003 Responsive | List stays single-column; card content reflows (title-row wraps, badge under title, meta wraps) at narrow widths; tabs scroll horizontally on overflow; sheet full-bleed on mobile | No layout break at 320px; verified at 375/768/1280 | Storybook viewport addon + manual check |
| NFR-004 Performance | Loading skeleton appears promptly to avoid perceived hang on navigation | Skeleton visible ≤320ms after navigation | Manual/Perf trace on story load |
| NFR-005 i18n | All static copy sourced from the existing `assignments` namespace (vi source + en mirror); dynamic values (dates, names, scores, filenames) interpolated at render, not separate keys | 0 hardcoded user-facing strings outside `messages/{vi,en}.json`; both locales render without missing-key errors | `bunx tsc --noEmit` (typed messages) + grep sweep |
| NFR-006 Security | Screen reachable only under existing `(app)/student/**` route family; no new authz boundary; mock file-picker performs no real upload (no file leaves the client) | Route inaccessible to non-student roles via existing route guard; no network call for file content in this story's scope | Route-guard test + manual check |

## 5. UI States & Flows

| Surface | Loading | Empty | Error | Success |
| --- | --- | --- | --- | --- |
| Assignment list (per tab) | `EduSkeleton` 4 rows | `EduEmpty`, 4 distinct per-tab copies (all/pending/submitted/graded) | `EduError` + "Thử lại" retry (network-error, unknown) | Card list; page-header subtitle reflects `pendingCount` |
| Submit sheet (open) | n/a (sheet opens synchronously; sheet-data fetch failure → inline error per AC-1174.4) | n/a | Inline error on sheet-open data failure | Read-only summary + file-picker + textarea + Lưu nháp/Nộp bài |
| Submit action | Submitting sub-state: spinner + "Đang nộp bài…", disabled, `aria-busy`, motion-safe-gated | n/a | Inline sheet error (network-error/already-submitted/not-found/forbidden/unknown per INT-117-02) — state preserved except auto-close cases | Sheet closes; card flips to submitted; toast "Nộp bài thành công." (~3.2s auto-dismiss) |
| Save draft | Instant local write, no skeleton/submitting state | n/a | n/a (cannot fail over network, per INT-117-03) | Toast "Đã lưu nháp."; sheet stays open; draft pre-populates on reopen |
| Overdue confirm dialog | n/a | n/a | n/a | Confirm → submit proceeds; Cancel → returns to sheet unchanged, focus restored |
| Graded feedback sheet | n/a (opens synchronously) | n/a | Inline error on sheet-open data failure (shared with FR-004 E1) | Score chip + comment block (or fallback) + optional file link + timestamps, fully read-only |

**Key flows:** see `use-cases.md` UC-1171 (list + states), UC-1174 (CTA→sheet
routing), UC-1175/1176/1177 (submit sheet → overdue confirm → transition),
UC-1178 (graded sheet), UC-1179 (error/retry mechanics). Edge-case decisions
(file-too-large scoping, double-click guard, tab-switch-while-sheet-open,
overdue recompute timing) are in `use-cases.md` §5 Edge Case Matrix.

## 6. Data & Integration

Full endpoint catalogue: `integration.md` INT-117-01/02/03. Service: `lms`
— **100% mock-first** (decision `0014`); `lms` has no `openapi.yaml`/
`INTEGRATION.md`/deployed endpoint as of 2026-07-14. Auth: inherited from the
existing student-role route guard for `(app)/student/**` — no new auth logic
in this story.

| INT ID | Logical endpoint | Pagination | Error → UI mapping |
| --- | --- | --- | --- |
| INT-117-01 | `GET /api/v1/lms/students/{studentId}/assignments` (logical, `ILmsRepository.listAssignments(studentId, statusFilter?)`) | Not required for MVP — bounded list, full response in one call | `network-error`/`unknown` → `EduError` + "Thử lại" retry (FR-009) |
| INT-117-02 | `POST /api/v1/lms/assignments/{assignmentId}/submissions` (logical, `ILmsRepository.submitAssignment(assignmentId, { answerText?, fileName?, overdueConfirmed })`) | n/a (single-item action) | `file-too-large` → inline `role="alert"`, client-side, never round-trips; `already-submitted`/`not-found` → inline error + sheet auto-closes to refreshed list; `forbidden` → inline error, no retry; `network-error`/`unknown` → inline error, retry available |
| INT-117-03 | Save Draft — **no endpoint call**, 100% client-local persistence (`{ assignmentId, answerText?, fileName? }`) | n/a | n/a (cannot fail over network; local-storage-quota failure out of scope) |

Payloads are camelCase per `.claude/rules/api-integration.md`. Full field
list (`assignment` entity: id/title/description/subject/className/
teacherName/courseColor/dueDate/status/submittedAt/gradedAt/score/maxScore/
teacherComment/gradedFileName) is defined once in `integration.md` §2 — not
re-listed here. `AssignmentFailure` union (new file,
`src/features/lms/domain/failures/assignment.failure.ts`):
`"network-error" | "not-found" | "forbidden" | "already-submitted" |
"file-too-large" | "unknown"` — members map 1:1 to the already-staged
`assignments.errors.*` i18n keys (no new i18n keys needed for the failure
union itself). PII: `teacherName` = Internal (PII-lite), same tier as
`authorName` in the US-E19.1 feed map.

Mock-first plan (repository interface, fixtures, mock repository,
`resetLmsMockStore()` reseed) is fully specified in `integration.md` §4 — the
FE team extends the existing `MockLmsRepository`/`lms.fixtures.ts` stack, not
a parallel one.

## 7. Use Case Summary

| UC ID | Title | FR coverage | AC count |
| --- | --- | --- | --- |
| UC-1171 | View assignment list (filter tabs + 4 UI states) | FR-001, FR-009 | 11 |
| UC-1172 | Assignment card anatomy + status/badge mapping | FR-002 | 10 |
| UC-1173 | Overdue card special-case styling | FR-003 | 5 |
| UC-1174 | Status-driven CTA → correct sheet opens | FR-004 | 5 |
| UC-1175 | Submit sheet interaction (file, textarea, draft vs. submit) | FR-005, FR-007b, FR-009 | 9 |
| UC-1176 | Overdue confirmation dialog | FR-006 | 6 |
| UC-1177 | Successful submit (pending → submitted transition) | FR-007 | 8 |
| UC-1178 | Graded feedback sheet | FR-008 | 10 |
| UC-1179 | Error/retry paths (list fetch + submit failure) | FR-009 | 5 |

Total: 62 AC (matches `use-cases.md` §1 Use Case Scope Summary and the count
stated in this task's brief). No FR/NFR is left uncovered — see §9
Traceability Matrix for the FR/NFR-by-FR/NFR verification.

## 8. Constraints & Assumptions

**Technical constraints:**
- No published `openapi.yaml`/`INTEGRATION.md` for `lms` — every field name
  in INT-117-01/02 is inferred from `requirements.md` `dataDependencies` +
  `design-spec.jsonc` `lms.assignments` + `design_src/edu/assignments.jsx`.
  Whoever wires the real `lms` repository later MUST reconcile shape drift as
  a decision, not a silent rename (`integration.md` §5).
- Whether a future real `lms` endpoint will send `statusFilter` server-side
  vs. expect client-side filtering, and whether it will paginate, are
  repository-swap-only concerns not needed for this story's AC.

**Confirmed assumptions:**
- [ASSUMPTION] A student sees assignments only for the class(es) they belong
  to; cross-class visibility is out of scope.
- [ASSUMPTION] "Lưu nháp" persists only locally/mock-first — no
  draft-sync-across-devices requirement.
- [ASSUMPTION] The optional subject-filter chip row is Won't for this
  story's Must/Should scope (DR-020 flags it nice-to-have).
- [ASSUMPTION] "Overdue" is computed purely from `dueDate` vs. current client
  time — no server-side grace period or timezone-adjustment rule.
- [ASSUMPTION] Pagination is not required for MVP (small, bounded per-student
  list); a future real endpoint returning `meta.pagination` would need a
  `useInfiniteQuery` swap, not an AC change.

**[GAP]/[CONFLICT]/[OPEN QUESTION]:**
- `[GAP #1 — i18n placeholder missing, pre-existing]` The staged
  `assignments` namespace's `assignments.card.daysLeft.overdue` key currently
  reads plain "Quá hạn" with **no `{n}`/`{days}` placeholder**, but FR-003/
  AC-1173.3 (and `design-spec.jsonc` `card.overdue.badge`) require the
  interpolated form **"Quá hạn {n} ngày"**. This is a genuine gap in the
  already-staged namespace (confirmed present, not invented, by
  `ba-use-case-modeler`) — NOT ADR-worthy (pure content/copy fix, no
  design-system/token/architecture decision) and NOT to be added by the BA
  team, since i18n keys live in app source owned by implementation per
  `.claude/rules/i18n.md`. **fe-lead/fe-nextjs-engineer must add the
  placeholder to BOTH `vi.json` and `en.json`** when implementing AC-1173.3,
  mirroring the existing `remaining: "Còn {days} ngày"` interpolation
  pattern already used elsewhere in this same namespace (e.g. the
  `daysLeft.remaining`-style key). Same-day content fix, done alongside the
  story's implementation commit — not a separate story.
- `[GAP #2 — new key needed, decision already resolved]` AC-1178.6 resolves
  the "should the mock graded-file download be disabled/no-op or show a
  toast" open question as: **it must show a toast telling the student it's a
  demo with no real file**. No such copy key currently exists in the
  `assignments.graded.*` namespace (only `attachedFileLabel`/
  `downloadAriaLabel` are staged). **fe-lead/fe-nextjs-engineer must add a
  new key** — suggested path `assignments.graded.mockDownloadToast` (fe-lead
  may choose a better-fitting name at implementation time) — to BOTH
  `vi.json`/`en.json`, per i18n.md "thêm key ở cả hai file cùng lúc." The
  resolved-but-not-final vi copy direction from `use-cases.md` §6 is "Đây là
  bản demo — không có tệp thật để tải."; final microcopy should be confirmed
  by `ba-lead`/`uiux-ux-writer` if a wording change is desired, but the
  UX/behavior decision itself (toast, not disabled/no-op) is already settled
  and does not block implementation.
  **Neither GAP #1 nor GAP #2 is ADR-worthy** — both are same-day content/
  copy fixes to an existing i18n namespace, not a new design-system token,
  architecture change, or cross-cutting decision.
- `[OPEN QUESTION]` (carried, informational only, no AC impact) Field names
  in INT-117-01/02 are inferred, not confirmed against a published `lms`
  OpenAPI spec (none exists yet).
- `[OPEN QUESTION]` (carried, informational only) Whether `statusFilter` will
  be server-side filtered or client-side filtered, and whether the real `lms`
  endpoint will paginate — repository-swap-only, not an AC concern now.

## 9. Traceability Matrix

| Requirement | Source | Use Case(s) | Integration(s) | Priority |
| --- | --- | --- | --- | --- |
| FR-001 Filter tab-bar | TR-117/FR-001 | UC-1171 | INT-117-01 | Must |
| FR-002 Card anatomy + badge mapping | TR-117/FR-002 | UC-1172 | INT-117-01 | Must |
| FR-003 Overdue special-case styling | TR-117/FR-003 | UC-1173 | INT-117-01 (client-derived from `dueDate`+`status`) | Must |
| FR-004 Status-driven CTA→sheet routing | TR-117/FR-004 | UC-1174 | INT-117-01 (card data), INT-117-02/03 (sheet actions) | Must |
| FR-005 Submit sheet interaction | TR-117/FR-005 | UC-1175 | INT-117-02, INT-117-03 | Must |
| FR-006 Overdue confirmation dialog | TR-117/FR-006 | UC-1176 | INT-117-02 (`overdueConfirmed` flag) | Must |
| FR-007 Submit → pending→submitted | TR-117/FR-007 | UC-1177 | INT-117-02 | Must |
| FR-007b Save draft | TR-117/FR-007b | UC-1175 | INT-117-03 | Should |
| FR-008 Graded feedback sheet | TR-117/FR-008 | UC-1178 | INT-117-01 (graded fields on the assignment entity) | Must |
| FR-009 4 UI states + submitting sub-state | TR-117/FR-009 | UC-1171, UC-1175, UC-1179 | INT-117-01, INT-117-02 | Must |
| NFR-001 Accessibility (a11y contract) | TR-117/NFR-001 | all UCs | none | Must |
| NFR-002 Accessibility (touch target) | TR-117/NFR-002 | UC-1171, UC-1175 | none | Must |
| NFR-003 Responsive | TR-117/NFR-003 | UC-1171, UC-1172, UC-1175 | none | Must |
| NFR-004 Performance | TR-117/NFR-004 | UC-1171 | INT-117-01 | Should |
| NFR-005 i18n | TR-117/NFR-005 | all UCs | none | Must |
| NFR-006 Security | TR-117/NFR-006 | UC-1171 (route boundary) | none | Must |

**AC coverage summary:** `use-cases.md` §4 lists 62 acceptance criteria
(AC-1171.1…AC-1171.11 = 11, AC-1172.1…AC-1172.10 = 10, AC-1173.1…AC-1173.5 =
5, AC-1174.1…AC-1174.5 = 5, AC-1175.1…AC-1175.9 = 9, AC-1176.1…AC-1176.6 = 6,
AC-1177.1…AC-1177.8 = 8, AC-1178.1…AC-1178.10 = 10, AC-1179.1…AC-1179.5 = 5;
sum = 62). Cross-checked against §9 above: every FR-001…FR-009/FR-007b and
every NFR-001…NFR-006 appears at least once in the Traceability Matrix — **no
UNCOVERED requirement**. AC coverage confirmed: **62/62**.

## 10. Handoff to FE

**What `fe-lead` should build:** extend the existing `src/features/lms/`
module (Clean Architecture — no new feature folder needed, this is additive
to the module already used for student courses/lessons) with a net-new
presentation slice `student-assignments/` per `design_src/edu/assignments.jsx`
(`StudentAssignmentsScreen`), a domain `AssignmentFailure` union, use-cases
for list/submit, and a mock repository extension (`listAssignments`,
`submitAssignment` added to `ILmsRepository`/`MockLmsRepository`, per
`integration.md` §4) wired at `(app)/student/assignments`. "Lưu nháp" is
presentation-local (hook/localStorage or query-cache), not a repository
method.

**Suggested lane:** normal (already assigned; no authz/data-loss change of
its own — submit is additive, "Lưu nháp" is non-destructive, no new route
guard).

**Build from:** `design_src/edu/assignments.jsx`, `docs/product/design-spec.jsonc`
→ `screens.lms.assignments`, this spec (`spec.md`), and the two i18n gaps
flagged in §8 (must be resolved as part of this story's implementation
commit, not deferred).

**Proof owed (maps to TEST_MATRIX rows):**

| Layer | Expected proof |
| --- | --- |
| Unit | Domain use-cases (list-assignments, submit-assignment) + `AssignmentFailure` mapping; mock repository (`listAssignments`/`submitAssignment`/fixture coverage across pending-non-overdue/pending-overdue/submitted/graded-with-comment/graded-empty-comment/graded-with-file); overdue-derivation helper (pure function, testable in isolation) |
| Integration | Mock repository ↔ use-case contract tests (INT-117-01/02 error-code branching: `network-error`/`not-found`/`forbidden`/`already-submitted`/`file-too-large`/`unknown`); INT-117-03 tested as a pure local read/write (no HTTP) |
| E2E | Storybook interaction stories per UC: tab switch + 4 states + 4 empty copies, card badge/overdue matrix, CTA→sheet routing (3-way), submit sheet file attach/remove/oversized-block/draft-save/pre-populate, overdue-confirm accept/cancel/recompute-at-click, submit happy-path + all 5 failure branches + double-click guard, graded sheet score-mapping/comment-fallback/file-link-present-absent/mock-download-toast, list error+retry+double-click guard |
| Platform | Manual keyboard-only pass: tablist arrow-keys + Enter/Space, sheet focus-trap + Escape + focus-restore (submit sheet, overdue-confirm dialog, graded sheet) |
