# US-E17.5 Empty State — Grade Book Table

## Status

planned

## Lane

normal

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) chạm: `src/features/grades/presentation/grade-book-screen/`, `src/components/shared/grade-book-table/`
- Shared contract/file: `src/components/shared/grade-book-table/grade-book-table.tsx` (shared component — verify no in-flight US-E17.2 branch edits the same file before claiming)

## Product Contract

After this story:

1. **Grade book empty state** — when `vm.gradeBook === null` AND `hasSelection === true` after a successful fetch, the dashed-border text box is replaced by the canonical empty state: `FileText` icon (64px, `text-edu-text-muted`, `aria-hidden`), `role="status"` container, `aria-live="polite"`, `<p>` title from `gradeBook.emptyState` ("Chưa có điểm"), no CTA.
2. **No-selection prompt** — `hasSelection === false` branch is unchanged.
3. **Mobile scroll completions on `GradeBookTable`** — scroll wrapper gets `-webkit-overflow-scrolling: touch`; `<table>` gets `min-width: 640px`; sticky first column gets `border-right: 1px solid var(--edu-border)` + `bg-edu-card` background.
4. A `MobileScroll` Storybook story at 375px is added (or updated if it already exists from US-E17.2).

No new tokens, no new i18n keys, no BE changes.

**i18n namespace note:** `design-spec.jsonc` has a typo referencing `grades.gradeBook.emptyState`. The correct namespace verified in `vi.json` is `gradeBook`, key `emptyState`. The FE team MUST use `useTranslations("gradeBook")`.

## Relevant Product Docs

- `docs/product/design-spec.jsonc` — `emptyStatePattern`, `emptyStates.gradebook.gradeTable`, `responsiveGrid.gradeTable`
- `docs/stories/epics/E17-ux-polish/US-E17.5-empty-state-gradebook/spec.md` — full engineering spec
- `docs/stories/epics/E17-ux-polish/US-E17.5-empty-state-gradebook/requirements.md`
- `docs/stories/epics/E17-ux-polish/US-E17.5-empty-state-gradebook/use-cases.md`

## Acceptance Criteria

- When `vm.gradeBook === null` and `hasSelection === true` after a successful fetch, the canonical empty state renders: `role="status"` + `aria-live="polite"` container, `FileText` icon (`aria-hidden="true"`, 64px, `text-edu-text-muted`), `<p>` title "Chưa có điểm" from namespace `gradeBook` key `emptyState`.
- No `<button>`, no `<h2>`/`<h3>`, no body text, no dashed-border element inside the empty state container.
- When `hasSelection === false`, the `role="status"` container is NOT rendered; the existing no-selection prompt is unchanged.
- During grade book fetch (loading), `GradeBookSkeleton` renders and `role="status"` container is NOT present.
- On fetch failure, error banner renders and `role="status"` container is NOT present.
- `GradeBookTable` scroll wrapper has `-webkit-overflow-scrolling: touch`.
- `GradeBookTable` `<table>` element has `min-width: 640px`.
- Sticky first-column `<th>` and `<td>` have `border-right: 1px solid var(--edu-border)` and `background: var(--edu-card)`.
- `MobileScroll` Storybook story exists in `grade-book-table.stories.tsx` at 375px container width.
- `src/app/tokens.css` is unchanged. `vi.json` / `en.json` are unchanged.
- Storybook `EmptyState` story has `play()` asserting `role="status"`, `aria-live="polite"`, and `aria-hidden="true"` on icon.

## Design Notes

- Commands: none
- Queries: existing grade book TanStack Query hook — no changes; empty state is client-side conditional on `vm.gradeBook === null`
- API: none
- Tables: none
- Domain rules: `vm.gradeBook === null` AND `hasSelection === true` → empty state; `hasSelection === false` → no-selection prompt (unchanged)
- UI surfaces:
  - `grade-book-screen.tsx` ~lines 194–205: replace local `EmptyState` component with canonical pattern
  - `grade-book-table.tsx`: add `-webkit-overflow-scrolling: touch` to scroll wrapper, `min-width: 640px` to `<table>`, `border-right` + `bg-edu-card` to sticky first column `<th>`/`<td>`
  - `grade-book-table.stories.tsx`: add/update `MobileScroll` story
- i18n: `useTranslations("gradeBook")` → key `"emptyState"` (NOT `"grades"` or `"grades.gradeBook"`)
- [OPEN QUESTION] Check whether `MobileScroll` story already exists from US-E17.2 before authoring; update if present.
- [OPEN QUESTION] Confirm `aria-live="polite"` is required for this screen (additive beyond base `emptyStatePattern`; included because selection can change dynamically).

## Validation

When updating durable proof status, use numeric booleans:
`scripts/bin/harness-cli story update --id US-E17.5 --unit 1 --integration 0 --e2e 1 --platform 0`.

| Layer | Expected proof |
|---|---|
| Unit | Vitest + Testing Library: `vm.gradeBook === null` + `hasSelection === true` renders canonical pattern (AC-01.1–01.9); `hasSelection === false` suppresses `role="status"` (AC-02.1); loading suppresses (AC-05.1); error suppresses (AC-06.1); DOM attribute assertions for `role`, `aria-live`, `aria-hidden`; table `min-width` and `border-right` DOM assertions |
| Integration | none |
| E2E | Storybook interaction story (`play()` asserting `role="status"`, `aria-live="polite"`, `aria-hidden` on icon); `MobileScroll` story at 375px rendering GradeBookTable with scroll wrapper props |
| Platform | none |
| Release | Verify on `/teacher/grade-book` and `/student/grades` that empty state renders correctly; verify sticky column visible on mobile viewport with border separator |

## Harness Delta

No harness changes required. No new ADR, no new tokens, no new i18n keys.

## Evidence

Add commands, reports, screenshots, or links after validation exists.
