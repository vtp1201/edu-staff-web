# 0029 Concept Badge Accessible Text Tokens

Date: 2026-06-13

## Status

Accepted

## Context

US-E12.3 SubjectParent Departments screen uses concept badges with teal and
purple tints (`bg-edu-teal/15`, `bg-edu-purple/15`). The existing `text-edu-teal`
(#00b8a9, 2.47:1 on white) and `text-edu-purple` (#7b5ea7, 4.14:1 on white)
both fail WCAG 1.4.3 AA (4.5:1 threshold for normal text). This is the same
class of problem solved by decision 0027 for success and error tokens.

## Decision

Add two dark-shade accessible text tokens following the 0027 pattern:

- `--edu-teal-text: #00695c` — 6.61:1 on white, 5.71:1 on teal/15 (AA pass)
- `--edu-purple-text: #5b3d8a` — 8.47:1 on white, 6.91:1 on purple/15 (AA pass)

Both added to `src/app/tokens.css` (with contrast ratio comments) and mapped
in `src/app/globals.css` `@theme` as `--color-edu-teal-text` and
`--color-edu-purple-text`. Usage: ConceptBadge component for KHOA (teal) and
CUSTOM (purple) concept types.

## Alternatives Considered

1. Use `text-foreground` (#2a3547, 12.9:1) for all concept types — passes
   contrast but loses brand color meaning for teal/purple concepts.
2. Increase tint opacity (e.g. teal/25) — approaches accessibility but loses
   the soft badge appearance from the design spec.

## Consequences

- Two new semantic tokens extend the existing pattern from decision 0027.
- `docs/product/design-system.md` requires sync (follow-up).
- ConceptBadge component uses: BO_MON → text-foreground, TO →
  text-edu-warning-foreground, KHOA → text-edu-teal-text, CUSTOM →
  text-edu-purple-text.
