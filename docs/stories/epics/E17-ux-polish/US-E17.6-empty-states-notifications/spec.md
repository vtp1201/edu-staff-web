# Spec — US-E17.6 Empty States — Notifications Center (All tab + Unread tab)

**Status:** Planned | **Lane:** normal
**Sources:** requirements.md · use-cases.md · `docs/product/design-spec.jsonc` (`emptyStatePattern`, `emptyStates.notifications.list`)

---

## 1. Overview

The Notifications Center has a local `EmptyState` component with a `variant` prop driving All-tab vs. Unread-tab content. The current implementation lacks `role="status"` on the container, has no icon, and uses `var(--edu-text-muted)` for body text — which fails WCAG 1.4.3 (3.08:1 at 13px < 4.5:1 required). This story upgrades the component to the canonical `emptyStatePattern`: adds `role="status"`, adds the variant-specific icon, and fixes the body text color to `var(--edu-text-secondary)` (5.1:1 — PASS). The existing `variant` prop logic and all four i18n keys are retained unchanged.

This is the only story in E17 where body text exists and the contrast fix is required.

**In scope:**
- `src/features/notification/presentation/notifications-center/notifications-center.tsx` — upgrade local `EmptyState` component (lines ~106–128)

**Out of scope:**
- Notification delivery logic, SSE, mark-as-read
- Stat-card responsive fixes (US-E17.1)
- Additional notification tabs beyond "All" and "Unread"

**Definitions:**
- *All-tab empty state* — `variant` driven to "all"; icon `BellOff`; keys `notifications.emptyAllTitle` + `notifications.emptyAllBody`.
- *Unread-tab empty state* — `variant` driven to "unread"; icon `CheckCircle2`; keys `notifications.emptyUnreadTitle` + `notifications.emptyUnreadBody`.
- *Contrast fix* — body text color changed from `var(--edu-text-muted)` (3.08:1, FAIL) to `var(--edu-text-secondary)` (5.1:1, PASS).

---

## 2. Actors & Roles

| Role | Route | Primary device |
|---|---|---|
| Teacher | `/teacher/notifications` | Desktop + mobile |
| Principal | `/principal/notifications` | Desktop |
| Student | `/student/notifications` | Mobile-first |
| Parent | `/parent/notifications` | Mobile-first |

All roles share the same `EmptyState` component. Student and Parent are the primary mobile users for whom the a11y fix is most visible.

---

## 3. Functional Requirements

### FR-01 — All-tab empty state (canonical pattern + contrast fix)

**Priority:** Must | **Source:** TR-001, UC-01 | **Design-spec key:** `emptyStates.notifications.list.allTab`

The system SHALL render the canonical empty state in the "All" tab when the notification list is empty after a successful fetch.

- Container: `role="status"`, `flex flex-col items-center text-center px-5 py-10`
- Icon: `BellOff` (Lucide), `size-16` (64px), `text-edu-text-muted`, `aria-hidden="true"`
- Title: `<p className="text-base font-bold text-foreground mt-4">` — i18n key `notifications.emptyAllTitle` ("Chưa có thông báo")
- Body: `<p className="text-sm text-edu-text-secondary mt-2 max-w-xs">` — i18n key `notifications.emptyAllBody` ("Thông báo sẽ xuất hiện ở đây khi có hoạt động mới.")
  - Color MUST be `text-edu-text-secondary` — NOT `text-muted-foreground` or `text-edu-text-muted`
- CTA: none

**AC:** AC-01.1 through AC-01.12 (see §7)

---

### FR-02 — Unread-tab empty state (canonical pattern + contrast fix)

**Priority:** Must | **Source:** TR-002, UC-02 | **Design-spec key:** `emptyStates.notifications.list.unreadTab`

The system SHALL render the canonical empty state in the "Unread" tab when the unread notification list is empty after a successful fetch.

- Container: `role="status"`, `flex flex-col items-center text-center px-5 py-10`
- Icon: `CheckCircle2` (Lucide), `size-16` (64px), `text-edu-text-muted`, `aria-hidden="true"`
- Title: `<p className="text-base font-bold text-foreground mt-4">` — i18n key `notifications.emptyUnreadTitle` ("Tất cả đã đọc")
- Body: `<p className="text-sm text-edu-text-secondary mt-2 max-w-xs">` — i18n key `notifications.emptyUnreadBody` ("Bạn đã đọc hết tất cả thông báo.")
  - Color MUST be `text-edu-text-secondary` — NOT `text-muted-foreground` or `text-edu-text-muted`
- CTA: none

**AC:** AC-02.1 through AC-02.10 (see §7)

---

### FR-03 — Tab switching preserves correct empty state variant

**Priority:** Should | **Source:** TR-003, UC-03

When the user switches between "All" and "Unread" tabs while both are empty, the icon and copy SHALL update to match the active tab. This is driven by the existing `variant` prop — no new logic is introduced; the canonical upgrade must not break the existing tab-switch behavior.

**AC:** AC-03.1 through AC-03.4 (see §7)

---

### FR-04 — Loading and error states unchanged

**Priority:** Must | **Source:** TR-004, UC-04, UC-05

The existing loading skeleton and error state SHALL remain exactly as implemented. Any regression is a defect.

**AC:** AC-04.1, AC-05.1 (see §7)

---

## 4. Non-Functional Requirements

### NFR-01 — Accessibility (WCAG 2.1 AA) — MANDATORY contrast fix

- **Target:** `role="status"` on container; `aria-hidden="true"` on both icons; no `<h2>`/`<h3>` inside container; title `var(--edu-text-primary)` = 9.4:1 (PASS); body `var(--edu-text-secondary)` = 5.1:1 at 13px (PASS). Body with `var(--edu-text-muted)` = 3.08:1 at 13px FAILS WCAG 1.4.3 — this class MUST NOT be applied to the body text.
- **How QA verifies:** Storybook `EmptyState` story (both variants) with `play()` assertions:
  - `role="status"` on container
  - `aria-hidden="true"` on icon SVG
  - Body element does NOT have class `text-muted-foreground` or `text-edu-text-muted`
  - Body element HAS class `text-edu-text-secondary`

### NFR-02 — i18n (zero new keys)

- **Target:** `vi.json` and `en.json` diff is empty. All four keys already exist: `notifications.emptyAllTitle`, `notifications.emptyAllBody`, `notifications.emptyUnreadTitle`, `notifications.emptyUnreadBody`.
- **How QA verifies:** `bunx tsc --noEmit` passes; no key additions in messages diff.

### NFR-03 — No token additions

- **Target:** `src/app/tokens.css` diff is empty. All colors from existing tokens (`text-edu-text-primary`, `text-edu-text-muted` for icon, `text-edu-text-secondary` for body).
- **How QA verifies:** `git diff src/app/tokens.css` shows no changes.

### NFR-04 — Responsive

- **Target:** No horizontal overflow at 320px. Body `max-w-xs` (320px) prevents over-wide lines at larger viewports.
- **How QA verifies:** Storybook story at 320px container width.

---

## 5. UI States & Flows

The `EmptyState` component is rendered by the Notifications Center when the notification list is empty after fetch. State machine (unchanged; only the empty state visual is upgraded):

```
[fetch pending] → Loading skeleton (unchanged)
[fetch success, list.length > 0] → Notification list (unchanged)
[fetch success, list.length === 0] → Empty state (UPGRADED — icon + role="status" + contrast fix)
[fetch failure] → Error state (unchanged)
```

Tab switching (both tabs empty):
```
"All" tab active → BellOff icon + emptyAllTitle + emptyAllBody (text-edu-text-secondary)
                ──user clicks "Unread" tab──→
"Unread" tab active → CheckCircle2 icon + emptyUnreadTitle + emptyUnreadBody (text-edu-text-secondary)
```

**Key flows referencing UCs:**
- UC-01: All-tab empty state
- UC-02: Unread-tab empty state
- UC-03: Tab switch preserves correct variant
- UC-04: Loading state unchanged
- UC-05: Error state unchanged

---

## 6. Data & Integration

No new backend integration. The Notifications Center consumes existing notification data from the `noti` service via SSE proxy (decision `0009`) or polling. The empty state condition (`list.length === 0`) is client-side. No new API calls, no new DTOs. The upgrade is localized to the `EmptyState` function component inside `notifications-center.tsx`.

---

## 7. Acceptance Criteria

### AC-01: All-Tab Empty State (FR-01, UC-01)

**AC-01.1** — Given the "All" tab is active and the notification list is empty after a successful fetch, when the Notifications Center renders, then the empty state container has `role="status"`.

**AC-01.2** — Given the above, when the container is inspected, then it has `padding: 40px 20px` (`px-5 py-10`), `text-align: center`, and is rendered as a centered flex column.

**AC-01.3** — Given the All-tab empty state is rendered, when the DOM is inspected, then a `BellOff` icon element is present with `aria-hidden="true"`, 64px size, and class `text-edu-text-muted`.

**AC-01.4** — Given the All-tab empty state is rendered, when the DOM is inspected, then a `<p>` element contains "Chưa có thông báo" (resolved from `notifications.emptyAllTitle`), with `font-size: 16px`, `font-weight: 700`, and color `var(--edu-text-primary)`.

**AC-01.5** — Given the All-tab empty state is rendered, when the DOM is inspected, then no `<h2>` or `<h3>` is inside the container.

**AC-01.6** — Given the All-tab empty state is rendered, when the DOM is inspected, then a body `<p>` element contains "Thông báo sẽ xuất hiện ở đây khi có hoạt động mới." (resolved from `notifications.emptyAllBody`).

**AC-01.7** — Given the All-tab empty state is rendered, when the body `<p>` element is inspected, then its color is `var(--edu-text-secondary)` (class `text-edu-text-secondary`). The class `text-muted-foreground` and class `text-edu-text-muted` MUST NOT be present on this element.

**AC-01.8** — Given the All-tab empty state is rendered, when the body `<p>` is inspected, then it has a computed `max-width` of 320px (`max-w-xs`).

**AC-01.9** — Given the All-tab empty state is rendered, when the DOM is inspected, then no `<button>` or `<a>` element is inside the container.

**AC-01.10** — Given the notification fetch is pending and the "All" tab is active, when the component renders, then the loading skeleton is present and the `role="status"` container is NOT present.

**AC-01.11** — Given the notification fetch failed and the "All" tab is active, when the component renders, then the existing error state is present and the `role="status"` container is NOT present.

**AC-01.12** — Given the "All" tab has one or more notifications, when the component renders, then the notification list is shown and the `role="status"` container is NOT present.

---

### AC-02: Unread-Tab Empty State (FR-02, UC-02)

**AC-02.1** — Given the "Unread" tab is active and the unread notification list is empty after a successful fetch, when the component renders, then the empty state container has `role="status"`.

**AC-02.2** — Given the Unread-tab empty state is rendered, when the DOM is inspected, then a `CheckCircle2` icon (or `CheckCircle` if `CheckCircle2` unavailable) is present with `aria-hidden="true"`, 64px, and class `text-edu-text-muted`.

**AC-02.3** — Given the Unread-tab empty state is rendered, when the DOM is inspected, then a `<p>` contains "Tất cả đã đọc" (resolved from `notifications.emptyUnreadTitle`), 16px / 700, color `var(--edu-text-primary)`.

**AC-02.4** — Given the Unread-tab empty state is rendered, when the DOM is inspected, then a body `<p>` contains "Bạn đã đọc hết tất cả thông báo." (resolved from `notifications.emptyUnreadBody`).

**AC-02.5** — Given the Unread-tab empty state is rendered, when the body `<p>` is inspected, then its color is `var(--edu-text-secondary)`. Classes `text-muted-foreground` and `text-edu-text-muted` MUST NOT be present on this element.

**AC-02.6** — Given the Unread-tab empty state is rendered, when the body `<p>` is inspected, then it has `max-width: 320px` (`max-w-xs`).

**AC-02.7** — Given the Unread-tab empty state is rendered, when the DOM is inspected, then no `<button>` or `<a>` is inside the container.

**AC-02.8** — Given the notification fetch is pending and the "Unread" tab is active, when the component renders, then the loading skeleton is present and the `role="status"` container is NOT present.

**AC-02.9** — Given the notification fetch failed and the "Unread" tab is active, when the component renders, then the existing error state is present and the `role="status"` container is NOT present.

**AC-02.10** — Given the "Unread" tab has one or more unread notifications, when the component renders, then the unread list is shown and the `role="status"` container is NOT present.

---

### AC-03: Tab Switch Preserves Correct Variant (FR-03, UC-03)

**AC-03.1** — Given the "All" tab is showing its empty state (`BellOff` + `emptyAllTitle` + `emptyAllBody`), when the user activates the "Unread" tab, then `BellOff` is replaced by `CheckCircle2`, the title resolves from `notifications.emptyUnreadTitle`, and the body resolves from `notifications.emptyUnreadBody`.

**AC-03.2** — Given the "Unread" tab is showing its empty state, when the user activates the "All" tab, then `CheckCircle2` is replaced by `BellOff`, the title resolves from `notifications.emptyAllTitle`, and the body resolves from `notifications.emptyAllBody`.

**AC-03.3** — Given any tab switch while both tabs show empty states, when the new tab renders, then no icon or text element from the previously active tab's empty state is present in the DOM.

**AC-03.4** — Given the user navigates to the tab list via keyboard (Tab key) and activates the "Unread" tab via Enter or Space, when the empty state renders, then the icon and copy switch correctly to the unread variant (same as AC-03.1).

---

### AC-04: Loading State Unchanged (FR-04, UC-04)

**AC-04.1** — Given the notification fetch is pending, when the component renders, then the existing loading skeleton is present and neither the All-tab nor Unread-tab `role="status"` container is present in the DOM.

---

### AC-05: Error State Unchanged (FR-04, UC-05)

**AC-05.1** — Given the notification fetch has failed, when the component renders, then the existing error state is present and no `role="status"` empty state container is present.

---

## 8. Use Case Summary

| UC ID | Title | FR coverage | AC count |
|---|---|---|---|
| UC-01 | All-Tab Empty State | FR-01, FR-04 | 12 |
| UC-02 | Unread-Tab Empty State | FR-02, FR-04 | 10 |
| UC-03 | Tab Switch Preserves Correct Variant | FR-03 | 4 |
| UC-04 | Loading State Unchanged | FR-04 | 1 |
| UC-05 | Error State Unchanged | FR-04 | 1 |

---

## 9. Constraints & Assumptions

- [OPEN QUESTION OQ-01] `CheckCircle` vs. `CheckCircle2`: design-spec says `check-circle`. In Lucide, `CheckCircle` is the filled variant and `CheckCircle2` is the outline stroke variant. The spec recommends `CheckCircle2` (outline) for consistency with the muted-color icon style. FE team must confirm with design team before committing.
- [OPEN QUESTION OQ-02] The existing `EmptyState` component already has a `variant` prop. The upgrade strategy is to edit internals (add `role="status"`, add icon, fix body color) rather than wrapping. FE team must audit whether `role="status"` is on the component's root container or needs to be added to a parent wrapper — the spec requires it on the empty state container itself.
- [OPEN QUESTION OQ-03] Are additional notification tabs (e.g., "Mentions", "System") planned? If so, a third variant should be scoped now. Currently out of scope.
- No new tokens. No new i18n keys. No BE changes.
- The body text contrast fix (`text-edu-text-secondary` vs. `text-muted-foreground`) is mandatory — WCAG 1.4.3 at 13px requires 4.5:1; `text-muted` provides only 3.08:1.

---

## 10. Traceability Matrix

| Requirement | Source | Use Case(s) | Integration | Priority |
|---|---|---|---|---|
| FR-01: All-tab canonical empty state | TR-001, `emptyStates.notifications.list.allTab` | UC-01, UC-03, UC-04, UC-05 | `noti` service (SSE proxy, decision `0009`) — no new call | Must |
| FR-02: Unread-tab canonical empty state | TR-002, `emptyStates.notifications.list.unreadTab` | UC-02, UC-03, UC-04, UC-05 | `noti` service — no new call | Must |
| FR-03: tab switch variant correctness | TR-003 | UC-03 | none (existing `variant` prop logic) | Should |
| FR-04: loading + error unchanged | TR-004 | UC-04, UC-05 | none | Must |
| NFR-01: WCAG AA — `role="status"`, `aria-hidden`, body `text-secondary` | TR-NFR-001 | UC-01, UC-02 | none | Must |
| NFR-02: zero new i18n keys | TR-NFR-002 | UC-01, UC-02 | none | Should |
| NFR-03: zero new tokens | TR-NFR-003 | UC-01, UC-02 | none | Should |
| NFR-04: responsive 320px | (implied by `emptyStatePattern`) | UC-01, UC-02 | none | Must |

---

## 11. Handoff to FE

**What `fe-lead` should build:**

One file target: `src/features/notification/presentation/notifications-center/notifications-center.tsx`, local `EmptyState` function component (~lines 106–128).

**Changes to the `EmptyState` component:**

1. Add `role="status"` to the container element (the root div/section of `EmptyState`).
2. Add the icon before the title, switching by `variant`:
   - `variant === "all"` (or non-unread): `<BellOff className="size-16 text-edu-text-muted" aria-hidden="true" />`
   - `variant === "unread"`: `<CheckCircle2 className="size-16 text-edu-text-muted" aria-hidden="true" />`
3. Apply canonical title styling: `<p className="text-base font-bold text-foreground mt-4">`.
4. Fix body text color: change from `text-muted-foreground` (or equivalent) to `text-edu-text-secondary`. Add `max-w-xs` if not already present.
5. Retain the existing `variant` prop and key-switching logic for title and body.
6. Retain `mt-2` on body and `px-5 py-10` on container (verify these are already present; add if not).

**Storybook:** `notifications-center.stories.tsx` (or inline story file) must include two `EmptyState` stories — `EmptyStateAll` and `EmptyStateUnread` — each with a `play()` that asserts:
- Container has `role="status"`
- Icon SVG has `aria-hidden="true"`
- Body element has class `text-edu-text-secondary`
- Body element does NOT have class `text-muted-foreground` or `text-edu-text-muted`
- No `<button>` inside container

**TDD proof required:**
- Unit / component tests (Vitest): both variants render correct icon; body has `text-edu-text-secondary`; `role="status"` present; tab switch (variant prop change) swaps icon and copy cleanly; loading and error states suppress the empty state container.

**Lane:** normal

**TEST_MATRIX rows to create:** FR-01 (unit: AC-01.3, AC-01.7, AC-01.10–01.12), FR-02 (unit: AC-02.2, AC-02.5, AC-02.8–02.10), FR-03 (unit: AC-03.1–03.3), NFR-01/Storybook (play: `role="status"`, `aria-hidden`, `text-edu-text-secondary` body, no `text-muted-foreground`).
