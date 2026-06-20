# 0047 Messaging own-bubble quoted-block overlay token

Date: 2026-06-20

## Status

Accepted

## Context

US-E10.4 (messaging enhancements) introduces quoted-message blocks inside chat bubbles for the reply feature. The design mockup (`design_src/edu/messaging.jsx`) specifies `rgba(255,255,255,0.18)` as the background for the quoted block inside own-message bubbles (dark primary background). This raw rgba value is:

1. Not a token in `src/app/tokens.css`, violating the tokens-only rule.
2. Dark-mode unsafe — transparent white on a white card background produces near-invisible content.
3. Not equivalent to any existing overlay token (shadow tokens are for box-shadows, not fill).

## Decision

Add a new semantic token `--edu-messaging-quote-own-bg` to `src/app/tokens.css`:

```css
/** Own-message reply quoted block background — semi-transparent white on primary-tinted bubble. */
--edu-messaging-quote-own-bg: rgba(255, 255, 255, 0.18);
```

The token is scoped to the messaging quoted-block use case only. The companion border token `--edu-messaging-quote-own-border` (`rgba(255,255,255,0.35)`) is also added for the left/full border of the quoted block.

In `globals.css` `@theme`, map as custom properties (not Tailwind color utilities — inline `style={{ background: 'var(--edu-messaging-quote-own-bg)' }}` is the intended usage since these are context-specific overlays that do not benefit from utility-class generation).

For received-message (non-own) quoted blocks, the design uses `var(--edu-bg)` background + `var(--edu-primary)` left border — both are existing tokens; no new token needed.

## Alternatives Considered

1. **Use inline `rgba()` directly** — violates tokens-only rule; flagged by `fe-tech-lead-reviewer`.
2. **Use an existing overlay token** — no suitable existing token; shadow tokens are box-shadow values, not fill colors.
3. **Use `bg-white/20` Tailwind v4 utility** — technically available but would require verifying Tailwind v4 generates the class and couples the value to the utility layer rather than the semantic token layer. Token is more intentional and auditable.

## Consequences

Positive:
- Tokens-only rule maintained; design-review gate passes cleanly.
- Dark-mode can override `--edu-messaging-quote-own-bg` per theme without touching components.
- ADR documents the intentional use of a semi-transparent overlay for this context.

Tradeoffs:
- Two narrow-use tokens added to `tokens.css` (minimal surface area).

## Follow-Up

- `fe-nextjs-engineer` adds both tokens to `src/app/tokens.css` and maps in `globals.css` before implementing `ChatBubble` quoted block (Phase 4).
- `docs/product/design-system.md` messaging component section updated in same commit.
