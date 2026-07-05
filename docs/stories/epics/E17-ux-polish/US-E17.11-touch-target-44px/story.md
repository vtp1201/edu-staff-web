# US-E17.11 Touch Target ≥44px on Mobile

## Status

implemented

## Lane

normal

## Dependencies

- Depends on: none (but sticky column has a functional dependency on US-E17.2's horizontal-scroll wrapper; see §FR-002)
- Blocks: none
- Feature module(s) chạm:
  - `src/components/shared/grade-book-table/grade-book-table.tsx` (min-h + sticky column)
  - `src/features/discipline/presentation/discipline-screen/discipline-screen.tsx` (violation rows)
  - `src/features/student/presentation/student-conduct-screen/student-conduct-screen.tsx` (FE audits — may need same fix)
- Shared contract/file: `src/components/shared/grade-book-table/grade-book-table.tsx` — **CROSS-REFERENCE US-E17.2 (same file, non-overlapping changes — claim check required per parallel-workflow.md)**

## Product Contract

Interactive rows in the grade-book table and discipline violation log meet WCAG 2.5.5 AA minimum 44×44px touch target on mobile. Grade table data row cells get `min-h-[44px]`. The grade table first column gets `position: sticky; left: 0; bg-card; z-10` for mobile horizontal-scroll usability. Violation rows get `py-2.5 min-h-[44px]`. Icon-only action buttons in affected rows get `min-h-[44px] min-w-[44px]`. No new design tokens — Tailwind utility classes only.

## Relevant Product Docs

- `docs/design-requests/DR-011-ux-polish-interactions.md` §UX-08
- `docs/product/design-spec.jsonc` → `interactionPatterns.touchTarget`
- `docs/stories/epics/E17-ux-polish/US-E17.11-touch-target-44px/spec.md`
- `docs/stories/epics/E17-ux-polish/US-E17.2-grade-table-scroll/` (cross-reference — same file)

## Acceptance Criteria

Full 15-AC set from `use-cases.md` (this section previously listed only 8 of 15 —
reconciled per `fe-qa-playwright`'s Go/No-Go finding so future QA passes don't
need to cross-reference `use-cases.md`). Status = proof that actually exists today.

- AC-E17.11-01: Grade table data rows have computed height ≥44px on a 375px viewport. **DONE** — `min-h-[44px]` added to `GradeRow` cells; unit tests + `TouchTarget_Mobile375` live-browser story.
- AC-E17.11-02: Change in `grade-book-table.tsx` propagates to teacher grade entry, parent grade view, and student grade view without individual file changes. **DONE (architectural)** — single shared component, no per-consumer edits; existing `TeacherView_WithScores`/`StudentView_SingleRow`/`ParentView_SingleRow`/`PrincipalView` stories all render the same `GradeRow`.
- AC-E17.11-03: Row expands with content taller than 44px (min-height, not fixed). **DONE (by construction)**, untested — `min-h-[44px]` used, not `h-[44px]`. No test exercises actual overflow content; low-risk gap, follow-up if a tall-content regression is ever suspected.
- AC-E17.11-04: Desktop 30-row density acceptable ("Should", not "Must"). **NOT TESTED** — no 30-row fixture exists; default (unconditional `min-h-[44px]`, no `md:min-h-auto`) taken per spec's own recommended default (OQ-E17.11-01), decision documented here rather than in the commit body. Follow-up: a real 30-row Storybook fixture at 1280px if density is ever reported as an issue.
- AC-E17.11-05: Zero new entries in `src/app/tokens.css`; only Tailwind utilities used. **DONE** — confirmed via `git diff`, no `tokens.css`/`globals.css` touch.
- AC-E17.11-06: When grade table has horizontal overflow, first column stays visible (sticky) during horizontal scroll on 375px viewport. **DONE (pre-existing, US-E17.2)** — `MobileScroll_375` story, unmodified, still green.
- AC-E17.11-07: First column cells have `position: sticky`, `left: 0`, `background-color: var(--card)`, `z-index: 10`. **DONE functionally, literal values differ by design** — code uses `bg-edu-card`/`z-[1]` (US-E17.5 dark-mode-literal-token decision, kept intentionally, see Scope decision #3 below). Sticky/left:0/visible-during-scroll all proven; the exact `bg-card`/`z-10` token names in this AC's wording are stale relative to the later E17.5 fix.
- AC-E17.11-08: No z-index collision with dialogs/overlays. **DONE (verified by inspection)** — sticky column `z-[1]` vs. every Radix overlay primitive (`dialog`/`alert-dialog`/`sheet`/`popover`/`dropdown-menu`/`select`) at `z-50`; no story renders a live dialog over the table to prove this dynamically, so it's a structural/inspection proof, not a runtime one.
- AC-E17.11-09: Dependency — sticky column requires US-E17.2's horizontal-scroll wrapper. **MOOT** — US-E17.2 already merged before this story started; wrapper present in all consumers.
- AC-E17.11-10: Discipline violation rows have computed height ≥44px. **DONE (by inspection, now test-covered)** — `violations-tab.tsx` rows use `py-3.5` (not the spec's literal `py-2.5`) + `DisciplineAvatar size="lg"` (40px) ≈68px computed height, already exceeding the floor; QA flagged the "no automated proof" gap, closed with a Storybook/unit assertion in the QA-gap-closing follow-up commit (see Proof section).
- AC-E17.11-11: `py-2.5` provides visual vertical separation. **Spec/code wording drift, functionally satisfied** — actual code uses `py-3.5` (more generous than spec's `py-2.5`); A11Y-011-01 (non-blocking) documents this. No behavior gap, just a stale literal value in the AC text.
- AC-E17.11-12: `student-conduct-screen.tsx`-equivalent violation markup aligned. **VERIFIED — two additional files found, both already compliant, no code change needed.** The actual files (not literally named `student-conduct-screen.tsx`) are `src/features/discipline/presentation/student-conduct-screen/components/my-violations-list.tsx` (`MyViolationsList`, student's own-violations read-only list) and `src/features/discipline/presentation/parent-discipline/components/ViolationsList.tsx` (`ViolationsList`, parent read-only list). Both use `py-4` (32px) rows with a 2-3 line text stack (type+badge, description, date) — computed height well over 44px by inspection; neither renders icon-only action buttons (both are read-only, no edit/delete), so FR-004/AC-13 doesn't apply to them. Not found by the original spec/scope-decision docs (which assumed the file would be literally named `student-conduct-screen.tsx`, which doesn't exist) — documented here as a QA-driven scope-completion, not an oversight left open.
- AC-E17.11-13: Icon-only action buttons in rows have `min-h-[44px]` and `min-w-[44px]`. **DONE (pre-existing, US-E17.8 A11Y-004)** — `Button size="icon"` variant already carries `min-h-11 min-w-11` globally; confirmed by reading `components/ui/button/button.tsx`. Test-covered per the QA-gap-closing follow-up (see Proof section).
- AC-E17.11-14: Icon-only buttons individually keyboard-reachable with visible focus ring. **DONE (native semantics, verified by inspection)** — native `<button>` via the `size="icon"` Button primitive is independently focusable/activatable and carries the shared `focus-visible:ring-ring/50`; no dedicated Tab-order test exists (low-risk, standard native element behavior).
- AC-E17.11-15: US-E17.2 changes (horizontal scroll, `border-r` on sticky col) are not regressed by this story. **DONE** — `MobileScroll_375/320`, `DesktopView_1280`, `TeacherView_Tablet768`, `ParentView_Mobile375` stories unmodified, all still green. (Note: the new AC-01 unit/story tests were initially mislabeled "AC-E17.11-15" in code comments — fixed to "AC-E17.11-01" in the QA-gap-closing follow-up commit, since they actually prove row height, not E17.2 regression-absence.)

## Design Notes

- Commands: none
- Queries: none (layout-only changes)
- API: none
- Tables: none
- Domain rules: `min-h-[44px]` applied unconditionally by default; FE may add `md:min-h-auto` for desktop density only after verifying a 30-row table is unacceptably dense — decision documented in commit
- UI surfaces:
  - Modify: `src/components/shared/grade-book-table/grade-book-table.tsx` — add `min-h-[44px]` to data rows; ensure first column has `sticky left-0 bg-card z-10`
  - Modify: `src/features/discipline/presentation/discipline-screen/discipline-screen.tsx` — add `py-2.5 min-h-[44px]` to violation row containers
  - Audit: `src/features/student/presentation/student-conduct-screen/student-conduct-screen.tsx` — apply same if same markup
  - Update: Storybook stories with 375px viewport assertions
- i18n keys: none required

## Validation

When updating durable proof status, use numeric booleans:
`scripts/bin/harness-cli story update --id US-E17.11 --unit 1 --integration 0 --e2e 1 --platform 0`.

| Layer | Expected proof |
|---|---|
| Unit | Vitest: `min-h-[44px]` class on grade table row cells; `sticky left-0 bg-card z-10` on first column; `py-2.5 min-h-[44px]` on violation row containers |
| Integration | None |
| E2E | Storybook interaction: 375px viewport asserting ≥44px row height; sticky column visible during horizontal scroll |
| Platform | Manual 375px device-mode check for touch target size and sticky column behavior |
| Release | n/a |

## Harness Delta

No harness changes required. No new endpoints, tokens, or i18n keys.

## Evidence

Design review: pass
- design-system: conform — `min-h-[44px]` is a bare Tailwind arbitrary spacing utility (not a color); zero new tokens (NFR-004 met); no component pattern duplicated.
- a11y: WCAG 2.1 AA / 2.5.5 target-size — `fe-accessibility-auditor` PASS, no blocking/critical findings (1 non-blocking documentation note, see below); keyboard/focus/contrast unaffected (no interactive/color surface touched).
- impeccable audit: 0 findings requiring action — this is a non-visual-breaking spacing addition (row height increase only); reviewed manually against `.claude/rules/design-system.md` + `.claude/rules/accessibility.md` checklists (no impeccable CLI invocation needed for a single-utility-class layout change; nothing to critique/polish beyond what tech-lead + a11y already covered).
- states: no new states; existing loading/empty/error/success stories in `grade-book-table.stories.tsx` unmodified, still passing. 320px unbroken (`MobileScroll_320` unchanged, still green). Dark mode: no color/token touched by this diff — see pre-existing follow-up note below.
- tech-lead: Approved (`fe-tech-lead-reviewer`).

### Scope decisions (documented per reviewer SHOULD-FIX)

1. **Grade table (`grade-book-table.tsx`) — the only file changed.** Added `min-h-[44px]` to the 4 data-row cells inside `GradeRow` (`th[scope=row]` + score/average/conduct `<td>`s). Header row (`<thead>`) intentionally excluded — not interactive tappable data, out of scope per spec.md.
2. **Discipline violation rows (`violations-tab.tsx`, the file that actually holds the row markup — `discipline-screen.tsx` is a tab shell with no rows) — NO CHANGE, verified already compliant.** Row `<li>` uses `py-3.5` (28px) + `DisciplineAvatar size="lg"` (40px) ≈ 68px computed height, already well over the 44px floor. The icon-only delete button (`Button size="icon"`) already carries `min-h-11 min-w-11` globally from the US-E17.8 A11Y-004 fix. Both independently re-verified by `fe-accessibility-auditor` (not just trusted from the engineer's claim). AC-E17.11-10/13 are satisfied by pre-existing markup; FR-003 required no code change.
3. **Sticky first column tokens (`bg-edu-card`/`z-[1]`/`border-edu-border`) — NOT changed to the spec's literal `bg-card`/`z-10` wording.** This is a deliberate, tested choice from US-E17.5 (dark-mode-literal token pinning) that predates this story's spec.md draft. Reverting to `bg-card`/`z-10` would regress a documented prior decision and violate this story's own AC-E17.11-15 (no regression). Functional intent of FR-002/AC-06–09 (sticky, visible, no z-index collision with Radix overlays at `z-50`) is already satisfied — independently confirmed by both reviewers.

### Follow-ups flagged (non-blocking, not part of this story's scope)

- **A11Y-011-01 (Minor, informational):** spec.md's literal `py-2.5` wording for violation rows doesn't match the actual `py-3.5` in code — traceability/documentation drift only, not a compliance gap (actual height already exceeds 44px). Recommend reconciling spec.md wording in a future doc-sync pass; no code change needed.
- **Dark-mode sticky-column contrast (pre-existing, not introduced by this story):** `fe-tech-lead-reviewer` noted `--edu-card`/`--edu-border` are not overridden in `.dark` (`globals.css`), while `--card` is (`#131a2e`) — so the grade table's sticky first column could render as a white stripe on a dark table body in dark mode. This predates US-E17.11 (introduced by US-E17.5) and is out of this story's scope (this story added no color/token changes). Flagged to fe-lead backlog for a future dark-mode visual QA pass / possible follow-up story on `grade-book-table.tsx` dark-mode sticky-column tokens.

### Proof

- Unit: `bun vitest run` → 1032 passed / 202 files (baseline ~1010 + 2 new tests), zero regressions.
- `bunx tsc --noEmit`: clean.
- `bun lint:fix`: clean.
- `bun run build`: exit 0.
- E2E/Storybook: `TouchTarget_Mobile375` story (real 375px via `page.viewport`) asserts live `getBoundingClientRect().height >= 44` on grade-row cells; verified green in real Chromium by `fe-tech-lead-reviewer`. Existing `MobileScroll_375/320`, `DesktopView_1280`, `TeacherView_Tablet768`, `ParentView_Mobile375` stories unmodified, still passing (12 total browser-runner tests in this file).
- Tech-lead verdict: Approved. A11y verdict: PASS (0 blocking/critical).
