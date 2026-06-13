---
name: project-e07-design-system
description: E07 Design System epic status — US-E07.3 StatCard variants + US-E07.4 StatusBadge implemented; decision 0027 accessible status text tokens added
metadata:
  type: project
---

E07 Design System epic follow-ups from decision 0026 (component-placement-canonical) are done.

**Why:** Tech-debt cleanup — 3 divergent stat-card clones and inline badge-pattern repetition.

**How to apply:** When any future feature needs a stat card or status badge, refer to canonical shared components; no new local variants.

## US-E07.3 — StatCard variants (merged 2026-06-13)
- `components/shared/stat-card/StatCard` now accepts `variant`: `"default"` (unchanged) | `"compact"` (no icon, tone-colored value) | `"mini"` (caller-provided ReactNode icon, small).
- `StatTone` gained `"muted"` member.
- `compactToneClass()` exported pure helper (testable in node env, per repo toolchain).
- Deleted `Stat` (attendance-summary-card) and `ChildStat` (parent-dashboard).
- Decision 0027: added `--edu-success-text` (#007A6E, 5.4:1) + `--edu-error-text` (#C0392B, 5.1:1) to tokens.css + @theme for AA-compliant value text on white.
- Label contrast fix: `text-muted-foreground` → `text-edu-text-secondary` (#5A6A85, 5.9:1) in compact/mini labels.

## US-E07.4 — StatusBadge (merged 2026-06-13)
- `components/shared/status-badge/StatusBadge` wraps `Badge` primitive with typed `StatusTone` prop.
- `statusToneClass()` exported pure helper (unit-tested).
- Tone→class: success/error use decision-0027 dark tokens; warning uses `edu-warning-foreground`; info/teal/purple use `text-edu-text-primary` (AA on tinted bg); muted uses `text-foreground`.
- Deleted inline `STATUS_TONE` class map from teacher-dashboard; replaced with tone-type map.
- Fixed profile-screen: `Field` helper now uses `useId()` + `htmlFor`/`id` linkage (WCAG 1.3.1/4.1.2); `aria-hidden` on password rule icons.
- Badge fill opacity: `/15` is canonical (design-system.md updated from legacy `/18`).
- calendar-screen active-year badge intentionally deferred (in-flight branch feat/us-e12.2).

## Next available E07 US id: E07.5

[[project-e12-admin-core]]
