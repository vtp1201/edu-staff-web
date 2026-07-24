---
name: project-infra-storybook-suite-green
description: INFRA-storybook-suite-green (2026-07-24) — fixed 68 failing Storybook interaction tests across 16 files; found 3 real production bugs along the way
metadata:
  type: project
---

Fixed the Storybook interaction suite (`bunx vitest run --config vitest.storybook.mts`) after it
regressed to 68 failed / 954 total across 16 files, undetected on `main` because this tier isn't
part of the pre-push gate (only `bun vitest run`, the main suite, is).

**Why it matters going forward**: this suite can silently rot since nothing blocks a merge on it.
Recommended follow-up (not done, flagged to user): consider adding
`bunx vitest run --config vitest.storybook.mts` to the pre-push hook or CI, at least as a
non-blocking warning, so a future regression surfaces immediately instead of accumulating.

**Root-cause classes worth recognizing fast next time:**
1. Whole-file crash, `invariant expected app router to be mounted` → missing
   `parameters.nextjs.appDirectory: true` in the story `meta`. Check sibling story files in the
   same feature for the correct pattern before assuming it's a router-mock problem.
2. Whole-file crash from a `<SelectItem value="">` — Radix Select reserves empty string for
   "clear selection" and throws. Fix pattern already established:
   `const ALL = "__all__"` sentinel (see `exam-bank-filter-bar.tsx`), map `?? ALL` on the Select
   value and `v === ALL ? undefined : v` on change.
3. "Toast never appears" timeout → check the story's `decorators` array for a `<Toaster />` — several
   story files exercise `toast.success(...)` but never mount one (production layout always does,
   via `src/app/layout.tsx`).
4. Duplicate-text `getByText` ambiguity is the single most common failure shape in this suite —
   always check whether the matched string is reused as a filter-pill label / section heading /
   stat-card label / badge elsewhere on the same screen before assuming the assertion itself is
   wrong.
5. Portal-rendered content (Radix Dialog/Popover/DropdownMenu/AlertDialog) needs
   `within(document.body)`, not `within(canvasElement)` — and once inside the dialog, the
   background canvas can go `aria-hidden`, so order-of-operations matters (assert on background
   content BEFORE opening a modal that hides it).

**3 real production bugs this pass surfaced (not just test staleness) — pattern: a Storybook test
failure is worth reading the component before assuming the test is wrong:**
- `teaching-plan`: approve/reject buttons' visible text ("Phê duyệt"/"Trả lại") vs `aria-label`
  ("Duyệt kế hoạch .../Từ chối kế hoạch ...") announced a different verb than shown — a genuine
  a11y/i18n terminology mismatch, not a rename. Fixed the i18n templates to match the visible text.
- `discipline` parent leave form: `<input type="date" min={today}>` had no `noValidate` on its
  `<form>` → the browser's native HTML5 constraint validation silently blocked submission for any
  past date BEFORE React/zod ever ran (confirmed via a temporary debug trace: neither
  `handleSubmit`'s valid nor invalid callback ever fired). Any date/number input with a native
  `min`/`max`/`pattern` constraint in this codebase should have `noValidate` on its form if the
  team wants its own zod message to be the one shown — otherwise browser-native validation wins
  silently and the custom error code path is unreachable.
- `messaging`: selecting "Trả lời" (reply) refocused the message-bubble trigger (the generic
  `closeContextMenu()` shared by every menu action) instead of the reply textarea — AC-7 keyboard
  UX regression. When one context-menu action needs different post-close focus behavior than the
  rest, don't route it through the shared close-and-refocus-trigger helper.

Full RCA + file-by-file changes: `docs/stories/epics/INFRA-toolchain/INFRA-storybook-suite-green/story.md`.
