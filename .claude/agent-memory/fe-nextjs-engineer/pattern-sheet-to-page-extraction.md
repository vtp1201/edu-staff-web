---
name: pattern-sheet-to-page-extraction
description: Sharing a Sheet editor body with a new full-page route (hook + fields split), and the saved-feedback race that re-snapshotting causes
metadata:
  type: project
---

Splitting an existing slide-over editor so a new full-page route reuses it (US-E12.13,
`admin/subject-catalogue/presentation/subjects-screen/`).

**Why:** decision `0026` forbids copying the editor body; each consumer still needs its own
footer chrome (SheetFooter vs. page save bar), so a single monolithic form component is wrong.

**How to apply:**
- Split into `use-<x>-form.ts` (state + `toFormValues`/`toPatchInput` pure helpers) +
  `<x>-fields.tsx` (presentational, owns `useId` + `aria-describedby`). The Sheet keeps its
  footer wired to the hook. Extraction is behavior-preserving → existing story suite must pass
  with ZERO test edits (that is the regression bar).
- Page-only variance = a prop on the shared component (`showClassOfferings={false}`), never a
  forked component.
- Repo Vitest project is `environment: "node"` and has **no `@testing-library/react`** (only
  `@testing-library/{dom,jest-dom,user-event}`) → `renderHook` is NOT available. Keep the hook
  thin over exported pure helpers, unit-test those, prove the React binding in Storybook.

**Saved-feedback race (real bug, don't copy it):** the Sheet's `savedFeedback` is effectively
dead — the parent sets a NEW `subject` object on save success, and the hook's
`useEffect([subject])` resets `saved=false` in the render right after `setSaved(true)`. On the
new page I deliberately do NOT re-snapshot the entity after save; archive-only state lives in a
separate `status` `useState`. Flagged to fe-lead as a pre-existing US-E12.3 defect.

**Storybook suite baseline (2026-07-26):** `bun vitest --config vitest.storybook.mts run` is
FULLY green (151 files / 1082 tests). The older "~70 baseline failures" note in
[[pattern-destructive-confirm-and-moderation]] is stale — re-measure before blaming your story.
