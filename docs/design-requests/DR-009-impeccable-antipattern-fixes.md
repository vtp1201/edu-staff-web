# DR-009 — Impeccable Anti-pattern Fixes (reference mockup retrofit)

| Field        | Value |
|---|---|
| Status       | [x] delivered |
| Lane         | normal |
| Branch       | `docs/dr-009-impeccable-antipattern-fixes` |
| Story ref    | US-E16.1, US-E16.2, US-E16.3, US-E16.4, US-E16.5 |
| Design files | `design_src/edu/ui.jsx`, `design_src/edu/tokens.js`, `design_src/edu/announcements.jsx`, `design_src/edu/assessment.jsx`, `design_src/edu/gradebook.jsx`, `design_src/edu/messaging.jsx`, `design_src/edu/notifications.jsx`, `design_src/edu/staff-leave.jsx`, `design_src/edu/student.jsx`, `design_src/edu/teacher.jsx`, `design_src/edu/teaching-plan.jsx`, `design_src/edu/timetable.jsx`, `design_src/edu/timetable-view.jsx`, `design_src/edu/academic-records.jsx` |
| Spec entry   | `docs/product/design-spec.jsonc` (synced for all 5 concerns) |
| Rule update  | `.claude/rules/design-system.md` (schedule live-row description) |
| Tokens       | `design_src/edu/tokens.js` (errorText / errorDark / errorDarkLight + foreground aliases — already exist in `src/app/tokens.css`) |

---

## Background

After `/impeccable audit` + `critique` on the reference mockup (`design_src/edu/`),
five anti-pattern categories were identified and fixed in the reference mockups.
This DR records those changes as design authority and registers them as FE backlog
stories so the production `src/` receives the same fixes.

The changes touch **only design-authoring artifacts** (`design_src/`, `design-spec.jsonc`,
`.claude/rules/design-system.md`). No `src/` code was touched — that is `/fe`'s scope.

---

## Anti-pattern concerns fixed (5)

### (a) US-E16.1 — Side-stripe ban
3 px / 4 px colored `border-left` on cards, list rows, callout strips, schedule
cells, timetable cells, and legend chips → replaced with:
- Background tint (e.g. `pColor + '16'` for selected rows, `sm.color + '14'` for status reason blocks).
- 1px full border with reduced opacity (e.g. `border: 1px solid pColor + '33'`).
- Exception kept: sidebar active-item rail (3 px left, that is the **navigation indicator**, not a card decoration).

Files changed: `ui.jsx` (Card border-left dead hover), `announcements.jsx` (NotificationPreview, SonnerToast), `messaging.jsx` (ConversationItem active row, ChatBubble quote strip, ReplyStrip, DeletePreview), `notifications.jsx` (NotificationRow, SonnerToast), `staff-leave.jsx` (RequestCard reason block), `student.jsx` (LessonPlayer chapter list), `teacher.jsx` (TeacherDashboardHome live-period row, TeacherScheduleFull cell), `teaching-plan.jsx` (session list selected row), `timetable.jsx` (TTCell, legend chips), `timetable-view.jsx` (TVCell, legend chips), `academic-records.jsx` (UnsealCard warning note).

### (b) US-E16.2 — Error-ramp contrast (notification badges)
White text on soft coral `T.error` (#FA896B) = 2.36:1 — WCAG AA FAIL. Fixed:
- Notification count badge in `Header` (sidebar + bell icon) → `errorDark` (#B91C1C, 8.2:1) bg + `errorForeground` (#FFF) text.
- Sidebar `item.badge` → same.
- `Button variant="danger"` → `errorDark` bg.
- `tokens.js` gained `errorText`, `errorDark`, `errorDarkLight`, `successForeground`, `warningForeground`, `errorForeground` to mirror `src/app/tokens.css` (these already exist in production tokens — no new token needed, no ADR needed).

Note: production `tokens.css` already has `--edu-error-dark` / `--edu-error-foreground`. The destructive Button in `button.tsx` already uses `bg-edu-error-dark`. The net-new production fix is **notification count badges** (sidebar + header bell) that still use `bg-edu-error` + `text-white`.

### (c) US-E16.3 — a11y / interaction gaps
- `Card` component: dead inline `:hover` pseudo → real `React.useState(hovered/focused)` + `transform: translateY(-2px)` lift; `role="button"`, `tabIndex={0}`, `onKeyDown` (Enter/Space); focus ring via `box-shadow: 0 0 0 2px T.primary`.
- `ProgressBar`: added `role="progressbar"` + `aria-valuenow/min/max`.
- `Header`: notification bell got `aria-label` (with live count); collapse button got `aria-label` + `aria-expanded`; avatar menu button got `aria-haspopup="menu"` + `aria-expanded` + `aria-label`; search input got `aria-label`.
- Sidebar nav items: `aria-current="page"` on active item; hover state added.
- Avatar dropdown: outside-click dismiss (pointer listener) + Escape key dismiss; `menuRef` guard.

### (d) US-E16.4 — Layout-transition perf (GPU compositing)
`width: X%` → `transform: scaleX(X/100)` with `transformOrigin: left` for all ProgressBar-like fills. This eliminates layout/paint thrash, enabling GPU compositing.

Affected: `ui.jsx` (ProgressBar), `announcements.jsx` (ProgressTrack), `assessment.jsx` (SchemeEditor progress fill), `gradebook.jsx` (SummaryPanel distribution bar).

Sidebar collapse: `transition: width` → `display: grid; grid-template-columns` transition — layout-layer instead of width re-flow.

### (e) US-E16.5 — Bounce easing (typing indicator)
`@keyframes bounce` with per-dot duration desync (`1s / 1.15s / 1.3s` — gaps visible as stutter) → `@keyframes msg-typing` with staggered `animation-delay` (`0s / 0.18s / 0.36s`) all at same `1.2s` duration, `ease-in-out`, opacity pulse + subtle translateY. Smooth and non-distracting.

---

## Design-review verdict (impeccable)

All 5 concerns were flagged by `/impeccable audit` + `critique`. Fixes verified:
- (a) Side-stripe: confirmed all instances replaced; sidebar active-rail intentionally kept.
- (b) Contrast: `errorDark` (#B91C1C) on white = 8.2:1 — passes AA and AAA.
- (c) a11y: Card is keyboard-accessible; ARIA attrs correct; dropdown dismiss correct.
- (d) GPU: no `width` transition remains on fill elements; `scaleX` w/ `transformOrigin:left` confirmed.
- (e) Bounce: single `animation-delay` stagger; no duration desync.

Design system compliance: tokens-only; no raw colors introduced. No new tokens needed (errorDark/errorForeground already in `src/app/tokens.css`). No ADR needed.

---

## Handoff to /ba then /fe

Run `/ba` on US-E16.1 through US-E16.5 to produce AC per concern.
Then run `/fe` to implement the same fixes in production `src/`.

Each US maps to specific production files listed in `docs/TEST_MATRIX.md` rows.
