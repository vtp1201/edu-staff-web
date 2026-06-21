---
name: us-e13.7-qa-patterns
description: Grade Book Parent Child-Switcher (US-E13.7): aria-disabled vs toBeDisabled story defect + coverage gaps
metadata:
  type: project
---

**Key defect: `aria-disabled` vs `toBeDisabled()` mismatch (MAJOR)**
`ChildSwitcher` correctly uses `aria-disabled={isLoading && !isActive}` on `<button role="tab">` per WCAG 2.1 AA (no native `disabled` on tab elements). But `ParentView_SwitchLoading` story in both `child-switcher.stories.tsx` (line 69-70) and `grade-book-screen.stories.tsx` (line 253) assert `expect(tabs[0]).toBeDisabled()`.

`@testing-library/jest-dom` v6.9.1 `toBeDisabled()` calls `element.hasAttribute('disabled')` for `<button>` — it does NOT check `aria-disabled`. So:
- `expect(tabs[0]).toBeDisabled()` FAILS (no native `disabled` attr set)
- Correct assertion: `expect(tabs[0]).toHaveAttribute('aria-disabled', 'true')`

**Why:** The component was updated to use `aria-disabled` per TLR-001/A11Y-004 fix (commit 0698d69), but stories weren't updated to match.

**AC6 keyboard coverage gaps (MINOR)**
ArrowLeft/Right focus-only and Enter/Space activate keyboard handlers exist in the component (handleKeyDown) but no unit test exercises these keyboard flows. The story `ParentView_MultiChild_Switch` exercises mouse click but not keyboard.

**Tech-lead approval evidence**
Commit `fix(grades): US-E13.7 a11y A11Y-001–007 + TLR-001 dead key` shows TLR-001 was reviewed and fixed. Pattern: TLR-NNN in commit message = tech-lead finding addressed.

**TEST_MATRIX shows `planned`** even though fully implemented — need update to `implemented` with proof counts.

**How to apply:** When reviewing loading-state tab stories, always check if `aria-disabled` is used instead of native `disabled`. `toBeDisabled()` = native attribute; `toHaveAttribute('aria-disabled', 'true')` = ARIA attribute. These are different DOM properties.
