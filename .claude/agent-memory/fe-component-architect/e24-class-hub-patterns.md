---
name: e24-class-hub-patterns
description: US-E24.7 class-list component decisions — role-badges shared placement, KPI tile VM contract, StatusBadge purple tone already exists
metadata:
  type: project
---

US-E24.7 (`/teacher/classes` list) established these patterns for the E24
class-hub epic (E24.8 class-detail shell reuses them):

- `StatusBadge` (`components/shared/status-badge/status-badge.tsx`) **already
  has `tone: "purple"`** in its `StatusTone` union — no extension needed for
  GVCN badges. Always grep the tone map before assuming a new tone/variant is
  required.
- `role-badges.tsx` promoted straight to `features/teacher/presentation/shared/`
  on first write (not feature-screen-local then promoted later) because the
  packet's own Design Note already named the 2nd consumer (E24.8 identity
  header) — a committed, named 2nd use justifies shared placement immediately,
  per `component-organization.md`'s "composed, dùng ≥2 screen" branch. Props
  take `{ roles, subjects }` directly (not a screen VM) so a future consumer
  with a different VM shape can call it without depending on this screen's
  `.i-vm.ts`.
- KPI tile **tone** (`neutral|warning|error` from `value > 0`) and **which
  tiles render** (role-dependent set, dual-role precedence) are both resolved
  in the RSC `page.tsx`, never inside the presentational card/tile — matches
  the established `mapScheduleStatusTone` convention (teacher-dashboard-home).
  `KpiTileVM.label` is pre-translated (unlike role-badge copy, which the
  shared component translates itself) because the tile *label set* is a
  page-level composition decision, not a fixed 2-variant vocabulary.
- Mockup div-`onClick`-card-navigate pattern (`design_src/edu/class-hub.jsx`
  `ChClassList`'s `onOpen(cls)` on the card div) is a JS-prototype affordance
  only — NOT adopted in real components. Keep the card presentational with a
  single real `<Link>` CTA as the sole interactive element; don't make the
  whole card clickable via a div handler (nested-interactive / non-semantic
  target a11y issue).
- See [[component-placement]] for the general decision tree this applied.

US-E24.8 (`/teacher/classes/[classId]` shell, on top of E24.7):
- **`'use client'` composition wrapper receiving an RSC subtree as
  `children`** is the pattern for a route whose active "panel" must be
  resolved server-side (URL = state, no client fetch) while this repo's
  layer table still mandates `presentation/` = `'use client'`. The
  RSC page (`page.tsx`) resolves the tab body first, then passes it as
  `children` into a thin `'use client'` `*Screen` composition component that
  does zero fetching itself — reconciles the "container-in-presentation
  would violate layer rules" tension without inventing an RSC exception.
  Reuse this shape whenever a story wants "tabs backed by real navigation,
  not client state" (Link-based `role="tablist"`, `?tab=` query param
  resolved server-side via a pure domain resolver function).
- A `hideBreadcrumb?: boolean` (or similar render-mode) flag belongs on the
  component **Props**, not the `.i-vm.ts` VM — VM is server-assembled *data*,
  render-mode switches are caller-set flags, same shelf as an existing
  `loading?: boolean` Storybook-only prop. Don't let ambiguous packet wording
  ("add to the screen/its VM") push a UI concern into the data contract.
  Extend the prop as additive/optional so old call sites are unaffected.
- Per-tab **icon** (or other purely-visual, fixed-per-variant choice) is a
  local static `Record<Tab, Icon>` lookup inside the presentational tab-strip
  component, NOT a VM field — matches `KpiTile`'s local `TILE_TONE_CLASS` map
  convention. VM carries only per-request data (id, href, active state).
- `TeacherClass.name` on the wire/mock is bare (`"10A1"`), never pre-prefixed
  with "Lớp " — confirmed by grepping `mock-teacher-class.repository.ts` and
  `vi.json`'s `teacherClasses.card.studentCount` = `"{count} học sinh"`
  (no "Lớp" baked in either). Any VM carrying a class name should stay raw;
  the "Lớp {name}" composition happens via `t()` in the presentational
  component, never pre-formatted in the RSC page.
