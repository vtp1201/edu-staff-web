---
name: project-e17-ux-polish-patterns
description: UC patterns from DR-011 UX Polish stories — shared component pattern, skeleton AC pattern, toast fallback pattern, stepper motion-safe pattern, cross-story file dependency
metadata:
  type: project
---

## E17 DR-011 UX Polish (US-E17.8–E17.13) — UC/AC Patterns

**Why:** These 6 stories establish recurring cross-cutting UC patterns (pure-UI, no BE) that will recur in future UX polish work.

### DestructiveConfirmDialog (UC pattern for shared confirm dialogs)
- UC structure: (1) open+confirm, (2) loading state, (3) keyboard+Escape, (4–N) one UC per named instance, (N+1) consolidation.
- Key AC: focus-trap, focus-return-to-trigger, isLoading=true disables both buttons + aria-busy, Escape fires onCancel, no hardcoded strings, WCAG alertdialog role.
- Open question established: whether Escape is blocked during isLoading (Radix default allows it).

### DetailPanelHeader (UC pattern for back-navigation shared components)
- UC structure: (1) render 3-zone layout, (2) back nav activation, (3–N) one UC per consumer screen.
- Key AC: min-h-[44px] min-w-[44px] on back button, aria-label equals backLabel (full value even when text truncates), title truncates at 375px, actions icon-only below 768px.

### Loading Skeletons (UC pattern for async loading states)
- Each screen gets its own UC; shared wrapper AC covers all instances.
- Mandatory AC: role=status + aria-busy=true on wrapper, sr-only via t('Common.skeleton.loadingAriaLabel'), motion-safe:animate-pulse, skeleton unmounted (not hidden) when data resolves, CLS=0, visible ≤320ms.
- Open question pattern: "does screen X use same card shape as Y?" → drives shared vs feature-local placement decision.

### Contextual Toast (UC pattern for additive toast upgrade)
- Pattern: contextual variant (4000ms) when context data available, generic fallback (2000ms) when not. Generic key NEVER deleted.
- Net-new i18n key must be added to BOTH vi.json + en.json atomically.
- AC must assert: generic key still present, fallback fires correctly, no hardcoded strings at call site.

### Setup Stepper (UC pattern for progress bar upgrade)
- Always test: aria-valuenow is Math.round() integer (0-100), motion-safe gates transition-[width], counter hidden when data undefined (no broken placeholder), stepComplete/stepCurrent/stepPending icons are not aria-hidden.
- Open question pattern: which lucide icon for current step (Loader2 vs Clock) — Loader2 requires motion-safe:animate-spin.

### Cross-story file dependency (important)
- US-E17.11 (touch target) and US-E17.2 (mobile scroll) BOTH modify `grade-book-table.tsx` — must NOT be claimed simultaneously on different branches. AC must include regression assertion for the other story's changes.
- When two stories touch the same file, always model an AC for "no regression on sibling story changes."

**How to apply:** When modeling UCs for future UX polish stories that involve shared components, skeleton states, contextual toasts, or motion-safe animations, use these patterns as templates.
