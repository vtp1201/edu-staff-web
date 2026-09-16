# US-E24.19 Backlog batch 5 — a11y contrast + dangling aria-controls (items #3, #15)

## Status

implemented

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

### Item #3 — `text-primary` on `bg-edu-primary-light`

> **Premise correction (post-implementation, confirmed independently by both
> `fe-tech-lead-reviewer` and `fe-accessibility-auditor` — see Evidence):** the
> harness backlog item and this packet's ORIGINAL text below both assumed
> `text-primary` resolves to `--edu-primary` (`#5d87ff`) ⇒ 2.94:1, "failing"
> the 3:1 floor. That assumption is **wrong**. `globals.css`'s `@theme inline`
> block defines `--color-primary: var(--primary)` — the utility Tailwind
> compiles from `--color-primary` follows `--primary`, NOT the unrelated
> `:root { --color-primary: var(--edu-primary) }` declaration in
> `tokens.css:112` (a decision-`0007` tenant-override slot that no utility
> actually consults under `@theme inline`). `globals.css:128`/`:223` sets
> `--primary: var(--edu-primary-dark)` (`#4570ea`, ADR `0023`). So
> `text-primary` actually resolves to **`#4570ea` = 3.93:1** on
> `--edu-primary-light` — **already over the 3:1 large-text/UI floor** that
> applies to both call sites below (bold-14px header = large text; icon =
> non-text UI component). Verified empirically: reverting the source fix while
> keeping the new Chromium-computed-style story reproduces
> `rgb(69, 112, 234)` (`#4570ea`), not `rgb(93, 135, 255)` (`#5d87ff`).
>
> **Conclusion:** #3 was not an actual WCAG floor violation as filed. The fix
> below (already implemented) is still a legitimate, worthwhile improvement —
> it raises the margin from 3.93:1 to 4.35:1 and aligns two outlier call sites
> with the pairing already established elsewhere in the repo — but it closes a
> "nice-to-have" gap, not an AA failure. Closing backlog #3 with this
> corrected note so a future reader doesn't re-derive the wrong 2.94:1 number.

Two call sites in class-hub's timetable tab pair `text-primary` directly with
a `bg-edu-primary-light` ancestor:

- `day-card.tsx` — the "Hôm nay" (today) `<h3>` day-label header
  (`font-extrabold text-sm` ⇒ qualifies as WCAG large/bold text, floor 3:1).
- `upcoming-period-panel.tsx` — a `size-8` icon swatch, `bg-edu-primary-light`
  square with a `text-primary` lucide icon inside (non-text UI component,
  floor 3:1 per `.claude/rules/accessibility.md`).

Fix: swap `text-primary` → `text-edu-primary-accessible` at both call sites
(light mode), plus `dark:text-edu-primary` at both (dark mode — see below).
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

**Dark-mode addendum (round 2, reviewer SHOULD-FIX):** `--edu-primary-light`
is overridden to `#28344e` in `.dark` (`globals.css:181`), and on that
background `--edu-primary-accessible` (the light-mode fix) drops to **2.54:1**
— worse than the pre-fix `--edu-primary-dark` value of 2.81:1 (both already
below 3:1, so not a NEW failure, but the fix should not make an existing
number worse when a precedented one-line remedy exists). `--edu-primary`
(`#5d87ff`) measures **3.77:1** on the same dark background — passes the
floor. Fix: add `dark:text-edu-primary` alongside `text-edu-primary-accessible`
at both call sites, same idiom ADR `0077` established (`globals.css` already
flips `--accent-foreground`/`--sidebar-accent-foreground` to
`var(--edu-primary)` in `.dark` for the identical reason).

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
  icon both render with `text-edu-primary-accessible` in light mode (4.35:1 on
  `bg-edu-primary-light`) and `dark:text-edu-primary` in dark mode (3.77:1 on
  the dark `bg-edu-primary-light` override), both meeting the WCAG 3:1
  large-text/UI floor. No other visual change (no layout, spacing, or
  unrelated color change).

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
| Platform | `bunx tsc --noEmit`, `bun lint`, `bun vitest run`, `bun vitest --config vitest.storybook.mts run`, `NEXT_PUBLIC_USE_MOCK=true bun run build` all clean — all confirmed green, see Evidence |
| Release | design-review gate (`docs/DESIGN_REVIEW.md`) PASS — both items touch UI; `/impeccable audit` run, 0 findings; see Evidence |

## Harness Delta

- Backlog items #3, #15 closed via `harness-cli backlog close`, with #3's
  outcome note recording the premise correction (see Item #3 above) so the
  wrong 2.94:1/`--edu-primary` assumption isn't re-derived later.
- `docs/TEST_MATRIX.md` US-E24.19 row promoted `planned` → `implemented`.
- No ADR — no new/changed token; `dark:text-edu-primary` is a class-level
  override of the same shape ADR `0077` already established, not a token
  change.
- New backlog item filed (not fixed — out of scope for #3, which named only
  the two timetable-tab files): `year-timeline.tsx` has 2 more
  `text-primary`-on-primary-tint pairings (`bg-primary/10` active-tab
  background, `bg-primary/15` "current year" badge) the reviewer spotted while
  reading the file this story touched. Left unfixed per scope guard.

## Evidence

Implemented on branch `fix/us-e24.19-backlog-batch5-a11y-contrast`, commits:
- `cca93742` — #15: `year-timeline.tsx` — `aria-controls` now conditional on
  `active` (only the tab with a mounted panel emits it); `id` stays
  unconditional. Single consumer confirmed (`academic-record-screen.tsx`), no
  `idPrefix` added.
- `26d1e1ed` — #3 (round 1): `day-card.tsx` / `upcoming-period-panel.tsx`
  `text-primary` → `text-edu-primary-accessible`.
- `1bc77ab3` — #3 (round 2, reviewer SHOULD-FIX): added `dark:text-edu-primary`
  alongside `text-edu-primary-accessible` at both call sites (dark-mode
  `--edu-primary-light` override drops the accessible token to 2.54:1, worse
  than pre-fix 2.81:1 and still under 3:1; `--edu-primary` measures 3.77:1 on
  the same dark background — same class-level-override idiom as ADR `0077`).
  Also hoisted a story helper function above its JSDoc block (recurring nit,
  first seen in US-E24.18) and tightened 2 contrast-ratio assertions from a
  loose `>=3` floor to threshold values just under each shipped ratio, so a
  future regression toward the pre-fix numbers actually fails the test instead
  of silently passing under a floor both pre- and post-fix satisfied.

**Premise correction (important):** the original harness backlog item #3 and
this packet's first draft both claimed `text-primary` on `bg-edu-primary-light`
measured **2.94:1** (assuming `text-primary` → `--edu-primary` #5d87ff). That
assumption is wrong. `globals.css`'s `@theme inline` block routes the
`text-primary` utility through `--primary` (not the unrelated `:root
{ --color-primary: var(--edu-primary) }` slot in `tokens.css:112`, a
decision-`0007` tenant-override hook no utility actually reads under `@theme
inline`), and `--primary` resolves to `--edu-primary-dark` (`#4570ea`, ADR
`0023`). So the REAL pre-fix contrast was **3.93:1** — already over the 3:1
large-text/UI floor both call sites are held to (bold-14px header = large
text; icon = non-text UI component). This was independently confirmed three
times: by `fe-nextjs-engineer` (reverting the source fix reproduced
`rgb(69, 112, 234)` = `#4570ea`, not `#5d87ff`, in a real-Chromium computed-style
story), by `fe-tech-lead-reviewer` (re-derived the same resolution chain from
`globals.css`/`tokens.css` line numbers and re-ran the revert-and-observe
check independently), and by `fe-accessibility-auditor` (recomputed the WCAG
relative-luminance formula by hand). **Conclusion:** #3 was not an actual AA
floor violation as filed; the shipped fix (3.93:1 → 4.35:1 light,
`--edu-primary-dark`-implied-but-unused-2.81:1 → `--edu-primary`-3.77:1 dark)
is a genuine, worthwhile margin improvement and a real defect (a pre-existing
factual error in the backlog/packet), not a WCAG-blocking one. Closed as
implemented with this corrected record.

Design review (`docs/DESIGN_REVIEW.md`):
- design-system: conform — only existing semantic tokens used
  (`text-edu-primary-accessible`, `dark:text-edu-primary`), no raw color, no
  new token, no component duplication (2 `className` edits + 1 attribute
  expression, no new components).
- a11y: WCAG AA/3:1-floor OK in both light and dark (`fe-accessibility-auditor`
  Pass — 0 blocking/major, 1 Minor doc-accuracy note, addressed above);
  keyboard roving on `YearTimeline` unchanged and re-verified; focus rings
  unchanged; no motion introduced.
- impeccable audit: ran `node .claude/skills/impeccable/scripts/detector/cli/main.mjs`
  against the 3 changed presentation files (`day-card.tsx`,
  `upcoming-period-panel.tsx`, `year-timeline.tsx`) — **0 findings**.
- states: no new UI state introduced (pure `className`/attribute edits); dark
  mode now explicitly covered by a new story
  (`PrimaryLightContrastDark`); no layout/responsive change, so 320px is
  unaffected.

Proof (all run on final HEAD `1bc77ab3`):
- Unit: n/a (no domain/use-case touched).
- Integration: n/a.
- E2E/Story: `academic-record-screen.stories.tsx#YearTabsNoDanglingAriaControls`
  (active tab's `aria-controls` resolves to a real mounted `tabpanel` with
  matching `aria-labelledby`; every inactive tab has NO `aria-controls`
  attribute at all; keyboard roving Arrow/Home/End re-verified) —
  `fe-tech-lead-reviewer` confirmed RED pre-fix
  (`expected true to be false` on `hasAttribute("aria-controls")`).
  `timetable-tab.stories.tsx#PrimaryLightContrast` +
  `#PrimaryLightContrastDark` (real-Chromium `getComputedStyle` colors +
  in-story WCAG ratio recompute, thresholds tightened to `>=4.3`/`>=3.7` so a
  regression toward the old numbers actually fails) — confirmed RED pre-fix
  both rounds (`rgb(69, 112, 234)` unexpected pre-round-1;
  `rgb(68, 104, 224)` unexpected pre-round-2 dark fix).
- Platform: `bunx tsc --noEmit` clean; `bun lint` clean (1 warning + 1 info
  pre-existing in `messaging/message-context-menu.tsx`, unrelated); `bun
  vitest run` 597 files/5046 tests; `bun vitest --config vitest.storybook.mts
  run` 176 files/1452 tests; `NEXT_PUBLIC_USE_MOCK=true bun run build` clean.

`fe-tech-lead-reviewer`: **Approved**, conditional on this packet's premise
correction (done above) — 1 should-fix (dark-mode contrast regression, fixed
round 2), 1 should-fix (story JSDoc placement, fixed round 2), 2 considers
(assertion threshold tightened round 2; `year-timeline.tsx`'s 2 other
`text-primary`-on-primary-tint pairs filed as a new backlog item, not fixed —
out of scope for #3).

`fe-accessibility-auditor`: **Pass**, 0 blocking/major findings; 1 Minor
(A11Y-001, packet documentation accuracy only, not a WCAG defect) — resolved
by this packet's premise-correction section.
