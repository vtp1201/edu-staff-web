# US-E24.18 Backlog batch 4 — tiny/normal fixes (items #7, #9, #10, #11)

## Status

planned

## Lane

normal

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) chạm: `src/app/globals.css` + `src/app/tokens.css` (token),
  `src/features/teacher/presentation/class-hub/` (heading hierarchy),
  `src/features/lms/domain/`, `src/features/lms/infrastructure/` (dead-code
  removal), `src/components/shared/child-switcher/` (a11y hardening).
- Shared contract/file: `--edu-error-dark-light` token (consumed by
  `StatusBadge`, `sd-severity-badge`, `discipline-screen`); `ChildSwitcher` is
  consumed by `academic-record-screen`, `parent-attendance-screen`,
  `grade-book-screen` — no prop/behavior change to those consumers expected,
  only internal id generation + optional new prop if the engineer's chosen fix
  needs one.

## Product Contract

Four independent, low-risk fixes closing harness backlog items opened during
earlier E24 story reviews. Bundled into one branch/packet per lane guidance —
each item is scoped to disjoint files and can be reviewed/tested independently
within the same commit set.

### Item #9 — ADR + dark value for `--edu-error-dark-light`

`StatusBadge` tone `error-dark` (`bg-edu-error-dark-light text-edu-error-dark`)
renders a light-pink chip in `.dark` mode because `--edu-error-dark-light` has
no `.dark` override, unlike every sibling tone (ADR 0049/US-E24.12 pattern).
ADR `docs/decisions/0077-error-dark-dark-mode-value.md` registered (this
packet, by `fe-lead`) — implement the `.dark` value(s) it specifies in
`src/app/globals.css`, verify AA contrast, sync
`docs/product/design-system.md` (remove the "chưa có giá trị dark" note under
US-E24.12).

### Item #10 — cleanup `ListAssignmentsUseCase` + `listAssignments`

Confirmed dead: `ListAssignmentsUseCase` (`src/features/lms/domain/use-cases/list-assignments.use-case.ts`)
has no DI factory in `bootstrap/di/lms.di.ts` (none exists) and no non-test
caller anywhere in `src/`. `repo.listAssignments` (declared in
`i-lms.repository.ts`, implemented in `lms.repository.ts` +
`lms.mock.repository.ts`) is used ONLY by this dead use-case. Superseded by
`ListLessonsUseCase`/`course-items` (US-E24.3/E24.4/E24.10) per the epic's
current data model. Remove the use-case, its interface method, both
implementations, and all now-unused tests/fixtures referencing only this path
— but do NOT touch `AssignmentSummary` entity or any OTHER `lms` repository
method that has a live caller (grep before deleting each symbol).

### Item #7 — class-hub tab content skips h2

`ClassHubScreen` (`class-hub-screen.tsx`) renders the shell `h1` in
`ClassHubHeader`, then jumps straight to `h3` card titles inside each tab body
(homeroom-tab cards, timetable-tab day-cards) with no `h2` in between —
WCAG 1.3.1/2.4.6 heading-hierarchy skip. Add the missing `h2` at the
appropriate level: the natural candidate is the ACTIVE TAB's own section
heading (visually hidden if the tab strip already conveys it, or promote the
existing tab-body section label to a real `h2`) inside `homeroom-tab.tsx` /
`timetable-tab-body.tsx` (or wherever each tab body's outermost section
label lives), BEFORE the `h3` card titles. Do not renumber unrelated headings
elsewhere in the app; scope this to the class-hub tab bodies only. Confirm
with a grep of `role="tabpanel"` descendants for any other silent `h1`→`h3`
skip in the same tree before closing.

### Item #11 — `ChildSwitcher` id namespace + dangling `aria-controls`

`ChildSwitcher` (`src/components/shared/child-switcher/child-switcher.tsx`)
emits `id={tab-${child.childId}}` / `aria-controls={tabpanel-${child.childId}}`
for EVERY child in the list, but every consumer (`academic-record-screen.tsx`,
`parent-attendance-screen.tsx`, `grade-book-screen.tsx`) mounts only ONE
`tabpanel` — the currently ACTIVE child's — with `id={tabpanel-${activeChildId}}`.
Every inactive tab's `aria-controls` therefore references an `id` that does
not exist anywhere in the DOM (WCAG 4.1.2 / ARIA tabs pattern violation),
already flagged as A11Y-002 (minor, deferred) in the US-E24.16 review
(`docs/TEST_MATRIX.md` US-E24.16 row). Fix inside `child-switcher.tsx` without
changing the consumer contract (`ChildPanelProps`/`id`/`aria-labelledby` shape
consumers already build) — e.g. only emit `aria-controls` when there is a
mounted panel for that tab (the ACTIVE one), or restructure so every tab
points at one stable, always-mounted panel id. Whichever approach: (a) no
`aria-controls` may ever reference a nonexistent id, (b) the active tab's
pairing with its panel must remain intact, (c) add an explicit id-namespace
so two `ChildSwitcher` instances rendered on the same page can never collide
(prefix param, e.g. an optional `idPrefix` prop defaulting to the current
scheme for backward compatibility with existing consumers/tests). Update the
3 consumers only if the chosen fix requires a prop; keep changes additive so
existing tests for those screens keep passing untouched wherever possible.

## Relevant Product Docs

- `docs/product/design-system.md` (§Badge, US-E24.12 follow-up note)
- `docs/TEST_MATRIX.md` (US-E24.16 row — A11Y-002 origin)
- `docs/decisions/0049-*.md`, `docs/decisions/0040-*.md` (error-dark origin)

## Acceptance Criteria

- #9: `StatusBadge` tone `error-dark` renders a dark tonal chip (not a light
  chip) in `.dark` mode, with text meeting WCAG AA (≥4.5:1) against the new
  background. ADR 0077 accepted + registered via `harness-cli decision add`.
- #10: `ListAssignmentsUseCase`, `listAssignments` (interface + both repo
  implementations), and their now-dead tests are removed;
  `bunx tsc --noEmit` and `bun vitest run` stay green; no other `lms` symbol
  with a live caller is touched.
- #7: every tab body under `role="tabpanel"` in class-hub has exactly one `h2`
  between the shell `h1` and its `h3` card titles — no heading-level skip.
- #11: for every `ChildSwitcher` consumer, no rendered tab's `aria-controls`
  ever points at a nonexistent DOM id; the active tab keeps a correct
  `aria-controls`/`aria-labelledby` pairing with its panel; two `ChildSwitcher`
  instances on one page cannot produce colliding ids.

## Design Notes

- Commands: none (no new mutation).
- Queries: none (no new data fetching).
- API: none — items are UI-token, UI-markup, and dead-code fixes.
- Tables: n/a.
- Domain rules: n/a for #7/#9/#11; #10 removes a domain use-case with no
  behavior contract (never wired).
- UI surfaces: class-hub (all tabs), any `StatusBadge`/severity-badge
  `error-dark` usage, `ChildSwitcher` (academic-record, parent-attendance,
  grade-book).

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `status-badge.test.ts` dark-mode class/contrast case (#9); class-hub heading-order test (#7, new or extended); `child-switcher.test.tsx` no-dangling-aria-controls + namespace case (#11); `lms.use-cases.test.ts`/`lms.repository.test.ts`/`lms.mock.repository.test.ts` updated to drop removed symbol, remaining suite green (#10) |
| Integration | n/a beyond existing repo tests already covering `lms` (post-cleanup) |
| E2E | `class-hub-screen.stories.tsx`/`homeroom-tab.stories.tsx`/`timetable-tab.stories.tsx` heading assertion (#7); `child-switcher.stories.tsx` + the 3 consumer `.stories.tsx` files still green (#11); `status-badge.stories.tsx` `Dark` variant (#9) |
| Platform | `bunx tsc --noEmit`, `bun lint`, `bun vitest run`, `bun vitest --config vitest.storybook.mts run`, `NEXT_PUBLIC_USE_MOCK=true bun run build` all clean |
| Release | design-review gate (`docs/DESIGN_REVIEW.md`) for #7/#9/#11 (UI-touching); #10 is code-only, no design-review needed |

## Harness Delta

- ADR `0077` registered for item #9.
- Backlog items #7, #9, #10, #11 closed via `harness-cli backlog close` on
  completion.
- `docs/product/design-system.md` US-E24.12 follow-up note updated (#9).
- `docs/TEST_MATRIX.md` US-E24.18 row added.

## Evidence

(added after validation exists)
