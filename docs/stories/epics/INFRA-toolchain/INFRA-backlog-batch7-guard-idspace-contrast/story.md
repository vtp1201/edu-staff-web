# INFRA-backlog-batch7: admin-guard E2E gap + DEFAULT_ROUTE layer relocation + discipline id-space bug + year-timeline contrast (#1, #17, #16)

## Status

implemented

## Lane

normal

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) touched: `src/bootstrap/tenant/` (#1), `src/app/[locale]/t/[tenant]/(app)/admin/` (#1),
  `src/app/[locale]/t/[tenant]/(app)/teacher/discipline/`,
  `src/app/[locale]/t/[tenant]/(app)/principal/discipline/` (#17),
  `src/features/academic-records/presentation/academic-record-screen/` (#16).
- Shared contract/file: `src/components/layout/app-shell/sidebar/nav-config.ts`
  (`DEFAULT_ROUTE` moves out, #1). No overlap between the three items —
  bundled on one branch per lane guidance (precedent: US-E24.18/19/20).

## Product Contract

Three independent harness backlog items, closed in one packet:

### #1 — US-E12.8 follow-up: admin-guard E2E gap + `DEFAULT_ROUTE` layer relocation

Two tracked-but-deferred items from US-E12.8's validation (`docs/stories/epics/E12-admin-core/US-E12.8-admin-role-guard/validation.md`):

1. **E2E gap**: `admin/layout.tsx` (the role guard added in US-E12.8, generalized
   by `INFRA-rsc-layout-guards-role-groups`) has NEVER had a direct route-gate
   test — unlike `principal/layout.test.ts` (added later), which exercises the
   RSC layout itself end-to-end (token → `decodeRoleClaim` → `evaluateNamespaceAccess`
   → `redirect()`) rather than only the pure `evaluateAdminAccess` unit in
   `role-guard.test.ts`. Fix: add `admin/layout.test.ts` mirroring
   `principal/layout.test.ts`'s exact recipe (a thrown `NEXT_REDIRECT` digest
   parsed for its target URL, exercised in node env with no request context).
2. **Layer-direction smell**: `src/bootstrap/tenant/role-guard.ts` (bootstrap
   layer) imports `DEFAULT_ROUTE` from
   `src/components/layout/app-shell/sidebar/nav-config.ts` — a presentation-layer
   module full of `lucide-react` icons and nav-menu structure. Per
   `.claude/CLAUDE.md`'s layer table, `bootstrap/` may import `domain/`,
   `infrastructure/`, `bootstrap/lib/*` — never `components/`. It "worked" only
   because `nav-config.ts` has no `'use client'` and is pure data, but the
   dependency arrow points the wrong way and every future `bootstrap/tenant/`
   consumer (now 5 namespace layouts) inherits it. Fix: relocate `DEFAULT_ROUTE`
   to `src/bootstrap/tenant/default-route.ts` (co-located with `role-guard.ts`,
   `tenant-url.ts` — its only real consumers), re-export via
   `bootstrap/tenant/index.ts`, and have `nav-config.ts` **import it from
   bootstrap** instead of defining it — the same direction already established
   for `tenantUrl` (`app-shell.tsx`, `sidebar.tsx`, `header.tsx` all import
   `tenantUrl` from `@/bootstrap/tenant` already). The two direct app-layer
   importers of the old `DEFAULT_ROUTE` location
   (`principal/reports/layout.tsx`, `parent/discipline/page.tsx`) are repointed
   to `@/bootstrap/tenant` too — they were borderline for the same reason.

No behavior change in either fix — pure test addition + import-direction
relocation (type-identical `Record<UserRole, string>` re-exported as
`Record<Role, string>`, `Role` being a structurally-identical alias).

### #17 — teacher/principal discipline `availableClasses` mixes two id spaces

**Ground-truthed, confirmed as filed.** `teacher/discipline/page.tsx` and
`principal/discipline/page.tsx` both build `availableClasses` as:

```ts
const availableClasses = Array.from(
  new Set([
    ...violations.map((v) => v.classId),
    ...conductSummary.map((c) => c.classId),
    ...leaveRequests.map((l) => l.classId),
  ]),
).sort();
```

`violations`/`conductSummary` are still force-mocked (backlog #4, BE-blocked,
NOT touched here) — their `classId` space is the mock repository's name-like
ids (`"10A1"`, …). `leaveRequests` is real since US-E24.20 (backlog #5) —
its `classId` space is core's real class UUIDs, fanned out per the caller's
real class set. These are two genuinely disjoint id spaces that now coexist
in one array.

Consumers of `vm.availableClasses`, grepped exhaustively:

- `violations-tab.tsx`: (a) the class-filter `<Select>` (filters `violations`
  by `v.classId === filterClass` — mock id space only), and (b)
  `form.classId: classes[0] ?? ""` — the DEFAULT class pre-selected on the
  "record a new violation" form, submitted via `recordViolationAction` to the
  MOCK violations repository.
- `conduct-tab.tsx`: the class-filter `<Select>` only (filters `conductSummary`
  by `s.classId === filterClass` — mock id space only).
- `leave-tab.tsx`: grepped — does **NOT** read `vm.availableClasses` at all
  (leave rows are already server-scoped to the caller's classes; the tab has
  no class-filter dropdown).

So `leaveRequests.map((l) => l.classId)` contributes to `availableClasses`
for **zero** actual consumers, while actively corrupting the two consumers
that DO use it: the filter dropdown gains dead entries that never match any
`violations`/`conductSummary` row, and — worse — `classes[0]` (the new-violation
form's default `classId`) can become a real core class UUID instead of a mock
class id, depending on `.sort()` ordering of the merged set, silently
submitting a violation record against a `classId` the mock violations
repository has no record of.

**Fix (honest for the mixed state, does not touch #4/un-mock anything):**
drop `leaveRequests` from the `availableClasses` union in both pages — it has
no consumer that needs it and every consumer it would reach is in the other
(mock) id space. `availableClasses` becomes the union of `violations` +
`conductSummary` classIds only, which is exactly the id space its two real
consumers operate in.

### #16 — `year-timeline.tsx`: 2 more `text-primary`-on-primary-tint pairings

Filed during the US-E24.19 review (backlog #3's sibling), two pairings in
`year-timeline.tsx` not covered by that fix:

1. **Active-tab background** (`bg-primary/10` on the button, `text-primary`
   on the year-label span inside, `text-sm font-bold` — 14px bold qualifies
   as WCAG large/bold text per this repo's established convention, floor
   3:1, same convention US-E24.19 #3 used for day-card's "Hôm nay" header).
   Computed (WCAG relative-luminance, `#4570ea` text on `#4570ea`-at-10%-over-
   `--edu-bg` background): **~3.65:1 light / ~3.52:1 dark — already at/over
   the 3:1 large-text floor, NOT an actual violation as filed** (same premise
   shape as #3's correction). Shipped anyway as a margin improvement, same
   idiom as #3: `text-edu-primary-accessible` (light, 4.35:1-class fix) +
   `dark:text-edu-primary` (dark).
2. **Current-year badge** (`bg-primary/15`, `text-primary`, `text-[11px]
   font-semibold` — 11px is small text, floor **4.5:1**, not 3:1). Computed:
   **~3.66:1 light / ~2.94:1 dark — a genuine AA failure**, both below 4.5:1.
   This is the EXACT pattern `components/shared/status-badge/status-badge.tsx`
   already fixed for its `tone="primary"` (A11Y-001, documented inline there:
   "primary text on its own tinted bg = 3.65:1 (fails AA, A11Y-001) →
   text-edu-text-primary (#2A3547) = 11.52:1 on the tint, guaranteed AA").
   `text-edu-primary-accessible` (the #3/#16-item-1 fix) only reaches ~4.05:1
   here — NOT enough for the 4.5:1 small-text floor, so it is the wrong fix
   for THIS pairing specifically. Fix: swap to `text-edu-text-primary` (no
   dark variant needed — `--edu-text-primary` is already theme-aware, unlike
   `--edu-primary`), matching `StatusBadge`'s established fix exactly. NOT
   migrated to the `<StatusBadge>` component itself (11px/600/px-2 py-0.5
   vs. `Badge`'s default 12px/500 — a component-level migration would be an
   unrequested visual-size change outside this item's scope); only the two
   offending utility classes change, same minimal-footprint discipline as #3.

## Relevant Product Docs

- `docs/decisions/0063-*.md` (authCtx / RSC layout guard family, #1).
- `docs/stories/epics/INFRA-toolchain/INFRA-rsc-layout-guards-role-groups/story.md` (#1, guard generalization precedent).
- `docs/stories/epics/E24-learning-class-hub/US-E24.20-backlog-batch6-leave-consolidation/US-E24.20-backlog-batch6-leave-consolidation.md` (#17, leave fan-out + id-space origin).
- `docs/stories/epics/E24-learning-class-hub/US-E24.19-backlog-batch5-a11y-contrast/US-E24.19-backlog-batch5-a11y-contrast.md` (#16, contrast fix idiom + premise-correction precedent).
- `src/components/shared/status-badge/status-badge.tsx` (#16, established small-text-on-tint fix, A11Y-001).
- `.claude/rules/accessibility.md` (3:1/4.5:1 floors).
- `.claude/CLAUDE.md` §Architecture layer table (#1).

## Acceptance Criteria

- #1a: `admin/layout.test.ts` exists and exercises the RSC layout directly
  (not just `evaluateAdminAccess`); asserts allow for `role=admin`, redirect
  to each non-admin role's `DEFAULT_ROUTE`, redirect to select-tenant for no
  token / a malformed token.
- #1b: `bootstrap/tenant/role-guard.ts` no longer imports from
  `components/layout/**`; `DEFAULT_ROUTE` is defined in
  `bootstrap/tenant/default-route.ts` and re-exported via
  `bootstrap/tenant/index.ts`; `nav-config.ts`, `principal/reports/layout.tsx`,
  `parent/discipline/page.tsx` import it from there; no behavior change
  (existing tests for all four still green unmodified in assertions).
- #17: `availableClasses` passed to `DisciplineScreen` in both
  `teacher/discipline/page.tsx` and `principal/discipline/page.tsx` is built
  from `violations` + `conductSummary` classIds only; a real leave-request-only
  classId never appears in `availableClasses`, and the new-violation form's
  default `classId` is always drawn from the mock id space consumers expect.
- #16: `year-timeline.tsx`'s active-tab label uses
  `text-edu-primary-accessible dark:text-edu-primary` in place of
  `text-primary`; the current-year badge uses `text-edu-text-primary` in
  place of `text-primary`; no layout/spacing/size change to either element.

## Design Notes

- Commands: none.
- Queries: none (#17 removes a field from an already-fetched entity's
  contribution to a derived array; no new query).
- API: none.
- Tables: n/a.
- Domain rules: n/a.
- UI surfaces: admin-namespace route guard (#1, no visible UI, redirect only);
  teacher/principal discipline screens' class-filter dropdowns + new-violation
  form (#17); academic-record year timeline (#16).

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `role-guard.test.ts` unaffected (re-run green); `default-route.ts` has no independent unit (pure data, covered transitively) |
| Integration | none |
| E2E | `admin/layout.test.ts` (#1a, new); `teacher/discipline/page.test.ts` + `principal/discipline/page.test.ts` gain `availableClasses` id-space assertions (#17) |
| Platform | `bunx tsc --noEmit`, `bun lint`, `bun vitest run`, `NEXT_PUBLIC_USE_MOCK= bun run build` all clean |
| Release | design-review gate for #16 (contrast-only, no layout change); #1/#17 have no visible UI — gate not applicable per `docs/DESIGN_REVIEW.md` scope (redirect-only guard, dropdown data-source fix) |

## Harness Delta

- Backlog #1, #16, #17 closed via `harness-cli backlog close` once implemented
  and reviewed, with any premise corrections recorded (see #16 above — item 1
  of #16 is a marginal-pass-not-a-violation, corrected in the closing note,
  item 2 is confirmed genuine).
- `docs/TEST_MATRIX.md` row added at `planned`, promoted to `implemented` on
  completion.
- No ADR — no new/changed design token; `DEFAULT_ROUTE` relocation is an
  import-direction fix, not an architecture decision requiring a fresh ADR
  (mirrors how `INFRA-rsc-layout-guards-role-groups` needed none for its
  `role-guard.ts` generalization).

## Evidence

Implemented on branch `fix/us-infra-backlog-batch7-guard-idspace-contrast`.

**#1**: `src/bootstrap/tenant/default-route.ts` (new) holds `DEFAULT_ROUTE:
Record<UserRole, string>`, re-exported via `bootstrap/tenant/index.ts`;
`role-guard.ts` imports it from `./default-route` instead of
`components/layout/app-shell/sidebar/nav-config.ts`; `nav-config.ts` now
re-exports `DEFAULT_ROUTE` from `@/bootstrap/tenant` (backward-compat, no
local definition); `principal/reports/layout.tsx` and
`parent/discipline/page.tsx` repointed to `@/bootstrap/tenant` too. New
`admin/layout.test.ts` (7 tests) mirrors `principal/layout.test.ts`'s direct
RSC-layout route-gate recipe — allow admin, redirect every other role to its
own `DEFAULT_ROUTE`, redirect unauthenticated/garbage-token to
`/select-tenant`.

**#17**: `teacher/discipline/page.tsx` and `principal/discipline/page.tsx`
both drop `leaveRequests.map((l) => l.classId)` from the `availableClasses`
union — now `violations` + `conductSummary` classIds only. 4 new tests (2 per
page) reproduce the bug RED first (a leave-only classId leaking into
`availableClasses`), confirmed GREEN after the fix.

**#16**: `year-timeline.tsx` — active-tab label:
`text-edu-primary-accessible dark:text-edu-primary` (margin improvement, not
an actual violation as filed — see backlog closing note); current-year badge:
`text-edu-text-primary` (genuine AA fix, same idiom as `status-badge.tsx`'s
`tone="primary"`, A11Y-001). 2 new Storybook interaction stories
(`YearTimelineContrast`/`YearTimelineContrastDark` in
`academic-record-screen.stories.tsx`) assert real-Chromium *resolved computed
`color`* equality for both surfaces in both themes (confirmed RED pre-fix:
both surfaces resolved to the old `text-primary` color,
`rgb(69, 112, 234)` = `#4570ea`, in both themes). These two surfaces sit on
ALPHA-blended tints (`bg-primary/10`/`/15`, Tailwind v4 `color-mix(...)`,
computed as an `oklab(... / <alpha>)` string in real Chromium — not a solid
`rgb()`), unlike the opaque `bg-edu-primary-light` pairing US-E24.19's
`timetable-tab.stories.tsx#PrimaryLightContrast` proves with an in-story WCAG
ratio recompute. Round 1 of this story shipped a `contrastRatio()` helper
that assumed an opaque `rgb()` background and silently produced a vacuous
~3e8 "ratio" for the alpha string on any input color (caught by
`fe-tech-lead-reviewer`, a real MUST-FIX) — removed in round 2. The WCAG
ratios cited above (and in the code comments) are independently
hand-measured/re-measured (twice — once by this packet's author, once by
`fe-tech-lead-reviewer` in review) against the actual composited colors, not
computed in-browser; the story's real regression guard is the exact resolved
`color` equality, which the round-1 vacuous assertions had NOT actually been.

Design review (`docs/DESIGN_REVIEW.md`):
- design-system: conform — only existing semantic tokens used
  (`text-edu-primary-accessible`, `dark:text-edu-primary`,
  `text-edu-text-primary`), no raw color, no new token.
- a11y: WCAG AA/3:1/4.5:1 floors verified in both light and dark, independently
  hand-measured against the real composited alpha-tint colors (not computed
  in-browser — see round-1/round-2 note above), cross-checked by
  `fe-accessibility-auditor`'s own independent re-measurement (both land
  within a small margin of each other, same conclusions). #1/#17 have no
  visible UI (redirect logic / dropdown data-source only) — gate scope not
  applicable per `docs/DESIGN_REVIEW.md`.
- impeccable audit: `node .claude/skills/impeccable/scripts/detector/cli/main.mjs
  src/features/academic-records/presentation/academic-record-screen/year-timeline.tsx`
  — 0 findings.
- states: no new UI state; no layout/spacing/size change to either #16
  surface.

Proof (all run on final HEAD of the branch):
- Unit/E2E: `bun vitest run` — 601 files / 5073 tests, all green (13 new:
  7 in `admin/layout.test.ts`, 4 in the two `page.test.ts` files' new
  `availableClasses` describe blocks, 2 in `role-guard`-adjacent coverage
  unaffected).
- Storybook interaction suite: `bun vitest run --config vitest.storybook.mts`
  — 176 files / 1458 tests, all green (2 new: `YearTimelineContrast`,
  `YearTimelineContrastDark`).
- Platform: `bunx tsc --noEmit` clean; `bun lint` clean (1 warning + 1 info
  pre-existing in `messaging/message-context-menu.tsx`, unrelated);
  `NEXT_PUBLIC_USE_MOCK= bun run build` succeeded, all admin/teacher/principal
  discipline + academic-record routes present.

`fe-tech-lead-reviewer`: round 1 **Revision Required** — 2 must-fix (the
`contrastRatio()` helper in `academic-record-screen.stories.tsx` was vacuous
against the alpha-tint backgrounds, see above; packet/TEST_MATRIX wording
overclaimed an "in-story WCAG ratio recompute" that hadn't actually happened),
1 should-fix (`nav-config.ts`'s backward-compat `DEFAULT_ROUTE` re-export had
zero production consumers left — repointed `nav-config.test.ts` to
`@/bootstrap/tenant` and deleted the re-export, completing the relocation
rather than leaving it half-done), 2 consider (a raw-classId-as-label
UX risk once #4 un-mocks — filed as backlog `#19`; trivial test-name nits in
`admin/layout.test.ts` — fixed). Everything else (the `#1` layer fix, the
`#17` id-space fix, the `#16` production color swaps, all pre-existing test
proof) verified independently by the reviewer and confirmed correct — all
round-1 findings fixed, round 2 clean.

`fe-accessibility-auditor`: **Pass**, 0 blocking/major findings on `#16`
(the only item touching visible UI) — independently re-measured the WCAG
ratios (own numbers land within ~0.4 of the packet's, same conclusions:
label was marginal/not-a-violation pre-fix, badge was a genuine AA failure
pre-fix, both comfortably clear their floors post-fix); confirmed the
`aria-controls` fix from US-E24.19 #15 and all keyboard/focus/motion/i18n
behavior in `year-timeline.tsx` are untouched by this diff. One test-quality
nit noted (not blocking, addressed by round 2's rewrite of the story
assertions to exact-color-equality only).

Harness: backlog `#1`, `#16`, `#17` closed via `harness-cli backlog close`
(outcome notes record #16's partial premise correction). New backlog `#18`
filed (teacher/student/parent namespace layouts also lack a direct
route-gate test, sibling of #1's admin half) and `#19` (discipline
`availableClasses` renders raw `classId` as the visible dropdown label —
will show UUIDs once #4 un-mocks) — NEITHER folded into this story, scope
guard.
