---
name: us-e09.5-qa-patterns
description: QA patterns and coverage gaps found during US-E09.5 Staff Discipline final QA pass
metadata:
  type: project
---

US-E09.5 passed QA with CONDITIONAL PASS→closed to PASS after test-only gap fills (no
production-code changes needed). 68 ACs, ~30 pre-existing stories were already unusually
rigorous (per-AC comments in both stories and use-case tests) — worth noting for future
audits: a spec this detailed makes literal-AC-text vs actual-test-scope mismatches easy to
spot by re-reading the AC wording closely, not just trusting a story title.

**Gaps found (closed with new Storybook stories, no prod code touched):**
1. AC-002.2's literal subject is the **staff-member** select ("no network call ever fires
   for this field") — a fix-pass commit had added a near-identical test for the
   **category** select only (`CreateViolationDialogCategoryStaticSelect`), and it was easy
   to mistake that for AC-002.2 coverage. Added
   `CreateViolationDialogStaffMemberStaticSelect` asserting the exact 3-entry roster on
   TWO opens + zero action-spy calls. **Lesson: when a spec explicitly names a field, grep
   for that literal noun in existing stories before accepting an adjacent field's test as
   proof.**
2. AC-002.7/AC-007.9 ("dialog stays open on network error, values preserved") — the
   create-violation dialog's network-error story only asserted "a dialog exists" without
   ever filling fields first (so "preserved" was unproven), and the set-conduct-note
   dialog had ZERO network-error story at all despite `spec.md` explicitly calling out
   "both dialogs" as needing this. Fixed by filling every required field before triggering
   the error and asserting `toHaveValue`/`toHaveTextContent` post-error for both dialogs.
3. AC-006.3 (teacher zero mutation controls) had a Storybook proof for the Violations tab
   (`ViolationsTabPopulatedTeacherReadOnly`) but NOT for the Conduct Notes tab — even
   though code review confirms `isPrincipal` gates the entire term-bar/dialog/row-button
   set identically on both tabs. Added `ConductNotesTabTeacherZeroMutationControls`.

**NFR-008/NFR-009 security suite (`staff-discipline.mock.repository.security.test.ts`)**
is exemplary — a dedicated file testing all 8 mutating ops × 4 forged roles directly
against the repository (not UI-hidden-only), list-scope enforcement, 409 lock on a
dedicated APPROVED fixture, and a "no existence leak" test (forbidden fires before
not-found). Use this file as the template for any future high-risk-grade security gate.

**Reliable locator/test-writing pitfalls found on this screen:**
- Radix `Select` (inside a `Dialog`) leaves the DIALOG subtree `aria-hidden="true"` on
  its CHILDREN (not always the root `role="dialog"` element itself) for a beat after the
  option is chosen — role-based queries (`getByRole`) issued right after a Select
  interaction can spuriously fail even though the element is visually present. Two
  reliable fixes, pick whichever fits: (a) do all role-based interactions (radiogroup,
  buttons) BEFORE the Select interaction, and use label-based queries
  (`getByLabelText`/`getByText`) AFTER it (unaffected by the aria-hidden a11y-tree
  exclusion); or (b) pass `{ hidden: true }` to the post-Select `getByRole` call to
  sidestep the exclusion entirely instead of racing a `waitFor` against it.
- `userEvent.type` into a `Textarea` with Vietnamese diacritic text CAN truncate mid-string
  under some interleavings (seen with "Ghi chú cần lưu lại khi lỗi mạng." → cut off after a
  few chars) even though the same pattern works fine elsewhere in this same file
  (`RejectPanelHappy`). When it's flaky, switch that one field to `fireEvent.change` (which
  every other numeric/date field in this codebase already uses) rather than chasing the
  race in `userEvent.type`.
- `bunx vitest run --config vitest.storybook.mts -t "<name>"` does NOT filter by story/file
  name the way `-t` filters test names elsewhere in this suite — it matched zero and
  reported "146 skipped". Pass the FILE PATH directly instead:
  `bunx vitest run --config vitest.storybook.mts <path-to-.stories.tsx>`.

**How to apply:** On any story with an explicit "confirm this is asserted, not just coded"
QA brief, literally grep the AC's exact subject noun in the story file before accepting an
adjacent/similar-looking story as proof — this repo's engineers write very AC-specific
comments, which makes it easy to conflate a sibling AC's test with the one actually named.
