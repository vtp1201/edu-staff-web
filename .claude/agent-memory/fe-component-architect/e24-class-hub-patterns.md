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
