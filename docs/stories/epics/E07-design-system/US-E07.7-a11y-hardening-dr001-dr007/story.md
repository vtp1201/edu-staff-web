# US-E07.7 — A11y Hardening: WCAG 2.1 AA gaps on DR-001→DR-007 screens

| Field | Value |
|---|---|
| **ID** | US-E07.7 |
| **Epic** | E07 — Design System Foundation |
| **Lane** | normal |
| **Status** | in-progress |
| **Branch** | feat/us-e07.7-a11y-hardening |
| **Hard-gate flags** | None (no auth/RBAC/token/session/tenant/data-loss/PII/new token changes) |

## Summary

The UI/UX team delivered design-spec entries for 7 already-implemented screens (DR-001→DR-007) and flagged WCAG 2.1 AA follow-up items in each. This story consolidates them into one a11y-hardening pass: audit the actual `src/` implementations against flagged items, fix only CONFIRMED real gaps (TDD), and close with gate-green.

CRITICAL FRAMING: Flags originated from vanilla-HTML reference JSX in `design_src/edu/*.jsx`. The real `src/` implementations use Radix/shadcn (handles most ARIA/focus/role automatically) and `src/app/globals.css:199` has a GLOBAL `@media (prefers-reduced-motion: reduce)` reset with `!important` covering all elements. Many flagged items are already handled.

## Audit Findings — Per Screen

### DR-001 assessment-scheme
- Icon-only band delete + column delete buttons: `aria-label` PRESENT (lines 335, 715). ALREADY COVERED.
- Success-toast motion: covered by global `@media (prefers-reduced-motion)` reset. ALREADY COVERED.
- `aria-invalid` + `aria-describedby` on inputs: PRESENT. ALREADY COVERED.
- **Confirmed gaps: 0**

### DR-002 grades / grade-book
- Score color `#13DEB9` contrast: `getScoreColorClass()` returns `text-edu-success-text` (token = accessible foreground, ~5.4:1), NOT raw `#13DEB9`. ALREADY COVERED.
- Grade input touch target: `ScoreCell` uses `min-h-[44px]` (line 89 of grade-entry-table.tsx). ALREADY COVERED.
- `gb-pulse` / toast animations: covered by global reset. ALREADY COVERED.
- **Confirmed gaps: 0**

### DR-003 teaching-plan
- Custom select `aria-expanded`/`aria-haspopup`: uses Radix `Select` — ALREADY COVERED by Radix semantics.
- Reject-reason textarea `aria-required`/`aria-describedby`: `aria-invalid` + `aria-describedby` present in `reject-dialog.tsx`. NOTE: `aria-required` not set, but the label text indicates required and validation fires on submit — minor, not a WCAG failure (label conveys requirement).
- Approve/reject buttons `aria-label` including teacher name: REAL GAP — `principal-review-screen.tsx` approve/reject buttons show only "Duyệt"/"Từ chối" without contextual plan info, ambiguous when multiple plans are listed.
- Week-jump keyboard: plan grid uses standard buttons. ALREADY COVERED.
- **Confirmed gaps: 1** (A11Y-050: approve/reject buttons need plan-contextual `aria-label`)

### DR-004 lesson-bank
- File input keyboard alt: `aria-label` present on drop-zone button. ALREADY COVERED.
- `aria-live` upload progress: upload is handled by Sonner toast (live region built-in). ALREADY COVERED.
- Owner toggle `aria-pressed`: uses Radix `Toggle` which sets `aria-pressed` automatically. ALREADY COVERED.
- Card action `aria-label` including title: action buttons inside `lesson-detail-sheet.tsx` have text labels. ALREADY COVERED.
- Skeleton `aria-label` i18n: REAL GAP — `lesson-bank-skeleton.tsx` uses hardcoded Vietnamese `aria-label="Đang tải danh sách bài giảng"` and `sr-only` span, violating i18n rule (all UI strings must be in `messages/{vi,en}.json`).
- **Confirmed gaps: 1** (A11Y-051: lesson-bank-skeleton hardcoded i18n violation)

### DR-005 exam-bank
- Unsaved indicator `aria-live`: builder uses Sonner toasts (live). ALREADY COVERED.
- `aside role="complementary"`: `<aside>` is present — HTML5 `aside` implicitly has `role="complementary"` per spec. However, it has NO `aria-label`, so when multiple landmarks exist it is anonymous to SRs. REAL GAP: add `aria-label` to `<aside>` and `<section>` in exam-builder.
- MCQ correct-answer radio `aria-label` per option: present (line 100 of `mcq-editor.tsx`). ALREADY COVERED.
- Publish-disabled `aria-disabled`: present (line 50 of `builder-action-bar.tsx`). ALREADY COVERED.
- Dialog focus-on-safe-default: Radix `AlertDialog` handles this. ALREADY COVERED.
- **Confirmed gaps: 1** (A11Y-052: exam-builder landmark regions unlabeled)

### DR-006 notification
- All checks: tabs `role=tab` + `aria-selected`, live regions (`role=log aria-live=polite`, `role=alert aria-live=assertive`), loading skeleton `aria-busy`, mark-all-read `aria-label`, row `aria-label`. All PRESENT.
- **Confirmed gaps: 0**

### DR-007 announcements
- Audience chips `aria-pressed`: PRESENT (announcement-drawer.tsx line 270, 307). ALREADY COVERED.
- Priority `role=radiogroup`: implemented as `aria-pressed` toggle buttons with `fieldset/legend` grouping — functionally correct, acceptable pattern. ALREADY COVERED.
- Schedule calendar `aria-label`: uses shadcn Calendar (Radix DayPicker) — handles `aria-label` for dates. ALREADY COVERED.
- Read-receipt progress `aria-label` with %: present (`aria-label={t("readProgressLabel", { pct: readPct })}`). ALREADY COVERED.
- Icon-only buttons `aria-label`: all present (actionView, actionEdit, actionDelete). ALREADY COVERED.
- Dialog/alertdialog focus-trap: Radix `Sheet`/`AlertDialog`. ALREADY COVERED.
- **Confirmed gaps: 0**

## Acceptance Criteria

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | Multiple teaching plans listed in principal review | SR reads approve/reject button | Each button announces with plan subject+class+teacher context |
| AC-2 | Lesson bank loading (skeleton) | SR encounters loading state | `aria-label` text comes from i18n key (vi: "Đang tải danh sách bài giảng", en: "Loading lesson list") |
| AC-3 | Exam builder open | SR navigates landmarks | aside has `aria-label` "Danh sách câu hỏi", section has `aria-label` "Soạn câu hỏi" |
| AC-4 | All 3 fixes applied | `bunx tsc --noEmit` | Zero type errors |
| AC-5 | All 3 fixes applied | `bun vitest run` | All tests pass |

## Fixes Required (3 confirmed gaps)

### A11Y-050: Teaching-plan approve/reject contextual aria-label
- **File**: `src/features/teaching-plan/presentation/teaching-plan-screen/principal-review-screen.tsx`
- **Fix**: Add `aria-label={t("actions.approveForPlan", { subject: plan.subjectName, className: plan.className })}` and `aria-label={t("actions.rejectForPlan", { ... })}` to the approve/reject buttons.
- **i18n keys needed**: `teachingPlan.actions.approveForPlan`, `teachingPlan.actions.rejectForPlan`

### A11Y-051: Lesson-bank skeleton i18n compliance
- **File**: `src/features/lesson-bank/presentation/lesson-bank-screen/lesson-bank-skeleton.tsx`
- **Fix**: Accept `t = useTranslations("lessonBank")` and replace hardcoded strings with `t("loadingAriaLabel")` and `t("loadingSR")`.
- **i18n keys needed**: `lessonBank.loadingAriaLabel`, `lessonBank.loadingSR`

### A11Y-052: Exam-builder landmark labels
- **File**: `src/features/exam-bank/presentation/exam-builder-screen/exam-builder-screen.tsx`
- **Fix**: Add `aria-label={t("builder.questionListAriaLabel")}` to `<aside>` and `aria-label={t("builder.editorAriaLabel")}` to `<section>`.
- **i18n keys needed**: `examBank.builder.questionListAriaLabel`, `examBank.builder.editorAriaLabel`

## Dependencies

None — no in-flight US, independent of all other feature modules.

## Test proof target

| Layer | Target | Real proof |
|---|---|---|
| Unit | Existing tests must remain green | `bun vitest run` |
| Story | Storybook interaction tests for affected screens | existing stories |
| E2E | N/A for this hardening (no flow change) | — |
