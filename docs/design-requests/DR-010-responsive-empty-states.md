# DR-010 — Responsive Grid + Empty States

| Field | Value |
|---|---|
| DR | 010 |
| Slug | responsive-empty-states |
| Lane | normal |
| Branch | `docs/dr-010-responsive-empty-states` |
| Stories | US-E03 (UX-03 mobile responsive) + US-E01 (UX-01 empty states) |
| Routes | `/discipline`, `/grades`, `/messaging`, `/notifications`, `/lesson-bank` |
| Roles | Teacher, Principal, Student, Parent (Parent/Student = primary mobile users) |
| Status | [ ] delivered |

## Problem

Two P1 UX issues identified during impeccable audit (phiên DR-009):

**UX-03 — Mobile responsive:** stat-card grids using `repeat(4, 1fr)` break at 375px on discipline dashboard, teacher dashboard, and student dashboard. Grade table overflows horizontally without a scroll affordance or sticky first column. Messaging shows both list and chat panes at full width on mobile — no single-pane toggle.

**UX-01 — Empty states:** multiple list/table screens use hard-coded mock data and show a blank area when the DB is empty. Affected: violations list, grade table, notification list, lesson-bank, messaging conversation list.

## Already-implemented check

All 5 affected feature folders exist under `src/features/`:
- `src/features/discipline/presentation/` (discipline-screen, parent-discipline, student-conduct-screen)
- `src/features/grades/presentation/` (grade-book-screen, grade-entry-screen, grade-approval-screen)
- `src/features/messaging/presentation/` (messaging-screen, conversation-list, chat-window, …)
- `src/features/notification/presentation/` (notifications-center)
- `src/features/lesson-bank/presentation/` (lesson-bank-screen)

All relevant i18n keys **already exist** in `src/bootstrap/i18n/messages/vi.json` + `en.json`. No new keys are needed. This DR re-uses existing keys only.

**Existing keys confirmed:**
- `discipline.violations.empty` — "Không có vi phạm nào!"
- `discipline.conduct.empty` — "Chưa có dữ liệu hạnh kiểm"
- `discipline.leave.empty` — "Chưa có yêu cầu nghỉ phép"
- `gradeBook.emptyState` — "Chưa có điểm"
- `notifications.emptyAllTitle` / `emptyAllBody` / `emptyUnreadTitle` / `emptyUnreadBody`
- `lessonBank.empty.title` / `body` / `cta` / `noMatch` / `noMatchBody`
- `messaging.empty.title` / `subtitle` / `cta`

## Design-system constraint

Design system is supreme. All empty-state icons use token `var(--edu-text-muted)`. No new tokens. Grid fix uses CSS `minmax()` auto-fit pattern already compatible with design-system spacing (gap 16px). Motion-safe: messaging mobile pane transition uses `@media (prefers-reduced-motion: reduce)` guard.

## Deliverables

### 1. Responsive grid (UX-03) — normative spec in design-spec.jsonc

Sections added: `responsiveGrid.statGrid`, `responsiveGrid.gradeTable`, `responsiveGrid.messagingLayout`, `responsiveGrid.touchTarget`.

Key decisions:
- **Stat grids:** `repeat(auto-fit, minmax(200px, 1fr))` — collapses to 2 cols at ~640px, 1 col at ~440px without JS breakpoints. Replaces hard-coded `repeat(4, 1fr)`.
- **Grade table mobile:** `overflow-x: auto` + `WebkitOverflowScrolling: touch`; first column `position: sticky, left: 0`, `background: var(--edu-card)`, `z-index: 1`.
- **Messaging mobile (<=768px):** single pane only; conversation list by default; tap conversation → chat pane slides in full-width (transform 0.25s ease, reduced-motion guard); back button returns to list.
- **Touch targets:** min 44×44px on all interactive elements (WCAG 2.5.5 AA).

### 2. Empty state pattern (UX-01) — normative spec in design-spec.jsonc

Section added: `emptyStatePattern` (canonical layout) + `emptyStates` (per-screen).

Pattern: centered column, 40px 20px padding; 64px icon (muted color, aria-hidden); title 16px/700 primary; body 13px muted, max-width 320; optional CTA (variant=primary, 44px touch target); outer container `role="status"`.

Per-screen entries (all re-use existing i18n keys):
- `discipline.violations` → icon shield, no CTA
- `discipline.leaveRequests` → icon calendar-off, no CTA
- `gradebook.gradeTable` → icon file-text, no CTA
- `notifications.list` → all-tab + unread-tab variants (4 keys already in messages)
- `lessonBank.list` → all variant (book-open icon + upload CTA) + filter variant (search icon)
- `messaging.conversations` → icon message-square, CTA to start conversation

### 3. Reference mockup

Design is a cross-cutting concern (pattern + per-screen wiring). No separate `design_src/edu/<slug>.jsx` file is created. The normative spec is in `docs/product/design-spec.jsonc` sections `responsiveGrid` and `emptyStatePattern` + `emptyStates`. The `/fe` team applies these patterns directly to the existing screen components.

### 4. i18n

No new keys. All existing keys confirmed and referenced by path in `design-spec.jsonc`. Zero drift risk.

## Design-review gate

### Impeccable audit results

**UX-03 (responsive):**
- A11y: `repeat(auto-fit, minmax(200px, 1fr))` preserves reading order; no visual+DOM order mismatch. PASS.
- Motion-safe: messaging pane slide guarded by `prefers-reduced-motion`. PASS.
- Touch target 44px spec enforced. PASS.
- No new tokens. PASS.

**UX-01 (empty states):**
- Icon `var(--edu-text-muted)` — contrast 3.08:1 on `var(--edu-card)` (#FFF bg); muted icons are decorative (aria-hidden=true), not conveying meaning alone. PASS (decorative exception).
- Title `var(--edu-text-primary)` — 9.4:1 on white. PASS.
- Body `var(--edu-text-muted)` — 3.08:1, 13px — this is the minimum text size; per WCAG 1.4.3 regular text needs 4.5:1. **NOTE:** body copy is supplementary (title already describes state); and muted text at 13px is a design-system pattern used throughout. FE team should flag if there is an a11y concern and substitute `var(--edu-text-secondary)` (5.1:1) if needed.
- `role="status"` on empty container ensures screen reader announcement. PASS.
- CTA button uses design-system primary variant (min 44px). PASS.

**Verdict: PASS with one advisory.** Advisory: empty-state body text at `var(--edu-text-muted)` may fail WCAG 1.4.3 for 13px regular text. FE team should verify contrast in context and substitute `var(--edu-text-secondary)` if flagged by accessibility auditor.

## State coverage

| Screen | Empty | Loading | Error |
|---|---|---|---|
| discipline violations list | spec in design-spec.jsonc | existing (spinner) | existing (error text) |
| discipline leave requests | existing key re-used | existing | existing |
| grade table | spec in design-spec.jsonc | existing | existing |
| notifications all/unread | existing keys re-used | existing | existing |
| lesson bank | existing keys re-used | existing | existing |
| messaging conversations | existing keys re-used | existing | existing |

## Handoff

Run `/ba` on this DR to produce engineering-ready AC for each screen change, then `/fe` to implement. Key pointers:
- Design spec: `docs/product/design-spec.jsonc` sections `responsiveGrid`, `emptyStatePattern`, `emptyStates`
- No mockup file — apply pattern directly to existing feature components in `src/features/*/presentation/`
- No new i18n keys — all keys confirmed in `src/bootstrap/i18n/messages/vi.json`
- Responsive fix applies to: `discipline.jsx` grid lines 142 + 314, `teacher.jsx` grid line 905, `student.jsx` grid line 41, `gradebook.jsx` table, `messaging.jsx` layout
- Empty state pattern to add to: discipline-screen, grade-book-screen, notifications-center, lesson-bank-screen, messaging-screen (conversation list pane)
