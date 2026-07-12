---
name: repo-uc-patterns
description: Standard UC pattern shapes for edu-staff-web — async four-state, role-gating, keyboard nav, error mapping
metadata:
  type: project
---

## Four async states (mandatory for every async UC)
Every async UC must cover: loading (skeleton within 320ms), empty (no data), error (mapped from failure code), success.

## Role gating
Roles: teacher | principal | student | parent. Routes are hard-gated per role group.
Role variants always need: (a) a UC showing the correct role's feature, (b) a negative UC confirming other roles cannot access.

## Error failure codes → UI messages (grades domain)
- not-found → "Không tìm thấy dữ liệu điểm"
- forbidden → "Bạn không có quyền xem bảng điểm này" (no retry)
- not-published → banner "Điểm học kỳ này chưa được công bố" (locked banner, not error)
- network-error → "Lỗi kết nối. Vui lòng thử lại." + retry button
- unknown → "Đã có lỗi xảy ra. Vui lòng thử lại sau."

## Keyboard nav pattern (tablist)
Focus moves with ArrowLeft/ArrowRight (no fetch, focus only). Enter/Space activate the focused tab (triggers fetch). Tab key moves between tab buttons and the rest of the page. Wraps at boundary.

## TanStack Query key convention
['gradeBook', 'child', childId, term] — invalidate on term change.

## Parent role child-switcher UC pattern (E09.4)
- Two UCs: (1) single-child happy path, (2) multi-child switcher. Split at the selector level.
- Form reset on child switch is a separate BR (TR-015), modeled explicitly in the multi-child UC.
- The only write operation on a read-mostly screen should be called out explicitly in both UC-01 (happy path) and the validation UC.
- RBAC has two sub-flows: (a) non-parent redirect, (b) parent with out-of-scope childId → 403.
- Read-only enforcement UC covers DOM-level absence (not CSS hide) of mutation controls.

## Conduct score color token thresholds (discipline domain)
score ≥90 → var(--edu-success) | ≥70 → var(--edu-primary) | ≥50 → var(--edu-warning) | <50 → var(--edu-error)
Grade mapping: excellent(≥90)=success | good(≥70)=primary | average(≥50)=warning | weak(<50)=error
Domain rule: score = 100 + sum(violation.points), floor 0 (TR-017) — lives in domain layer only.

## Leave status badge color tokens
pending → var(--edu-warning) | approved → var(--edu-success) | rejected → var(--edu-error)

## Leave form validation rules (discipline domain)
startDate >= today | endDate >= startDate (optional field) | reason.trim().length >= 10
All three rules fire independently; model concurrent-violation alt flow explicitly.

## Responsive layout UC patterns (UX-03 / E17)
Pure CSS-layout stories (no new BE, no new tokens, no new i18n) still need four async states modeled: loading skeletons inherit the same CSS class, empty state uses role="status", error state replaces grid/table.

### Stat-grid breakpoint spec (design-spec.jsonc responsiveGrid.statGrid)
`repeat(auto-fit, minmax(200px, 1fr))` — 4 cols >1024px, 2 cols 640–1024px, 1 col <640px.
Key AC test: document.documentElement.scrollWidth === clientWidth at 320px.
No JS matchMedia / ResizeObserver added — CSS-only constraint.
Open question pattern: "teacher dashboard" reference in DR-010 has no matching src/features/teacher/ file — FE must grep for remaining hard-coded grid-cols-4 patterns.

### Grade table mobile spec (design-spec.jsonc responsiveGrid.gradeTable)
Scroll wrapper: overflow-x:auto, -webkit-overflow-scrolling:touch, padding:0, role="region"+aria-label (existing key).
Table: min-width:640px.
First column cells: position:sticky, left:0, background:var(--edu-card), z-index:1, border-right:1px solid var(--edu-border).
z-index must NOT exceed 1 (modal/popover layers must be > 1).

### Shared-cooldown countdown pattern (auth/OTP-adjacent flows, E22.1 email-verify)
When two entry points (e.g. banner + dialog) hit the same send/resend endpoint, model
ONE shared clock, not two independent timers — AC must explicitly assert the second
surface reflects the first surface's remaining time on open/reopen. Cooldown is
client-only when the BE 204 response carries no retryAfter/nextResendAt field —
model a full-page-reload reset as accepted behavior (not a defect) rather than
inventing a persistence requirement not in the contract.
aria-live="polite" for countdowns: only start/end transitions need guaranteed
announcement — do not require per-second announcement (screen readers throttle
live-region updates naturally); state this explicitly in AC to avoid over-speccing.

### Defensive modeling of a BE error code flagged mid-pipeline (E22.1 too-many-attempts)
When ba-integration-analyst confirms a BE error code exists (e.g. USER_TOO_MANY_ATTEMPTS,
429, already in CODE_MAP) but the original requirements/design only named 2 of 3 dialog
error states — write it as a full UC with its own AC, not a footnote, and flag the
still-open behavioral question (e.g. "does resend unlock the lockout?") as
[OPEN QUESTION] rather than asserting an unconfirmed BE behavior as fact. Keep it
textually/AC-distinct from a same-shaped 429 on a DIFFERENT endpoint (send vs confirm) —
don't let the modeler merge two error codes just because the surfaced copy is similar.

### High-risk destructive-mutation AC pattern (E20.1 admin Unlink, 5th role `admin`)
When ba-lead escalates a destructive UC to high-risk lane (authorization-adjacent
data-visibility change, not just a normal confirm-dialog delete), write THREE
distinct AC classes for that one action: (1) exact consequence copy assertion —
quote the literal DR string with interpolation vars, not "shows a warning";
(2) explicit server-side re-authorization assertion, worded to be testable by
invoking the repository/Server Action directly with a forged/altered role — do
NOT accept "route is role-gated" alone as satisfying this, since client gating
is exactly what the high-risk lane says is insufficient; (3) a negative UC
(non-admin actor denied) restated at both the specific action's AC (redundant
by design, for traceability) and a dedicated role-gate UC. Also model
"no client-only optimistic removal" as its own AC — the row/item must stay
visible until the server 2xx, not disappear on click.
5-role model note: decision 0022 added `admin` as a distinct UserRole from
`principal` for `(app)/admin/**` route group — don't default to `principal`
for admin-route stories; check roles-permissions.md's current role count first.

### Distinct mobile layout callout (not squeeze) — design-spec explicit variant
When a design-spec/DR explicitly calls a breakpoint variant "distinct" (e.g.
card-list vs squeezed table) rather than implying pure CSS reflow, give it its
own UC + AC set (data-parity assertion: every field the desktop view shows
must appear on the card, no field dropped/hidden behind extra interaction) —
don't fold it into the parent feature's AC as an implicit responsive note.

### Sibling-screen shared entity pattern (E20.1 + E20.2 parent-student-links)
Two independent stories (admin-side CRUD vs parent-side self-service toggle)
sharing one conceptual entity (ParentStudentLink/Consent) still get two
separate UC sets/mocks — cross-reference the shared shape in an edge-case-
matrix row instead of merging use cases. Model the "empty vs 403-scoping-
failure must not look the same" distinction explicitly as its own AC when a
generic empty-array response could be confused with a silent auth failure.

### Messaging pane toggle spec (design-spec.jsonc responsiveGrid.messagingLayout)
Mobile (≤768px): single pane, default="list"; chat slides in on row tap, back button returns.
Transition: transform translateX 0.25s ease; @media(prefers-reduced-motion:reduce) → no transition (CSS-only guard, not JS matchMedia).
Off-screen pane: aria-hidden="true" or inert — removes focusable children from tab order.
No-overlap rule: outer container must clip overflow (overflow:hidden) during transition.
Back button aria-label: reuse existing i18n key under messaging.* or Common.*.
Desktop (>768px): both panes visible, no transform applied.
