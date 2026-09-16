---
name: project-e24-18-backlog-batch4
description: US-E24.18 backlog batch 4 (items #7/#9/#10/#11) — dual-role token dark-mode fix, ARIA tabs hardening, dead-code cleanup
metadata:
  type: project
---

US-E24.18 (merged 15d99c8e) closed 4 harness backlog items in ONE branch/packet
(normal lane, solo run — no worktree needed, only origin/main existed).

Key transferable pattern: **dual-role design tokens can't get a single
`.dark {}` override.** `--edu-error-dark` is both (a) text color paired with
`--edu-error-dark-light` tint, and (b) a solid background elsewhere (buttons,
badges) with white foreground. A dark-mode value that fixes (a) breaks (b) —
math showed `#b91c1c`'s luminance gives it a 3.25:1 ceiling as text on ANY dark
bg, so it structurally can never be dark-mode-safe as text. Resolution: leave
the token alone, add a class-level `dark:text-edu-error-text` override at
every call site pairing `bg-edu-error-dark-light` (grepped: 5 sites, not just
the one place the backlog item named) — reuse an EXISTING sibling token
(`--edu-error-text`) rather than minting a new one. ADR 0077 was written
BEFORE implementation with a conditional ("only if X fails add Y"), then
**amended in-place by fe-lead after implementation** to record the actual
math and resolution — writing the ADR before code doesn't mean it's final;
reconcile it once the engineer's contrast measurement comes back.

Other 3 items: #10 dead-code removal surfaced 2 further orphans one level
downstream (`MOCK_ASSIGNMENT_SUMMARIES` fixture — deleted; `toAssignmentSummary`
mapper + DTO — kept with an explicit "retained as future contract surface"
comment per reviewer's triage rule, not silently left ambiguous). #7 heading-hierarchy
fix reused existing i18n keys as `sr-only` `<h2>`, zero visual diff. #11
`ChildSwitcher` a11y fix (dangling `aria-controls` on inactive tabs) shipped
with an intentionally **opt-in** `idPrefix` default (not `useId()`-based)
specifically to keep 3 consumers' hardcoded exact-string test assertions
(`aria-controls="tabpanel-st-1"` etc.) passing unchanged — reviewer flagged
this as a real AC gap (mechanism exists but isn't exercised) and it was
recorded as an accepted deviation in the packet Evidence, not silently closed.
Reviewer independently found the SAME defect in a sibling non-shared component
(`year-timeline.tsx`, same screen) — correctly out of scope for a shared-component
fix, routed to a NEW backlog item (#15) rather than expanding scope or ignoring it.

Design-review gate for a **non-visual** batch (token .dark value + aria
attribute + heading semantics, zero layout/spacing/typography diff): explicit
written rationale for skipping a separate `/impeccable audit` pass (its actual
catch-surface — contrast, heading hierarchy, ARIA correctness — was already
independently verified twice by reviewer + auditor) is acceptable and should be
recorded in the gate output, not silently skipped.
