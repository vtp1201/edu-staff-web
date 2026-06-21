# Use Cases — US-E17.4 Empty States — Discipline

## 1. Use Case Scope Summary

**Total UCs:** 5
**Actors:** Teacher, Principal, Parent
**Boundaries:** discipline screen tab panels (violations, conduct, leave requests) + parent-discipline component. No new tokens, i18n keys, or BE changes. State machine covers loading / empty / populated / error for all four locations.

---

## 2. Actor Catalogue

| Actor / Role | Type | Capabilities |
|---|---|---|
| Teacher | Primary user (staff) | Views all three tabs: violations, conduct, leave requests on `/teacher/discipline` |
| Principal | Primary user (staff, read-only) | Views violations and conduct tabs on `/principal/discipline` |
| Parent | Primary user (guardian, mobile-first) | Views leave requests tab on `/parent/discipline` — multi-child switcher |

---

## 3. Use Case Catalogue

### UC-01: Violations Tab Empty State (Teacher / Principal)

**Goal:** Display the canonical empty state instead of the misleading green check icon when no violations exist.
**Primary Actor:** Teacher, Principal
**Secondary Actors:** none
**Preconditions:**
- User is authenticated as Teacher or Principal.
- The violations tab panel is active.
- Data fetch for violations has completed successfully with an empty array (`violations.length === 0`).
- Component is not in loading state and not in error state.

**Main Success Scenario:**
1. Violations fetch completes; response is an empty array.
2. System removes the table/list and the legacy `<Check>` icon with `text-edu-success`.
3. System renders a container with `role="status"`, centered column layout, `padding: 40px 20px`.
4. System renders a `Shield` Lucide icon at 64px, color `var(--edu-text-muted)`, `aria-hidden="true"`.
5. System renders a `<p>` element with the i18n key `discipline.violations.empty` ("Không có vi phạm nào!"), 16px / font-weight 700, color `var(--edu-text-primary)`, `margin-top: 16px`.
6. No CTA is rendered.
7. Screen reader announces the container content via `role="status"`.

**Alternative Flows:**
- A1 — Data arrives non-empty: violations list renders; canonical empty state is not shown. (See UC-05.)

**Exception Flows:**
- E1 — Fetch fails (network error / 5xx): existing error state renders inside the tab panel; canonical empty state is not shown.
- E2 — Fetch is pending: existing loading spinner renders; canonical empty state is not shown.

**Business Rules:**
- BR-01: The `<Check>` icon with `text-edu-success` MUST NOT appear in the empty state for violations. Its presence is actively misleading (zero violations ≠ positive outcome badge).
- BR-02: No CTA is permitted on any discipline empty state (`hasCTA: false` per design-spec).
- BR-03: Title element is `<p>`, not `<h2>` or `<h3>`, to avoid disrupting heading hierarchy.

**Non-functional Constraints:**
- WCAG 2.1 AA: `role="status"` present; icon `aria-hidden="true"`; title contrast 9.4:1 (PASS).
- Responsive: renders without horizontal overflow at 320px viewport width.
- i18n: zero new keys; uses `discipline.violations.empty` from existing `vi.json` / `en.json`.

---

### UC-02: Conduct Tab Empty State (Teacher / Principal)

**Goal:** Display the canonical empty state when the conduct summary table has zero rows.
**Primary Actor:** Teacher, Principal
**Secondary Actors:** none
**Preconditions:**
- User is authenticated as Teacher or Principal.
- The conduct tab panel is active.
- Data fetch for conduct data has completed successfully with an empty result.
- Component is not in loading state and not in error state.

**Main Success Scenario:**
1. Conduct fetch completes; result has zero rows.
2. System removes the table element.
3. System renders a container with `role="status"`, centered column layout, `padding: 40px 20px`.
4. System renders a `ClipboardList` Lucide icon at 64px, color `var(--edu-text-muted)`, `aria-hidden="true"`.
5. System renders a `<p>` with i18n key `discipline.conduct.empty` ("Chưa có dữ liệu hạnh kiểm"), 16px / 700, color `var(--edu-text-primary)`, `margin-top: 16px`.
6. No CTA is rendered.

**Alternative Flows:**
- A1 — Conduct data arrives non-empty: table renders; empty state is not shown.

**Exception Flows:**
- E1 — Fetch fails: existing error state renders; empty state is not shown.
- E2 — Fetch pending: loading spinner renders; empty state is not shown.

**Business Rules:**
- BR-01: No CTA.
- BR-02: Title is `<p>`, not a heading element.

**Non-functional Constraints:**
- WCAG 2.1 AA: same as UC-01.
- Responsive: no horizontal overflow at 320px.

---

### UC-03: Leave Requests Empty State — Teacher-Side Tab

**Goal:** Display the canonical empty state when the leave requests list is empty on the teacher-side tab.
**Primary Actor:** Teacher
**Secondary Actors:** none
**Preconditions:**
- User is authenticated as Teacher.
- The leave-requests tab panel is active.
- Leave-requests fetch completes successfully with an empty array.
- Component is not in loading state and not in error state.

**Main Success Scenario:**
1. Leave-requests fetch completes; response array is empty.
2. System removes the table/list.
3. System renders a container with `role="status"`, centered column, `padding: 40px 20px`.
4. System renders a `CalendarOff` Lucide icon at 64px, color `var(--edu-text-muted)`, `aria-hidden="true"`.
5. System renders a `<p>` with i18n key `discipline.leave.empty` ("Chưa có yêu cầu nghỉ phép"), 16px / 700, color `var(--edu-text-primary)`, `margin-top: 16px`.
6. No CTA is rendered.

**Alternative Flows:**
- A1 — Leave requests arrive non-empty: list renders; empty state is not shown.

**Exception Flows:**
- E1 — Fetch fails: existing error state renders.
- E2 — Fetch pending: loading spinner renders.

**Business Rules:**
- BR-01: No CTA.
- BR-02: Title is `<p>`.

---

### UC-04: Leave Requests Empty State — Parent View (Multi-Child Switcher)

**Goal:** Display the canonical empty state on the parent-discipline screen when the selected child's leave requests list is empty; reset correctly when the parent switches to a different child.
**Primary Actor:** Parent
**Secondary Actors:** none
**Preconditions:**
- User is authenticated as Parent.
- Parent has at least one child registered.
- The parent-discipline screen is active.
- Leave-requests fetch for the currently selected child completes successfully with an empty array.
- Component is not in loading state and not in error state.

**Main Success Scenario:**
1. Parent opens `/parent/discipline`.
2. Leave-requests fetch for selected child completes with empty array.
3. System renders the canonical empty state (same icon, key, layout as UC-03) inside the parent-facing component.
4. No CTA is rendered.

**Alternative Flows:**
- A1 — Parent switches to a different child: component transitions to loading state while the new fetch is pending, then renders either the empty state or the populated list for the new child. The previous child's empty state is not retained.
- A2 — Selected child has non-empty leave requests: list renders; empty state is not shown.

**Exception Flows:**
- E1 — Fetch fails for selected child: existing error state renders; empty state is not shown.
- E2 — Fetch pending after child switch: loading state renders; empty state is not shown.

**Business Rules:**
- BR-01: Empty state must be keyed to the currently selected child, not retained from the previous child.
- BR-02: No CTA.
- BR-03: Title is `<p>`.

**Non-functional Constraints:**
- Mobile-first: Parent is the primary mobile user; 44px minimum touch target on the child switcher (unchanged from existing design).

---

### UC-05: State Machine — Loading / Empty / Populated / Error (All Four Locations)

**Goal:** Ensure exactly one UI state renders at any time across all four tab locations; no state bleed or overlap.
**Primary Actor:** Teacher (violations, conduct, leave requests), Principal (violations, conduct), Parent (leave requests)
**Secondary Actors:** none
**Preconditions:** Component is mounted and a data fetch lifecycle is in progress or completed.

**Main Success Scenario:**
1. Component mounts → loading state renders (spinner / skeleton).
2. Fetch completes with empty result → loading state clears; canonical empty state renders.
3. User triggers a data refresh (e.g., tab switch or filter change) → loading state re-renders; empty state is hidden.
4. Refreshed fetch returns populated data → list/table renders; empty state is hidden.

**Alternative Flows:**
- A1 — Fetch completes with non-empty data (populated → populated): list renders at all times; empty state never shown.
- A2 — Fetch completes with non-empty data after showing empty (e.g., a record is added by another session and user refreshes): system transitions from empty to populated.

**Exception Flows:**
- E1 — Fetch fails at any stage: error state renders; empty and populated states are both hidden.
- E2 — Concurrent fetch (e.g., rapid tab switches): only the last fetch's result determines the rendered state; stale intermediate states are discarded.

**Business Rules:**
- BR-01: Exactly one of {loading, empty, populated, error} is rendered at any time in each tab panel. No two states co-exist.

---

## 4. Acceptance Criteria

### UC-01: Violations Tab Empty State

**AC-01.1 (Container — role):** Given the violations fetch has completed with an empty array and the violations tab is active, when the component renders, then the empty state container has `role="status"`.

**AC-01.2 (Container — layout):** Given the above, when the component renders, then the container has `padding: 40px 20px`, `text-align: center`, and flexbox column alignment centered on both axes.

**AC-01.3 (Icon — correct icon, no success tint):** Given the empty state is rendered, when the DOM is inspected, then a `Shield` icon element is present with `aria-hidden="true"`, 64px size, and color `var(--edu-text-muted)`. No element with class `text-edu-success` or equivalent green tint exists inside the empty state container.

**AC-01.4 (Title — text and style):** Given the empty state is rendered, when the DOM is inspected, then a `<p>` element contains the text resolved from `discipline.violations.empty` ("Không có vi phạm nào!"), has `font-size: 16px`, `font-weight: 700`, and color `var(--edu-text-primary)`.

**AC-01.5 (Title — no heading element):** Given the empty state is rendered, when the DOM is inspected, then no `<h2>` or `<h3>` element is present inside the empty state container.

**AC-01.6 (No CTA):** Given the empty state is rendered, when the DOM is inspected, then no `<button>` or `<a>` element is present inside the empty state container.

**AC-01.7 (Loading — spinner shown, not empty state):** Given the violations fetch is in progress (pending), when the tab panel renders, then the existing loading spinner is shown and the empty state container is not present in the DOM.

**AC-01.8 (Error — error state shown, not empty state):** Given the violations fetch has failed (network error or non-2xx response), when the tab panel renders, then the existing error state is shown and the empty state container is not present in the DOM.

**AC-01.9 (Populated — list shown, not empty state):** Given the violations fetch completes with one or more violation records, when the tab panel renders, then the violation list/table is shown and the empty state container is not present in the DOM.

**AC-01.10 (Responsive — no overflow at 320px):** Given the empty state is rendered, when the viewport width is 320px, then no horizontal overflow occurs and the title text does not clip outside the viewport.

**AC-01.11 (Role — Principal sees same empty state):** Given a Principal is authenticated and the violations tab is empty, when the tab renders, then the same canonical empty state (Shield icon + `discipline.violations.empty` title) is displayed with no role-specific variation.

---

### UC-02: Conduct Tab Empty State

**AC-02.1 (Container — role):** Given the conduct fetch has completed with empty data and the conduct tab is active, when the component renders, then the empty state container has `role="status"`.

**AC-02.2 (Icon):** Given the empty state is rendered, when the DOM is inspected, then a `ClipboardList` icon element is present with `aria-hidden="true"`, 64px size, and color `var(--edu-text-muted)`.

**AC-02.3 (Title):** Given the empty state is rendered, when the DOM is inspected, then a `<p>` element contains the text resolved from `discipline.conduct.empty` ("Chưa có dữ liệu hạnh kiểm"), 16px / 700, color `var(--edu-text-primary)`.

**AC-02.4 (No CTA):** Given the empty state is rendered, when the DOM is inspected, then no `<button>` or `<a>` element exists inside the empty state container.

**AC-02.5 (Loading):** Given the conduct fetch is pending, when the tab panel renders, then the loading spinner is shown and the empty state is not present.

**AC-02.6 (Error):** Given the conduct fetch fails, when the tab panel renders, then the error state is shown and the empty state is not present.

**AC-02.7 (Populated):** Given the conduct fetch returns non-empty rows, when the tab panel renders, then the conduct table is shown and the empty state is not present.

---

### UC-03: Leave Requests Empty State — Teacher-Side

**AC-03.1 (Container — role):** Given the leave-requests fetch completes with an empty array in the teacher-side tab, when the component renders, then the container has `role="status"`.

**AC-03.2 (Icon):** Given the empty state renders, when the DOM is inspected, then a `CalendarOff` icon is present with `aria-hidden="true"`, 64px, color `var(--edu-text-muted)`.

**AC-03.3 (Title):** Given the empty state renders, when the DOM is inspected, then a `<p>` contains the text resolved from `discipline.leave.empty` ("Chưa có yêu cầu nghỉ phép"), 16px / 700, `var(--edu-text-primary)`.

**AC-03.4 (No CTA):** Given the empty state renders, when the DOM is inspected, then no `<button>` or `<a>` exists inside the empty state container.

**AC-03.5 (Loading):** Given the leave-requests fetch is pending, when the tab panel renders, then the spinner is shown and the empty state is not present.

**AC-03.6 (Error):** Given the leave-requests fetch fails, when the tab panel renders, then the error state is shown and the empty state is not present.

**AC-03.7 (Populated):** Given the leave-requests fetch returns one or more records, when the tab panel renders, then the list is shown and the empty state is not present.

---

### UC-04: Leave Requests Empty State — Parent View

**AC-04.1 (Container — role):** Given the parent is on `/parent/discipline`, the selected child's leave-requests fetch completes with an empty array, and the component is not loading or in error, when the parent-discipline component renders, then the empty state container has `role="status"`.

**AC-04.2 (Icon):** Given the above, when the DOM is inspected, then a `CalendarOff` icon is present with `aria-hidden="true"`, 64px, color `var(--edu-text-muted)`.

**AC-04.3 (Title):** Given the empty state renders, when the DOM is inspected, then a `<p>` contains text resolved from `discipline.leave.empty` ("Chưa có yêu cầu nghỉ phép"), 16px / 700, `var(--edu-text-primary)`.

**AC-04.4 (No CTA):** Given the empty state renders, when the DOM is inspected, then no `<button>` or `<a>` exists inside the empty state container.

**AC-04.5 (Child switch — resets to loading):** Given the empty state is showing for child A, when the parent selects child B via the child switcher, then the empty state for child A is removed from the DOM and the loading state renders while the new fetch is pending.

**AC-04.6 (Child switch — shows correct state for new child):** Given the parent switches from child A (empty) to child B, when the fetch for child B completes with non-empty leave requests, then the populated list for child B is shown and the empty state is not present.

**AC-04.7 (Child switch — both empty):** Given the parent switches from child A (empty) to child B whose fetch also completes with empty data, when child B's fetch resolves, then the canonical empty state renders fresh (re-mounted) for child B.

**AC-04.8 (Loading after child switch):** Given child B's fetch is pending after the child switcher is used, when the component renders, then the loading state is shown and the empty state is not present.

**AC-04.9 (Error after child switch):** Given child B's fetch fails, when the component renders, then the error state is shown and the empty state is not present.

---

### UC-05: State Machine — All Four Locations

**AC-05.1 (Only one state at a time — violations):** Given the violations tab panel, at any point in time exactly one of {loading spinner, canonical empty state, violation list, error state} is present in the DOM. No two of these are simultaneously rendered.

**AC-05.2 (Only one state at a time — conduct):** Given the conduct tab panel, at any point in time exactly one of {loading spinner, canonical empty state, conduct table, error state} is present in the DOM.

**AC-05.3 (Only one state at a time — leave requests teacher):** Given the teacher leave-requests tab panel, at any point in time exactly one of {loading spinner, canonical empty state, leave-requests list, error state} is present in the DOM.

**AC-05.4 (Only one state at a time — leave requests parent):** Given the parent-discipline component, at any point in time exactly one of {loading spinner, canonical empty state, leave-requests list, error state} is present in the DOM.

**AC-05.5 (Transition: loading → empty):** Given a fetch completes with empty data, when the transition occurs, then the loading spinner is removed before the empty state container appears (no flash where both are visible).

**AC-05.6 (Transition: empty → loading on refresh):** Given the empty state is showing, when a data refresh is triggered (tab re-activation, filter change), then the empty state is removed and the loading spinner appears before the next fetch result renders.

---

## 5. Edge Case Matrix

| Scenario | Violations tab | Conduct tab | Leave Requests (Teacher) | Leave Requests (Parent) |
|---|---|---|---|---|
| Empty data | Canonical empty state, Shield icon, no CTA, no green check | Canonical empty state, ClipboardList icon | Canonical empty state, CalendarOff icon | Canonical empty state, CalendarOff icon |
| Loading | Spinner only | Spinner only | Spinner only | Spinner only |
| Error | Error state only | Error state only | Error state only | Error state only |
| Populated | List/table only | Table only | List only | List only |
| Auth expired during fetch | Redirect to login (existing auth flow) | Same | Same | Same |
| Network error | Error state shown | Same | Same | Same |
| Child switch (parent only) | N/A | N/A | N/A | Reset to loading → empty or populated for new child |
| Concurrent/rapid tab switches | Last fetch result wins; stale states discarded | Same | Same | Same |
| Principal role | Same empty state as Teacher (read-only) | Same empty state as Teacher (read-only) | N/A (principal sees conduct/violations only) | N/A |
| 320px viewport | No horizontal overflow | Same | Same | Same |
| Max-length title text | Title wraps within container, no overflow | Same | Same | Same |
| Legacy green Check icon | MUST NOT be present in DOM | N/A | N/A | N/A |

---

## 6. Open Questions

[OPEN QUESTION OQ-01] The requirements specify `ClipboardList` as a contextual icon for the conduct tab, but `design-spec.jsonc` does not explicitly name the conduct icon. Should `ClipboardList` be confirmed by the design team, or is an alternative (e.g., `GraduationCap`, `BookCheck`) preferred?

[OPEN QUESTION OQ-02] The parent-discipline multi-child switcher resets the leave-requests state on child change. Should the transition be an immediate loading state, or should the previous child's empty state persist until the new fetch resolves (optimistic retention)? The current AC models an immediate reset; this should be confirmed with the product owner to avoid a perceived "flash".

[OPEN QUESTION OQ-03] The requirements note that conduct and leave-requests empty states are in scope for Principal. The requirements table lists Principal as viewing violations and conduct tabs — does Principal also have a leave-requests tab, or is that teacher-only? Requirements currently imply teacher-only for leave requests; this should be confirmed to avoid accidental out-of-scope work.
