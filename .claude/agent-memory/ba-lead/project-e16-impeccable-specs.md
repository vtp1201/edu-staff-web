---
name: e16-impeccable-specs
description: E16 BA specs complete for DR-009 impeccable anti-pattern fixes — 5 story packets, no ADR, no BE, pure UI/a11y/perf
metadata:
  type: project
---

5 BA story packets delivered under E16-impeccable-fixes (2026-06-21), DR-009.

**Why:** /impeccable audit flagged 5 anti-pattern categories in reference mockups; FE team needs testable AC to apply the same fixes to production src/.

**How to apply:** Point /fe at the story packets for each US. All pure visual/a11y/CSS work — no BE, no ADR, no domain use-cases.

## Packet paths
- `docs/stories/epics/E16-impeccable-fixes/US-E16.1-side-stripe-ban/story.md`
- `docs/stories/epics/E16-impeccable-fixes/US-E16.2-error-ramp-contrast/story.md`
- `docs/stories/epics/E16-impeccable-fixes/US-E16.3-a11y-interaction-gaps/story.md`
- `docs/stories/epics/E16-impeccable-fixes/US-E16.4-layout-transition-perf/story.md`
- `docs/stories/epics/E16-impeccable-fixes/US-E16.5-bounce-easing/story.md`

## Key gotchas per story

### US-E16.1 Side-stripe ban
- KEEP `sidebar.tsx:135` border-l-[3px] active nav rail — it is a NAV INDICATOR, NOT in scope
- 8 files touched; each has specific before/after class mapping in story.md
- subjects-screen.tsx:177-178 has TWO border-l-[3px] lines (active + transparent inactive) — BOTH must be removed

### US-E16.2 Error-ramp contrast
- Header bell is a DOT (size-2), not a count badge — just swap bg-edu-error → bg-edu-error-dark
- Sidebar nav badge: current sidebar.tsx has NO badge span — if added, must use bg-edu-error-dark
- Destructive button ALREADY fixed (before this story) — do NOT touch button.tsx
- Token --edu-error-dark already exists (decision 0040) — NO ADR needed

### US-E16.3 a11y/interaction gaps
- Card interactive variant: add role=button + tabIndex=0 + onKeyDown(Enter/Space) + focus ring to the PRIMITIVE (components/ui/card/) — not a feature wrapper
- ProgressBar ARIA: shadcn Progress (Radix) already sets role=progressbar from value prop — verify; custom bars in grade-distribution-chart/conduct-summary/announcement-card/school-setup NEED aria-valuenow manually
- Avatar dropdown: Radix DropdownMenu handles outside-click + Escape natively — main gap is aria-label i18n on the trigger button (hardcoded "User menu")
- Sidebar aria-current: ALREADY present at sidebar.tsx:129 — verify and document as covered

### US-E16.4 Layout-transition perf
- scaleX formula: `scaleX(value/100)` with width='100%' and transformOrigin='left center' on fill element
- shadcn Progress uses translateX(-N%) — already GPU-composited; evaluate leave as-is or normalize
- Sidebar: wrap aside in grid container; inner aside gets min-w-0 overflow-hidden; transition on grid-template-columns not width
- motion-safe: all transitions must be gated under prefers-reduced-motion:no-preference (motion-safe: prefix)

### US-E16.5 Bounce easing
- Target: @keyframes msg-typing { 0%,70%,100%: opacity 0.35 translateY(0); 35%: opacity 1 translateY(-3px) }
- Duration: 1.2s ALL dots (not 1/1.15/1.3s per dot — that was the old anti-pattern)
- Delays: 0 / 0.18 / 0.36s (updated from current 0/0.15/0.3s to match mockup)
- Remove animate-bounce Tailwind class; add inline animation style
- sr-only span with t("chat.typing") must REMAIN
