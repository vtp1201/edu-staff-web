# 0050 Video Faux-Chrome Media-Surface Token

Date: 2026-07-08

## Status

Accepted

## Context

US-E11.6 (Student Lesson Player) needs a video-lesson content pane rendered as
faux player chrome (no real media in mock-first — decision `0014`): a
near-black backdrop with a centered play affordance and a bottom seek-bar
strip, per the reference mockup `design_src/edu/student.jsx` (`LessonBody`,
`type === "video"` branch, background `#0f1117`). No existing token in
`src/app/tokens.css` covers a dark media/video surface — the palette is
built around a light-surface UI (`--edu-bg #f5f7fa`, `--edu-card #ffffff`).
Video player chrome is conventionally dark regardless of the host app's
light/dark theme (YouTube, Vimeo, native `<video>` controls all stay dark-on-
light apps) — this is a **decorative media-container** need, not a light/dark
theme variant. Per `.claude/rules/design-system.md`, any new color must be a
token in `tokens.css` first (no raw hex in components) and needs an ADR.

## Decision

Add one new semantic token pair, scoped to media/video surfaces only:

```css
/* tokens.css */
--edu-media-surface: #0f1117;
--edu-media-surface-foreground: #ffffff;
```

Mapped in `globals.css` `@theme inline`:

```css
--color-edu-media-surface: var(--edu-media-surface);
--color-edu-media-surface-foreground: var(--edu-media-surface-foreground);
```

Usage: `bg-edu-media-surface text-edu-media-surface-foreground` for the
`VideoPlayer` faux-chrome container in `src/features/lms/presentation/lesson-player/video-player.tsx`.
Overlay/secondary text on this surface (duration label, timestamp) may use
`text-edu-media-surface-foreground/75` (Tailwind opacity modifier) rather than
a second token, matching the existing repo convention of opacity-modified
foreground tokens for secondary-on-dark text (e.g. sidebar collapsed-state
labels).

Contrast check: `#ffffff` on `#0f1117` = 19.6:1 (passes AAA), well above the
4.5:1 AA floor for the primary label; `/75` opacity white on `#0f1117` ≈
14.7:1 (still passes AA/AAA for both normal and large text).

## Alternatives Considered

1. Reuse `--foreground`/`--background` inverted via a `dark:` variant wrapper
   — rejected: this app's dark mode (`next-themes`) is a full-app theme
   toggle, not a per-component media-chrome affordance; coupling the video
   player's always-dark chrome to the app's theme state would make it flip
   to a light background when the user's OS/app theme is dark, breaking the
   "video players are always dark" convention and adding needless
   theme-conditional logic to a single decorative component.
2. Inline raw hex (`bg-[#0f1117]`) — rejected outright: violates the
   tokens-only hard rule (`design-system.md`, `tailwind-v4.md`) unconditionally.
3. No token, render lesson video as a plain light-surface card with just an
   icon (no dark chrome) — rejected: diverges from the normative mockup
   reference without a product reason; the dark chrome is what visually
   communicates "this is a media player" per the design intent.

## Consequences

Positive:

- One narrowly-scoped token, not a new palette; zero impact on existing
  screens/components.
- Contrast is verified AA/AAA-safe at authoring time (ADR), not left to
  per-usage review.

Tradeoffs:

- A token whose only consumer today is the video faux-chrome — acceptable
  per the "narrow but named" convention already used for
  `--edu-messaging-quote-own-bg` (ADR `0047`), a similarly single-purpose
  token.

## Follow-Up

- If a second media-surface consumer appears (e.g. a future audio-lesson
  player or an image lightbox), reuse this same token rather than minting a
  near-duplicate.
