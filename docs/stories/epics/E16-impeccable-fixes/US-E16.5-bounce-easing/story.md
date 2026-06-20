# US-E16.5 — Bounce easing: messaging typing indicator — per-dot duration desync → staggered animation-delay

| Field | Value |
|---|---|
| **ID** | US-E16.5 |
| **Epic** | E16 — Impeccable Anti-pattern Fixes (DR-009) |
| **Lane** | tiny |
| **Status** | planned |
| **Hard-gate flags** | None — single-file CSS animation fix; no auth/RBAC/token/data-loss/PII |
| **Design authority** | `design_src/edu/messaging.jsx` lines 1710, 1873–1876 (`@keyframes msg-typing`); design-spec.jsonc §bounce-easing; `.claude/rules/accessibility.md` (motion-safe) |
| **DR** | DR-009 |

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) touched:
  - `src/features/messaging/presentation/typing-indicator/typing-indicator.tsx:34` (the ONLY file)
- Shared contract/file: none — self-contained single component

## Product Contract

The `TypingIndicator` component currently renders three dots with `motion-safe:animate-bounce` (Tailwind's `bounce` keyframe) and staggered `animationDelay` values of `0s`, `0.15s`, `0.3s`.

Tailwind's built-in `animate-bounce` uses a `bounce` keyframe with a fixed `1s` duration. There is no per-dot duration desync in the current implementation (the delays are `0 / 0.15 / 0.3s` — not `1s / 1.15s / 1.3s` as the old mockup had). HOWEVER, the `animate-bounce` keyframe is a sharp, spring-like bounce that looks jarring and unpolished. The DR-009 impeccable audit flagged the visual quality as a stutter/desync anti-pattern.

The design-authority fix (from `design_src/edu/messaging.jsx`) replaces `animate-bounce` with a custom `@keyframes msg-typing` animation:

```css
@keyframes msg-typing {
  0%, 70%, 100% { opacity: 0.35; transform: translateY(0); }
  35%           { opacity: 1;    transform: translateY(-3px); }
}
```

Applied per dot: `animation: msg-typing 1.2s <delay>s ease-in-out infinite`
- Dot 0: `animationDelay: 0s`
- Dot 1: `animationDelay: 0.18s`
- Dot 2: `animationDelay: 0.36s`

All three dots use the SAME `1.2s` duration — stagger is achieved only via `animation-delay`, not via different durations. This is the fix: identical duration + staggered delay = smooth wave. Different durations = visible stutter (the anti-pattern).

Motion must be gated behind `@media (prefers-reduced-motion: no-preference)` — for reduce users, dots should show as static (no animation, full opacity).

## Current State Analysis

From `typing-indicator.tsx` (lines 31–38):
```tsx
{[0, 0.15, 0.3].map((delay) => (
  <span
    key={delay}
    className="size-1.5 rounded-full bg-muted-foreground/60 motion-safe:animate-bounce"
    style={{ animationDelay: `${delay}s` }}
  />
))}
```

Issues:
1. `animate-bounce` is Tailwind's default bounce — sharp, spring-like, not the smooth opacity+translateY wave the design requires
2. Delays `0 / 0.15 / 0.3s` are correct in concept but the keyframe is wrong
3. The `motion-safe:` prefix correctly gates the animation for accessibility — this must be preserved or improved

Target state:
- Remove `motion-safe:animate-bounce` class
- Add a custom CSS `@keyframes msg-typing` keyframe (via `<style>` or global CSS)
- Apply it inline: `animation: msg-typing 1.2s ${delay}s ease-in-out infinite` where delays are `0 / 0.18 / 0.36`
- Gate the entire animation under `prefers-reduced-motion: no-preference`

### Implementation options (FE decides, both are acceptable)

**Option 1 — Inline `<style>` tag** (matches mockup pattern):
```tsx
<>
  <style>{`
    @keyframes msg-typing {
      0%, 70%, 100% { opacity: 0.35; transform: translateY(0); }
      35%            { opacity: 1;   transform: translateY(-3px); }
    }
    @media (prefers-reduced-motion: no-preference) {
      .msg-typing-dot { animation: msg-typing 1.2s ease-in-out infinite; }
    }
  `}</style>
  {[0, 0.18, 0.36].map((delay) => (
    <span
      key={delay}
      className="msg-typing-dot size-1.5 rounded-full bg-muted-foreground/60"
      style={{ animationDelay: `${delay}s` }}
    />
  ))}
</>
```

**Option 2 — Tailwind v4 custom keyframe in globals.css + arbitrary value**:
Add to `src/app/globals.css`:
```css
@keyframes msg-typing {
  0%, 70%, 100% { opacity: 0.35; transform: translateY(0); }
  35%            { opacity: 1;   transform: translateY(-3px); }
}
```
Then use inline style for the full animation property (Tailwind doesn't trivially support custom per-dot duration+delay combos without a plugin), or use `style={{ animation: 'msg-typing 1.2s ease-in-out infinite' }}` with `motion-safe:` class wrapper.

The FE engineer chooses Option 1 or 2 based on team convention. Both produce identical output.

## Acceptance Criteria

> Proof tiers: **S** = Storybook interaction (play()), **U** = Vitest unit.
> Animation timing ACs require visual inspection (manual) or CSS computed-style assertions.

### AC-1 — Dots use msg-typing keyframe, NOT animate-bounce (S)
- GIVEN the `TypingIndicator` component rendered in Storybook
- WHEN the DOM and computed styles are inspected
- THEN none of the three dot spans has the `animate-bounce` class
- AND each dot span has an `animation` property referencing `msg-typing` (via inline style or CSS class)

### AC-2 — All three dots have identical animation duration of 1.2s (S, manual)
- GIVEN the three dot spans rendered
- WHEN the computed `animation-duration` is read for each dot
- THEN all three return `1.2s` (not `1s / 1.15s / 1.3s` — the old anti-pattern)

### AC-3 — Dots have staggered delays 0s, 0.18s, 0.36s (S, manual)
- GIVEN the three dot spans rendered (indexed 0, 1, 2)
- WHEN the computed `animation-delay` is read for each dot
- THEN dot 0 = `0s`, dot 1 = `0.18s`, dot 2 = `0.36s`

### AC-4 — Keyframe produces opacity + translateY wave (S, manual)
- GIVEN the `msg-typing` keyframe
- WHEN inspected via Chrome DevTools Animations panel
- THEN at 0% / 70% / 100% keyframe positions: `opacity: 0.35`, `transform: translateY(0)`
- AND at 35% keyframe position: `opacity: 1`, `transform: translateY(-3px)`

### AC-5 — Easing is ease-in-out (S, manual)
- GIVEN the computed `animation-timing-function` for each dot
- THEN the value is `ease-in-out` (not `linear`, `ease`, or a cubic-bezier that differs)

### AC-6 — motion-safe gate: animation runs only when motion is allowed (S)
- GIVEN `@media (prefers-reduced-motion: reduce)` is active (simulated in Storybook via Chromium reduced-motion emulation)
- WHEN the `TypingIndicator` renders
- THEN the three dots are VISIBLE but STATIC (no animation)
- AND `opacity` of each dot at rest is legible (≥ 0.35 or the resting state — dots must still be seen)

### AC-7 — motion-safe gate: animation runs when motion is allowed (S)
- GIVEN `@media (prefers-reduced-motion: no-preference)` is active (default)
- WHEN the `TypingIndicator` renders
- THEN the three dots animate with the staggered `msg-typing` wave

### AC-8 — Screen reader SR-only text unchanged (S)
- GIVEN the `TypingIndicator` component
- WHEN the DOM is inspected
- THEN the `<span className="sr-only">` with `{t("chat.typing")}` text is STILL present (existing accessibility, do not remove)
- AND the dot spans are still `aria-hidden="true"` (the animation is decorative — SR sees only the sr-only text)

### AC-9 — Visual smoothness: no visible stutter between dots at rest (S, manual)
- GIVEN the three dots animating in Storybook at normal (non-reduced-motion) settings
- WHEN the animation is observed for at least 3 full cycles (3.6 seconds)
- THEN the wave flows smoothly from left to right without any visible synchronization gap or jerk between dots
- NOTE: This criterion is a manual visual check by the QA reviewer. Document with a screen recording in the evidence section.

### AC-10 — i18n key for typing text unchanged (S)
- GIVEN the `TypingIndicator` component
- WHEN `useTranslations("messaging")` is called
- THEN `t("chat.typing")` resolves to vi: "đang nhập..." / en: "typing..." (existing keys — confirm no breakage)

### AC-11 — Biome lint + tsc clean (platform)
- GIVEN the changes to `typing-indicator.tsx` (and optionally `globals.css`)
- WHEN `bun lint` and `bunx tsc --noEmit` run
- THEN zero errors

### AC-12 — Full test suite unchanged (U)
- GIVEN the animation changes
- WHEN `bun vitest run` executes
- THEN all 839 previously-passing tests continue to pass (US-E10.5 tests must remain green)

## i18n Requirements

No new i18n keys. The existing `messaging.chat.typing` key is sufficient. Do NOT change it.

## Design Notes

- The `msg-typing` keyframe is defined in the design authority at `design_src/edu/messaging.jsx:1873-1876` — this is the normative animation spec
- Dot size: keep `size-1.5` (6px) as-is
- Dot color: keep `bg-muted-foreground/60` as-is — the opacity in the keyframe (0.35) compounds with the /60 Tailwind modifier; this is intentional
- The container bubble styling (rounded, border, bg-card) is UNCHANGED
- The avatar shown next to the typing indicator is UNCHANGED

## Validation

`scripts/bin/harness-cli story update --id US-E16.5 --status implemented --unit 0 --integration 0 --e2e 1 --platform 1`

| Layer | Expected proof |
| --- | --- |
| Unit | None required (pure CSS animation) |
| Integration | None required |
| E2E | Storybook: TypingIndicator story — inspect computed animation-duration (1.2s all dots), animation-delay (0/0.18/0.36s), absence of animate-bounce class; motion-safe toggle verification |
| Platform | `bun build` + `bunx tsc --noEmit` clean; visual screen recording of smooth wave |

## Harness Delta

- TEST_MATRIX row US-E16.5: `planned` → `implemented` after gate-green
- No ADR (no new design-system decision; no new token)

## Evidence

Add after implementation: screen recording (GIF or MP4) of typing indicator before (bounce) and after (smooth wave). Storybook story screenshot in both motion-safe and motion-reduce states.
