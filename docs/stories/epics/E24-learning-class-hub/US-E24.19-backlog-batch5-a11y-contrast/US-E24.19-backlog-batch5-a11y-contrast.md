# US-E24.19 Backlog batch 5 — a11y contrast + dangling aria-controls (items #3, #15)

## Status

planned

## Lane

normal

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) chạm: `src/features/teacher/presentation/class-hub/timetable-tab/`
  (contrast fix, #3), `src/features/academic-records/presentation/academic-record-screen/`
  (dangling `aria-controls` fix, #15).
- Shared contract/file: none. `YearTimeline` (#15) is feature-local with exactly
  one consumer (`academic-record-screen.tsx`) — no shared component contract to
  preserve, unlike `ChildSwitcher` in US-E24.18 #11. `day-card.tsx` /
  `upcoming-period-panel.tsx` (#3) are both feature-local to class-hub's
  timetable tab; no consumer contract changes.

## Product Contract

Two independent, disjoint-file fixes closing harness backlog items opened
during earlier E24 story reviews (#3 opened during US-E24.9 review; #15 opened
as an explicit follow-up during the US-E24.18 tech-lead review, deliberately
scoped out of that batch). Bundled into one branch/packet per lane guidance.

### Item #15 — `year-timeline.tsx` dangling `aria-controls`

`YearTimeline` (`year-timeline.tsx`) emits `id={tab-${year.yearId}}` /
`aria-controls={tabpanel-${year.yearId}}` for EVERY year tab, but
`academic-record-screen.tsx` mounts only the ACTIVE year's panel
(`id={tabpanel-${activeYear.yearId}}`) — every inactive year tab's
`aria-controls` references a nonexistent DOM id (WCAG 4.1.2), the identical
defect closed for `ChildSwitcher` in US-E24.18 #11. Apply the SAME fix
pattern already established there: only emit `aria-controls` on the tab that
actually has a mounted panel (the active one); every tab keeps its `id` (the
panel's `aria-labelledby` needs it) and correct `tabIndex`/`aria-selected`.
`YearTimeline` has exactly one consumer (verified — no other import site), so
the `idPrefix`-style multi-instance guard #11 added is NOT required here;
do not add one speculatively.

### Item #3 — `text-primary` on `bg-edu-primary-light` fails 3:1

Confirmed by direct token-pair contrast measurement:
`--edu-primary` (`#5d87ff`) on `--edu-primary-light` (`#ecf2ff`) = **2.94:1**,
below the WCAG 3:1 large-text/UI floor. Two call sites in class-hub's
timetable tab pair `text-primary` directly with a `bg-edu-primary-light`
ancestor and both fail:

- `day-card.tsx` — the "Hôm nay" (today) `<h3>` day-label header
  (`font-extrabold text-sm` ⇒ qualifies as WCAG large/bold text, floor 3:1).
- `upcoming-period-panel.tsx` — a `size-8` icon swatch, `bg-edu-primary-light`
  square with a `text-primary` lucide icon inside (non-text UI component,
  floor 3:1 per `.claude/rules/accessibility.md`).

Fix: swap `text-primary` → `text-edu-primary-accessible` at both call sites.
**No new token, no ADR** — `--edu-primary-accessible` (`#4468e0`) already
exists in `src/app/tokens.css` (mapped in `globals.css` as
`--color-edu-primary-accessible`) for exactly this pairing: measured
**4.35:1** on `--edu-primary-light`, and it is already the established
class-level fix for `text-primary`-on-`bg-edu-primary-light`
(`ChildSwitcher`'s avatar background comment: "was `--edu-primary` 3.29:1
FAIL", now uses `--edu-primary-accessible`; `teacher-students-roster-table.tsx`
already uses `text-edu-primary-accessible` on the same background for its
avatar initials). This is a class-level swap to an existing AA-safe token —
same shape as US-E24.18 #9's per-call-site fix, not a token-level change.

Other `bg-edu-primary-light` call sites were audited and are NOT affected —
they either already use an accessible pairing or a different (adequately
contrasting) text color:

- `cross-subject-list.tsx` — `text-foreground` (11.5:1), fine.
- `period-row.tsx` (×2) — no `text-primary` text inside; label uses
  `text-edu-text-secondary`, fine.
- `teacher-students-roster-table.tsx` — already `text-edu-primary-accessible`.

## Relevant Product Docs

- `docs/product/design-system.md` (token reference; no change required — no
  new token, no value change).
- `docs/decisions/0077-*.md`, `docs/stories/epics/E24-learning-class-hub/US-E24.18-backlog-batch4-tiny-fixes/`
  (precedent for #11's aria-controls fix pattern, reused here for #15;
  precedent for scoping a class-level fix without a new ADR).
- `.claude/rules/accessibility.md` (3:1 large-text/UI floor).

## Acceptance Criteria

- #15: for every year tab in `YearTimeline`, `aria-controls` is present ONLY
  when a mounted panel exists for that tab (the active year); every tab keeps
  a valid `id`; the active tab's `aria-controls`/`aria-labelledby` pairing
  with its panel remains correct; keyboard navigation (arrow/home/end) is
  unchanged.
- #3: `day-card.tsx`'s "today" header text and `upcoming-period-panel.tsx`'s
  icon both render with `text-edu-primary-accessible` (4.35:1 on
  `bg-edu-primary-light`), meeting the WCAG 3:1 large-text/UI floor. No other
  visual change (no layout, spacing, or unrelated color change).

## Design Notes

- Commands: none.
- Queries: none.
- API: none — both items are UI-markup (#15) and UI-token-class (#3) fixes,
  no data/contract change.
- Tables: n/a.
- Domain rules: n/a.
- UI surfaces: academic-record-screen year selector (#15); class-hub
  timetable tab day-card header + upcoming-period-panel icon (#3).

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | n/a beyond component-level assertions below (no domain/use-case touched) |
| Integration | n/a |
| E2E | `year-timeline`/`academic-record-screen` test or story assertion: inactive tab has no `aria-controls`, active tab's `aria-controls` resolves to a rendered element (#15); `timetable-tab.test.ts`/`timetable-tab.stories.tsx` assertion or visual check that the today-header text and upcoming-period icon use the accessible class (#3) |
| Platform | `bunx tsc --noEmit`, `bun lint`, `bun vitest run`, `bun vitest --config vitest.storybook.mts run`, `NEXT_PUBLIC_USE_MOCK=true bun run build` all clean |
| Release | design-review gate (`docs/DESIGN_REVIEW.md`) — both items touch UI; `/impeccable audit` in scope for #3 (visual contrast change) |

## Harness Delta

- Backlog items #3, #15 closed via `harness-cli backlog close` on completion.
- `docs/TEST_MATRIX.md` US-E24.19 row added.
- No ADR — no new/changed token (see Item #3 above for why).

## Evidence

(added after implementation)
