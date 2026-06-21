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

### Messaging pane toggle spec (design-spec.jsonc responsiveGrid.messagingLayout)
Mobile (≤768px): single pane, default="list"; chat slides in on row tap, back button returns.
Transition: transform translateX 0.25s ease; @media(prefers-reduced-motion:reduce) → no transition (CSS-only guard, not JS matchMedia).
Off-screen pane: aria-hidden="true" or inert — removes focusable children from tab order.
No-overlap rule: outer container must clip overflow (overflow:hidden) during transition.
Back button aria-label: reuse existing i18n key under messaging.* or Common.*.
Desktop (>768px): both panes visible, no transform applied.
