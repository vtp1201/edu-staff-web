# US-E17.4 Empty States — Discipline (Violations + Conduct + Leave Requests)

## Status

planned

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

- The violations tab empty state renders `role="status"` container + `ShieldOff` icon (`aria-hidden="true"`, 64px, `text-edu-text-muted`) + `<p>` title from `discipline.violations.empty`; no `<button>`; no element with `text-edu-success` inside the container.
- The conduct tab empty state renders `role="status"` container + `ClipboardList` icon (`aria-hidden="true"`, 64px, `text-edu-text-muted`) + `<p>` title from `discipline.conduct.empty`; no `<button>`.
- The teacher-side leave-requests tab empty state renders `role="status"` container + `CalendarOff` icon (`aria-hidden="true"`, 64px, `text-edu-text-muted`) + `<p>` title from `discipline.leave.empty`; no `<button>`.
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

Add commands, reports, screenshots, or links after validation exists.
