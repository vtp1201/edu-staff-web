# Spec — US-E17.4 Empty States — Discipline (Violations + Conduct + Leave Requests)

**Status:** Planned | **Lane:** normal
**Sources:** requirements.md · use-cases.md · `docs/product/design-spec.jsonc` (`emptyStatePattern`, `emptyStates.discipline`)

---

## 1. Overview

Four locations inside the discipline feature currently render non-canonical or missing empty states. The violations tab renders a misleading `<Check>` icon with `text-edu-success` (zero violations is not a success badge). The conduct tab renders a bare text row inside the table. The teacher-side and parent-side leave-requests tabs render a blank area or no empty state at all. All four SHALL be upgraded to the canonical `emptyStatePattern` from `docs/product/design-spec.jsonc`. No new tokens, no new i18n keys, and no BE changes are required.

**In scope:**
- `src/features/discipline/presentation/discipline-screen/components/violations-tab.tsx` (line ~380–389)
- `src/features/discipline/presentation/discipline-screen/components/conduct-tab.tsx` (line ~101)
- `src/features/discipline/presentation/discipline-screen/components/leave-tab.tsx` (line ~132)
- `src/features/discipline/presentation/parent-discipline/` — leave-requests empty state

**Out of scope:**
- Stat-card grid fix (US-E17.1)
- Student conduct view (`/student/conduct`)
- CTA buttons — all discipline empty states have `hasCTA: false`
- New BE endpoints, design tokens, or i18n keys

**Definitions:**
- *Canonical empty state* — the `emptyStatePattern` from `docs/product/design-spec.jsonc`: `role="status"` container, centered column, icon 64px `text-edu-text-secondary` `aria-hidden`, `<p>` title 16px/700 `text-foreground` `mt-4`, no CTA.
  - **A11Y-001 fix (implementation):** the icon color is `text-edu-text-secondary` (#5A6A85 = 5.48:1 on the white card), NOT `text-edu-text-muted` which `emptyStatePattern.icon.color` literally names — `text-edu-text-muted` (#8898A9) is 2.95:1 on white, below the ≥3:1 icon-contrast floor (WCAG 1.4.11, `accessibility.md`; DR-GATE-002 precedent). The `design-spec.jsonc` pattern entry itself is unchanged (cross-cutting, out of this story's scope).

---

## 2. Actors & Roles

| Role | Route | Visible tabs |
|---|---|---|
| Teacher | `/teacher/discipline` | Violations, Conduct, Leave Requests |
| Principal | `/principal/discipline` | Violations, Conduct (read-only) |
| Parent | `/parent/discipline` | Leave Requests only (multi-child switcher) |

Principal sees the same violations and conduct empty states as Teacher (no role-specific variation). Parent is the primary mobile user for leave requests.

---

## 3. Functional Requirements

### FR-01 — Violations tab empty state (canonical pattern)

**Priority:** Must | **Source:** TR-001, UC-01 | **Design-spec key:** `emptyStates.discipline.violations`

The system SHALL render the canonical empty state inside the violations tab panel when `violations.length === 0` after a successful (non-error, non-loading) data fetch.

- Container: `role="status"`, `flex flex-col items-center text-center px-5 py-10`
- Icon: `ShieldOff` (Lucide), `size-16` (64px), `text-edu-text-secondary`, `aria-hidden="true"`
- Title: `<p className="text-base font-bold text-foreground mt-4">` — i18n key `discipline.violations.empty` ("Không có vi phạm nào!")
- Body: omitted (no separate body key; title is self-contained)
- CTA: none
- The existing `<Check>` icon with `text-edu-success` SHALL be removed

**AC:** AC-01.1 through AC-01.11 (see §6)

**Dependencies:** none

---

### FR-02 — Conduct tab empty state (canonical pattern)

**Priority:** Must | **Source:** TR-002, UC-02 | **Design-spec key:** `emptyStates.discipline.conduct` (contextual icon)

The system SHALL render the canonical empty state inside the conduct tab panel when the conduct summary table has zero rows after a successful data fetch.

- Container: `role="status"`, `flex flex-col items-center text-center px-5 py-10`
- Icon: `ClipboardList` (Lucide), `size-16` (64px), `text-edu-text-secondary`, `aria-hidden="true"`
- Title: `<p className="text-base font-bold text-foreground mt-4">` — i18n key `discipline.conduct.empty` ("Chưa có dữ liệu hạnh kiểm")
- Body: omitted
- CTA: none

**AC:** AC-02.1 through AC-02.7 (see §6)

**Dependencies:** none

---

### FR-03 — Leave requests empty state — teacher-side tab

**Priority:** Must | **Source:** TR-003, UC-03 | **Design-spec key:** `emptyStates.discipline.leaveRequests`

The system SHALL render the canonical empty state inside the teacher-side leave-requests tab panel when `leaveRequests.length === 0` after a successful data fetch.

- Container: `role="status"`, `flex flex-col items-center text-center px-5 py-10`
- Icon: `CalendarOff` (Lucide), `size-16` (64px), `text-edu-text-secondary`, `aria-hidden="true"`
- Title: `<p className="text-base font-bold text-foreground mt-4">` — i18n key `discipline.leave.empty` ("Chưa có yêu cầu nghỉ phép")
  - i18n call: `useTranslations("discipline.leave")`, key `"empty"`
- Body: omitted
- CTA: none

**AC:** AC-03.1 through AC-03.7 (see §6)

**Dependencies:** none

---

### FR-04 — Leave requests empty state — parent view

**Priority:** Must | **Source:** TR-004, UC-04

The system SHALL render the identical canonical empty state (same icon, same key, same layout as FR-03) inside the parent-discipline component when the selected child's leave-requests fetch resolves with an empty array.

- The empty state SHALL be keyed to the currently selected child; on child switch, it SHALL reset to loading then re-render for the new child.
- CTA: none

**AC:** AC-04.1 through AC-04.9 (see §6)

**Dependencies:** none

---

### FR-05 — State machine: loading / empty / populated / error (all four locations)

**Priority:** Must | **Source:** TR-005, UC-05

For each of the four locations (violations tab, conduct tab, leave-requests teacher tab, leave-requests parent), the system SHALL ensure exactly one of {loading, empty, populated, error} is rendered at any point in time. No two states SHALL co-exist in the DOM simultaneously.

**AC:** AC-05.1 through AC-05.6 (see §6)

---

### FR-06 — Canonical layout compliance

**Priority:** Must | **Source:** TR-006

All four empty states SHALL conform to the `emptyStatePattern` specification: `flex flex-col items-center text-center px-5 py-10`, icon 64px, title `mt-4`, no horizontal overflow at 320px viewport width.

---

## 4. Non-Functional Requirements

### NFR-01 — Accessibility (WCAG 2.1 AA)

- **Target:** `role="status"` present on every empty state container; icon `aria-hidden="true"` on every empty state icon; no `<h2>` / `<h3>` introduced inside an empty state; title color `var(--edu-text-primary)` = 9.4:1 on white (PASS).
- No body text in any discipline empty state → the `text-muted-foreground` contrast advisory does not apply here.
- **How QA verifies:** Storybook `EmptyState` story with a `play()` assertion confirming `role="status"` on container and `aria-hidden="true"` on the icon SVG element.

### NFR-02 — i18n (zero new keys)

- **Target:** `src/bootstrap/i18n/messages/vi.json` and `en.json` diff is empty for this story.
- Uses existing keys: `discipline.violations.empty`, `discipline.conduct.empty`, `discipline.leave.empty`.
- **How QA verifies:** `bunx tsc --noEmit` passes; no new keys in messages diff.

### NFR-03 — No token additions

- **Target:** `src/app/tokens.css` diff is empty for this story. All colors from existing tokens (`text-edu-text-secondary`, `text-foreground`).
- **How QA verifies:** `git diff src/app/tokens.css` shows no changes.

### NFR-04 — Responsive

- **Target:** No horizontal overflow at 320px, 375px, 768px, 1280px viewports. `px-5 py-10` + `max-w-xs` on any body text ensures fit.
- **How QA verifies:** Storybook story rendered at 320px container width with no `overflow-x`.

---

## 5. UI States & Flows

Each of the four tab locations follows an identical state machine:

```
[mount] → Loading (existing spinner) ──fetch resolves──→ Empty (canonical empty state)
                                      ──fetch resolves──→ Populated (existing list/table)
                                      ──fetch fails────→ Error (existing error text)
[any state] ──tab switch / refresh──→ Loading
```

- Only one state is rendered at a time; no overlap.
- Parent view additionally: child switch → immediate reset to Loading for the new child.

**Key flows referencing UCs:**
- UC-01: violations tab empty state (Teacher / Principal)
- UC-02: conduct tab empty state (Teacher / Principal)
- UC-03: leave-requests tab empty state (Teacher)
- UC-04: leave-requests empty state — parent, including child-switch reset (AC-04.5 through AC-04.9)
- UC-05: state machine correctness across all four locations

---

## 6. Data & Integration

No new backend integration. All four locations consume data already fetched by existing hooks/queries from the `core` service (mock-first per decision `0014`). The empty state is triggered purely by client-side logic (`violations.length === 0`, `conductRows === 0`, `leaveRequests.length === 0`). No new API calls, no new DTOs.

---

## 7. Acceptance Criteria

### AC-01: Violations Tab (FR-01, UC-01)

**AC-01.1** — Given the violations fetch completed with an empty array and the tab is active, when the component renders, then the empty state container has `role="status"`.

**AC-01.2** — Given AC-01.1, when the container is inspected, then it has `padding: 40px 20px` (Tailwind `px-5 py-10`), `text-align: center`, and flex column alignment centered on both axes.

**AC-01.3** — Given the empty state is rendered, when the DOM is inspected, then a `ShieldOff` icon (or `Shield` if `ShieldOff` unavailable) is present with `aria-hidden="true"`, size 64px, and class `text-edu-text-secondary`. No element with class `text-edu-success` exists inside the empty state container.

**AC-01.4** — Given the empty state is rendered, when the DOM is inspected, then a `<p>` element contains "Không có vi phạm nào!" (resolved from `discipline.violations.empty`), with `font-size: 16px`, `font-weight: 700`, and color `var(--edu-text-primary)`.

**AC-01.5** — Given the empty state is rendered, when the DOM is inspected, then no `<h2>` or `<h3>` element is inside the empty state container.

**AC-01.6** — Given the empty state is rendered, when the DOM is inspected, then no `<button>` or `<a>` element is inside the empty state container.

**AC-01.7** — Given the violations fetch is pending (loading), when the tab panel renders, then the existing loading spinner is shown and the `role="status"` container is NOT in the DOM.

**AC-01.8** — Given the violations fetch has failed, when the tab panel renders, then the existing error state is shown and the `role="status"` container is NOT in the DOM.

**AC-01.9** — Given the violations fetch returned one or more records, when the tab panel renders, then the violation list/table is shown and the `role="status"` container is NOT in the DOM.

**AC-01.10** — Given the empty state is rendered, when the viewport is 320px, then no horizontal overflow occurs and the title text does not clip.

**AC-01.11** — Given a Principal is authenticated and the violations tab is empty, when the tab renders, then the same canonical empty state (no role-specific variation) is displayed.

---

### AC-02: Conduct Tab (FR-02, UC-02)

**AC-02.1** — Given the conduct fetch completed with zero rows and the tab is active, when the component renders, then the empty state container has `role="status"`.

**AC-02.2** — Given the empty state is rendered, when the DOM is inspected, then a `ClipboardList` icon is present with `aria-hidden="true"`, 64px, `text-edu-text-secondary`.

**AC-02.3** — Given the empty state is rendered, when the DOM is inspected, then a `<p>` contains "Chưa có dữ liệu hạnh kiểm" (resolved from `discipline.conduct.empty`), 16px / 700, color `var(--edu-text-primary)`.

**AC-02.4** — Given the empty state is rendered, when the DOM is inspected, then no `<button>` or `<a>` exists inside the container.

**AC-02.5** — Given the conduct fetch is pending, when the tab panel renders, then the spinner is shown and `role="status"` container is NOT in the DOM.

**AC-02.6** — Given the conduct fetch failed, when the tab panel renders, then the error state is shown and `role="status"` container is NOT in the DOM.

**AC-02.7** — Given the conduct fetch returned non-empty rows, when the tab panel renders, then the conduct table is shown and `role="status"` container is NOT in the DOM.

---

### AC-03: Leave Requests — Teacher Side (FR-03, UC-03)

**AC-03.1** — Given the leave-requests fetch completed with an empty array in the teacher-side tab, when the component renders, then the container has `role="status"`.

**AC-03.2** — Given the empty state renders, when the DOM is inspected, then a `CalendarOff` icon is present with `aria-hidden="true"`, 64px, `text-edu-text-secondary`.

**AC-03.3** — Given the empty state renders, when the DOM is inspected, then a `<p>` contains "Chưa có yêu cầu nghỉ phép" (resolved from `discipline.leave.empty`), 16px / 700, `var(--edu-text-primary)`.

**AC-03.4** — Given the empty state renders, when the DOM is inspected, then no `<button>` or `<a>` exists inside the container.

**AC-03.5** — Given the leave-requests fetch is pending, when the tab panel renders, then the spinner is shown and `role="status"` container is NOT in the DOM.

**AC-03.6** — Given the leave-requests fetch failed, when the tab panel renders, then the error state is shown and `role="status"` container is NOT in the DOM.

**AC-03.7** — Given the leave-requests fetch returned one or more records, when the tab panel renders, then the list is shown and `role="status"` container is NOT in the DOM.

---

### AC-04: Leave Requests — Parent View (FR-04, UC-04)

**AC-04.1** — Given the parent is on `/parent/discipline`, the selected child's fetch completed with empty array, and the component is not loading or in error, when the parent-discipline component renders, then the container has `role="status"`.

**AC-04.2** — Given the above, when the DOM is inspected, then a `CalendarOff` icon is present with `aria-hidden="true"`, 64px, `text-edu-text-secondary`.

**AC-04.3** — Given the empty state renders, when the DOM is inspected, then a `<p>` contains "Chưa có yêu cầu nghỉ phép" (resolved from `discipline.leave.empty`), 16px / 700, `var(--edu-text-primary)`.

**AC-04.4** — Given the empty state renders, when the DOM is inspected, then no `<button>` or `<a>` exists inside the container.

**AC-04.5** — Given the empty state is showing for child A, when the parent selects child B via the child switcher, then the child A empty state is removed from the DOM and the loading state renders while the new fetch is pending.

**AC-04.6** — Given the parent switches from child A (empty) to child B, when child B's fetch completes with non-empty records, then the populated list for child B is shown and the empty state is NOT present.

**AC-04.7** — Given the parent switches from child A (empty) to child B whose fetch also resolves empty, when child B's fetch resolves, then the canonical empty state renders fresh for child B.

**AC-04.8** — Given child B's fetch is pending after the child switcher is used, when the component renders, then the loading state is shown and the empty state is NOT present.

**AC-04.9** — Given child B's fetch fails, when the component renders, then the error state is shown and the empty state is NOT present.

---

### AC-05: State Machine (FR-05, UC-05)

**AC-05.1** — Given the violations tab panel, at any point in time exactly one of {loading spinner, canonical empty state, violation list, error state} is present in the DOM.

**AC-05.2** — Given the conduct tab panel, at any point in time exactly one of {loading spinner, canonical empty state, conduct table, error state} is present in the DOM.

**AC-05.3** — Given the teacher leave-requests tab panel, at any point in time exactly one of {loading spinner, canonical empty state, leave-requests list, error state} is present in the DOM.

**AC-05.4** — Given the parent-discipline component, at any point in time exactly one of {loading spinner, canonical empty state, leave-requests list, error state} is present in the DOM.

**AC-05.5** — Given a fetch completes with empty data, when the transition occurs, then the loading spinner is removed before the empty state container appears (no flash where both are visible).

**AC-05.6** — Given the empty state is showing, when a data refresh is triggered (tab re-activation, filter change), then the empty state is removed and the loading spinner appears before the next fetch result renders.

---

## 8. Use Case Summary

| UC ID | Title | FR coverage | AC count |
|---|---|---|---|
| UC-01 | Violations Tab Empty State (Teacher / Principal) | FR-01, FR-05, FR-06 | 11 |
| UC-02 | Conduct Tab Empty State (Teacher / Principal) | FR-02, FR-05, FR-06 | 7 |
| UC-03 | Leave Requests Empty State — Teacher-Side | FR-03, FR-05, FR-06 | 7 |
| UC-04 | Leave Requests Empty State — Parent View (Multi-Child Switcher) | FR-04, FR-05, FR-06 | 9 |
| UC-05 | State Machine — Loading / Empty / Populated / Error | FR-05 | 6 |

---

## 9. Constraints & Assumptions

- [ASSUMPTION] The `ShieldOff` Lucide icon is preferred over `Shield` for violations empty state (no violations = "no-shield" semantics). If `ShieldOff` is not in the installed Lucide version, `Shield` is the fallback. FE team confirms availability.
- [OPEN QUESTION OQ-01] `ClipboardList` is assumed as the contextual icon for the conduct tab. Design team confirmation is preferred; alternatives include `GraduationCap`, `BookCheck`.
- [OPEN QUESTION OQ-02] Parent child switch transitions to immediate loading state (AC-04.5). Product owner should confirm whether optimistic retention of the previous child's empty state is preferred over an immediate loading reset.
- [OPEN QUESTION OQ-03] Confirmed in requirements: Principal does NOT have a leave-requests tab (teacher-only). Principal scope = violations + conduct only.
- No new tokens. No new i18n keys. No BE changes. All colors use existing tokens from `src/app/tokens.css`.
- Data source is `core` service, currently mock-first. Empty array case must be handled regardless of mock/real.

---

## 10. Traceability Matrix

| Requirement | Source | Use Case(s) | Integration | Priority |
|---|---|---|---|---|
| FR-01: violations canonical empty state | TR-001, `emptyStates.discipline.violations` | UC-01, UC-05 | `core` service (mock-first) | Must |
| FR-02: conduct canonical empty state | TR-002 | UC-02, UC-05 | `core` service (mock-first) | Must |
| FR-03: leave requests canonical empty state — teacher | TR-003, `emptyStates.discipline.leaveRequests` | UC-03, UC-05 | `core` service (mock-first) | Must |
| FR-04: leave requests canonical empty state — parent | TR-004 | UC-04, UC-05 | `core` service (mock-first) | Must |
| FR-05: state machine correctness | TR-005 | UC-05 | none (client logic only) | Must |
| FR-06: canonical layout compliance | TR-006, `emptyStatePattern` | UC-01–05 | none | Must |
| NFR-01: WCAG 2.1 AA (`role="status"`, `aria-hidden`) | TR-NFR-001 | UC-01–04 | none | Must |
| NFR-02: zero new i18n keys | TR-NFR-002 | UC-01–04 | none | Should |
| NFR-03: zero new tokens | TR-NFR-003 | UC-01–04 | none | Should |
| NFR-04: responsive 320px | TR-NFR-004 | UC-01–04 | none | Must |

---

## 11. Handoff to FE

**What `fe-lead` should build:**

Four inline empty state replacements — no shared component is needed unless the FE team decides to extract a shared `DisciplineEmptyState` (optional, not required by this spec). Each location is a localized change.

**File targets:**

1. `src/features/discipline/presentation/discipline-screen/components/violations-tab.tsx` (~line 380–389): remove `<Check>` + `text-edu-success` pattern; replace with canonical container using `ShieldOff` icon + `discipline.violations.empty` key. `useTranslations("discipline.violations")` → key `"empty"`.

2. `src/features/discipline/presentation/discipline-screen/components/conduct-tab.tsx` (~line 101): replace bare text with canonical container using `ClipboardList` icon + `discipline.conduct.empty` key. `useTranslations("discipline.conduct")` → key `"empty"`.

3. `src/features/discipline/presentation/discipline-screen/components/leave-tab.tsx` (~line 132): replace existing empty markup with canonical container using `CalendarOff` icon + `discipline.leave.empty` key. `useTranslations("discipline.leave")` → key `"empty"`.

4. `src/features/discipline/presentation/parent-discipline/` (leave-requests empty state): add canonical container using `CalendarOff` + `discipline.leave.empty`. Same i18n call as #3.

**Storybook:** Each component must have (or update) a `.stories.tsx` with an `EmptyState` story. The `play()` function SHALL assert:
- Container has `role="status"`
- Icon SVG has `aria-hidden="true"`
- No `<h2>` / `<h3>` inside container
- No `<button>` inside container

**TDD proof required:**
- Unit / component tests (Vitest + Testing Library) verifying DOM attributes per the AC rows above.
- State machine tests: loading → empty → populated → error transitions.

**Lane:** normal (pure UI + i18n wiring, no new tokens or BE)

**TEST_MATRIX rows to create:** FR-01 (unit: AC-01.3, AC-01.7–01.9), FR-02 (unit: AC-02.2, AC-02.5–02.7), FR-03 (unit: AC-03.2, AC-03.5–03.7), FR-04 (unit: AC-04.1–04.4, integration: AC-04.5–04.9), NFR-01 (Storybook play: `role="status"` + `aria-hidden`).
