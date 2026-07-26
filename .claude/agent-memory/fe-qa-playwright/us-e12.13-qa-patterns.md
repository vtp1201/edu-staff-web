---
name: us-e12.13-qa-patterns
description: Subject Detail deep-link route QA — page.tsx wiring proof gap and clean extraction baseline
metadata:
  type: project
---

US-E12.13 (subject-detail deep-link route, `/admin/subjects/[id]`) QA findings:

- `page.test.ts` asserted the composed props shape (subject/classOfferings/parentName/backHref)
  but NOT that `onSave`/`onArchive` were the real `patchSubjectAction`/`archiveSubjectAction`
  function references — a generic stub would have passed the same assertions. Added
  `expect(props?.onSave).toBe(patchSubjectAction)` / `.toBe(archiveSubjectAction)` to close it.
  Recurring pattern from [[us-e18.17-qa-patterns]]/[[us-e18.18-qa-patterns]]: "wiring exists"
  claims need an identity/spy assertion, not just a props-shape assertion.
- Clean extraction: `use-subject-detail-form.ts` + `subject-detail-fields.tsx` shared between
  Sheet (US-E12.3, unchanged — zero diff on `subjects-screen.stories.tsx` confirmed via
  `git diff main...HEAD`) and the new full-page `subject-detail-screen.tsx`. 8 Storybook
  interaction stories (Populated/EmptyOfferings/NotFound/ArchiveBlocked/ArchiveConfirmed/
  ArchivedReadOnly/SaveSuccess/SaveError) all genuinely assert (not vacuous): ArchivedReadOnly
  checks ALL 8 fields individually disabled + both action buttons absent; ArchiveBlocked checks
  `aria-disabled` + keyboard-focusable + click no-op (not a `disabled` button, so tooltip stays
  reachable — correct WCAG pattern).
- `LockHint` icon-only tooltip button (12px icon, no min-w-11) inside curriculum field labels
  is NOT a touch-target violation introduced here — verified via `git log` it was already in
  `subject-detail-sheet.tsx` since US-E12.3 (b7b69e2), carried over verbatim by the
  behavior-preserving extraction. Pre-existing MINOR, not a blocker for this story.
- AC-6 (route inherits admin role guard, no new guard code) has no dedicated
  `admin/layout.test.ts` at all (not just for this route — none of admin's other nested routes
  have one either); the guard logic (`evaluateAdminAccess`) is unit-tested at
  `src/bootstrap/tenant/role-guard.test.ts`, and layout nesting is a Next.js file-convention
  fact, not new code — acceptable proof-by-code-inspection + existing unit coverage, matches
  the AC's own wording ("no new guard code needed").
- RSC `page.test.ts` not-found path correctly proven to NOT redirect (contrast with the
  question-bank `[id]/edit` pattern which does redirect) — genuinely distinct assertion, not
  copy-pasted from a sibling route.
