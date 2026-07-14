---
name: dr-020-net-new-pattern
description: DR-020 student-assignments — genuine net-new authoring (not reconcile), lean pipeline shortcut, and premature-checkbox gotcha with uiux-docs-manager
metadata:
  type: feedback
---

DR-020 (Student Assignments, US-E11.7) was the first DR in a long streak where
the already-implemented check came back **negative** — no `src/features/lms`
assignment code, no i18n namespace, only a skeletal ~13-line stub already
sitting in `design-spec.jsonc` (`lms.assignments`) as a placeholder. Confirms
the already-implemented grep check must be run every time — assuming
"probably reconciled like the last 8 DRs" would have been wrong here.

**Lean pipeline shortcut that worked**: skipped `uiux-product-manager` (not
net-new product framing, just a new screen in an established epic),
`uiux-researcher` (status-badge/card/states patterns are already fully
normative in `design-system.md` + sibling `design_src/edu/*.jsx` files — no
novel UX question to research), `uiux-brainstormer` (only one sane layout
direction given 3+ analogous sibling screens: exam.jsx, exam-bank.jsx,
gradebook.jsx), and `uiux-design-system-builder` (no new token needed, status
mapping already exists). Went straight designer + ux-writer (parallel) →
docs-manager. This was NOT flagged as a shortcut violation because the DR
packet itself documented *why* each step was skipped ("Reused patterns"
section) — future DRs on well-established screen types can do the same, but
must still write out the reasoning in the DR so it's auditable.

**Gotcha**: `uiux-docs-manager`, when asked to sync the DR's delivery
checklist, checked the "Design-review gate passed" box itself — before the
lead had actually run/self-audited the gate. Docs-manager syncs *facts*, it
shouldn't pre-certify a gate it doesn't own. Fix applied: lead added a real
`## Evidence` section (self-audit against `docs/DESIGN_REVIEW.md` checklist)
in a follow-up commit before merging. **For future DRs: instruct
uiux-docs-manager explicitly to leave the design-review checkbox to the lead,
or verify/redo it after docs-manager runs.**

Also confirmed (again): `#fff` / fixed light-tint hex constants (`T.successLight`
etc. from `tokens.js`) inside `design_src/edu/*.jsx` reference mockups are an
established, repo-wide convention (not a raw-color violation) — these files
predate the runtime `tokens.css` semantic-class convention and are exempt by
precedent (checked against `exam.jsx`, `gradebook.jsx`, `invitations.jsx`).
Don't flag these as design-system violations during self-audit.

Related: [pipeline-conventions](pipeline-conventions.md).
