# US-E16.1 — Side-stripe ban: replace border-left with bg-tint + 1px border

| Field | Value |
|---|---|
| **ID** | US-E16.1 |
| **Epic** | E16 — Impeccable Anti-pattern Fixes (DR-009) |
| **Lane** | normal |
| **Status** | planned |
| **Hard-gate flags** | None — pure visual refactor, no auth/RBAC/token/session/data-loss/PII |
| **Design authority** | `design_src/edu/ui.jsx` (Card), `design_src/edu/teacher.jsx` (live-period row), `design_src/edu/announcements.jsx` (urgent callout), `design_src/edu/messaging.jsx` (ConversationItem, ChatBubble quote), `design_src/edu/timetable.jsx` (TTCell), design-spec.jsonc §side-stripe-ban |
| **DR** | DR-009 |

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) touched:
  - `src/features/announcements/presentation/announcements-screen/announcement-card.tsx:54`
  - `src/features/staffing/presentation/…/staff-leave-request-card.tsx:159` (confirm exact path — TEST_MATRIX note)
  - `src/features/teacher/presentation/teacher-dashboard-home/teacher-dashboard-home.tsx:125`
  - `src/features/messaging/presentation/conversation-item/conversation-item.tsx:46`
  - `src/features/messaging/presentation/chat-window/chat-window.tsx:326`
  - `src/features/messaging/presentation/chat-bubble/chat-bubble.tsx:161`
  - `src/features/admin/timetable/presentation/timetable-screen/timetable-screen.tsx:404`
  - `src/features/admin/subject-catalogue/presentation/subjects-screen/subjects-screen.tsx:177-178`
- Shared contract/file: none — each file is a standalone class change

**KEEP** `src/components/layout/app-shell/sidebar/sidebar.tsx:135` — the `border-l-[3px]` active nav rail is a NAVIGATION INDICATOR and is explicitly excluded from this story per the DR-009 design review verdict.

## Product Contract

Every colored `border-left` (3 px or 4 px) used as a CARD / ROW / CALLOUT / CELL STATUS DECORATION must be replaced with:
1. A **background tint** (`pColor + '16'` for selected rows; `statusColor + '14'` for status-reason blocks; `statusColor + '15'` for urgent callouts — match the design-spec token).
2. A **1 px full border** with reduced opacity (`statusColor + '33'` or semantic Tailwind ring — match the design-spec per case).

For **selection rows** (e.g. ConversationItem active row, subjects-screen active item): remove the stripe entirely and bump the active `bg` tint up to `bg-primary/14` (from transparent). The 1 px border replaces the stripe and the tint replaces the hollow state.

The visible color meaning (urgency = error, live = success, active selection = primary, quote strip = primary) must remain identical. Only the DECORATION PATTERN changes.

## Context — Per-file Before / After

### 1. announcement-card.tsx:54
- BEFORE: `isUrgent && "border-l-4 border-edu-error"` (4 px left stripe, no tint)
- AFTER: `isUrgent && "border border-edu-error/30 bg-edu-error/10"` (full 1 px border, soft tint)
- Design ref: `design_src/edu/announcements.jsx` NotificationPreview / SonnerToast pattern — urgent callout uses `error + '14'` bg + `error + '33'` border.

### 2. staff-leave-request-card.tsx:159 (reason block)
- BEFORE: inline `borderLeft: '3px solid <statusColor>'` on the reason callout block
- AFTER: `background: statusColor + '14'; border: '1px solid ' + statusColor + '33'` — full border + tint
- Design ref: `design_src/edu/staff-leave.jsx` RequestCard reason block.

### 3. teacher-dashboard-home.tsx:125 (live-period row)
- BEFORE: `border-l-[3px] px-6 py-3` on the live row container, no bg tint
- AFTER: Remove `border-l-[3px]`; add `bg-edu-success/14 border border-edu-success/30` — the whole row carries the status tint
- Design ref: `design_src/edu/teacher.jsx` TeacherDashboardHome live-period row comment: "Live period marked by a soft success tint on the whole row (no side-stripe)."

### 4. conversation-item.tsx:46 (active row)
- BEFORE: `"flex w-full items-center gap-3 border-l-[3px] px-4 py-3 text-left transition-colors"` (always renders the 3 px stripe slot — active state sets its color, inactive renders transparent but stripe space remains)
- AFTER: Remove `border-l-[3px]`; active state: `bg-primary/14`; hover state: `hover:bg-muted`; selected text: `text-foreground font-semibold` (no stripe at all)
- Design ref: `design_src/edu/messaging.jsx` ConversationItem active row uses `pColor + '14'` bg, no stripe.

### 5. chat-window.tsx:326 (reply/quote strip)
- BEFORE: `"flex items-center gap-2 border-border border-t border-l-4 border-l-primary bg-card px-4 py-2"` (4 px left primary stripe on reply preview)
- AFTER: `"flex items-center gap-2 rounded border border-primary/30 bg-primary/10 px-4 py-2"` — full 1 px border + tint, rounded corners
- Design ref: `design_src/edu/messaging.jsx` ReplyStrip: full border + `T.primary + '14'` bg.

### 6. chat-bubble.tsx:161 (quote strip in received bubble)
- BEFORE: `!isMe && "border-primary border-l-4 bg-edu-bg"` — 4 px primary stripe on quoted content inside received bubble
- AFTER: `!isMe && "rounded border border-primary/30 bg-primary/10"` — same semantic meaning, no stripe
- Design ref: `design_src/edu/messaging.jsx` ChatBubble quoted strip pattern.

### 7. timetable-screen.tsx:404 (TTCell)
- BEFORE: `"relative min-h-[76px] w-full rounded-lg border-l-[3px] px-2.5 py-2 text-left transition-shadow"` — stripe for status cells (e.g. `border-l-edu-error-text` for conflict)
- AFTER: Remove `border-l-[3px]` from base; conflict cell: `border border-edu-error-text/40 bg-edu-error/10 ring-1 ring-edu-error-text/20`; cells already have `rounded-lg` + `border` via the row above — ensure full-border ring replaces stripe
- Design ref: `design_src/edu/timetable.jsx` TTCell conflict / filled variants.

### 8. subjects-screen.tsx:177-178 (active subject row)
- BEFORE: `"border-l-[3px] border-primary bg-primary/12 font-bold text-foreground"` (active) / `"border-l-[3px] border-transparent text-foreground hover:bg-muted"` (inactive — transparent stripe slot persists)
- AFTER: Active: `"bg-primary/14 font-bold text-foreground"`; Inactive: `"text-foreground hover:bg-muted"`. Remove all `border-l-[3px]` — use ring or full border on active only if design-spec requires it (check `design_src/edu/teacher.jsx` chapter list pattern — uses `pColor + '14'` bg + `pColor + '33'` border, no stripe).
- Design ref: `design_src/edu/teacher.jsx` LessonPlayer chapter list active row.

## Acceptance Criteria

> Proof tiers: **S** = Storybook interaction, **U** = Vitest unit (if pure logic), **P** = Playwright E2E.
> All visual-equivalence ACs are verifiable at **S** tier (inspect rendered classes/styles in play()).

### AC-1 — Announcement card: stripe removed, tint + border present (S)
- GIVEN an `AnnouncementCard` rendered with `isUrgent = true`
- WHEN the component renders
- THEN the card container has class `border` and `bg-edu-error/10` (or equivalent token tint) and does NOT have any class matching `/border-l-\[4px\]/` or `/border-l-4/`
- AND the border color class is `border-edu-error/30` (full perimeter, not left-only)

### AC-2 — Announcement card: non-urgent card has no side-stripe (S)
- GIVEN an `AnnouncementCard` rendered with `isUrgent = false`
- WHEN the component renders
- THEN no class matching `border-l-4`, `border-l-[3px]`, or `border-l-[4px]` is present on the card

### AC-3 — Staff leave reason block: stripe removed, tint + border (S)
- GIVEN a `StaffLeaveRequestCard` rendered with a non-empty reason field
- WHEN the reason callout block renders
- THEN no `border-l-*` class or `borderLeft` style is present on the reason container
- AND the reason container has a full border (all sides) and a background tint matching the status color at low opacity

### AC-4 — Teacher dashboard live-period row: success tint covers full row, no stripe (S)
- GIVEN the `TeacherDashboardHome` with a live period in today's schedule
- WHEN the live period row renders
- THEN the row container has `bg-edu-success/14` (or `bg-edu-success/10`) and a `border-edu-success/30` (full border)
- AND no class `border-l-[3px]` or `border-l-3` is present on the row

### AC-5 — Conversation item: active row has bg tint, no left stripe slot (S)
- GIVEN a `ConversationItem` rendered with `isActive = true`
- WHEN the item renders
- THEN the root element class list does NOT contain `border-l-[3px]` or `border-l-3`
- AND the root element has `bg-primary/14` or equivalent token expressing active selection
- GIVEN a `ConversationItem` rendered with `isActive = false`
- THEN the root element has no `border-l-*` class (no ghost stripe slot)

### AC-6 — Reply strip in chat-window: full border + tint, no stripe (S)
- GIVEN the `ChatWindow` reply-preview bar is rendered (reply mode active)
- WHEN the reply strip renders
- THEN the strip container does NOT have `border-l-4` or `border-l-[4px]`
- AND has `border border-primary/30 bg-primary/10` (or token equivalents)
- AND corners are rounded (`rounded` or `rounded-md`)

### AC-7 — Chat bubble quote strip: full border + tint, no stripe (S)
- GIVEN a received `ChatBubble` (`isMe = false`) with a quoted message
- WHEN the quote container renders
- THEN no `border-l-4` or `border-l-primary` class is present on the quote block
- AND `border border-primary/30 bg-primary/10` (or token equivalents) is present

### AC-8 — Timetable cell: conflict cell uses ring/border, no left stripe (S)
- GIVEN a `TimetableScreen` with a conflict cell rendered
- WHEN the cell renders
- THEN the cell root does NOT have `border-l-[3px]` or `border-l-3`
- AND the conflict variant applies `border-edu-error-text/40` and `bg-edu-error/10` on all sides

### AC-9 — Subjects screen active row: bg tint, no stripe slot (S)
- GIVEN the `SubjectsScreen` with a subject selected (active row)
- WHEN the active row renders
- THEN no class `border-l-[3px]` or `border-l-3` is present
- AND active row has `bg-primary/14` or equivalent tint
- GIVEN an inactive row
- THEN no `border-l-*` class is present (the transparent stripe slot is gone)

### AC-10 — Sidebar active nav rail: UNTOUCHED (S)
- GIVEN the `Sidebar` with an active nav item
- WHEN the nav link renders
- THEN the `border-l-[3px]` class on the active nav `<Link>` REMAINS
- AND NO changes are made to `src/components/layout/app-shell/sidebar/sidebar.tsx`
- [Rationale: sidebar active rail is a NAVIGATION INDICATOR, not a card decoration — explicitly excluded by DR-009 design review]

### AC-11 — Visual color meaning preserved across all 8 locations (S)
- GIVEN each affected component rendered in its "active/urgent/live/selected/quoted" state
- WHEN the component renders AFTER the fix
- THEN the color role is identical to BEFORE:
  - urgent = edu-error
  - live/active selection = edu-success / primary
  - reply/quote = primary
  - conflict = edu-error-text
- AND the status is NOT conveyed by color alone — an icon or label accompanies it where applicable

### AC-12 — No raw color introduced (S, build gate)
- GIVEN the diff after all 8 file changes
- WHEN `bun lint` and `bun build` run
- THEN zero Biome errors
- AND no hex literal (e.g. `#FA896B`, `#13DEB9`) is added to any of the 8 files
- AND `bunx tsc --noEmit` reports zero type errors

### AC-13 — Existing test suite remains green (U)
- GIVEN the 8 file changes applied
- WHEN `bun vitest run` executes
- THEN all previously-passing tests continue to pass (no regression)

## i18n Requirements

No new user-facing copy is introduced by this story. No new i18n keys are needed.

## Design Notes

- Commands: none (pure visual refactor)
- API: none
- New tokens: none — all token classes used already exist in `src/app/tokens.css`
- Domain rules: none
- UI surfaces: card, list-row, callout, timetable-cell — class-level changes only

## Validation

`scripts/bin/harness-cli story update --id US-E16.1 --status implemented --unit 0 --integration 0 --e2e 0 --platform 1`

| Layer | Expected proof |
| --- | --- |
| Unit | None required (no domain logic) |
| Integration | None required |
| E2E | Storybook interaction stories for all 8 affected components — inspect class lists; verify stripe-absence and tint-presence in `play()` assertions |
| Platform | `bun build` + `bunx tsc --noEmit` clean; `bun lint` zero errors |

## Harness Delta

- TEST_MATRIX row US-E16.1: update status from `planned` → `implemented` with platform proof after gate-green
- No ADR needed (tokens already exist; no new design-system decision)

## Evidence

Add after implementation: screenshot diff showing stripe → tint+border for each of the 8 locations. Storybook test run report.
