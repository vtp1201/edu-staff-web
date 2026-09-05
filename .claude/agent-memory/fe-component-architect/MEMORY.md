# Memory Index

- [ViewModel conventions](vm-conventions.md) — i-vm.ts contract patterns, label injection, RSC→client boundary
- [Component placement patterns](component-placement.md) — canonical homes, GenderBadge promotion, promotion triggers
- [Existing shared components](shared-components-inventory.md) — what lives in components/shared and components/ui
- [Messaging feature patterns](messaging-patterns.md) — US-E10.x component decisions: Sheet for panels, DropdownMenu for context menus, ReplyStrip inline in ChatWindow, MemberSelectPanel feature-local sub-component pattern
- [LMS lesson player patterns](lms-lesson-player-patterns.md) — US-E11.6: same Tabs primitive w/ variant prop for visually-distinct tab groups, no accordion primitive exists (native disclosure button instead), faux-video-chrome a11y (role=slider seek, live-region state announce), stretched-link card pattern to avoid nested-interactive
- [E24 class-hub patterns](e24-class-hub-patterns.md) — US-E24.7/8/9: StatusBadge purple tone exists, role-badges promoted-on-write, KPI/fan-out resolved in RSC not component, full-page screen component ≠ embeddable strip, state-model mismatch justifies 2nd component (URL vs useState week-nav)
- [E24.5 course-player patterns](e24-course-player-patterns.md) — inline switch dispatcher over discriminated-union VM (no dispatcher file), submit-box stays feature-local, TextContent file caller-agnostic
- [Tooling gap: no shell](tooling-gap-no-shell.md) — this role has no Bash tool; cannot git rm or run vitest/build itself — stub-out + honest handoff instead
