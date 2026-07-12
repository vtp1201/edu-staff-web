# US-E20.1 — Use Cases & Acceptance Criteria (Admin Parent–Student Link Management)

Lane: **high-risk** (ba-lead decision, FR-007 Unlink = authorization-adjacent
data-visibility mutation). Actor role: `admin` (route `(app)/admin/parent-links`,
decision `0022`/`0024`). Source: `requirements.md`, `integration.md`, DR-014.

## 1. Use Case Scope Summary

7 use cases covering the full admin parent-link-management screen: table
load (incl. both empty variants + error), search/filter, create link (incl.
duplicate rejection), view detail, unlink (high-risk, extra rigor per
ba-lead), role-gate enforcement, and the mobile card-list layout. Boundary:
this screen only manages links + displays read-only consent status; it never
writes consent (that's US-E20.2, parent-only). All data is mock-first behind
`IParentStudentLinkRepository` until `core` ships.

## 2. Actor Catalogue

| Actor/Role | Type | Capabilities |
| --- | --- | --- |
| `admin` | Primary, human | View/search/filter table, create link, view detail, unlink (destructive, high-risk), view read-only consent badges |
| `teacher` / `principal-non-admin` / `parent` / `student` | Secondary, negative | MUST be denied the route/actions server-side (non-`admin` role) |
| `core` service (mock-first) | System | Backing data store for links, consents, search pools |
| `iam` service | System | Parent-role-scoped member search (INT-006) |

## 3. Use Case Catalogue

### UC-001: Load parent-student links table

- **Primary actor:** admin. **Preconditions:** authenticated as `admin`, tenant resolved.
- **Main success scenario:**
  1. Admin navigates to `/admin/parent-links`.
  2. Skeleton (5 rows) renders while INT-001 is in flight.
  3. Response resolves with `items[]`; table renders student/parent/relationship/consent/linkedOn columns.
- **Alternative flows:**
  - A1 — Zero links, no active filter → per-class empty state + "Tạo liên kết" CTA (FR-008 variant A).
  - A2 — Zero links, search/class filter active → filtered-empty state + "Xoá bộ lọc" action (FR-008 variant B).
- **Exception flows:**
  - E1 — Network/API failure (5xx/timeout) → error state with retry button; retry re-issues INT-001.
  - E2 — 403 FORBIDDEN_ACTION (should not occur post role-gate, but if returned) → redirect to actor's own workspace, not an in-page error.
- **Business rules:** tenant scoping resolved server-side, never client-supplied (NFR-008). Empty-variant choice is a client-side decision (active-filter state), not a server flag.
- **Non-functional constraints:** NFR-005 (skeleton within one paint frame), NFR-004 (mobile card-list, see UC-007), NFR-006 (i18n `parentLinks.*`).

### UC-002: Search + class filter

- **Primary actor:** admin. **Preconditions:** table has loaded (UC-001 success).
- **Main success scenario:**
  1. Admin types in the search box and/or selects a class from the filter.
  2. Table re-queries INT-001 with combined `q` + `classId`.
  3. Rows update to the filtered/matched set; filtered count shown (`parentLinks.count.filtered`).
- **Alternative flows:**
  - A1 — Only class filter active (no search text) → rows scoped to class, count shown without "(đã lọc)" distinction rule per FR-002 (still uses filtered semantics for empty-state variant, per FR-008).
  - A2 — Admin clears filters via "Xoá bộ lọc" → table reloads unfiltered.
- **Exception flows:**
  - E1 — Combined filter yields 0 rows → filtered-empty state (UC-001 A2), not the per-class empty state.
  - E2 — Query request fails mid-typing → error state with retry (does not silently keep stale rows without indicating failure).
- **Business rules:** search + class filter combine (AND), not OR. Debounced free-text input to avoid excessive requests (implementation detail, not user-facing AC).

### UC-003: Create parent-student link (incl. duplicate rejection)

- **Primary actor:** admin. **Preconditions:** table loaded; actor is `admin`.
- **Main success scenario:**
  1. Admin clicks "Tạo liên kết" → dialog opens with empty/reset fields (student combobox, parent combobox, relationship select, optional note).
  2. Admin searches + selects a student (INT-005) and a parent (INT-006, role-scoped to `parent`), picks relationship, optionally enters a note.
  3. Admin submits; INT-002 POST fires; submit button shows pending/disabled state.
  4. On success: dialog closes, table refetches, new row appears with `consentStatus: pending`, success toast shows `parentLinks.createDialog.toastCreated`.
- **Alternative flows:**
  - A1 — Admin cancels/closes dialog before submit → no request sent, fields discarded.
  - A2 — Admin adds an optional note → note persisted, visible later in detail dialog (FR-011).
- **Exception flows:**
  - E1 — Duplicate (studentId, parentId) pair (409 `LINK_ALREADY_EXISTS`-style code, code TBD) → inline dialog error "Liên kết đã tồn tại" (`role="alert"`), dialog stays open, no new row created, no toast.
  - E2 — 422 VALIDATION_ERROR (e.g. selected parent not actually parent-role) → per-field inline error on the failing combobox/select.
  - E3 — Network/5xx failure → dialog stays open, inline/toast error shown, retry re-submits with the same field values (no data loss), no partial link created.
  - E4 — 403 FORBIDDEN_ACTION → dialog closes, redirect to actor's own workspace (should not be reachable given route gate, but server must still enforce, NFR-007).
- **Business rules:** duplicate check happens server-side (FR-004); parent combobox restricted to parent-role accounts, tenant-scoped server-side (FR-010/NFR-008 — never client-filtered-only).
- **Non-functional constraints:** NFR-002 (combobox ARIA + full keyboard operability).

### UC-004: View link detail (read-only)

- **Primary actor:** admin. **Preconditions:** at least one row exists.
- **Main success scenario:**
  1. Admin opens a row's "…" action menu, selects "Xem chi tiết".
  2. Detail dialog opens rendering student, parent, relationship, consent status, linked-on date, note (if any) — all read-only.
- **Alternative flows:**
  - A1 — Link has no note → note field omitted/shows nothing (not an error).
  - A2 — Detail dialog needs the 3 individual consent categories (INT-004) beyond the aggregate badge → inline skeleton within the dialog while resolving, does not block the rest of the dialog's fields from rendering.
- **Exception flows:**
  - E1 — INT-004 fails while the rest of detail data is already rendered → section-scoped error within the dialog (consent detail area only), dialog itself remains open and usable.
- **Business rules:** admin cannot edit consent from this dialog (FR-012, Won't-scope). No mutating control present.

### UC-005: Unlink a parent-student link (HIGH-RISK — extra rigor)

- **Primary actor:** admin. **Secondary actor:** `core` service (server-side authorization boundary).
- **Preconditions:** row exists; actor is `admin`.
- **Risk classification:** high-risk lane — Unlink revokes another user's (parent's) data-visibility grant over a third party's (student's) data. Treated with RBAC-change rigor: no optimistic client-only removal, explicit consequence copy, and mandatory server-side re-authorization independent of the client having already passed the route's role gate.
- **Main success scenario:**
  1. Admin opens a row's "…" action menu, selects "Gỡ liên kết".
  2. Confirm dialog opens, stating the exact consequence per DR-014 `unlinkDialog.body`: "Phụ huynh {parent} sẽ mất quyền xem điểm số, hạnh kiểm, chuyên cần và mọi thông báo về học sinh {student} ({class}). Tài khoản của hai bên không bị xoá." (en mirror: "Parent {parent} will lose access to grades, conduct, attendance and all notifications about {student} ({class}). Neither account is deleted.")
  3. Admin clicks "Gỡ liên kết" (confirm, danger-styled button, distinguished from Cancel).
  4. Confirm button shows pending state; INT-003 `DELETE /api/v1/parent-student-links/{linkId}` fires — this is the ONLY path that can trigger the deletion (no optimistic removal before this call resolves).
  5. Server validates: (a) caller's authenticated session role is `admin`, (b) the link belongs to the caller's own tenant — both checked at the API boundary, independent of client-side role gating.
  6. On 2xx: dialog closes, row disappears from the table, success toast shows `parentLinks.unlinkDialog.toastRemoved`.
- **Alternative flows:**
  - A1 — Admin clicks Cancel or presses Escape → dialog closes, no request sent, no change, focus returns to the triggering row's "…" menu button (NFR-003).
- **Exception flows:**
  - E1 — 404 RESOURCE_NOT_FOUND (link already removed by a concurrent action — race) → toast "already removed" variant, row disappears anyway (table refetches to reconcile state), no error thrown to the user.
  - E2 — 403 FORBIDDEN_ACTION (server-side authorization rejects the caller — the high-risk assertion) → confirm dialog reopens/stays open with an inline error; the row is NOT removed; the link remains intact server-side. This is the explicit proof point that authorization is enforced at the API boundary, not merely by the client having reached this dialog.
  - E3 — Network/5xx failure → confirm dialog stays open (or reopens) with error; link not removed; admin may retry the same confirm action.
- **Business rules:**
  - The route (`(app)/admin/parent-links`) is already role-gated client-side by the existing `(app)/admin/layout.tsx` RSC guard (`role === "admin"`, decision `0022`/`0024`) — this is necessary but explicitly NOT sufficient for this action. INT-003 MUST independently re-check role + tenant scope server-side on every call, because client-side gating can be bypassed (e.g. a forged/replayed request, a stale session whose role changed, a direct API call). The mock repository simulates this by rejecting a simulated non-admin/cross-tenant call (per integration.md §4), making E2 testable pre-`core`.
  - Neither the parent's nor the student's account is deleted or otherwise affected by Unlink — only the link record (and, per open question, potentially the associated consent record) is removed.
  - No client-only optimistic removal: the row must remain visible until the server confirms deletion (2xx), consistent with the high-risk lane's rigor.
- **Non-functional constraints:** NFR-003 (dialog keyboard-operable, focus trap, danger-styled confirm, focus returns to trigger on close).

### UC-006: Role-gate enforcement (non-admin actor denied)

- **Primary actor:** any authenticated non-`admin` actor (teacher, principal-without-admin-role, parent, student). **Secondary actor:** `core`/route guard.
- **Main success scenario (denial is the "success" path for this UC):**
  1. Non-admin actor's session hits `(app)/admin/parent-links` (directly, via URL, or via a stale bookmark/link).
  2. The existing `(app)/admin/layout.tsx` RSC guard evaluates `role === "admin"` server-side before any page content renders.
  3. Actor is redirected to their own workspace; no table data, no dialog markup, and no combobox candidate data is ever sent to the client.
- **Exception flows:**
  - E1 — A non-admin actor's client somehow directly invokes a mutating Server Action for create (INT-002) or unlink (INT-003) bypassing the UI (e.g. crafted request) → server rejects with 403 FORBIDDEN_ACTION at the API/action boundary; no link is created or removed.
- **Business rules:** Denial MUST be enforced server-side (RSC guard for the route, API/Server Action check for each mutating call) — a client-side `if` that merely hides the "Tạo liên kết" button or the "…" menu is not sufficient and does not satisfy NFR-007.

### UC-007: Mobile card-list layout (<760px)

- **Primary actor:** admin on a narrow viewport (phone/small tablet).
- **Preconditions:** table has data (any of UC-001's success/empty states).
- **Main success scenario:**
  1. Admin views `/admin/parent-links` at a viewport width below 760px.
  2. The table renders as a **distinct stacked card-list layout** (per design-spec's explicit callout), not a horizontally-scrolled or visually-squeezed table.
  3. Each card surfaces all the same data as a table row: student (avatar+name+class), parent (avatar+name+phone), relationship badge, consent-status badge (icon+text), linked date, and an accessible affordance to open the "…" row-action menu (view detail / unlink).
- **Alternative flows:**
  - A1 — Empty/filtered-empty states render their card-layout-appropriate empty UI (same copy as desktop, restacked).
- **Exception flows:**
  - E1 — Error state at this viewport still shows the same error UI + retry, laid out for the narrow card list (not clipped/overflowing).
- **Business rules:** No column's data may be dropped or hidden behind an additional interaction in the card layout — all fields visible directly on the card (NFR-004).
- **Non-functional constraints:** NFR-004 — no horizontal scroll/clipping at 320px; verified at 375/768/1280; the sub-760px breakpoint specifically must show the card variant, not a squeezed table.

## 4. Acceptance Criteria

```
UC-001: Load parent-student links table
  AC-001.1 Loading — Given the admin navigates to /admin/parent-links, When the page mounts and INT-001 is in flight, Then a 5-row skeleton renders within one paint frame (no blank screen).
  AC-001.2 Success — Given INT-001 resolves with items, When the response arrives, Then the table renders rows with student (avatar+name+class), parent (avatar+name+phone), relationship badge, consent-status badge (icon+text), and linked date, in the `parentLinks` i18n namespace.
  AC-001.3 Empty (no filter) — Given the tenant has zero links and no search/class filter is active, When the table finishes loading, Then it shows "Lớp này chưa có liên kết nào" + a "Tạo liên kết" CTA (FR-008 variant A).
  AC-001.4 Empty (filtered) — Given a search/class filter is active and yields zero matches, When the table finishes loading, Then it shows "Không có liên kết nào khớp bộ lọc" + a "Xoá bộ lọc" action (FR-008 variant B), distinct copy/CTA from AC-001.3.
  AC-001.5 Error — Given INT-001 fails (network/5xx/timeout), When the response returns, Then an error state renders with "Không tải được dữ liệu" + a "Thử lại" button that re-issues the same request.
  AC-001.6 403 denial — Given INT-001 returns FORBIDDEN_ACTION/403, When this is received, Then the admin is redirected to their own workspace, not shown an in-page error banner.
```

```
UC-002: Search + class filter
  AC-002.1 Combined filter — Given the table has loaded, When the admin types a search term AND selects a class, Then only rows matching BOTH conditions render, and the header shows the filtered count with "(đã lọc)" suffix.
  AC-002.2 Clear filters — Given a filtered-empty state is shown, When the admin activates "Xoá bộ lọc", Then all filters reset and the unfiltered table (or its own empty/success state) reloads.
  AC-002.3 Loading during refilter — Given the admin changes a filter, When the refetch is in flight, Then the table shows a loading indicator (not a flash to an incorrect empty state) before the new result set renders.
  AC-002.4 Error during refilter — Given a filter change triggers a failed refetch, When the error returns, Then the error+retry state renders (AC-001.5 semantics), not silently-stale rows.
```

```
UC-003: Create parent-student link
  AC-003.1 Open dialog — Given the admin is on the table, When they click "Tạo liên kết", Then the create-link dialog opens with empty student/parent comboboxes, no relationship selected, and an empty note field.
  AC-003.2 Happy path — Given the admin selects a valid non-duplicate student+parent pair, a relationship, and (optionally) a note, When they submit, Then the dialog closes, the table refetches, a new row appears with consentStatus = pending, and a toast reads "Đã tạo liên kết {parent} → {student}. Đã gửi yêu cầu xác nhận consent." (vi) / the en mirror.
  AC-003.3 Duplicate rejection — Given the selected (studentId, parentId) pair already has an active link, When the admin submits, Then an inline dialog error "Liên kết đã tồn tại" renders with role="alert", the dialog stays open, no new row is created, and no toast is shown.
  AC-003.4 Field validation — Given the selected parent does not actually hold the parent role (422 VALIDATION_ERROR), When submit is attempted, Then a per-field inline error renders on the parent combobox, dialog stays open, no link created.
  AC-003.5 Loading — Given a valid submit is in flight, Then the submit button shows a pending/disabled state (aria-busy) and the dialog does not close until the request settles.
  AC-003.6 Network error — Given INT-002 fails (network/5xx), When the response returns, Then the dialog stays open, an inline/toast error is shown, and the previously entered field values are preserved for retry.
  AC-003.7 Parent combobox scope — Given the admin types in the parent combobox, When candidates are returned, Then only parent-role members of the admin's own tenant appear (server-scoped, FR-010/NFR-008) — never students/teachers, never another tenant's members.
  AC-003.8 Keyboard operability — Given the admin uses only a keyboard, When they open, filter, arrow-navigate, and select in either combobox, Then the full create-link flow completes with no mouse (NFR-002).
```

```
UC-004: View link detail
  AC-004.1 Success — Given a row exists, When the admin selects "Xem chi tiết" from its action menu, Then a read-only dialog opens showing student, parent, relationship, consent status, linked-on date, and note (if present).
  AC-004.2 No note — Given the link has no note, Then the note field is omitted or shows no content, not an error state.
  AC-004.3 Loading (consent detail) — Given the dialog needs the 3 individual consent categories (INT-004), When that sub-fetch is in flight, Then an inline skeleton renders in that section only, while the rest of the dialog's fields are already visible.
  AC-004.4 Error (consent detail) — Given INT-004 fails, Then a section-scoped error renders in the consent-detail area only; the dialog remains open and the other fields (student/parent/relationship/note) stay visible and usable.
  AC-004.5 Read-only — Given the detail dialog is open, Then no control on it allows editing consent or relationship (FR-012) — only a Close action is present.
```

```
UC-005: Unlink a parent-student link (HIGH-RISK)
  AC-005.1 Confirm dialog copy (explicit assertion) — Given the admin selects "Gỡ liên kết" from a row's action menu, When the confirm dialog opens, Then it renders the exact consequence copy from DR-014 `unlinkDialog.body`: vi "Phụ huynh {parent} sẽ mất quyền xem điểm số, hạnh kiểm, chuyên cần và mọi thông báo về học sinh {student} ({class}). Tài khoản của hai bên không bị xoá." / en "Parent {parent} will lose access to grades, conduct, attendance and all notifications about {student} ({class}). Neither account is deleted." with {parent}/{student}/{class} interpolated to that row's actual values — this AC fails if the dialog shows only a generic "are you sure?" without the visibility-loss + no-account-deletion clauses.
  AC-005.2 Danger styling + keyboard — Given the confirm dialog is open, Then the confirm button ("Gỡ liên kết") is visually/semantically danger-styled and distinguished from Cancel, the dialog traps focus while open, and Escape/Cancel returns focus to the triggering row's "…" menu button (NFR-003).
  AC-005.3 Happy path — Given the admin clicks confirm, When INT-003 DELETE resolves 2xx, Then the dialog closes, the row disappears from the table, and a toast reads "Đã gỡ liên kết. {parent} không còn quyền xem dữ liệu học sinh." (vi) / en mirror.
  AC-005.4 Loading / no optimistic removal — Given confirm is clicked, When the DELETE request is in flight, Then the confirm button shows a pending/disabled state AND the row remains visible in the table until the server responds — the row must never disappear before the 2xx response arrives (no client-only optimistic removal).
  AC-005.5 Server-side authorization enforcement (explicit assertion, high-risk core) — Given a caller's request reaches the INT-003 DELETE endpoint with a role that is not `admin` for the resolved tenant (simulated via the mock repository per integration.md §4, since `core` is not yet built), When the request is evaluated, Then the API layer itself rejects it with 403 FORBIDDEN_ACTION — independent of and in addition to the client-side route/role gate already passed to reach the dialog. This assertion must be testable by directly invoking the repository/Server Action with a forged/altered role, not only by confirming the button is hidden in the UI for non-admins.
  AC-005.6 403 handling in UI — Given INT-003 returns 403 FORBIDDEN_ACTION, When this is received, Then the confirm dialog reopens/stays open with an inline error, the row is NOT removed from the table, and no success toast is shown.
  AC-005.7 404 race — Given the link was already removed by a concurrent action (404 RESOURCE_NOT_FOUND), When this is received, Then a toast indicates the link was already removed, the row disappears (table refetches to reconcile), and this is not surfaced as a hard error.
  AC-005.8 Network error — Given INT-003 fails (network/5xx), When the response returns, Then the confirm dialog stays open (or reopens) with an error, the link is not removed, and the admin can retry the same confirm action.
  AC-005.9 Cancel — Given the confirm dialog is open, When the admin clicks Cancel or presses Escape, Then the dialog closes, no request is sent, no change occurs, and focus returns to the triggering row's action-menu button.
```

```
UC-006: Role-gate enforcement
  AC-006.1 Route denial — Given an authenticated actor whose role is not `admin` (teacher/principal-without-admin-role/parent/student), When they navigate to /admin/parent-links, Then the RSC layout guard (`(app)/admin/layout.tsx`, decision 0022/0024) redirects them to their own workspace server-side before any table/dialog data or markup is sent to the client.
  AC-006.2 Action denial (create) — Given a non-admin actor's client directly invokes the create-link Server Action/API (bypassing the UI), When the request is evaluated, Then the server rejects it with 403 FORBIDDEN_ACTION and no link is created.
  AC-006.3 Action denial (unlink) — Given a non-admin actor's client directly invokes the unlink Server Action/API (bypassing the UI), When the request is evaluated, Then the server rejects it with 403 FORBIDDEN_ACTION and no link is removed. (Same assertion as AC-005.5, restated at the role-gate UC level for traceability.)
  AC-006.4 No client-only gating — Given any of the above, Then denial must not depend solely on a client-side conditional that hides a button/menu item — the check must be reproducible by calling the underlying Server Action/repository method directly with a non-admin role and observing rejection.
```

```
UC-007: Mobile card-list layout (<760px)
  AC-007.1 Distinct layout — Given the viewport width is below 760px, When the table has data, Then the UI renders a stacked card-list (one card per link), not a horizontally scrollable or visually-squeezed version of the desktop table.
  AC-007.2 Data parity — Given a card is rendered, Then it displays the same fields as a desktop row: student (avatar+name+class), parent (avatar+name+phone), relationship badge, consent-status badge (icon+text), linked date, and an accessible entry point to the "…" action menu — no field is dropped or requires an extra tap beyond the card itself to discover.
  AC-007.3 Empty states restack — Given zero links (either empty variant) at <760px, Then the same empty-state copy/CTA from AC-001.3/AC-001.4 renders in a layout appropriate to the narrow viewport, not clipped or overlapping.
  AC-007.4 Error restacks — Given an error state at <760px, Then the same error+retry UI renders without horizontal scroll or clipping.
  AC-007.5 No clipping at 320px — Given the viewport is 320px wide, Then no content is clipped or requires horizontal scrolling; verified additionally at 375/768/1280 per NFR-004.
  AC-007.6 Action menu keyboard-operable on mobile — Given the card-list layout, When a keyboard/AT user tabs to a card's action-menu trigger, Then it opens the same "Xem chi tiết"/"Gỡ liên kết" menu with the same keyboard semantics as desktop (NFR-002/NFR-003 apply identically).
```

## 5. Edge Case Matrix

| Feature | Empty | Max-length (long names/notes) | Concurrent action | Auth-expired | Network-error | Wrong-role |
| --- | --- | --- | --- | --- | --- | --- |
| Table load (UC-001) | Two variants (AC-001.3/.4) | Long student/parent names truncate with ellipsis + full text on hover/focus (title attr or tooltip) — `[OPEN QUESTION]` exact truncation UX not specced, flag to uiux if pursued | Another admin creates/unlinks a row while this admin's table is open → next refetch/poll reconciles; no crash on stale linkId reference | 401 mid-session → existing hybrid refresh (decision 0018) retries once, then redirect-to-login on failure (shared cross-screen behavior, not screen-specific) | AC-001.5 | AC-006.1 |
| Search/filter (UC-002) | Filtered-empty (AC-001.4) | Very long search string still debounced/sent as-is; server truncates/ignores overflow (BE concern) | Filter change fires while a previous filter request is still in flight → last request wins (stale response discarded) | same as above | AC-002.4 | N/A (route already gated) |
| Create link (UC-003) | N/A (dialog always has fields) | Note field very long (no explicit max in FR-011) → `[OPEN QUESTION]` needs a max length from `core`/design; until then treat as unconstrained client-side, server may 422 | Two admins create the same pair near-simultaneously → second submit hits duplicate-check server-side (AC-003.3), even if not caught by an earlier client-side pre-check | Token expires mid-dialog-fill → submit triggers reactive refresh (decision 0018) transparently; if refresh fails, redirect to login without losing in-progress field values if feasible (best-effort) | AC-003.6 | AC-006.2 |
| Detail dialog (UC-004) | No note (AC-004.2) | Long note wraps within dialog, no truncation (read-only display) | Link is unlinked by another admin while detail dialog is open → detail dialog does not auto-close; a subsequent action would 404, handled like AC-005.7 pattern if re-attempted | same pattern as above | AC-004.4 | N/A (view-only, still role-gated at route level) |
| Unlink (UC-005) | N/A | N/A | Two admins attempt to unlink the same row concurrently → second confirm gets 404 (AC-005.7), not a crash | Token expires between opening confirm dialog and clicking confirm → reactive refresh attempts once; if it still fails, treat as a network/auth error (AC-005.8-equivalent), dialog stays open | AC-005.8 | AC-005.5/AC-005.6/AC-006.3 (server-side, explicit) |
| Mobile layout (UC-007) | AC-007.3 | Long text wraps within the card (no horizontal overflow) — card width is viewport-bound | N/A (layout concern, not a data-mutation concern) | Same cross-cutting auth behavior as above, rendered in card layout | AC-007.4 | Same as AC-006.1 (redirect happens before layout even matters) |

## 6. Open Questions

- `[OPEN QUESTION]` Exact truncation/tooltip UX for long student/parent names in the table and cards — not specified in DR-014; flag to `uiux-lead` if a real name-length edge case surfaces during `/fe` build.
- `[OPEN QUESTION]` Max length for the optional note field (FR-011) — no client-side limit specified; recommend a reasonable cap (e.g. 500 chars) be decided by `ba-lead`/`core` team before `/fe` implements validation.
- `[OPEN QUESTION]` (carried from requirements.md/integration.md) Exact error code for duplicate-link rejection (assumed `LINK_ALREADY_EXISTS`) — needs confirmation once `core`'s `ERROR_CODES.md` exists; AC-003.3 is written against the UI behavior (inline error, dialog stays open), which should hold regardless of the exact code once mapped.
- `[OPEN QUESTION]` (carried) Whether DELETE `/parent-student-links/{linkId}` cascades to clear the associated consent record server-side — affects whether US-E20.2's data is instantly consistent post-unlink; not blocking for this story's AC (unlink AC is scoped to the link row's own removal), but flag for a future consistency check between the two stories' mocks.
- `[OPEN QUESTION]` Whether Unlink emits into the existing generic audit-log (`AuditEntityType` extension needed) — flagged in integration.md as a candidate ADR; not modeled as an AC here since it's out of this story's confirmed scope until decided.
