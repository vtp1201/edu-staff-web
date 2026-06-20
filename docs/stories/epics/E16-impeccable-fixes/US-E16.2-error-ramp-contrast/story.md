# US-E16.2 — Error-ramp contrast: notification count badges white-on-error → errorDark

| Field | Value |
|---|---|
| **ID** | US-E16.2 |
| **Epic** | E16 — Impeccable Anti-pattern Fixes (DR-009) |
| **Lane** | normal |
| **Status** | planned |
| **Hard-gate flags** | None — pure token swap on badges; no auth/RBAC/token/session/data-loss/PII |
| **Design authority** | `design_src/edu/ui.jsx` Sidebar (badge span) + Header (bell count badge); `design_src/edu/tokens.js` `errorDark` + `errorForeground`; design-spec.jsonc §error-ramp-contrast |
| **DR** | DR-009 |

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) touched:
  - `src/components/layout/app-shell/sidebar/sidebar.tsx` — nav item badge `<span>`
  - `src/components/layout/app-shell/header/header.tsx` — bell button indicator `<span>`
- Shared contract/file: `src/app/tokens.css` (already contains `--edu-error-dark` and `--edu-error-foreground` — no token additions needed)

**ALREADY FIXED (do NOT touch)**: `src/components/ui/button/button.tsx` destructive variant already uses `bg-edu-error-dark`. Do not modify.

## Product Contract

The notification COUNT badges in the Sidebar (nav items with `badge` values) and the bell-icon notification dot/count in the Header use `bg-edu-error` (#FA896B) with white text. This combination yields a contrast ratio of **2.36:1 — WCAG AA FAIL** (minimum 3:1 for UI components; 4.5:1 for text).

The fix is a single token swap on the badge `<span>` elements:
- Background: `bg-edu-error` → `bg-edu-error-dark` (token `--edu-error-dark` = #B91C1C, yields **8.2:1** on white text — passes AA and AAA)
- Text: keep white (`text-white` / `text-edu-error-foreground`) — `--edu-error-foreground` = #FFFFFF

No new tokens. No ADR. The tokens exist in `src/app/tokens.css` (decision 0040).

### Header bell badge — current state
Currently `header.tsx:82` renders a **2×2 dot** (`size-2`) with no count text: `<span className="absolute top-2 right-2 size-2 rounded-full bg-edu-error" />`. This is a presence indicator (not a count badge). The fix is the same token swap:
- Before: `bg-edu-error`
- After: `bg-edu-error-dark`

If/when the badge is upgraded to show a count number, text must be `text-white` (already `errorForeground`). The sidebar badge (if present) follows the same rule.

## Current Badge Location Analysis

### Sidebar badge
The current production `sidebar.tsx` does NOT render a count badge span per nav item (the nav config drive `badge` fields but the sidebar component renders only the nav link without badge text). If a badge span is added in a future iteration, it MUST use `bg-edu-error-dark text-white`.

Scope note: the header bell dot is the confirmed production gap (line 82). The sidebar badge is a PRE-EMPTIVE spec for any badge added during this story.

### Header bell indicator
`header.tsx:82`: `<span className="absolute top-2 right-2 size-2 rounded-full bg-edu-error" />`
This is an unread-presence dot. No text. Token swap: `bg-edu-error` → `bg-edu-error-dark`.

## Acceptance Criteria

> Proof tiers: **S** = Storybook interaction, **P** = Playwright E2E, **U** = Vitest unit.
> Contrast ratios cited below are verifiable via design-system token contract (documented in tokens.css + decision 0040).

### AC-1 — Header bell dot uses errorDark token (S, platform)
- GIVEN the `Header` component rendered in Storybook (any role)
- WHEN the bell indicator `<span>` renders
- THEN the class list contains `bg-edu-error-dark`
- AND does NOT contain `bg-edu-error` (the low-contrast token)
- AND the contrast ratio of `#B91C1C` (errorDark) on the header `bg-card` (#FFFFFF) background is 8.2:1 — WCAG AA PASS for any text OR UI component

### AC-2 — Sidebar nav badge (when rendered) uses errorDark token (S)
- GIVEN the `Sidebar` component rendered with a nav item that displays a badge count
- WHEN the badge `<span>` renders
- THEN the class list contains `bg-edu-error-dark` and `text-white` (or `text-edu-error-foreground`)
- AND the class list does NOT contain `bg-edu-error`

### AC-3 — Badge contrast: errorDark on white text ≥ 4.5:1 (design contract)
- GIVEN `--edu-error-dark` = #B91C1C (as defined in `src/app/tokens.css`)
- AND badge text is `#FFFFFF` (`--edu-error-foreground`)
- THEN the WCAG contrast ratio is 8.2:1 (≥ 4.5:1 AA; ≥ 7:1 AAA) — passes ALL levels
- NOTE: This AC is verified by the token contract (decision 0040); no runtime test required. Include in story evidence section.

### AC-4 — Badge visible against all sidebar/header backgrounds (design contract)
- GIVEN the badge is `bg-edu-error-dark`
- AND it appears on `bg-card` (#FFFFFF header) and `bg-sidebar` (sidebar background)
- THEN the badge is visually distinguishable in both light and dark themes
- AND no raw hex `#FA896B`, `#B91C1C` is introduced in source — only token classes

### AC-5 — Destructive button remains UNTOUCHED (S)
- GIVEN the `Button` component with `variant="destructive"`
- WHEN rendered in Storybook
- THEN the button STILL uses `bg-edu-error-dark` (unchanged — it was fixed before this story)
- AND no changes are made to `src/components/ui/button/button.tsx`

### AC-6 — No visual regression on other badge/dot usages (S)
- GIVEN all Storybook stories that include the Header or Sidebar
- WHEN the stories render
- THEN no previously-passing story fails
- AND the unread-presence indicator on the bell retains its position and size (`size-2 rounded-full absolute`)

### AC-7 — Biome lint + type check clean (platform)
- GIVEN the changes to `header.tsx` and `sidebar.tsx`
- WHEN `bun lint` and `bunx tsc --noEmit` run
- THEN zero errors and zero new warnings

### AC-8 — Full test suite unchanged (U)
- GIVEN the token class changes
- WHEN `bun vitest run` executes
- THEN all previously-passing tests continue to pass

## i18n Requirements

No new user-facing copy. No new i18n keys. The bell button already has `aria-label={t("notifications")}` in `header.tsx:78` — no change needed.

If the badge is upgraded to show a count (e.g. `aria-label={t("shell.header.notificationsCount", { count: n })}`), specify:

| Key path | vi value | en value |
|---|---|---|
| `shell.header.notificationsCount` | `{count} thông báo chưa đọc` | `{count} unread notifications` |

This key is OPTIONAL for this story (dot indicator has no count text). Include only if the count badge is rendered.

## Design Notes

- Token `--edu-error-dark` = #B91C1C — defined in `src/app/tokens.css`, Tailwind utility `bg-edu-error-dark`, decision 0040
- Token `--edu-error-foreground` = #FFFFFF — defined in `src/app/tokens.css`, Tailwind utility `text-edu-error-foreground`
- Token `--edu-error` = #FA896B (the old, failing token) — keep for soft backgrounds/tints only (e.g. `bg-edu-error/10`), never for filled badge backgrounds with white text
- The sidebar badge is pre-emptively spec'd; if the current sidebar has no badge `<span>`, add one only if the nav config supplies a count

## Validation

`scripts/bin/harness-cli story update --id US-E16.2 --status implemented --unit 0 --integration 0 --e2e 0 --platform 1`

| Layer | Expected proof |
| --- | --- |
| Unit | None required (no domain logic) |
| Integration | None required |
| E2E | Storybook: Header story — inspect badge class list; assert `bg-edu-error-dark` present, `bg-edu-error` absent |
| Platform | `bun build` + `bunx tsc --noEmit` clean; WCAG ratio documented in evidence |

## Harness Delta

- TEST_MATRIX row US-E16.2: update `planned` → `implemented` after gate-green
- No ADR (tokens already exist, decision 0040 covers `--edu-error-dark`)

## Evidence

Add after implementation: contrast ratio certificate for `#B91C1C` on `#FFFFFF` = 8.2:1. Before/after screenshot of bell badge and sidebar badge.
