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

## Key rules derived
- Never use text-edu-success on any background (1.72:1 on white — fails both 4.5 and 3:1).
- Never use white icon/text on edu-success backgrounds (1.72:1 — fails 3:1 icon minimum).
- text-muted-foreground (#8898a9) is decorative/placeholder only — fails for real content text.
- --edu-warning text must always pair with --edu-warning-foreground, not white.
- Primary button text: white fails (3.29) for normal text sizes; use dark text or ensure ≥18px.
- edu-error as text color on error-light fails (2.21); use edu-text-primary instead.
- edu-primary as text on edu-primary/15 bg fails (2.82); use edu-text-primary.
