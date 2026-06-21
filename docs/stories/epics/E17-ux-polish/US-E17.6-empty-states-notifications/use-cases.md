# Use Cases — US-E17.6 Empty States — Notifications Center

## 1. Use Case Scope Summary

**Total UCs:** 5
**Actors:** Teacher, Principal, Student, Parent (all roles with notification access)
**Boundaries:** `notifications-center.tsx` local `EmptyState` component upgrade only. Both tab variants (All, Unread) receive the canonical pattern. The mandatory a11y fix is body text color: `var(--edu-text-secondary)` (5.1:1 contrast) replaces any use of `var(--edu-text-muted)` (3.08:1, fails WCAG 1.4.3 at 13px). Loading and error states are unchanged. No new tokens, i18n keys, or BE changes.

---

## 2. Actor Catalogue

| Actor / Role | Type | Primary Device | Notes |
|---|---|---|---|
| Teacher | Staff | Desktop + mobile | Receives all notification types |
| Principal | Staff | Desktop | Receives administrative notifications |
| Student | Student | Mobile-first | High frequency; mobile empty state is critical |
| Parent | Guardian | Mobile-first | Receives child-activity notifications |

---

## 3. Use Case Catalogue

### UC-01: All-Tab Empty State

**Goal:** Display the canonical empty state in the Notifications Center "All" tab when the notification list is empty, with the correct icon, title, body, and contrast-compliant styling.
**Primary Actor:** Teacher, Principal, Student, Parent
**Secondary Actors:** none
**Preconditions:**
- User is authenticated in any role.
- The "All" tab in the Notifications Center is active.
- The notification fetch has completed successfully.
- The notification list is empty (zero items).
- Component is not in loading state and not in error state.

**Main Success Scenario:**
1. Notification fetch completes; list is empty; "All" tab is active.
2. System renders a container with `role="status"`, centered column layout, `padding: 40px 20px`.
3. System renders a `BellOff` Lucide icon at 64px, color `var(--edu-text-muted)`, `aria-hidden="true"`.
4. System renders a `<p>` element with i18n key `notifications.emptyAllTitle` ("Chưa có thông báo"), 16px / font-weight 700, color `var(--edu-text-primary)`, `margin-top: 16px`.
5. System renders a body `<p>` element with i18n key `notifications.emptyAllBody` ("Thông báo sẽ xuất hiện ở đây khi có hoạt động mới."), 13px, color `var(--edu-text-secondary)`, `max-width: 320px`.
6. No CTA is rendered.
7. Screen reader announces the container content via `role="status"`.

**Alternative Flows:**
- A1 — Notification list is non-empty: notification list renders; empty state is not shown.
- A2 — User switches to "Unread" tab while "All" is empty: UC-02 takes over.

**Exception Flows:**
- E1 — Fetch fails: existing error state renders; empty state is not shown.
- E2 — Fetch is pending: existing loading skeleton renders; empty state is not shown.

**Business Rules:**
- BR-01: Body text color MUST be `var(--edu-text-secondary)`, NOT `var(--edu-text-muted)`. The muted token fails WCAG 1.4.3 at 13px (3.08:1 < 4.5:1 required).
- BR-02: No CTA.
- BR-03: Title is `<p>`, not a heading element.
- BR-04: Body max-width is 320px to prevent over-wide lines at larger viewports.

**Non-functional Constraints:**
- WCAG 2.1 AA: `role="status"`, icon `aria-hidden="true"`, title 9.4:1 (PASS), body 5.1:1 (PASS with `text-secondary`).
- Body with `text-muted` would fail at 3.08:1 — this is the key fix driving this requirement.

---

### UC-02: Unread-Tab Empty State

**Goal:** Display the canonical empty state in the Notifications Center "Unread" tab when no unread notifications exist, with the correct icon, title, body, and contrast-compliant styling.
**Primary Actor:** Teacher, Principal, Student, Parent
**Secondary Actors:** none
**Preconditions:**
- User is authenticated in any role.
- The "Unread" tab in the Notifications Center is active.
- The unread notification fetch has completed successfully.
- The unread notification list is empty (all notifications have been read, or none exist).
- Component is not in loading state and not in error state.

**Main Success Scenario:**
1. Unread fetch completes; unread list is empty; "Unread" tab is active.
2. System renders a container with `role="status"`, centered column layout, `padding: 40px 20px`.
3. System renders a `CheckCircle` (or `CheckCircle2`) Lucide icon at 64px, color `var(--edu-text-muted)`, `aria-hidden="true"`.
4. System renders a `<p>` with i18n key `notifications.emptyUnreadTitle` ("Tất cả đã đọc"), 16px / 700, color `var(--edu-text-primary)`, `margin-top: 16px`.
5. System renders a body `<p>` with i18n key `notifications.emptyUnreadBody` ("Bạn đã đọc hết tất cả thông báo."), 13px, color `var(--edu-text-secondary)`, `max-width: 320px`.
6. No CTA is rendered.

**Alternative Flows:**
- A1 — Unread list is non-empty: unread notification list renders; empty state is not shown.
- A2 — User switches to "All" tab: UC-01 takes over.

**Exception Flows:**
- E1 — Fetch fails: existing error state renders.
- E2 — Fetch is pending: existing loading skeleton renders.

**Business Rules:**
- BR-01: Body text color MUST be `var(--edu-text-secondary)` — same constraint as UC-01.
- BR-02: No CTA.
- BR-03: Title is `<p>`.
- BR-04: The `CheckCircle`/`CheckCircle2` icon choice is intentional — it conveys "all done / all read", which is semantically appropriate for this variant.

---

### UC-03: Tab Switch Preserves Correct Empty State Variant

**Goal:** When both tabs are empty and the user switches between "All" and "Unread", the icon and copy update to match the active tab; no stale content from the previous tab remains.
**Primary Actor:** Teacher, Principal, Student, Parent
**Preconditions:**
- User is on the Notifications Center.
- Both "All" tab list and "Unread" tab list are empty.
- The existing tab-switch mechanism is functional.

**Main Success Scenario:**
1. User is on "All" tab → sees `BellOff` icon + `notifications.emptyAllTitle` + `notifications.emptyAllBody`.
2. User clicks the "Unread" tab.
3. System switches the tab; the "Unread" empty state renders with `CheckCircle` icon + `notifications.emptyUnreadTitle` + `notifications.emptyUnreadBody`.
4. No content from the "All" empty state is visible.
5. User clicks the "All" tab again.
6. System reverts to `BellOff` icon + all-tab copy.

**Alternative Flows:**
- A1 — "All" tab is empty but "Unread" tab has unread notifications: switching to "Unread" shows the unread list, not the unread empty state.

**Exception Flows:** none specific to this UC.

**Business Rules:**
- BR-01: The variant (all vs. unread) is driven by the same `variant` prop already in the existing component — the tab-switch logic is not changed.
- BR-02: The correct icon and copy render solely based on the active tab, regardless of whether the other tab is also empty.

---

### UC-04: Loading State (Unchanged)

**Goal:** Confirm the existing loading skeleton is unaffected by the empty state upgrade.
**Primary Actor:** Any authenticated role.
**Preconditions:** Notification fetch is pending.

**Main Success Scenario:**
1. Notification fetch is in progress.
2. Existing loading skeleton renders.
3. Neither the canonical empty state container nor the notification list is present in the DOM.

**Business Rules:** BR-01: This state is explicitly unchanged; any regression is a defect.

---

### UC-05: Error State (Unchanged)

**Goal:** Confirm the existing error state is unaffected by the empty state upgrade.
**Primary Actor:** Any authenticated role.
**Preconditions:** Notification fetch has failed.

**Main Success Scenario:**
1. Notification fetch fails.
2. Existing error state renders.
3. Neither the canonical empty state container nor the skeleton is present.

**Business Rules:** BR-01: This state is explicitly unchanged; any regression is a defect.

---

## 4. Acceptance Criteria

### UC-01: All-Tab Empty State

**AC-01.1 (Container — role):** Given the "All" tab is active and the notification list is empty after a successful fetch, when the Notifications Center renders, then the empty state container has `role="status"`.

**AC-01.2 (Container — layout):** Given the above, when the container element is inspected, then it has `padding: 40px 20px`, `text-align: center`, and is rendered as a centered flex column.

**AC-01.3 (Icon — BellOff):** Given the All-tab empty state is rendered, when the DOM is inspected, then a `BellOff` icon element is present with `aria-hidden="true"`, 64px size, and color `var(--edu-text-muted)`.

**AC-01.4 (Title — text and style):** Given the All-tab empty state is rendered, when the DOM is inspected, then a `<p>` element contains the text resolved from `notifications.emptyAllTitle` ("Chưa có thông báo"), has `font-size: 16px`, `font-weight: 700`, and color `var(--edu-text-primary)`.

**AC-01.5 (Title — no heading element):** Given the All-tab empty state is rendered, when the DOM is inspected, then no `<h2>` or `<h3>` is present inside the empty state container.

**AC-01.6 (Body — text):** Given the All-tab empty state is rendered, when the DOM is inspected, then a `<p>` element contains the text resolved from `notifications.emptyAllBody` ("Thông báo sẽ xuất hiện ở đây khi có hoạt động mới.").

**AC-01.7 (Body — contrast-compliant color):** Given the All-tab empty state is rendered, when the body `<p>` element is inspected, then its color is `var(--edu-text-secondary)`. The class `text-muted-foreground` or any mapping of `var(--edu-text-muted)` MUST NOT be applied to the body text.

**AC-01.8 (Body — max-width):** Given the All-tab empty state is rendered, when the body `<p>` element is inspected, then it has a computed `max-width` of 320px.

**AC-01.9 (No CTA):** Given the All-tab empty state is rendered, when the DOM is inspected, then no `<button>` or `<a>` element is present inside the empty state container.

**AC-01.10 (Loading — skeleton shown, not empty state):** Given the notification fetch is pending and the "All" tab is active, when the component renders, then the loading skeleton is present and the `role="status"` empty state container is not present in the DOM.

**AC-01.11 (Error — error state shown, not empty state):** Given the notification fetch has failed and the "All" tab is active, when the component renders, then the existing error state is present and the `role="status"` empty state container is not present in the DOM.

**AC-01.12 (Populated — list shown, not empty state):** Given the "All" tab has one or more notifications, when the component renders, then the notification list is shown and the `role="status"` empty state container is not present in the DOM.

---

### UC-02: Unread-Tab Empty State

**AC-02.1 (Container — role):** Given the "Unread" tab is active and the unread notification list is empty after a successful fetch, when the component renders, then the empty state container has `role="status"`.

**AC-02.2 (Icon — CheckCircle):** Given the Unread-tab empty state is rendered, when the DOM is inspected, then a `CheckCircle` or `CheckCircle2` icon is present with `aria-hidden="true"`, 64px, color `var(--edu-text-muted)`.

**AC-02.3 (Title — text and style):** Given the Unread-tab empty state is rendered, when the DOM is inspected, then a `<p>` contains the text resolved from `notifications.emptyUnreadTitle` ("Tất cả đã đọc"), 16px / 700, color `var(--edu-text-primary)`.

**AC-02.4 (Body — text):** Given the Unread-tab empty state is rendered, when the DOM is inspected, then a `<p>` contains the text resolved from `notifications.emptyUnreadBody` ("Bạn đã đọc hết tất cả thông báo.").

**AC-02.5 (Body — contrast-compliant color):** Given the Unread-tab empty state is rendered, when the body `<p>` is inspected, then its color is `var(--edu-text-secondary)`. `var(--edu-text-muted)` MUST NOT be used.

**AC-02.6 (Body — max-width):** Given the Unread-tab empty state is rendered, when the body `<p>` is inspected, then it has a computed `max-width` of 320px.

**AC-02.7 (No CTA):** Given the Unread-tab empty state is rendered, when the DOM is inspected, then no `<button>` or `<a>` exists inside the empty state container.

**AC-02.8 (Loading):** Given the notification fetch is pending and the "Unread" tab is active, when the component renders, then the loading skeleton is present and the `role="status"` container is not present.

**AC-02.9 (Error):** Given the notification fetch has failed and the "Unread" tab is active, when the component renders, then the error state is present and the `role="status"` container is not present.

**AC-02.10 (Populated):** Given the "Unread" tab has one or more unread notifications, when the component renders, then the unread list is shown and the `role="status"` container is not present.

---

### UC-03: Tab Switch Preserves Correct Variant

**AC-03.1 (All → Unread switch):** Given the "All" tab is showing its empty state (`BellOff` + `emptyAllTitle` body), when the user activates the "Unread" tab, then the `BellOff` icon is replaced by `CheckCircle`/`CheckCircle2`, the title text resolves from `notifications.emptyUnreadTitle`, and the body text resolves from `notifications.emptyUnreadBody`.

**AC-03.2 (Unread → All switch):** Given the "Unread" tab is showing its empty state, when the user activates the "All" tab, then the `CheckCircle`/`CheckCircle2` icon is replaced by `BellOff`, the title resolves from `notifications.emptyAllTitle`, and the body resolves from `notifications.emptyAllBody`.

**AC-03.3 (No stale content from previous tab):** Given any tab switch while both tabs show empty states, when the new tab renders, then no icon or text element from the previously active tab's empty state is present in the DOM.

**AC-03.4 (Keyboard — tab switch via keyboard):** Given the user navigates to the tab list via keyboard (Tab key) and activates the "Unread" tab via Enter or Space, then the empty state switches correctly to the unread variant (same as AC-03.1).

---

### UC-04: Loading State Unchanged

**AC-04.1 (Skeleton during fetch):** Given the notification fetch is pending, when the component renders, then the existing loading skeleton is present and neither the All-tab nor Unread-tab `role="status"` container is present in the DOM.

---

### UC-05: Error State Unchanged

**AC-05.1 (Error banner on failure):** Given the notification fetch has failed, when the component renders, then the existing error state is present and no `role="status"` empty state container is present in the DOM.

---

## 5. Edge Case Matrix

| Scenario | All tab (empty) | Unread tab (empty) | Tab switch (both empty) | Loading | Error |
|---|---|---|---|---|---|
| Normal empty | BellOff 64px, `emptyAllTitle`, body `text-secondary`, no CTA | CheckCircle 64px, `emptyUnreadTitle`, body `text-secondary`, no CTA | Correct variant per active tab | Skeleton only | Error state only |
| Non-empty list | All notification list shows | Unread list shows | N/A | Skeleton only | Error state only |
| Body color = `text-muted` | Defect (3.08:1 < 4.5:1, WCAG FAIL) | Same defect | Same | N/A | N/A |
| Body color = `text-secondary` | PASS 5.1:1 | PASS 5.1:1 | N/A | N/A | N/A |
| Auth expired during fetch | Redirect to login | Same | Same | Same | Same |
| Network error | Error state only | Error state only | N/A | N/A | Error state only |
| 320px viewport | No overflow; body max-width 320px fits | Same | Same | Same | Same |
| All empty, Unread has items | All: empty state; Unread: list | N/A | Switching to Unread shows list (not unread empty state) | N/A | N/A |
| Keyboard tab activation | Empty state updates on Enter/Space | Same | AC-03.4 | N/A | N/A |
| Icon accidentally using `text-edu-success` | Defect — muted token required on icon | Same | N/A | N/A | N/A |
| Max-length body text | Wraps at max-width 320px | Same | N/A | N/A | N/A |

---

## 6. Open Questions

[OPEN QUESTION OQ-01] The requirements say `CheckCircle` or `CheckCircle2` for the unread empty state icon. Should the icon be pinned to one specific Lucide variant (`CheckCircle` vs `CheckCircle2` differ visually — filled vs outline stroke)? The design-spec says `check-circle`; if that maps to `CheckCircle2` (outline) in Lucide, the FE team should confirm with the design team before committing.

[OPEN QUESTION OQ-02] The existing `EmptyState` component in `notifications-center.tsx` already has a `variant` prop driving the content switch. Does this component also handle the `role="status"` container, or is `role="status"` added to a wrapper outside the component? The upgrade strategy (edit internals vs. wrap) affects how the FE team interprets TR-004 (audit-first principle from E17.7 applied here). If the existing structure does not have `role="status"`, the FE team must add it as part of this story.

[OPEN QUESTION OQ-03] Are there additional notification tabs beyond "All" and "Unread" planned (e.g., "Mentions", "System")? If so, a third empty-state variant might be needed and should be scoped now rather than as a follow-up story.
