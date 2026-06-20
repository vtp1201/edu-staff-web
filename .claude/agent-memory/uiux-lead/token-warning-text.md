---
name: token-warning-text
description: #9A6A0F amber-on-warningLight pattern in 7 handoff screens — ADR 0046 flagged --edu-warning-text
metadata:
  type: project
---

## Fact

The 1506 design handoff uses `#9A6A0F` (dark amber) as text color on `warningLight`
(#FEF5E5) backgrounds in 7 screens: assessment.jsx, audit-log.jsx, gradebook.jsx,
grade-entry.jsx, academic-record-view.jsx, announcements.jsx, discipline.jsx.

This is a "warning-text" semantic pattern analogous to `--edu-success-text` and
`--edu-error-text` (ADR 0027). ADR 0046 registered 2026-06-20.

**Contrast:** 4.37:1 on warningLight — passes only for large/bold text (≥14px bold).
Used in handoff exclusively at 14px/800 weight.

## Why

The existing `--edu-warning-foreground: #2a3547` is for text on the warning color itself
(warning as background). #9A6A0F is a darker amber for text headings ON the light surface.

## How to apply

When reviewing any screen that uses `#9A6A0F` as text color → it should map to
`var(--edu-warning-text)` once that token is added to `src/app/tokens.css`.
Do not approve FE implementation until this token is added and wired.
The FE team must add `--edu-warning-text: #9a6a0f` to tokens.css before implementation.
