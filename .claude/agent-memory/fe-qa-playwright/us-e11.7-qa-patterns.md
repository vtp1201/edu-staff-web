---
name: us-e11.7-qa-patterns
description: Student assignments QA pass — real focus-restore bug found on Sheet/AlertDialog, missing sheet-close on submit-error branches, and a reusable inert-vs-aria-hidden test-query gotcha.
metadata:
  type: project
---

US-E11.7 (student assignments list/submit/graded-sheet, `src/features/lms/presentation/student-assignments/`) QA pass found 2 real production bugs via actual browser interaction testing, both contradicting the story packet's self-reported a11y evidence:

1. **Sheet/AlertDialog focus-restore is broken** — `student-assignments-screen.tsx` + `submit-sheet.tsx` + `overdue-confirm-dialog.tsx`: closing the submit sheet (Escape, from a card CTA) and closing the nested overdue-confirm AlertDialog (Cancel or Escape) both send `document.activeElement` to `<body>`, NOT back to the triggering button. Confirmed NOT a timing/animation artifact (tested with waits up to 3s). Violates AC-1174.5 and AC-1176.3 (WCAG 2.1 AA focus management) despite `fe-accessibility-auditor`'s evidence claiming this was verified. **Reason:** unconfirmed — likely something in this repo's `Sheet`/`AlertDialog` wrapper (`components/ui/sheet`, `components/ui/alert-dialog`) breaks Radix's default `onCloseAutoFocus`, since it reproduces identically across both dialog types and both trigger paths (card CTA and in-sheet button). Worth checking those wrapper files first in any fix pass.

2. **Submit-mutation `onError` never closes the sheet for `not-found`/`already-submitted`** — `student-assignments-screen.tsx`'s `submitMutation.onError` invalidates the query cache but never calls `setSheet(null)`. Violates AC-1177.4/AC-1177.5 ("sheet closes back to an auto-refreshed list"). Only `onSuccess` calls `setSheet(null)`.

3. **Card title-row never wraps at narrow viewports** — `assignment-card.tsx`'s title+badge row (`flex items-start justify-between gap-2.5`) has no `flex-wrap` class, so the badge stays pinned inline next to the title at 375px regardless of title length, violating AC-1172.10 ("title row wraps so the badge moves below the title ... at ≤480px"). Proven via `getBoundingClientRect().top` comparison (title vs badge), not just a class-presence grep.

**How to apply:** any future QA pass on a Radix-based sheet/dialog in this repo should NOT trust an accessibility-auditor's "focus-restore verified" claim without writing an actual browser interaction test (Escape → `toHaveFocus()` on the trigger) — this is exactly the kind of self-report gap this repo's memory index already warns about repeatedly.

**Test-authoring gotcha (reusable):** when Radix Dialog/Sheet is open, it makes ALL background DOM natively `inert` (not just `aria-hidden`). Testing Library's `getByRole(..., { hidden: true })` only overrides the `aria-hidden`-ancestor exclusion rule — it does NOT reach elements under a native `[inert]` ancestor in real Chromium (via `@vitest/browser-playwright`). If you need to drive a test-only harness control (e.g. an open/close toggle button) that sits outside the dialog's portal while the dialog is open, query it with `getByTestId` (unaffected by inert/hidden) and `dispatchEvent(new MouseEvent("click", {bubbles:true}))` instead of `userEvent.click` (which enforces `pointer-events`/inert and will throw).

See also [[storybook-import-pattern]] and the general Radix aria-hidden note in [[us-e10.1-qa-patterns]] for the related Dialog-portal-query pattern.
