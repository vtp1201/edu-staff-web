# US-E11.7 — Student Assignments (list, submit, graded feedback) — Requirements

Source design: `docs/design-requests/DR-020-student-assignments.md` (delivered
2026-07-14, net-new authoring), `docs/product/design-spec.jsonc` →
`screens.lms.assignments` (line ~1212), mockup `design_src/edu/assignments.jsx`
(component `StudentAssignmentsScreen`). Lane: **normal** — no auth/RBAC change
(the screen sits inside the existing `student`-role route family
`(app)/student/**`, gated by the pre-existing route guard, not a new one), no
token/session change, no tenant-isolation change, no PII beyond ordinary
student/assignment data already handled elsewhere in `features/lms`, no
data-loss risk (submit is additive, "Lưu nháp" is non-destructive), and no
validation being weakened (file-too-large / overdue-confirm are new UI
guardrails, not relaxations).

## 1. Requirements Summary

The Student Assignments screen lets a `student` view assignments assigned to
their class (filterable by Tất cả/Chưa nộp/Đã nộp/Đã chấm), submit a mock
file + optional text answer before or after a deadline (with an explicit
overdue confirmation), and view teacher grading feedback (score, comment,
optional graded-file link) once graded. Only the `student` role sees this
screen; there is no principal/teacher/parent view in this story. Constraints:
WCAG 2.1 AA, responsive 375/768/1280 with no break at 320px, vi/en i18n via
the already-staged `assignments` namespace, 4 mandatory async UI states plus
a submitting sub-state, and a mock-first submit flow (decision `0014`) since
`lms` has no real assignment endpoint yet.

## 2. Technical Requirements (JSON)

```json
{
  "requirementId": "TR-117",
  "title": "Student Assignments (list, submit, graded feedback)",
  "status": "Draft",
  "actors": [
    { "role": "student", "capabilities": ["view assignments assigned to own class(es)", "filter by status tab (all/pending/submitted/graded)", "submit an assignment (optional file + optional text answer)", "save a draft answer without submitting", "confirm overdue submission", "view own submission after submitting", "view score + teacher comment + optional graded-file link once graded"] }
  ],
  "functionalRequirements": [
    { "id": "FR-001", "priority": "Must", "description": "The system SHALL render a filter tab-bar with role='tablist' and four tabs (Tất cả/Chưa nộp/Đã nộp/Đã chấm, role='tab' + aria-selected), defaulting to 'Tất cả', and SHALL show only assignments matching the active tab's status.", "trigger": "screen load / tab click", "preconditions": ["user authenticated as student"], "postconditions": ["active tab's assignment set displayed", "page-header subtitle reflects current pendingCount"], "errorConditions": ["assignment fetch fails → error state (FR-008)"] },
    { "id": "FR-002", "priority": "Must", "description": "The system SHALL render one card per assignment showing course-color icon box, title ('Bài tập: {title}'), meta line ({subject} · Lớp {class} · GV: {teacher}), due-line ('Hạn nộp: {dueDate}'), and a status-derived days-left badge using the fixed design-system mapping (pending ≤1 day → error, ≤3 days → warning, >3 days → success; submitted → primary; graded → success), pairing every badge with an icon (never color-only).", "trigger": "list render for active tab", "preconditions": ["assignment data loaded"], "postconditions": ["card anatomy matches design-spec.jsonc lms.assignments.card"], "errorConditions": [] },
    { "id": "FR-003", "priority": "Must", "description": "The system SHALL mark an assignment as overdue when its deadline has passed and it is still unsubmitted, rendering the card with an error/40 border tint, an error-colored due-line, and a 'Quá hạn {n} ngày' badge (icon + text, not color-only) instead of the normal days-left badge.", "trigger": "card render when dueDate < now AND status === pending", "preconditions": [], "postconditions": ["overdue visual state applied consistently with design-spec.jsonc lms.assignments.card.overdue"], "errorConditions": [] },
    { "id": "FR-004", "priority": "Must", "description": "The system SHALL change the card's CTA and supporting content per status: pending → 'Nộp bài' (primary) opens the submit sheet; submitted → 'Xem bài đã nộp' (secondary) opens the submit sheet in read-only submitted view with submittedAt timestamp; graded → 'Xem điểm & nhận xét' (secondary) opens the graded feedback sheet.", "trigger": "CTA click", "preconditions": ["card rendered with resolved status"], "postconditions": ["correct sheet opens for the assignment's current status"], "errorConditions": ["sheet data fetch fails → sheet shows inline error, does not silently open empty"] },
    { "id": "FR-005", "priority": "Must", "description": "The system SHALL open a submit sheet (role='dialog', aria-modal='true', aria-labelledby, focus-trapped, Escape-to-close with focus restored to the triggering CTA) containing the read-only assignment title + description, a mock file-picker (accept-only, preview filename + remove control, no real upload), and an optional 'Nội dung bài làm' textarea, with 'Lưu nháp' (secondary) and 'Nộp bài' (primary) actions.", "trigger": "'Nộp bài' CTA click", "preconditions": ["assignment status === pending"], "postconditions": ["sheet open and focused; file/textarea state held locally until Lưu nháp/Nộp bài"], "errorConditions": ["attached file exceeds mock size limit (20MB) → inline role='alert' validation message ('Tệp đính kèm vượt quá dung lượng cho phép (tối đa 20MB).'), submit blocked until resolved"] },
    { "id": "FR-006", "priority": "Must", "description": "The system SHALL show an overdue confirmation dialog ('Bạn đang nộp bài trễ hạn, bạn có muốn tiếp tục?', title 'Nộp bài trễ hạn?', actions Huỷ/Tiếp tục nộp bài) when the user clicks 'Nộp bài' on an assignment whose deadline has already passed, and SHALL only proceed to submit when the user confirms.", "trigger": "'Nộp bài' click inside submit sheet while assignment is overdue", "preconditions": ["assignment is overdue (pending + deadline passed)"], "postconditions": ["confirm accepted → submit proceeds (FR-007)", "confirm cancelled → returns to submit sheet, no state change"], "errorConditions": [] },
    { "id": "FR-007", "priority": "Must", "description": "The system SHALL transition an assignment from pending to submitted via a local, simulated-async state change (mock-first, decision 0014 — no real `lms` assignment endpoint exists yet) on 'Nộp bài' confirmation, closing the sheet, flipping the card to its submitted state, and showing an auto-dismissing confirmation toast (role='status', 'Nộp bài thành công.').", "trigger": "submit confirmed (non-overdue direct, or overdue-confirmed)", "preconditions": ["no blocking validation error (e.g. file-too-large) present"], "postconditions": ["card status = submitted; submittedAt timestamp recorded; toast shown"], "errorConditions": ["simulated submit failure → sheet stays open with inline error, submitted state not applied"] },
    { "id": "FR-007b", "priority": "Should", "description": "The system SHALL allow the student to save a draft answer ('Lưu nháp') without changing the assignment's submitted status, showing a confirmation toast ('Đã lưu nháp.') and preserving the draft's file/text locally for the next time the sheet is opened.", "trigger": "'Lưu nháp' click inside submit sheet", "preconditions": ["assignment status === pending"], "postconditions": ["draft content persisted locally (mock-first); assignment status unchanged"], "errorConditions": [] },
    { "id": "FR-008", "priority": "Must", "description": "The system SHALL open a read-only graded feedback sheet (same dialog shell/a11y as the submit sheet) showing a score chip (icon award, {score}/{max}, colored per the existing score mapping: score≥8 success, <5 error, else text-primary), the teacher's comment block ('Nhận xét của giáo viên', muted-background card, or 'Giáo viên chưa để lại nhận xét.' when empty), an optional graded-file download link when a graded file exists, and 'Đã nộp lúc'/'Đã chấm lúc' timestamps.", "trigger": "'Xem điểm & nhận xét' CTA click", "preconditions": ["assignment status === graded"], "postconditions": ["graded sheet open with correct score coloring and all present fields rendered"], "errorConditions": [] },
    { "id": "FR-009", "priority": "Must", "description": "The system SHALL render the four mandatory async UI states for the assignment list — loading (EduSkeleton, 4 skeleton rows), empty (EduEmpty, per-tab distinct copy: all → 'Bạn chưa có bài tập nào.' / pending → 'Không có bài tập nào cần nộp 🎉' / submitted → 'Chưa có bài nộp nào.' / graded → 'Chưa có bài nộp nào.'), error (EduError with a 'Thử lại' retry action), and success (card list) — exactly one visible at a time consistent with fetch status — plus a submitting sub-state on the submit sheet (primary CTA replaced by spinner + 'Đang nộp bài…', disabled, motion-safe-gated animation).", "trigger": "data fetch lifecycle / submit action lifecycle", "preconditions": [], "postconditions": ["state shown matches current fetch/submit status"], "errorConditions": ["list fetch error → EduError + retry re-triggers fetch"] }
  ],
  "nonFunctionalRequirements": [
    { "id": "NFR-001", "category": "Accessibility", "requirement": "Filter tabs use role='tablist'/'tab'/aria-selected; submit and graded sheets are role='dialog' aria-modal='true' aria-labelledby with focus-trap (Tab/Shift+Tab cycle), Escape-to-close, and focus restored to the triggering CTA on close; every status badge (days-left, submitted, graded, overdue) pairs an icon with a text label, never color-only; icon-only controls (sheet close, remove-file) carry a Vietnamese aria-label; toast uses role='status'; validation/overdue-confirm messaging uses role='alert' or errorText color + icon, not color alone; overdue/error text uses --edu-error-text (ADR 0049), not raw --edu-error.", "measurableTarget": "WCAG 2.1 AA; contrast ≥4.5:1 body text / ≥3:1 large text & icons; zero critical axe/impeccable violations" },
    { "id": "NFR-002", "category": "Accessibility", "requirement": "All interactive controls (CTA buttons, file-picker trigger, tab items, sheet close) are keyboard-operable and meet touch-target sizing on mobile viewports.", "measurableTarget": "≥44×44px touch target at <820px viewport for CTAs and the file-picker control" },
    { "id": "NFR-003", "category": "Responsive", "requirement": "The assignment list stays single-column and card content reflows (title-row wraps to place the badge under the title, meta line wraps) without breaking layout at narrow widths; filter tabs scroll horizontally when they overflow; the submit/graded sheet becomes full-bleed (maxWidth 100vw) on mobile.", "measurableTarget": "no layout break at 320px; verified at 375/768/1280 breakpoints" },
    { "id": "NFR-004", "category": "Performance", "requirement": "The assignment list's loading skeleton must appear promptly to avoid a perceived hang on navigation.", "measurableTarget": "skeleton visible ≤320ms after navigation (product baseline)" },
    { "id": "NFR-005", "category": "i18n", "requirement": "All static UI copy is sourced from the existing `assignments` i18n namespace (vi source + en mirror, already staged in `messages/{vi,en}.json` — filters, card copy, empty states, submit sheet, overdue confirm, graded feedback, error/errors keys); dynamic values (dates, names, scores, filenames) are interpolated at render time, not separate keys.", "measurableTarget": "0 hardcoded user-facing strings outside messages/{vi,en}.json; both locales render without missing-key errors" },
    { "id": "NFR-006", "category": "Security", "requirement": "The screen is reachable only under the existing student-role route family `(app)/student/**`; no new authorization boundary is introduced by this story, and the mock file-picker performs no real upload (no file leaves the client).", "measurableTarget": "route inaccessible to non-student roles via the existing route guard; no network call for file content in this story's scope" }
  ],
  "uiStates": ["loading", "empty", "error", "success", "submitting"],
  "dataDependencies": [
    { "source": "mock", "entity": "assignment (id, title, description, subject, className, teacherName, dueDate, status, submittedAt, gradedAt, score, maxScore, teacherComment, gradedFileName, courseColor)", "sensitivity": "Internal" },
    { "source": "mock", "entity": "assignment submission (draft/submitted answer text + mock attached file metadata)", "sensitivity": "Internal" },
    { "source": "lms", "entity": "assignment (future real endpoint — not yet available, per DR-020 BE-aware note)", "sensitivity": "Internal" }
  ],
  "scope": {
    "inScope": [
      "Assignment list screen: page header (title + pending-count subtitle), 4 filter tabs, vertical assignment card list, status-derived badges (including overdue special case)",
      "Submit sheet: read-only assignment summary, mock file-picker (accept + preview + remove, no real upload), optional answer textarea, Lưu nháp / Nộp bài actions, overdue confirm dialog, submitting sub-state with file-too-large mock validation",
      "Post-submit transition (pending → submitted) as a local, simulated-async state change",
      "Graded feedback sheet: score chip, teacher comment block, optional graded-file download link (UI-only, no real file), submittedAt/gradedAt timestamps",
      "4 mandatory async UI states (loading/empty/error/success) + submitting sub-state, with 4 distinct per-tab empty copies"
    ],
    "outOfScope": [
      "Real `lms` assignment BE endpoint implementation (mock-first per decision 0014 — service does not exist yet)",
      "Real file upload/storage integration (mock accept + filename preview only)",
      "Teacher/principal-facing assignment creation, editing, or grading screens (separate future story)",
      "A detail sub-route for assignments (submission happens inline via the submit sheet, per DR-020 route note)",
      "Secondary subject-filter dropdown/chip row (DR-020 flags this as optional/nice-to-have, not required for MVP — deferred)",
      "Pixel-level UI implementation (owned by fe-nextjs-engineer against design-spec.jsonc lms.assignments entry)"
    ],
    "externalDependencies": [
      "BE service `lms`: no assignment endpoint exists yet; `/ba` + `/fe` wire a real repository when it lands (see `src/features/lms/infrastructure/repositories/mocks/lms.fixtures.ts` pattern already used for courses/lessons)",
      "Shared Screen State Primitives (EduSkeleton/EduEmpty/EduError) from the design-system component set (`design_src/edu/states.jsx`)",
      "Existing `assignments` i18n namespace in `src/bootstrap/i18n/messages/{vi,en}.json` (already fully staged by DR-020's ux-writer pass — no new keys anticipated, see Open Questions)"
    ]
  },
  "assumptions": [
    "[ASSUMPTION] A student sees assignments only for the class(es) they belong to; cross-class visibility is out of scope (no design-spec or DR-020 note suggests otherwise).",
    "[ASSUMPTION] 'Lưu nháp' (save draft) persists only locally/mock-first for this story — no draft-sync-across-devices requirement stated in DR-020.",
    "[ASSUMPTION] The optional subject-filter chip row mentioned in DR-020 as 'nice-to-have, not required for MVP' is treated as Won't for this story's Must/Should scope; it can be picked up as a follow-up enhancement if requested.",
    "[ASSUMPTION] 'Overdue' is computed purely from dueDate vs. current client time (no server-side grace period or timezone-adjustment rule specified)."
  ],
  "openQuestions": [
    "The `assignments` i18n namespace already exists in full (filters, card, empty, errors, submit, graded — verified in vi.json lines 675-765 / en.json mirror). If `ba-spec-writer`/`fe-nextjs-engineer` finds a genuine gap while wiring AC (e.g. an aria-label or a dueToday-specific badge label not covered above), flag it explicitly for reconciliation rather than adding a parallel key set — none is anticipated here.",
    "Should the mock 'Tải tệp GV đã chấm' (download graded file) link be disabled/no-op or show a toast explaining it's mock-only, so QA/users aren't misled into thinking a real file downloads? Flagging for `ba-use-case-modeler` to decide the AC wording."
  ]
}
```

## 3. Prioritized Requirements Summary (MoSCoW)

| ID | Requirement | Priority | Rationale |
| --- | --- | --- | --- |
| FR-001 | Filter tabs (tablist, 4 fixed tabs) | Must | Core navigation; fixed in design-spec `lms.assignments.filters` |
| FR-002 | Assignment card anatomy + status badge mapping | Must | Primary information unit of the screen; mapping is design-system-fixed, not proposed here |
| FR-003 | Overdue special-case styling | Must | Explicit DR-020/design-spec `card.overdue` behavior; a11y-relevant (never color-only) |
| FR-004 | Status-driven CTA + sheet routing | Must | Core interaction driving all three layouts |
| FR-005 | Submit sheet (file mock + textarea + actions) | Must | Primary student action on this screen |
| FR-006 | Overdue confirm dialog | Must | Explicit DR-020 behavior; prevents accidental late submission |
| FR-007 | Submit → pending→submitted transition (mock-first) | Must | Core flow completion; explicitly mock-first per decision 0014 |
| FR-007b | Save draft (Lưu nháp) | Should | Useful but not required to complete the primary submit flow |
| FR-008 | Graded feedback sheet | Must | Required per DR-020 Layout 3; reuses existing score-color mapping |
| FR-009 | 4 UI states + submitting sub-state | Must | Hard rule (tdd.md / design-system state requirement) |

## 4. Handoff Notes

- **To `ba-integration-analyst`**: there is no `lms` assignment BE endpoint
  yet — document the mock repository shape (`assignment` entity fields listed
  in `dataDependencies`) as the interim contract, and note the seam where a
  real repository would later replace `lms.fixtures.ts`-style mocks (matching
  the pattern already used for student courses/lessons in
  `src/features/lms/infrastructure/repositories/mocks/`). No envelope/error
  mapping work is needed against a real BE in this story since it's fully
  mock-first.
- **To `ba-use-case-modeler`**: model Given/When/Then for FR-001–FR-009
  including all 4 UI states + the submitting sub-state, the 4 distinct
  per-tab empty copies, the overdue-confirm branch (accept/cancel), the
  file-too-large mock validation branch, and the pending→submitted→graded
  status lifecycle; resolve the graded-file mock-download open question
  (see `openQuestions`) with an explicit AC.

## Dependencies

- No in-flight branch touches `src/features/lms/`, the `assignments` i18n
  namespace, or the `lms.assignments` `design-spec.jsonc` key as of
  2026-07-14 (per DR-020's own claim-check note — only its own now-merged
  design branch touched these paths).
- **US-E11.6 (Student Lesson Player)** is a sibling, already-implemented
  feature under `src/features/lms/presentation/student-courses/` — useful
  for component/spacing conventions (list-card shape, sheet patterns) but is
  NOT a hard dependency; this story does not import from it.
- This story is purely additive to `features/lms` (a new `student-assignments`
  presentation slice) — no shared contract is being redefined, unlike the
  US-E19.1/US-E19.2 Report-dialog coupling in the sibling epic.
