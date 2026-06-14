---
name: us-e13.5-qa-patterns
description: US-E13.5 principal teachers screen — recurring story/coverage gaps found in QA gate
metadata:
  type: feedback
---

For principal-teachers-screen stories, the following gaps recurred that QA must check on any similar screen:

1. **Error state story missing** — AC-4 requires error state with retry; the error render branch was implemented in the component but no `TeacherList_Error` story exercised it. Always write a story for `fetchError !== null`.

2. **Retry button absent** — AC-4 says "error state with retry" but the error block renders text only (role="alert", no retry Button). This is a MAJOR finding.

3. **AssignmentSheet_Open play does not assert GVCN pre-select** — AC-6 requires the current GVCN class be pre-selected when sheet opens. The story only checks `gvcnSection` text presence, not the Select value.

4. **Overflow badge fixture gap** — AC-1 requires "+N" overflow badge for >3 subject assignments. None of the 3 teacher fixtures have >3 assignments; overflow path is code-covered but not play-exercised.

5. **AssignmentSheet_Save_Loading story missing** — validation table in story.md lists it as required 5th E2E proof but only 5 stories cover Loading/Populated/Empty/Open/WithConflict.

**Why:** These are systematic "visual-only" gaps — the component logic is correct but the story interaction coverage leaves ACs partially asserted.
**How to apply:** When reviewing story files for screens with assignment/mutation UIs, explicitly grep for: error story, retry button, pre-select assertion, fixture with >max visible items, and save-loading story.
