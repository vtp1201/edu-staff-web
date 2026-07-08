---
name: lms-lesson-player-patterns
description: Component architecture decisions from US-E11.6 (student courses list + lesson player) — reusable patterns for future content-consumption/media screens
metadata:
  type: project
---

## Patterns established in US-E11.6

**Same Tabs primitive, different `variant`, not two components:** when one
screen needs visually different tab groups (pill-style course-list tabs vs
underline-style Notes/Q&A tabs), check `ui/tabs`'s `tabsListVariants` first —
it already had `default` and `line` variants covering both looks. Don't
invent a second tabs component for a visual difference the primitive already
models via a prop.

**No accordion/collapsible primitive in this repo** (confirmed by grep,
zero hits for `radix-ui/react-collapsible`/`Accordion` across `src/`). A
single expand/collapse disclosure (e.g. a collapsible chapter-list header)
should be a native `<button aria-expanded aria-controls>` + conditionally
rendered content, following the `Sidebar`'s existing hand-rolled nav
pattern — not a new Radix primitive install, unless a screen genuinely needs
true single-open accordion semantics (mutually-exclusive sections).

**Faux-media-chrome a11y pattern (no real `<video>` element, mock-first):**
when a video player is faux-chrome (decided by fe-lead for US-E11.6 since
mock-first has no real media assets) with keyboard Space/Left/Right controls:
- Play/pause button's `aria-label` flips between play/pause labels based on
  state (not static).
- Seek bar (cosmetic, no real scrubbing) still gets `role="slider"` +
  `aria-valuemin/max/now` + `aria-label` so keyboard users get a
  standards-correct target.
- A visually-hidden `aria-live="polite"` region announces play/pause state
  changes for screen-reader users when toggled via keyboard.
- Scope the Space-key handler to the play button element (not `window`) to
  avoid hijacking page-scroll Space when focus is elsewhere.

**Card-as-link a11y ("stretched link") over div+onClick+stopPropagation:**
when a design mockup has a whole card clickable AND a nested CTA button with
the SAME destination/handler (just `stopPropagation` to avoid double-firing),
prefer collapsing to a single `<Link>` wrapping the whole card with the CTA
rendered as non-interactive styled text inside it — avoids nested-interactive
elements entirely. Only keep two separate interactive targets if the CTA
click and card click genuinely differ in behavior/destination.

**Whole-screen mobile-collapse via one component + Tailwind responsive
classes, not a `Mobile<X>` fork:** AC calling for "sidebar/list panel
collapses on mobile" (< 768px) should be a `useState` toggle + `md:hidden`/
`hidden md:block` inside the SAME component (e.g. `ChapterList`), not a
separate mobile variant component — keeps one canonical home per
component-organization.md.

**Course/content accent-color tokens:** when a mockup assigns each list item
(course, subject, etc.) a raw hex from a shared palette object (`T.primary`,
`T.success`...), map those in the **mapper** (infrastructure layer) to a
closed union of semantic tone names (e.g. `"primary"|"success"|"warning"|
"purple"|"teal"|"error"`) that the VM carries — the client component never
sees a hex, only a tone name it maps to existing Tailwind token classes.

**Breakpoint mismatch risk:** this repo already has an `lg:` (1024px)
flex-col/flex-row responsive precedent (`exam-taking.tsx`) for a *different*
2-pane layout. When a story's AC states an explicit pixel breakpoint (e.g.
"< 768px"), don't silently reuse the nearby `lg:` precedent — flag the
`md:`(768px) vs `lg:`(1024px) choice explicitly since existing code doesn't
agree with the literal AC number.
