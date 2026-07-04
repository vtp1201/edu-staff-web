# US-E17.4 Empty States — Discipline (Violations + Conduct + Leave Requests)

## Status

implemented

## Lane

normal

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) chạm: `src/features/discipline/presentation/discipline-screen/components/`, `src/features/discipline/presentation/parent-discipline/`
- Shared contract/file: none (localized UI changes only; no shared DTO or endpoint touched)

## Product Contract

Four locations inside the discipline feature render non-canonical or missing empty states. After this story:

1. **Violations tab** — the misleading green `<Check>` icon is removed; replaced by the canonical empty state (`ShieldOff` icon, `role="status"`, `discipline.violations.empty` title, no CTA).
2. **Conduct tab** — the bare text row inside the table is replaced by the canonical empty state (`ClipboardList` icon, `role="status"`, `discipline.conduct.empty` title, no CTA).
3. **Leave-requests tab (teacher)** — a blank area becomes the canonical empty state (`CalendarOff` icon, `role="status"`, `discipline.leave.empty` title, no CTA).
4. **Leave-requests (parent view)** — same canonical pattern as #3, correctly reset on child switch.

All four locations must implement a clean state machine: exactly one of {loading, empty, populated, error} renders at any time. No new tokens, no new i18n keys, no BE changes.

## Relevant Product Docs

- `docs/product/design-spec.jsonc` — `emptyStatePattern`, `emptyStates.discipline.violations`, `emptyStates.discipline.leaveRequests`
- `docs/stories/epics/E17-ux-polish/US-E17.4-empty-states-discipline/spec.md` — full engineering spec
- `docs/stories/epics/E17-ux-polish/US-E17.4-empty-states-discipline/requirements.md`
- `docs/stories/epics/E17-ux-polish/US-E17.4-empty-states-discipline/use-cases.md`

## Acceptance Criteria

- The violations tab empty state renders `role="status"` container + `ShieldOff` icon (`aria-hidden="true"`, 64px, `text-edu-text-secondary`) + `<p>` title from `discipline.violations.empty`; no `<button>`; no element with `text-edu-success` inside the container.
- The conduct tab empty state renders `role="status"` container + `ClipboardList` icon (`aria-hidden="true"`, 64px, `text-edu-text-secondary`) + `<p>` title from `discipline.conduct.empty`; no `<button>`.
- The teacher-side leave-requests tab empty state renders `role="status"` container + `CalendarOff` icon (`aria-hidden="true"`, 64px, `text-edu-text-secondary`) + `<p>` title from `discipline.leave.empty`; no `<button>`.

> Note (A11Y-001 fix): icon color corrected from `text-edu-text-muted` (2.95:1 on white — fails the repo's ≥3:1 icon-contrast floor, WCAG 1.4.11) to `text-edu-text-secondary` (5.48:1) — see `src/components/shared/empty-state/empty-state.tsx` JSDoc. `docs/product/design-spec.jsonc`'s `emptyStatePattern.icon.color` still literally reads `var(--edu-text-muted)`; this story's implementation deviates from that generic pattern definition intentionally for accessibility and is the accepted precedent (DR-GATE-002).
- The parent-discipline leave-requests empty state renders identically to the teacher-side; resets to loading when parent switches child.
- At any point in time, exactly one of {loading spinner, canonical empty state, populated list/table, error state} is visible for each tab location.
- No `<h2>` or `<h3>` is present inside any empty state container.
- No horizontal overflow at 320px viewport for any empty state.
- `src/app/tokens.css` is unchanged (zero new tokens).
- `vi.json` and `en.json` are unchanged (zero new i18n keys).
- Storybook `EmptyState` story for each changed component has a `play()` that asserts `role="status"` on container and `aria-hidden="true"` on icon SVG.

## Design Notes

- Commands: none (read-only UI state change)
- Queries: existing violations / conduct / leave-requests queries (mock-first `core` service) — no changes to query logic
- API: none
- Tables: none
- Domain rules: empty state condition — `violations.length === 0`, `conductRows === 0`, `leaveRequests.length === 0` (after successful fetch, not loading, not error)
- UI surfaces:
  - `violations-tab.tsx` ~line 380–389: remove `<Check>` + green text; replace with canonical pattern
  - `conduct-tab.tsx` ~line 101: replace bare text with canonical pattern
  - `leave-tab.tsx` ~line 132: replace empty markup with canonical pattern
  - `parent-discipline/` leave-requests: add canonical pattern; key to selected child
- i18n namespaces: `useTranslations("discipline.violations")` → `"empty"`, `useTranslations("discipline.conduct")` → `"empty"`, `useTranslations("discipline.leave")` → `"empty"`
- Icon choices: `ShieldOff` (violations), `ClipboardList` (conduct), `CalendarOff` (leave requests)
  - [OPEN QUESTION] `ClipboardList` is assumed for conduct; design team confirmation preferred
  - [OPEN QUESTION] `ShieldOff` preferred over `Shield`; FE team verifies Lucide version availability

## Validation

When updating durable proof status, use numeric booleans:
`scripts/bin/harness-cli story update --id US-E17.4 --unit 1 --integration 0 --e2e 1 --platform 0`.

| Layer | Expected proof |
|---|---|
| Unit | Vitest + Testing Library: DOM attribute assertions for `role="status"`, `aria-hidden="true"`, absence of `text-edu-success`; state machine transitions (loading→empty, empty→loading, populated→empty not shown) for all four locations |
| Integration | none (no new API calls; mock-first data source unchanged) |
| E2E | Storybook interaction story with `play()` for each component's `EmptyState` state; `EmptyState` story at 320px width to verify no overflow |
| Platform | none |
| Release | Verify on `/teacher/discipline`, `/principal/discipline`, `/parent/discipline` that no green check icon appears in the violations tab and all four empty states render correctly |

## Harness Delta

No harness changes required. No new story packet sections, no new ADR, no new i18n keys, no new tokens.

## Evidence

- New shared `src/components/shared/empty-state/` (folder + `index.ts` + `.tsx` + `.test.tsx` + `.stories.tsx`) extracted per `.claude/rules/component-organization.md` (decision 0026), resolving the tech-debt flag from US-E17.5's tech-lead review (duplicated `emptyStatePattern` shape). Used at 4 locations: `violations-tab.tsx` (`ShieldOff`), `conduct-tab.tsx` (`ClipboardList`), `leave-tab.tsx` (`CalendarOff`), `parent-discipline/components/LeaveHistorySection.tsx` (`CalendarOff`, switched to `discipline.leave.empty` key for copy parity with the teacher tab).
- `bunx tsc --noEmit` — pass
- `bun lint` (Biome) — pass (0 findings in scoped files; 1 pre-existing unrelated warning + 1 info in `message-context-menu.tsx`, confirmed unrelated)
- `bun vitest run` — 949/949 pass (full unit suite; +7 new `empty-state.test.tsx` tests over the 942 baseline)
- `bunx vitest run --config vitest.storybook.mts` (`empty-state` scope) — 3/3 pass (`Default`/`WithBody`/`WithCta`, real Chromium)
- `bunx vitest run --config vitest.storybook.mts` (`ParentDisciplineScreen.stories.tsx`) — 11/12 pass; the 1 failure (`Leave Form Past Date`) is pre-existing on `main` too (confirmed by diffing against `main`'s copy of the same file — 10/11 there), unrelated to this diff.
- `bunx vitest run --config vitest.storybook.mts` (`discipline-screen.stories.tsx`) — blocked by a pre-existing, env-wide `useRouter`-mount failure affecting 17 story files repo-wide (not caused by this diff; `DisciplineScreen` calls `next/navigation` hooks untouched by this story). Tracked as a known runner limitation, not a release blocker.
- `NEXT_PUBLIC_USE_MOCK= bun run build` — pass, all routes compiled
- `git diff main -- src/app/tokens.css src/bootstrap/i18n/messages/vi.json src/bootstrap/i18n/messages/en.json` — empty (zero new tokens, zero new i18n keys, confirmed)
- `fe-tech-lead-reviewer`: **Approved** — layering, tokens, i18n, TS, TDD proof all pass. Follow-ups (non-blocking, out of scope): `body` text contrast guard for future `EmptyState` callers; `parent-discipline/components/ViolationsList.tsx` and `student-conduct-screen/components/leave-history-list.tsx` still carry the old anti-pattern (separate migration).
- `fe-accessibility-auditor`: 1 **Major** finding (A11Y-001, icon contrast `text-edu-text-muted` 2.95:1 on white card — below the repo's ≥3:1 icon-contrast floor) — **fixed** (swapped to `text-edu-text-secondary`, 5.48:1); story/spec AC text synced to match. Re-confirmed PASS after fix. Minor follow-up logged (A11Y-002, `leave-history-list.tsx` still 3-way copy drift) — out of scope.
- `fe-qa-playwright`: **Go** — 100% AC coverage (40/40, direct test or code-review-provable via unchanged exclusive state-machine control flow). Closed 2 pre-existing test-coverage gaps found during the pass (`ConductTab_Empty`, `ParentDisciplineScreen_EmptyLeaveRequests` — test-only additions, no production code touched).

Design review: pass
- design-system: conform (token/typography/component OK — matches `emptyStatePattern` in `design-spec.jsonc`, icon color corrected per A11Y-001)
- a11y: WCAG AA OK after A11Y-001 fix; keyboard OK (no interactive elements in any of the 4 usages); reduced-motion OK (no animation)
- impeccable audit: 0 finding — canonical pattern extraction, misleading green-check anti-pattern removed, no new anti-pattern introduced
- states: loading/empty/error/populated OK (state machine unchanged, verified at `discipline-screen.tsx` and `ParentDisciplineScreen.tsx` level); responsive 320px OK (no fixed widths, `max-w-xs` only on unused `body` prop — cannot overflow by construction)
