# US-E11.7 Student Assignments (list, submit, graded feedback)

## Status

implemented

## Lane

normal

## Dependencies

> Dùng cho parallel branch workflow (decision `0025`). Giúp fe-lead phát hiện ràng
> buộc với US team khác đang làm trước khi claim.

- No in-flight branch touches `src/features/lms/`, the `assignments` i18n
  namespace, or the `lms.assignments` `design-spec.jsonc` key as of
  2026-07-14 (per DR-020's own claim-check note — only its own now-merged
  design branch touched these paths).
- **US-E11.6 (Student Lesson Player)** is a sibling, already-implemented
  feature under `src/features/lms/presentation/student-courses/` — useful
  for component/spacing conventions (list-card shape, sheet patterns) but is
  NOT a hard dependency; this story does not import from it.
- Blocks: none. This story is purely additive to `features/lms` (a new
  `student-assignments` presentation slice) — no shared contract is being
  redefined, unlike the US-E19.1/US-E19.2 Report-dialog coupling in the
  sibling social epic.
- Feature module(s) chạm: `src/features/lms/` (extend existing module —
  domain `AssignmentFailure`, `ILmsRepository.listAssignments`/
  `submitAssignment`, `MockLmsRepository` extension, new presentation slice
  `student-assignments/`), `(app)/student/assignments` route.
- Shared contract/file: none new — reuses the existing `assignments` i18n
  namespace (extended per spec.md §8 GAP #1/#2), the existing
  `EduSkeleton`/`EduEmpty`/`EduError` shared state primitives, and the
  existing score-color/badge-color mappings already normative in
  `.claude/rules/design-system.md`.

## Product Contract

The Student Assignments screen (`(app)/student/assignments`, student role
only) lets a student see assignments assigned to their own class(es),
filterable by 4 tabs (Tất cả/Chưa nộp/Đã nộp/Đã chấm). Each assignment
renders as a card with a status-derived days-left badge (color mapping fixed
by the design system: pending ≤1 day → error, ≤3 days → warning, >3 days →
success; submitted → primary; graded → success), with a special-case overdue
styling (error border tint, error due-line, "Quá hạn {n} ngày" badge) when a
pending assignment's deadline has passed. The card's CTA routes to one of two
sheets depending on status: a submit sheet (pending: edit mode with mock
file-picker + optional textarea + Lưu nháp/Nộp bài; submitted: same shell,
read-only) or a graded feedback sheet (score chip, teacher comment with
empty-fallback, optional graded-file mock-download link, timestamps).
Submitting an overdue assignment requires an explicit confirm dialog. The
pending→submitted transition is a local, simulated-async state change
(mock-first, decision `0014`, since `lms` has no real assignment endpoint
yet). "Lưu nháp" (save draft) is 100% client-local, no network call at all.
All 4 mandatory async UI states (loading/empty/error/success) plus a
submitting sub-state are required, with 4 distinct per-tab empty copies.

## Relevant Product Docs

- `docs/design-requests/DR-020-student-assignments.md`
- `docs/product/design-spec.jsonc` → `screens.lms.assignments` (~line 1212)
- `design_src/edu/assignments.jsx` (`StudentAssignmentsScreen`)
- `docs/product/screens.md` (Assignments row, `(app)/student/assignments`)
- `docs/product/roles-permissions.md` (student role, `(app)/student/**`)
- This packet: `requirements.md` (TR-117), `integration.md`
  (INT-117-01/02/03), `use-cases.md` (UC-1171…UC-1179), `spec.md`
  (consolidated spec + traceability)

## Acceptance Criteria

Full Given/When/Then AC live in `use-cases.md` (AC-1171.x…AC-1179.x, 62
total, confirmed 100% FR/NFR coverage in `spec.md` §9). This is the practical
build checklist:

- Filter tab-bar (`role=tablist`, 4 fixed tabs) defaults to "Tất cả"; tab
  switch unmounts the previous list and starts an independent
  loading→(empty|error|success) cycle for the new tab; arrow-key navigation
  + Enter/Space activation per the WCAG tablist pattern.
- Assignment card: course-color icon box, "Bài tập: {title}", meta line
  "{subject} · Lớp {className} · GV: {teacherName}", due line, and a
  days-left/status badge (icon+text, never color-only) per the fixed
  design-system mapping; graded cards additionally show the score chip.
- Overdue special case: error/40 border tint + error due-line + "Quá hạn {n}
  ngày" badge, applies ONLY when `status === pending` — never on submitted/
  graded even if the deadline has passed.
- CTA routes by status: pending → submit sheet (edit mode); submitted → same
  sheet shell, read-only; graded → graded feedback sheet. Concurrent
  removal/modification → inline sheet error, never a blank sheet.
- Submit sheet: mock file-picker (attach/remove, filename chip), optional
  "Nội dung bài làm" textarea, file-too-large (>20MB) blocks ONLY "Nộp bài"
  (not "Lưu nháp"), "Lưu nháp" toast "Đã lưu nháp." with draft
  pre-population on reopen.
- Overdue confirm dialog (title "Nộp bài trễ hạn?", Huỷ/Tiếp tục nộp bài)
  gates submission when overdue; recomputed at the moment "Nộp bài" is
  clicked, not at sheet-open time; Cancel restores focus with no state
  change.
- Submit transition: pending→submitted local simulated-async (mock-first),
  submitting sub-state (spinner + "Đang nộp bài…", disabled, `aria-busy`,
  motion-safe-gated), toast "Nộp bài thành công." (~3.2s auto-dismiss);
  double-click guarded by the disabled CTA; 5 distinct failure branches
  (`network-error`/`already-submitted`/`not-found`/`forbidden`/`unknown`)
  each with defined inline-error behavior.
- Graded feedback sheet: score chip color mapping (≥8 success, <5 error,
  else text-primary), teacher comment with empty-string fallback copy,
  optional graded-file link that shows a mock-download toast (never a real
  download) when activated, "Đã nộp lúc"/"Đã chấm lúc" timestamps, fully
  read-only (no edit controls).
- All 4 required UI states present and mutually exclusive: loading
  (`EduSkeleton`, 4 rows), empty (`EduEmpty`, 4 distinct per-tab copies:
  all/pending/submitted/graded), error (`EduError` + "Thử lại" retry, no
  stacked concurrent retry), success (card list, header subtitle reflects
  `pendingCount`).
- WCAG 2.1 AA: tablist/tab/`aria-selected`; sheets `role='dialog'
  aria-modal='true' aria-labelledby` focus-trapped, Escape-to-close, focus
  restored to the triggering CTA; icon-only controls (remove-file) carry a
  Vietnamese `aria-label`; overdue/error text uses `--edu-error-text` (ADR
  `0049`); no layout break at 320px, tabs scroll horizontally on overflow,
  sheet full-bleed on mobile.

## Design Notes

- Commands: `submitAssignment` (mock-first, extends `ILmsRepository`),
  save-draft (presentation-local, no repository method — see
  `integration.md` INT-117-03 decision).
- Queries: `listAssignments(studentId, statusFilter?)` (extends
  `ILmsRepository`).
- API: `lms` service — **no real endpoint exists** (no `openapi.yaml`, no
  `INTEGRATION.md`); 100% mock-first per decision `0014`. Logical shape
  modeled in `integration.md` INT-117-01 (list) / INT-117-02 (submit) /
  INT-117-03 (draft, no network call at all). Extends the existing
  `MockLmsRepository`/`lms.fixtures.ts` stack (`src/features/lms/
  infrastructure/repositories/mocks/`) — no parallel mock stack.
- Tables: none (mock/local state only — no real persistence in this story).
- Domain rules: overdue = client-derived (`status === pending && dueDate <
  now`), recomputed at submit-click time; days-left badge color mapping
  fixed by the design system; score color mapping (≥8 success, <5 error,
  else text-primary) reused from the existing score-color convention;
  file-too-large (20MB) validation blocks only submit, not draft-save.
- UI surfaces: `src/features/lms/presentation/student-assignments/` (filter
  tabs, card list, submit sheet, overdue-confirm dialog, graded feedback
  sheet, 4 states + submitting sub-state) — net-new presentation slice
  inside the existing `lms` feature module. No new shared component expected
  (reuses `EduSkeleton`/`EduEmpty`/`EduError`, existing `Badge`/score-chip
  patterns).

## Validation

When updating durable proof status, use numeric booleans:
`scripts/bin/harness-cli story update --id US-E11.7 --unit 0 --integration 0 --e2e 0 --platform 0`.

| Layer | Expected proof |
| --- | --- |
| Unit | planned — domain use-cases (list-assignments, submit-assignment) + `AssignmentFailure` mapping, mock repository extension, overdue-derivation helper |
| Integration | planned — mock repository ↔ use-case contract tests for INT-117-01/02 (error-code branching); INT-117-03 tested as a pure local read/write, no HTTP |
| E2E | planned — Storybook interaction stories per UC (tab switch + 4 states, card badge/overdue matrix, CTA→sheet routing, submit sheet file/draft/validation, overdue-confirm accept/cancel/recompute, submit happy-path + 5 failure branches + double-click guard, graded sheet mapping/fallback/mock-download-toast, list error+retry) |
| Platform | planned — manual keyboard-only pass (tablist arrow-keys, sheet focus-trap/Escape/focus-restore for both sheets + the overdue-confirm dialog) |
| Release | planned |

## Harness Delta

- No new i18n namespace — reuses the already-staged `assignments` namespace
  in `src/bootstrap/i18n/messages/{vi,en}.json`. Two content-only gaps to
  close during implementation (both flagged in `spec.md` §8, NOT ADR-worthy,
  owned by `fe-nextjs-engineer` per `.claude/rules/i18n.md`, not by the BA
  team):
  1. `assignments.card.daysLeft.overdue` needs an `{n}`/`{days}` placeholder
     added (currently plain "Quá hạn") to render "Quá hạn {n} ngày" per
     FR-003/AC-1173.3.
  2. A new key (suggested `assignments.graded.mockDownloadToast`, vi copy
     direction "Đây là bản demo — không có tệp thật để tải.") for the
     mock graded-file-download toast per AC-1178.6.
- No new design tokens expected (reuses existing status/score-color mappings
  and existing dialog/sheet a11y conventions already normative in
  `.claude/rules/design-system.md` and `.claude/rules/accessibility.md`).
- No ADR needed for this story (lane: normal, no authz/data-loss change,
  purely additive to `features/lms`).

## Evidence

Design review: pass
- design-system: conform — semantic tokens only (`grep` clean of raw color/
  gradient/glassmorphism anti-patterns in `student-assignments/`); reuses
  `StatusBadge`/`Card`/`Sheet`/`AlertDialog`/`EmptyState` patterns, no forked
  component; role/status color mapping matches the fixed design-system table;
  matches `docs/product/design-spec.jsonc` `screens.lms.assignments` (title
  prefix + zero-state subtitle fixed to match the spec verbatim per
  `fe-tech-lead-reviewer`'s MUST FIX #1/#2).
- a11y: WCAG AA — `fe-accessibility-auditor` pass, 0 blocker, 2 major fixed
  (touch targets on remove-file/graded-download controls), 1 major fixed (SR
  loading announcement on per-tab cold-mount), 2 minor (list semantics
  applied; `destructive` variant on overdue-confirm's proceed action flagged,
  left as a design-judgment call — see below); keyboard/focus-trap/Escape/
  focus-restore verified for all 3 dialogs (submit sheet, overdue-confirm,
  graded sheet); reduced-motion gate present on the submitting spinner.
- impeccable audit (manual, skill invoked via checklist since this run has no
  interactive `/impeccable` slash-command channel): 0 anti-pattern hits
  (no gradient/backdrop-blur/glassmorphism grep hits), theming 4/4 (tokens
  only), responsive 4/4 (no fixed widths, `Sheet` full-bleed <520px per
  plan.md), a11y folded into the accessibility-auditor pass above.
- states: loading (per-tab skeleton + new SR announcement) / empty (4
  distinct per-tab copies) / error (inline alert + guarded retry) / success
  (card list, header subtitle incl. zero-state) all present and mutually
  exclusive; no 320px break (Card/Sheet reflow per plan.md NFR-003).

Open judgment call (not blocking, flagged for a future pass): A11Y-006 —
`overdue-confirm-dialog.tsx`'s "Tiếp tục nộp bài" (proceed) action uses
`variant="destructive"` (red) though it's a confirm, not a delete action.
Left as-is per `fe-accessibility-auditor`'s recommendation to defer to design
sign-off rather than unilaterally restyle a reviewed dialog.

Test proof: see harness `story update` below for numeric flags. Unit +
integration: 1588/1588 `bun vitest run` (41 new assignment-specific tests: 5
derive-overdue, 4 list-use-case, 6 submit-use-case, 3 mapper, 6 mock-repo, 12
badge/score-tone, plus sibling-mock updates). Component/E2E: 21/21 Storybook
interaction tests across 3 story files (screen, submit-sheet, graded-sheet).
`bunx tsc --noEmit`: clean. `bun build`: success (route
`/[locale]/t/[tenant]/student/assignments` registered).

## QA gate + fix pass (fe-qa-playwright → fe-nextjs-engineer)

First QA pass (`fe-qa-playwright`) mapped all 62 AC to tests, wrote 21
additional Storybook interaction cases (42 total across the 3 story files),
and issued a **FAIL** verdict: 6 of the new cases were intentionally red,
documenting 3 real production defects the prior review/audit gates missed —

- **DEF-1 (critical)**: submit sheet didn't auto-close on `already-submitted`/
  `not-found` failures (AC-1177.4/.5) — fixed via a deliberate 700ms
  stale-close delay in `student-assignments-screen.tsx` so the inline error
  paints for a beat before the sheet closes; `network-error`/`forbidden`/
  `unknown` unaffected (sheet stays open for retry, unchanged).
- **DEF-2 (critical)**: focus was not restored to the triggering CTA on
  Escape/Cancel across all 3 dialogs (AC-1174.5, AC-1176.3) — root cause:
  these are **controlled** Radix Dialog/AlertDialog instances with no
  `<SheetTrigger>`/`<AlertDialogTrigger>` wrapping the card CTA, so Radix's
  built-in `triggerRef`-based focus-restore had nothing to restore to. Fixed
  with a new shared hook `src/shared/use-dialog-return-focus.ts` (snapshots
  `document.activeElement` on open, restores it via `onCloseAutoFocus`) —
  no shared `Sheet`/`AlertDialog` primitive was modified, so other
  triggerless consumers (`destructive-confirm-dialog`, `email-verify-dialog`)
  are unaffected by this story and remain candidates for the same fix if
  ever audited.
- **DEF-3 (major)**: card title/badge row didn't wrap at ≤480px (AC-1172.10)
  — fixed by adding `flex-wrap` + `gap-x-2.5 gap-y-1.5` to the row in
  `assignment-card.tsx`.

Re-verification after the fix pass: all 6 previously-red cases now pass;
Storybook interaction suite for this slice is **42/42 green**; full
`bun vitest run` unchanged at **1588/1588**; `tsc`/`bun build` clean. QA
verdict on re-check: **Go**.

Deferred follow-up (not blocking, tracked in Design Notes): platform-layer
manual keyboard-only pass (story.md Validation table) has not been performed
by a human tester — automated Storybook interaction coverage already
exercises tablist arrow-keys, Escape-to-close, and focus-restore for all 3
dialogs, but a literal manual pass is still owed per `.claude/rules/tdd.md`'s
Platform proof tier before the `platform` harness flag can flip to 1.
