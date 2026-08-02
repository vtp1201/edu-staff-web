# US-E20.4 Parent Children Overview (index page — closes dead sidebar link)

## Status

planned

## Lane

normal

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) chạm: `src/features/parent-links/` (reuse
  `get-linked-students-with-consents.use-case.ts`, or a narrower sibling if the
  consent payload is heavier than this screen needs), route
  `app/[locale]/t/[tenant]/(app)/parent/children/page.tsx`
- Shared contract/file: `LinkedStudentSummary` entity — REUSE, do not
  re-resolve via `features/timetable`'s `TimetableChild` (see rationale below)

## Product Contract

Sidebar nav (`nav-config.ts`, parent role) links to `/parent/children` but only
`parent/children/[studentId]/academic-record` exists (unreachable from the UI —
no way to discover a `studentId` without this index). This adds the missing
"my children" overview: a card per linked child, name + class + a link into
that child's academic record (and, once built, other child-scoped screens).

**Important reuse disambiguation (do not swap these two):**
`features/parent-links`'s `LinkedStudentSummary` (`fullName`, real, resolved by
`GET /parents/{id}/linked-students`-equivalent, US-E20.2/INT-001) HAS a real
child name in production. `features/timetable`'s `TimetableChild` (used by the
schedule/grades child-pickers) documents a KNOWN residual gap — `name` is
`undefined` in real mode (ask #20, no directory endpoint a PARENT can call
resolves a student's name) and falls back to an ordinal label. Building this
overview screen on `TimetableChild` would ship a page that shows "Con thứ 1",
"Con thứ 2" instead of real names for no reason — use `parent-links`'s entity,
which already has the name.

## Relevant Product Docs

- No `docs/product/design-spec.jsonc` entry for this screen. Reuse the design
  system's card pattern (`StatCard`/list-card conventions) — name, avatar
  initials, class chip, "Xem học bạ" (view academic record) CTA per child.

## Acceptance Criteria

- Given a parent with ≥1 linked child, `/parent/children` shows one card per
  child with the child's real name (never an ordinal fallback for this
  screen — that fallback belongs to the timetable/grades pickers only, not
  here).
- Given a parent with zero linked children, the page shows the existing
  no-child empty state pattern (reuse, consistent with `parent/grades`'
  "no-child" state).
- Clicking a child card navigates to
  `/parent/children/[studentId]/academic-record` (existing route, made
  reachable).
- If the underlying consents payload includes per-subject/per-scope consent
  flags this screen doesn't need, do not surface them here — that is
  `parent/profile`'s consent section's job (US-E20.2), not this overview's.
- WCAG 2.1 AA: each card is a single focusable/keyboard-activatable unit with
  an accessible name (not icon-only), visible focus ring.

## Design Notes

- Commands: none (read-only).
- Queries: `getLinkedStudentsWithConsentsAction()` (existing, US-E20.2) — if its
  return shape is consent-heavy, either reuse as-is and select just
  `studentId`/`fullName`/`avatarUrl` in the ViewModel mapper, or (if the
  component-architect judges it cleaner) add a narrow read projection —
  confirm with `fe-component-architect`/`fe-state-engineer` before deciding;
  do not fetch consents twice.
- API: whatever `parent-consent.repository.ts` already calls — no new BE call.
- Domain rules: none new.
- UI surfaces: `app/[locale]/t/[tenant]/(app)/parent/children/page.tsx` (RSC) +
  `features/parent/presentation/children-overview-screen/` (new; parent's own
  presentation home, not parent-links', since parent-links' domain purpose is
  consent management — keep the screen namespaced where a parent expects "my
  dashboard" screens to live, mirroring `parent-dashboard.tsx`'s home).

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | ViewModel-mapping test (select child summary fields, no-child empty mapping) |
| Integration | none new (repository already covered by US-E20.2) |
| E2E | Storybook interaction: cards render, empty state, card → academic-record navigation |
| Platform | `bun build` clean |
| Release | design-review gate + a11y audit green |

## Harness Delta

Registered via `harness-cli story add --id US-E20.4`.

## Evidence

(fill after implementation)
