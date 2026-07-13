---
name: token-contrast-ratios
description: Resolved WCAG contrast ratios for edu-* design tokens against common surfaces (light mode)
metadata:
  type: reference
---

All values are WCAG relative luminance contrast ratios, light mode only.
Surface tokens resolved: bg=#f5f7fa (--edu-bg), card=#fff (--edu-card).

## Text on surfaces
| Token pair | Ratio | WCAG AA (4.5 normal / 3 large) |
|---|---|---|
| --edu-text-primary (#2a3547) on bg #f5f7fa | 11.52:1 | PASS |
| --edu-text-secondary (#5a6a85) on bg #f5f7fa | 5.10:1 | PASS |
| --edu-text-secondary (#5a6a85) on white | 5.48:1 | PASS |
| --edu-text-muted (#8898a9) on bg #f5f7fa | 2.75:1 | FAIL — use text-secondary |
| --edu-text-muted (#8898a9) on white | 2.95:1 | FAIL — use text-secondary |

## Status colors as text
| Token pair | Ratio | Notes |
|---|---|---|
| --edu-warning (#ffae1f) on --edu-warning-light (#fef5e5) | 1.71:1 | FAIL — use --edu-warning-foreground (#2a3547) |
| --edu-warning-foreground (#2a3547) on --edu-warning-light | 11.42:1 | PASS |
| --edu-success (#13deb9) on blended badge bg (~#ccf7f0) | 1.49:1 | FAIL — use text-edu-text-primary |
| --edu-success-foreground (#fff) on --edu-success (#13deb9) | 1.72:1 | FAIL — never use white on success |
| --edu-error (#fa896b) on error/10 blended bg (#f5eceb) | 2.04:1 | FAIL — use text-edu-text-primary |
| --edu-error (#fa896b) on white | 2.37:1 | FAIL for normal text |

## Interactive
| Token pair | Ratio | Notes |
|---|---|---|
| white (#fff) on --edu-primary (#5d87ff) | 3.29:1 | FAIL for <=14px normal text; PASS for large text ≥18px or ≥14px bold |
| --edu-primary (#5d87ff) on white | 3.29:1 | FAIL for body text (need 4.5); PASS for UI/icon (need 3) |
| --edu-primary (#5d87ff) on edu-primary/15 bg (#e7edff) | 2.82:1 | FAIL — both text and UI threshold |
| --edu-error (#fa896b) on --edu-error-light (#fff5f2) | 2.21:1 | FAIL for text — use edu-text-primary |
| --edu-success (#13deb9) on white | 1.72:1 | FAIL — never use as text color |
| --edu-success (#13deb9) on edu-success/15 (#dcfaf5) | 1.56:1 | FAIL — badge text fails |
| white (#fff) on --edu-success (#13deb9) icon | 1.72:1 | FAIL icon 3:1 — use edu-text-primary on success |
| --edu-text-muted (#8898a9) on edu-primary/15 (#e7edff) | 2.53:1 | FAIL — avoid muted on tinted bg |

## StatusBadge tone contrast (text on /15 tinted bg, blended on white card)
All computed with WCAG ^2.4 gamma linearization. Blended bg = token × 0.15 + #FFF × 0.85.
| Tone | Text token | Text hex | Blended bg | Ratio | WCAG AA |
|---|---|---|---|---|---|
| success | text-edu-success-text | #007A6E | #DBFAF4 | 4.74:1 | PASS |
| error | text-edu-error-text | #C0392B | #FEEDE8 | 4.79:1 | PASS |
| warning | text-edu-warning-foreground | #2A3547 | #FFF2DD | 11.18:1 | PASS |
| primary | text-primary (--edu-primary-dark) | #4570EA | #E3EAFC | **3.65:1** | **FAIL** — badge text (11px) fails 4.5:1; 4.56:1 was text on plain white (not badge bg) |
| info | text-edu-text-primary (fixed) | #2A3547 | #E5F0FF | 11.5:1 | PASS (fixed in StatusBadge) |
| purple | text-edu-text-primary (fixed) | #2A3547 | #EBE7F2 | 11.5:1 | PASS (fixed in StatusBadge) |
| teal | text-edu-text-primary (fixed) | #2A3547 | #D9F4F2 | 11.5:1 | PASS (fixed in StatusBadge) |
| muted | text-foreground (#2A3547) (fixed) | #2A3547 | #F5F7FA | 11.52:1 | PASS (fixed in StatusBadge) |

NOTE: The "primary" tone at 3.65:1 FAILS for badge text at 11px. Use text-edu-primary-accessible (#4468E0) on badge bg #E3EAFC = 4.02:1 — still marginal; consider using text-edu-text-primary (#2A3547) on primary badges for guaranteed pass.

## Key rules derived
- Never use text-edu-success on any background (1.72:1 on white — fails both 4.5 and 3:1).
- Never use white icon/text on edu-success backgrounds (1.72:1 — fails 3:1 icon minimum).
- text-muted-foreground (#8898a9) is decorative/placeholder only — fails for real content text.
- --edu-warning text must always pair with --edu-warning-foreground, not white.
- Primary button text: white fails (3.29) for normal text sizes; use dark text or ensure ≥18px.
- edu-error as text color on error-light fails (2.21); use edu-text-primary instead.
- edu-primary as text on edu-primary/15 bg fails (2.82); use edu-text-primary.
- info/teal tones: self-color text on own /15 tint fails badly (2.43 / 2.15). Fix: use edu-text-primary.
- purple tone: 4.32:1 — just under AA threshold. Fix: use --edu-purple-dark or edu-text-primary.
- muted tone for badges: 2.76:1 — fails for badge text. Fix: use text-foreground or text-edu-text-secondary.

## Additional ratios confirmed (US-E01.2 audit)
- `#8898a9` on `#f5f7fa` (muted text on edu-bg) — corrected measured value: ~3.07:1 (FAIL normal text including 10px bold)
- `#fa896b` on `#ffffff` (destructive on card) — ~2.46:1 (FAIL) per US-E01.2 error message usage
- `#fa896b` on `#f5f7fa` (destructive on page bg) — ~2.38:1 (FAIL)
- `#4570ea` on `#ffffff` (primary-dark on card) — 4.56:1 (PASS, per ADR 0023); also confirmed for white-on-primary 4.56:1

## Additional ratios confirmed (US-E09.1 discipline-screen audit, 2026-06-17)
- white on bg-edu-error (#fa896b): 2.37:1 — FAIL (tab count badge inactive state in discipline-screen.tsx)
- white on bg-primary (#5d87ff): 3.29:1 — FAIL for 10px text (tab count badge active state)
- edu-text-muted (#8898a9) on white: 2.95:1 — FAIL for 14px subtitle normal weight (discipline-screen.tsx h1 subtitle)
- edu-success (#13deb9) on white: 1.72:1 — FAIL for empty-state text labels (violations-tab + leave-tab)
- edu-error-dark (#b91c1c) on edu-error-dark-light (#fee2e2): 5.30:1 — PASS (high-severity badge, ADR 0040 confirmed)
- edu-error-text (#c0392b) on edu-error/10 bg: 5.01:1 — PASS (error banner)
- edu-warning-foreground (#2a3547) on warning/15 bg: 11.25:1 — PASS (badge pattern correct)
- edu-text-secondary (#5a6a85) on white: 5.48:1 — PASS (fieldset legend in severity selector)

## Additional ratios confirmed (US-E10.4 messaging audit, 2026-06-20)
- white (#fff) on bg-primary (#5d87ff) at 11px font-extrabold (unread badge): 3.29:1 — FAIL 4.5:1 small text
- --edu-error (#fa896b) on --edu-error-light (#fff5f2) (admin badge raw token): 2.21:1 — FAIL; use text-edu-error-text (#c0392b) = 5.07:1 PASS
- --edu-primary (#5d87ff) on bg-primary/8 (#f2f5ff) (create-group CTA in list): 3.02:1 — FAIL 4.5:1
- --edu-text-muted (#8898a9) on white (timestamps in chat bubbles): 2.95:1 — FAIL 4.5:1
- Own-bubble quoted block: white/80 effective (#e4ebff) on effective quote bg (#7a9cff = #5d87ff + 18% white): 2.20:1 — FAIL; use text-primary-foreground without opacity reduction, or use white/55+ on a darker token
- Own-bubble quoted block sender name: white/90 on #7a9cff: 2.40:1 — FAIL
- --edu-primary (#5d87ff) on --edu-bg (#f5f7fa) (reply quote sender name in "other" bubble): 3.07:1 — FAIL 4.5:1 for 11px text
- --edu-warning-foreground (#2a3547) on bg-edu-warning/15 (#fff2dd): 11.18:1 — PASS (leave group button correct)

## Additional ratios confirmed (US-E12.4 audit, US-E13.4 audit)
- --edu-primary-dark (#4570EA) on white: 4.41:1 — BARELY FAILS AA for ≤12px normal text (globals.css comment claims 4.56 — incorrect; this is a measurement discrepancy to note)
- --edu-primary-accessible (#4468E0) on white: 4.88:1 — PASS for small text buttons. Use for any button with text-[11px] or smaller.
- dark mode: --muted-foreground (#8898A9) on dark card (#131A2E): 5.85:1 — PASS in dark mode. Contrast failures are light-mode specific for this token.
- --edu-gender-female (#D6336C) on #FFE6F1: 3.92:1 — FAILS AA for 10.5px text (passes 3:1 UI/large text)
- --edu-gender-male (#3B7BD9) on #E6F0FF: 3.64:1 — FAILS AA for 10.5px text (passes 3:1 UI/large text)
- --edu-success (#13DEB9) on bg-edu-success/10: 1.61:1 — FAILS; use edu-success-text instead
- edu-success-text (#007A6E) on bg-edu-success/10: 4.90:1 — PASS
- border-edu-border (#E5EAF2) on white: 1.21:1 — FAILS SC 1.4.11 for UI component boundary
- white on bg-edu-warning (#FFAE1F): 1.85:1 — FAILS (same as recorded; applies to any button using bg-edu-warning + text-white)

## Additional ratios confirmed (US-E13.7 ChildSwitcher audit, 2026-06-21)
- white (#fff) on --edu-success (#13DEB9) avatar circle: 1.72:1 — FAIL (10px text, 4.5:1 required)
- white (#fff) on --edu-warning (#FFAE1F) avatar circle: 1.85:1 — FAIL (10px text)
- white (#fff) on --edu-error (#fa896b) avatar circle: 2.37:1 — FAIL (10px text)
- white (#fff) on --edu-primary (#5d87ff) avatar circle: 3.29:1 — FAIL (10px text, 4.5:1 required)
- white (#fff) on --edu-purple (#7B5EA7) avatar circle: 5.25:1 — PASS
- dark text (#2a3547) on edu-success/warning/error avatar circles: 7.17 / 6.67 / 5.21 — PASS (use as foreground)
- dark text (#2a3547) on --edu-primary (#5d87ff) avatar circle: 3.75:1 — FAILS 4.5:1 (use --edu-primary-accessible bg + white text = 4.88:1 instead)
- --edu-primary-accessible (#4468E0) on white: 4.88:1 — PASS. Confirmed for avatar circle bg with white initials text.

## Additional ratios confirmed (US-E03.1 principal-reports-dashboard audit, 2026-07-14)
- --edu-success (#13deb9) on white card (chart bar fill): 1.72:1 — FAILS WCAG 1.4.11 Non-text Contrast (need 3:1 for "parts of graphs"/bar fills, not just text). Fix: add a 1px border in `--edu-success-text` (#007a6e, 5.24:1) around the fill.
- --edu-warning (#ffae1f) on white card (chart bar fill): 1.85:1 — same FAIL; border fix: `--edu-warning-text` (#9a6a0f, 4.73:1).
- --edu-primary (#5d87ff) on white card (bar fill): 3.29:1 — PASSES 1.4.11 (only bar fill color that clears 3:1 among primary/success/warning).
- --edu-warning-text (#9a6a0f) on white/plain card bg (NOT --edu-warning-light): 4.73:1 — PASSES even for non-bold normal text. The token's own code comment ("bold ≥14px only") is calibrated against `--edu-warning-light` (4.37:1); on a plain white card the ratio is higher and clears the normal-text floor too. Don't auto-flag `--edu-warning-text` on white/card bg as the ADR-0046 misuse pattern — check the actual adjacent surface first.
- white on --primary (which resolves to --edu-primary-dark #4570ea, NOT raw --edu-primary #5d87ff) at 13px font-bold: 4.41:1 — FAILS 4.5:1 (13px bold doesn't meet the ≥14px-bold large-text threshold). Recurs on any new small (<14px) bold UI chrome using the default Button/segmented-control checked-state color pair. Fix: `--edu-primary-accessible` (#4468e0, 4.88:1).

## Additional ratios confirmed (US-E17.10 Skeleton primitive audit, 2026-07-05)
- bg-accent (light, #ECF2FF = --edu-primary-light) on card #FFFFFF: ~1.12:1 — decorative/non-text, but visually near-invisible.
- bg-accent (dark, #1C2541) on card dark #131A2E: ~1.14:1 — same near-invisible issue in dark mode.
- bg-muted (light, #F5F7FA = --edu-bg) on card #FFFFFF: ~1.07:1 — NOT materially better than bg-accent. The base `Skeleton` primitive (`src/components/ui/skeleton/skeleton.tsx`) has a systemic low-visibility issue regardless of bg-accent vs bg-muted — predates US-E17.10, affects every existing skeleton screen (grade-entry, exam-bank, grade-book, etc.), not just the new StatCardSkeleton/TableRowSkeleton. Treat "skeleton nearly invisible" as a design-system/primitive-level finding (flag to uiux-design-system-builder for a dedicated `--edu-skeleton` token with real separation from card bg) — not a per-story blocker unless the story literally authors the primitive.
