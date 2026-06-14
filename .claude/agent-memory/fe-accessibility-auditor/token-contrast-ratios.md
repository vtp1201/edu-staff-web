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
| success | text-edu-success-text | #007A6E | #DCFAF5 | 4.70:1 | PASS |
| error | text-edu-error-text | #C0392B | #FEE8E2 | 5.10:1 | PASS |
| warning | text-edu-warning-foreground | #2A3547 | #FFF1D7 | ~11:1 | PASS |
| primary | text-primary (--edu-primary-dark) | #4570EA | #E5ECFF | 4.56:1 | PASS |
| info | text-edu-info | #539BFF | #E5F0FF | 2.43:1 | FAIL |
| purple | text-edu-purple | #7B5EA7 | #EBE7F2 | 4.32:1 | FAIL (just under) |
| teal | text-edu-teal | #00B8A9 | #D9F4F2 | 2.15:1 | FAIL |
| muted | text-muted-foreground | #8898A9 | #F5F7FA | 2.76:1 | FAIL (content text) |

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
