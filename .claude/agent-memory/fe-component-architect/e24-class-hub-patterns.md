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

US-E24.9 (timetable tab: class week + period-log/prep + homeroom daily log):
- **Existing full-page screen component ≠ reusable inline sub-component.**
  `features/class-log/presentation/class-log-screen/components/class-log-
  entry-form.tsx` looked like an obvious reuse candidate for a new inline
  "daily log strip" inside a day-card, but it renders its OWN back-button +
  `max-w-2xl` centered card chrome — a screen body, not an embeddable strip.
  Decision: write a NEW thin feature-local component that binds to the SAME
  exported Server Actions (`createEntryAction`/`submitEntryAction`/
  `reviseEntryAction`, imported cross-route) and the SAME status-tone map
  (`status-tone.ts`), rather than forking the use-case/repo OR fighting the
  existing component's chrome. Rule of thumb: reuse the *action bindings and
  status/tone maps* verbatim; a component is only a reuse candidate if it has
  no opinion about its own page-level chrome (back button, page title).
- **Two components can look like "the same feature" but need separate
  components when the STATE MODEL differs**, not just the visual style —
  confirmed again here for week-nav: `timetable-view/week-nav.tsx` is client
  `useState` offset-based, this tab's own AC wants `?week=YYYY-Www` URL-driven
  (server-resolved). Built a second, local `class-timetable-week-nav.tsx`
  (pure Server Component, two `<Link>`s) instead of extending/forking the
  existing one — same reasoning as US-E24.8's Link-based tabs vs `WeekNav`'s
  buttons (see above), now a repeated-twice pattern worth remembering as a
  general rule: **state-model mismatch (URL-driven vs local useState) is a
  legitimate reason for a second component**, distinct from a visual variant
  that should just be a prop.
- **Per-row/per-slot fan-out state (own/live/logged/prepped) belongs on the
  row's own VM as pre-computed booleans/entities**, never re-derived inside
  the presentational row component — the RSC page runs the domain selectors
  (`isMySlot`, `isPeriodLive`, key-lookup helpers) ONCE and hands the row a
  flat `PeriodRowVm`. Keeps presentational components at zero business logic
  even when the fan-out is per-item across a list, not just per-screen.
- **A row/card's own "which sub-form is open" toggle state stays a local
  `useState` inside that row**, not lifted to the tab — confirmed as the
  right call again (mirrors US-E24.8's tab-body-as-children pattern of
  keeping UI-only state as local as possible); only lift if a cross-row
  constraint ("only one open at a time") becomes an actual AC — YAGNI until
  then.

US-E24.11 (homeroom tab: 3 independent cards, Promise.allSettled):
- **Per-card error isolation belongs at the tab-container level, not inside
  each card's VM.** Rather than adding `errorKey?` to every card's VM type,
  the page maps each `PromiseSettledResult` into a `HomeroomCardResult<T> =
  {ok:true,data:T} | {ok:false,retryHref}` union; the container switches on
  `.ok` and renders ONE shared `HomeroomCardError` (feature-local, 3
  call-sites) instead of the real card. Keeps success-shape VMs pure — no
  optional error field threaded through N places.
- **Zero-client-JS card retry**: a plain `<Button asChild><Link href={same
  tab url}>` re-navigation re-runs the RSC fetch — no client wrapper needed
  just to give a failed read-only card a "retry" affordance. Only add a
  client boundary when the card ALSO has real interactivity (mutations).
- **Promotion copy-check before adding a `title`/`description` prop**: when a
  2nd screen needs a promoted dialog (`reject-leave-dialog.tsx` → `components/
  shared/`), check both screens' actual copy needs FIRST — if identical,
  promote with zero prop widening; only add a variance prop if the 2nd screen
  genuinely needs different text. Don't pre-emptively generalize.
- **Inbox-style list cards remove the item on success** (not flip its status
  in place) when the card's whole purpose is "pending items only" — contrast
  with a full-history table (`leave-tab.tsx`) that flips status and keeps the
  row. Same underlying entity/action, different card semantics, deliberate
  divergence documented at the card's prop-interface, not a copy-paste bug.
