# Requirements — US-E17.4 Empty States — Discipline (Violations + Leave Requests)

## Requirements Summary

Three discipline tabs currently render non-canonical or blank empty states: the violations tab uses a misleading green check icon (`text-edu-success`), the conduct tab shows a plain text row inside the table, and the leave-requests tab (parent view) shows a blank area. All three SHALL be upgraded to the canonical `emptyStatePattern` defined in `docs/product/design-spec.jsonc`, using existing i18n keys. No new tokens, no new i18n keys, and no BE changes are required.

## Actors & Roles

| Role | Screen | Empty state location |
|---|---|---|
| Teacher | `/teacher/discipline` — violations tab, conduct tab, leave-requests tab | All three |
| Principal | `/principal/discipline` — violations tab, conduct tab | Read-only view |
| Parent | `/parent/discipline` — leave requests tab | Leave requests only |

Parent is the primary mobile user. Teacher and Principal see violations and conduct empty states.

## Functional Requirements

**TR-001** — Violations tab empty state (canonical pattern)
When `violations.length === 0` after data loads successfully, the system SHALL render the canonical empty state inside the violations tab panel:
- Container: `role="status"`, centered column, `padding: 40px 20px`
- Icon: `shield` (lucide), 64 px, `var(--edu-text-muted)`, `aria-hidden="true"`
- Title: i18n key `discipline.violations.empty` ("Không có vi phạm nào!"), 16 px / 700 weight, `var(--edu-text-primary)`, `margin-top: 16px`
- Body: omitted (no separate body key; the title is self-contained)
- CTA: none (`hasCTA: false`)
- The existing `<Check>` icon with `text-edu-success` color SHALL be removed from the empty state
- Trigger: violations list fetch completes with empty array.
- Preconditions: not loading, not error.
- Postconditions: canonical empty state is visible; table rows not rendered.
- Error conditions: if fetch fails, existing error state is shown instead.

**TR-002** — Conduct tab empty state (canonical pattern)
When the conduct summary table has zero rows after data loads successfully, the system SHALL render the canonical empty state:
- Container: `role="status"`, centered column, `padding: 40px 20px`
- Icon: contextual conduct icon (e.g. `clipboard-list`), 64 px, `var(--edu-text-muted)`, `aria-hidden="true"`
- Title: i18n key `discipline.conduct.empty` ("Chưa có dữ liệu hạnh kiểm"), 16 px / 700, `var(--edu-text-primary)`
- CTA: none
- Trigger: conduct data fetch completes with empty result.
- Preconditions: not loading, not error.
- Postconditions: canonical empty state visible; table not rendered.
- Error conditions: existing error state shown on fetch failure.

**TR-003** — Leave requests empty state — teacher-side tab
When `leaveRequests.length === 0` after data loads in the teacher-side leave-requests tab, the system SHALL render:
- Container: `role="status"`, centered column, `padding: 40px 20px`
- Icon: `calendar-off` (lucide), 64 px, `var(--edu-text-muted)`, `aria-hidden="true"`
- Title: i18n key `discipline.leave.empty` ("Chưa có yêu cầu nghỉ phép"), 16 px / 700, `var(--edu-text-primary)`
- CTA: none
- Trigger: leave-requests fetch completes with empty array.
- Preconditions: not loading, not error.
- Postconditions: canonical empty state visible; table/list not rendered.
- Error conditions: existing error state shown on fetch failure.

**TR-004** — Leave requests empty state — parent view
When the parent's leave-requests list in `parent-discipline` resolves with zero items, the system SHALL render the canonical empty state identical in spec to TR-003 (same icon, same key, no CTA) inside the parent-facing component.
- Trigger: leave-requests fetch completes with empty array in parent view.
- Preconditions: not loading, not error.
- Postconditions: canonical empty state visible.
- Error conditions: existing error state shown on fetch failure.

**TR-005** — State machine: loading / empty / populated / error
For all three tab panels, the system SHALL implement a clean state machine:
- Loading → existing spinner (unchanged)
- Empty → canonical empty state (TR-001 / TR-002 / TR-003 / TR-004)
- Populated → existing list/table (unchanged)
- Error → existing error text (unchanged)
- Exactly one state is rendered at any time; no state overlap.
- Trigger: data fetch lifecycle events.
- Preconditions: component mounted.
- Postconditions: correct state rendered; transitions are clean.
- Error conditions: none (constraint).

**TR-006** — Canonical layout compliance
All empty states SHALL conform to `emptyStatePattern` layout: centered column, `padding: 40px 20px`, `text-align: center`, title `margin-top: 16px`. Deviation is not permitted.

## Non-Functional Requirements

**TR-NFR-001 — Accessibility (WCAG 2.1 AA)**
`role="status"` on each empty-state container ensures screen reader announcement. Icon `aria-hidden="true"` (decorative). Title rendered as `<p>` (not `<h2>`) — no heading hierarchy disruption. Title color `var(--edu-text-primary)` = 9.4:1 on white (PASS). No body text in these entries → muted-color body advisory is moot. Measurable target: `role="status"` present; icon `aria-hidden="true"`; no `<h2>`/`<h3>` introduced.

**TR-NFR-002 — i18n**
No new keys. Uses `discipline.violations.empty`, `discipline.conduct.empty`, `discipline.leave.empty`. Measurable target: zero additions to `vi.json` / `en.json`.

**TR-NFR-003 — No token additions**
All colors from existing tokens (`--edu-text-muted`, `--edu-text-primary`). Measurable target: `src/app/tokens.css` diff is empty for this story.

**TR-NFR-004 — Responsive**
Empty states render correctly at 375 px, 768 px, 1280 px. `padding: 40px 20px` and `max-width: 320px` ensure fit at 320 px minimum viewport. Measurable target: no horizontal overflow at 320 px.

## Scope Boundary

**IN scope:**
- `src/features/discipline/presentation/discipline-screen/` — violations tab, conduct tab, leave-requests tab empty states.
- `src/features/discipline/presentation/parent-discipline/` — leave-requests empty state (parent role).
- State machine correctness for all four locations.

**OUT of scope:**
- Stat-card grid fix on discipline screen — covered in US-E17.1.
- Student conduct view (`/student/conduct`) — not in DR-010 emptyStates spec.
- New RBAC, new routes.
- CTA buttons — design spec marks all discipline empty states as `hasCTA: false`.
- BE changes, new design tokens, new i18n keys.

**External dependencies:**
- Data source: `core` service (discipline / conduct records). Currently mock-first; empty-array case must be handled regardless.

## MoSCoW

| Priority | Requirement | Rationale |
|---|---|---|
| Must | TR-001 | Violations empty state is actively misleading (green success icon on zero violations) |
| Must | TR-002, TR-003, TR-004 | All discipline tab empty states must consistently apply the canonical pattern |
| Must | TR-005, TR-006 | State machine correctness and layout compliance are baseline correctness |
| Must | TR-NFR-001, TR-NFR-004 | WCAG AA and responsive are "done" criteria |
| Should | TR-NFR-002, TR-NFR-003 | Zero-drift i18n and token constraints — easy to satisfy |
| Won't | CTA buttons | Design-spec explicitly marks all discipline empty states as `hasCTA: false` |

## Design Spec Reference

`docs/product/design-spec.jsonc` keys:
- `emptyStatePattern` — canonical layout (icon 64 px, title 16px/700 primary, centered column, padding 40 px 20 px, `role="status"`)
- `emptyStates.discipline.violations` — `{ i18nKey: "discipline.violations.empty", icon: "shield", hasCTA: false }`
- `emptyStates.discipline.leaveRequests` — `{ i18nKey: "discipline.leave.empty", icon: "calendar-off", hasCTA: false }`
