# US-E16.3 — a11y / interaction gaps: Card keyboard nav, ProgressBar ARIA, icon-button labels, dropdown dismiss, sidebar aria-current

| Field | Value |
|---|---|
| **ID** | US-E16.3 |
| **Epic** | E16 — Impeccable Anti-pattern Fixes (DR-009) |
| **Lane** | normal |
| **Status** | planned |
| **Hard-gate flags** | None — WCAG 2.1 AA hardening; no auth/RBAC/token/session/data-loss/PII |
| **Design authority** | `design_src/edu/ui.jsx` Card / ProgressBar / Sidebar / Header; design-spec.jsonc §a11y-interaction-gaps; `.claude/rules/accessibility.md` |
| **DR** | DR-009 |

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) touched:
  - `src/components/ui/card/` — Card primitive (interactive variant)
  - `src/components/ui/progress/progress.tsx` — ProgressBar ARIA attrs
  - `src/components/layout/app-shell/header/header.tsx` — bell button, avatar menu button, search input, avatar menu outside-click + Escape dismiss
  - `src/components/layout/app-shell/sidebar/sidebar.tsx` — `aria-current="page"` already present at line 129; confirm collapse toggle aria
- Shared contract/file: `src/components/ui/card/` (primitive shared across features — any fix here propagates globally)

## Product Contract

Five distinct gaps must be closed:

### Gap A — Interactive Card: no keyboard access, dead hover
When a `Card` component receives an `onClick` prop (interactive), it must behave as a button:
- `role="button"`, `tabIndex={0}`
- `onKeyDown`: Enter or Space triggers the click (same as the mockup's `e.key === 'Enter' || e.key === ' '`)
- Real React state hover/focus (`useState`) driving `transform: translateY(-2px)` lift + shadow — not a dead CSS pseudo-class
- Visible focus ring: `box-shadow: 0 0 0 2px var(--edu-primary)` (or equivalent Tailwind `focus-visible:ring-2 focus-visible:ring-primary`)
- `outline: none` must be paired with the ring (never naked `outline: none`)

### Gap B — ProgressBar: no ARIA
The `<Progress>` component (shadcn primitive in `src/components/ui/progress/progress.tsx`) uses `ProgressPrimitive.Root` from Radix, which sets `role="progressbar"` automatically. However, `aria-valuenow`, `aria-valuemin`, `aria-valuemax` propagation via `value` prop must be verified. The custom inline progress bars in feature files (grade-distribution-chart, conduct-summary-card, announcement-card, school-setup-screen) that do NOT use the shadcn `<Progress>` component must be audited and fixed if they lack ARIA attributes.

### Gap C — Icon-only button aria-labels
The following icon-only interactive elements must have a descriptive `aria-label` in Vietnamese (primary) with the next-intl key so en mirrors it:

| Element | Location | aria-label (vi) | i18n key |
|---|---|---|---|
| Bell button (header) | `header.tsx:75` | Already has `t("notifications")` — VERIFY it is descriptive | `shell.header.notifications` |
| Sidebar collapse toggle | `sidebar.tsx:88-106` | "Thu gọn thanh điều hướng" (collapse) / "Mở rộng thanh điều hướng" (expand) | `shell.nav.collapseSidebar` / `shell.nav.expandSidebar` |
| Avatar menu button | `header.tsx:88-99` | Must have explicit `aria-label` — current is `aria-label="User menu"` (English hardcode, not i18n) | `shell.header.userMenu` |
| Search input | `header.tsx:62-67` | Already has `placeholder` but no `aria-label` — add `aria-label={t("searchPlaceholder")}` | `shell.header.searchPlaceholder` |

The sidebar collapse toggle currently uses `aria-pressed` (line 92 of sidebar.tsx). Per mockup the correct attribute is `aria-expanded` (expanded/collapsed state of a region) — if `aria-pressed` was chosen intentionally, no change needed; if it's a gap, fix to `aria-expanded={!collapsed}`.

### Gap D — Dropdown (avatar menu) dismiss
The header avatar `DropdownMenu` (Radix `DropdownMenuContent`) must:
- Close when the user clicks outside the menu (`onPointerDownOutside` / `onInteractOutside` — Radix handles this by default; VERIFY it works)
- Close on `Escape` key — Radix `DropdownMenu` handles this natively; VERIFY
- `DropdownMenuTrigger` must have `aria-haspopup="menu"` (Radix sets this automatically via `asChild` + `Button`; VERIFY)
- When menu opens, `aria-expanded="true"` on trigger; when closed, `aria-expanded="false"` (Radix handles via `open` state)

If Radix already handles all of the above (likely), the only remaining gap is the `aria-label` on the trigger button (Gap C above) and the i18n fix.

### Gap E — Sidebar nav aria-current
`sidebar.tsx:129` already sets `aria-current={active ? "page" : undefined}`. VERIFY this propagates correctly and screen-reader announces "current page" in the active link. If already correct, document as verified (no code change needed).

## Acceptance Criteria

> Proof tiers: **S** = Storybook interaction (play()), **U** = Vitest unit, **P** = Playwright.
> All ARIA attribute checks are verifiable at S tier via `within(canvas).getByRole(...)` assertions.

### Gap A — Interactive Card keyboard access

#### AC-1 — Card with onClick gets role="button" and tabIndex=0 (S)
- GIVEN a `Card` rendered with an `onClick` prop
- WHEN the DOM is inspected
- THEN `role="button"` is present on the card element
- AND `tabIndex="0"` is present

#### AC-2 — Card: Enter key triggers onClick (S)
- GIVEN a `Card` rendered with an `onClick` prop and the card has focus
- WHEN the user presses the `Enter` key
- THEN `onClick` is called exactly once

#### AC-3 — Card: Space key triggers onClick and prevents page scroll (S)
- GIVEN a `Card` rendered with an `onClick` prop and the card has focus
- WHEN the user presses the `Space` key
- THEN `onClick` is called exactly once
- AND `event.preventDefault()` was called (no page scroll)

#### AC-4 — Card: visible focus ring appears on keyboard focus (S)
- GIVEN a `Card` rendered with an `onClick` prop
- WHEN the card receives keyboard focus (Tab navigation or programmatic `.focus()`)
- THEN a focus ring of `2px` is visible (box-shadow or `outline` — not suppressed with naked `outline: none`)
- AND the ring color is `var(--edu-primary)` or the `ring-primary` Tailwind token

#### AC-5 — Card: hover lift is real React state, not dead CSS pseudo (S)
- GIVEN an interactive `Card`
- WHEN `onMouseEnter` fires
- THEN `transform: translateY(-2px)` and elevated box-shadow are applied
- WHEN `onMouseLeave` fires
- THEN the card returns to resting position and shadow

#### AC-6 — Non-interactive Card (no onClick): no role, no tabIndex, no keyboard handler (S)
- GIVEN a `Card` rendered WITHOUT an `onClick` prop
- WHEN the DOM is inspected
- THEN `role` is NOT "button"
- AND `tabIndex` is NOT 0 or present
- AND no `onKeyDown` handler is wired

### Gap B — ProgressBar ARIA

#### AC-7 — shadcn Progress: aria-valuenow reflects current value (S)
- GIVEN the `<Progress>` component rendered with `value={42}`
- WHEN the DOM is inspected
- THEN the root element has `role="progressbar"`, `aria-valuenow="42"`, `aria-valuemin="0"`, `aria-valuemax="100"`
- NOTE: Radix `ProgressPrimitive.Root` sets these from the `value` prop automatically; verify the Radix version in use propagates correctly

#### AC-8 — Custom progress bars in feature files: ARIA attributes present (S)
For each custom progress bar div that does NOT use the shadcn `<Progress>` component:
- `grade-distribution-chart.tsx:46` — the bar fill div's parent must have `role="progressbar"` with `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`, and an `aria-label` describing what is measured (e.g. the grade band label)
- `conduct-summary-card.tsx:107` — the conduct points progress container must have `role="progressbar"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-label` in Vietnamese (i18n key)
- `announcement-card.tsx:114` — the read-receipt progress bar must have `role="progressbar"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-label` naming the progress (i18n key)
- `school-setup-screen.tsx:293` — the onboarding progress bar must have `role="progressbar"` attrs
- GIVEN any of these bars rendered with a known `value`
- THEN the container has the full progressbar ARIA set and a non-empty `aria-label`

#### AC-9 — Screen reader can announce progress bar value (S)
- GIVEN the `Progress` component with `value={75}` and `aria-label="Tiến độ đọc thông báo"`
- WHEN a screen reader encounters the element
- THEN it announces: "Tiến độ đọc thông báo: 75%" (or equivalent SR output)
- [Proof: inspect the rendered ARIA tree in Storybook a11y panel]

### Gap C — Icon-only button aria-labels

#### AC-10 — Bell button has i18n aria-label (S)
- GIVEN the `Header` component
- WHEN the bell `<Button>` renders
- THEN `aria-label` is set from the `t("notifications")` i18n key (not a hardcoded string)
- AND the label is descriptive: vi = "Thông báo", en = "Notifications"

#### AC-11 — Sidebar collapse toggle has aria-label and aria-expanded (S)
- GIVEN the `Sidebar` with `onToggle` prop, `collapsed = false`
- WHEN the toggle button renders
- THEN `aria-label` is set from `t("collapseSidebar")` (vi: "Thu gọn thanh điều hướng", en: "Collapse sidebar")
- AND `aria-expanded="true"` is present (sidebar is expanded)
- GIVEN `collapsed = true`
- THEN `aria-label` is set from `t("expandSidebar")` (vi: "Mở rộng thanh điều hướng", en: "Expand sidebar")
- AND `aria-expanded="false"` is present

#### AC-12 — Avatar menu button has i18n aria-label (S)
- GIVEN the `Header` with a user name
- WHEN the avatar `<Button>` trigger renders
- THEN `aria-label` is set from an i18n key (not hardcoded "User menu")
- AND the value is vi: "Menu người dùng", en: "User menu"
- Key: `shell.header.userMenu`

#### AC-13 — Search input has aria-label (S)
- GIVEN the `Header` search input
- WHEN the `<Input>` renders
- THEN `aria-label={t("searchPlaceholder")}` or a dedicated key is set (vi: "Tìm kiếm...", en: "Search...")
- NOTE: `placeholder` alone does not meet WCAG 1.3.1 (placeholder disappears on focus)

### Gap D — Avatar dropdown dismiss

#### AC-14 — Dropdown closes on outside click (S)
- GIVEN the avatar `DropdownMenu` is open (trigger clicked once)
- WHEN the user clicks outside the menu area
- THEN the dropdown closes and the trigger `aria-expanded` reflects `false`

#### AC-15 — Dropdown closes on Escape key (S)
- GIVEN the avatar `DropdownMenu` is open
- WHEN the user presses `Escape`
- THEN the dropdown closes
- AND focus returns to the trigger button

#### AC-16 — Dropdown trigger has aria-haspopup and aria-expanded (S)
- GIVEN the avatar button (DropdownMenuTrigger)
- WHEN the dropdown is closed
- THEN `aria-haspopup="menu"` and `aria-expanded="false"` are present (Radix sets these automatically — verify)
- WHEN the dropdown is open
- THEN `aria-expanded="true"` is present
- AND dropdown items have `role="menuitem"` (Radix sets this on `DropdownMenuItem`)

### Gap E — Sidebar aria-current

#### AC-17 — Active nav link has aria-current="page" (S)
- GIVEN the `Sidebar` with a nav item matching the current `pathname`
- WHEN the `<Link>` for that item renders
- THEN `aria-current="page"` is present
- AND no other nav link has `aria-current` set

#### AC-18 — Inactive nav links have no aria-current (S)
- GIVEN the `Sidebar` with multiple nav items and one active
- WHEN the DOM is inspected
- THEN exactly ONE element has `aria-current="page"`
- AND all other `<Link>` elements have no `aria-current` attribute (or `aria-current={undefined}`)

### General gates

#### AC-19 — Keyboard tab order follows visual reading order (S, manual)
- GIVEN the `Header` and `Sidebar` rendered in Storybook
- WHEN a user presses Tab from the first interactive element
- THEN focus moves: sidebar toggle → nav items (top to bottom) → [header] search → bell → theme-toggle → avatar trigger (no traps, no jumps)

#### AC-20 — No naked outline: none (build review)
- GIVEN the diff for this story
- WHEN reviewed by `fe-tech-lead-reviewer`
- THEN no occurrence of `outline: none` or `outline-none` exists without a companion `focus-visible:ring-*` or `box-shadow` focus ring

#### AC-21 — Touch targets ≥ 44×44 px (S)
- GIVEN all icon-only buttons in Header and Sidebar after fix
- WHEN rendered and measured
- THEN each button's click area is at least 44×44 CSS px (use `size-11` or `min-w-[44px] min-h-[44px]`)

#### AC-22 — Full test suite unchanged (U)
- GIVEN all changes
- WHEN `bun vitest run` executes
- THEN all previously-passing tests pass

#### AC-23 — Biome and tsc clean (platform)
- GIVEN all changes
- WHEN `bun lint` and `bunx tsc --noEmit` run
- THEN zero errors

## i18n Keys Required

The FE team must add these keys to `src/bootstrap/i18n/messages/vi.json` and `src/bootstrap/i18n/messages/en.json`:

| Key path | vi value | en value | Notes |
|---|---|---|---|
| `shell.header.userMenu` | `Menu người dùng` | `User menu` | aria-label for avatar button |
| `shell.header.notificationsLabel` | `Thông báo` | `Notifications` | Replace hardcoded `"User menu"` with i18n |
| `shell.nav.expandSidebar` | `Mở rộng thanh điều hướng` | `Expand sidebar` | Already in sidebar.tsx — verify key exists |
| `shell.nav.collapseSidebar` | `Thu gọn thanh điều hướng` | `Collapse sidebar` | Already in sidebar.tsx — verify key exists |

For custom progress bars in feature files, add aria-label keys in the feature's i18n namespace:

| Key path | vi value | en value |
|---|---|---|
| `grades.distribution.bandProgressLabel` | `Phân phối {band}` | `{band} distribution` |
| `discipline.conductProgress.label` | `Điểm hạnh kiểm: {points}/{max}` | `Conduct score: {points}/{max}` |
| `announcements.readProgressLabel` | `Đã đọc {pct}%` | `{pct}% read` |
| `admin.schoolSetup.onboardingProgressLabel` | `Tiến trình thiết lập: {pct}%` | `Setup progress: {pct}%` |

NOTE: The FE team adds these keys. This spec only defines what they should be.

## Design Notes

- No new tokens needed
- All ARIA attributes are purely additive — no visual change
- Radix shadcn handles most dropdown ARIA automatically; the primary gap is the `aria-label` i18n fix on icon-only buttons
- Card interactive variant: add `role="button"` + `tabIndex={0}` + `onKeyDown` + focus ring to the `src/components/ui/card/index.ts` primitive (decision: the Card primitive is modified, not a feature-level wrapper — per component-organization.md rule)

## Validation

`scripts/bin/harness-cli story update --id US-E16.3 --status implemented --unit 0 --integration 0 --e2e 1 --platform 1`

| Layer | Expected proof |
| --- | --- |
| Unit | None required for ARIA changes |
| Integration | None required |
| E2E | Storybook interaction stories: Card (interactive/non-interactive) stories cover AC-1–6; Header story covers AC-10,12,13,14,15,16; Sidebar story covers AC-11,17,18; ProgressBar stories cover AC-7 |
| Platform | `bun build` + `bunx tsc --noEmit` clean; `bun lint` clean; a11y panel in Storybook shows zero critical violations |

## Harness Delta

- TEST_MATRIX row US-E16.3: `planned` → `implemented` after gate-green
- No ADR (no new design-system decision)

## Evidence

Add after implementation: Storybook a11y panel screenshot showing zero violations. Screen-reader test log for keyboard navigation flow through Header + Sidebar.
