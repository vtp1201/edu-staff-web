---
name: project-e12-13-subject-detail-route
description: US-E12.13 Subject Detail deep-link route — closed screens.md gap NEW-02
metadata:
  type: project
---

US-E12.13 implemented and merged to main (9856940, 2026-07-26): full-page
`/admin/subjects/[id]` route closing NEW-02. Extracted the Sheet's editor
body into `useSubjectDetailForm` + `SubjectDetailFields` (zero-edit
regression-preserving proof: `git diff` on the existing
`subjects-screen.stories.tsx` stayed empty throughout); promoted
`ArchiveSubjectDialog` out of the table screen for a 2nd consumer.

**Why:** decision-0026 component-organization discipline — a Sheet-only
implementation blocked deep-linking/bookmarking; the design mockup
(`design_src/edu/subject-detail.jsx`, US-048/ADR 0036) was always a
full-page spec, never wired to a route.

**How to apply:** this is the reference pattern for "content lives in a
Sheet, now also needs its own route" — split into a framework-agnostic
hook (pure state/validation helpers, unit-testable without RTL since this
repo has no `@testing-library/react`) + a presentational fields component,
consumed by both the Sheet (thin wrapper) and the new page.

**Review found (worth re-checking on similar "Sheet → also a full page"
work):** a full-page surface can silently NOT inherit "archived ⇒
read-only" from the Sheet if the Sheet never needed that state (Sheet only
opens on active-row edit). Design mockup's `disabled={isArchived}` on every
field + hidden save-bar wasn't in the Sheet's AC, so it wasn't in the
Sheet — but it IS in the full-page mockup, and reviewer caught it as a
real gap (admin could edit+Save an archived subject with zero guard
anywhere in the stack). Check the *target* mockup's states independently
of what the existing narrower surface already covers.

**AC-2 amendment pattern:** reviewer found "name required" was never
enforced anywhere in the stack (pre-existing US-E12.3 gap) even though
this story's AC named it — fe-lead amended the AC to match reality rather
than growing shared validation logic outside the story's declared scope,
tracked as a follow-up candidate. See [[feedback-ac-amend-vs-scope-creep]].

Two API-overload (529) agent-launch failures on the same fix-task in a
row before a clean 3rd retry — check `git status`/`git log` before
retrying (both times only memory files were dirty, no lost production
code) rather than assuming work was lost.
