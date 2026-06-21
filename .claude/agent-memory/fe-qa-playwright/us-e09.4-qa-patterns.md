---
name: us-e09.4-qa-patterns
description: Parent discipline & leave view — QA patterns, AC gaps, security checks, story coverage
metadata:
  type: project
---

## US-E09.4 Parent Discipline & Leave View — QA patterns

**Blocked by missing tech-lead reviewer verdict.** Story status is `in-progress`; no `fe-tech-lead-reviewer` APPROVED commit or artifact exists in the packet. The a11y fixes and DR-GATE fixes land (commits `facecdf` + `859caeb`) but the tech-lead code-review gate has not been recorded.

**Why:** QA gate rule requires TechLead=APPROVED before sign-off. The story packet (spec.md §10) names the gate but it has not executed.

**How to apply:** When this US is re-submitted, verify a `fix(discipline): US-E09.4 tech-lead review` or similar commit exists with TLR findings resolved before running QA.

## What is already complete (for when gate re-runs)

- 912/912 Vitest pass, 185 files.
- 10 Storybook stories with `play()` assertions covering all 8 AC story targets.
- Security: `parentId`/`submittedBy` not present in `actions.ts` request bodies (comment in `LeaveRequestForm.tsx` line 54 confirms this).
- RBAC: `page.tsx` checks `role !== "parent"` and redirects BEFORE any data fetch.
- "Ghi nhận vi phạm" is absent from all parent-discipline components (only appears as a test-only const in stories file).
- i18n: reuses `discipline.studentConduct.*` namespace, no hardcoded Vietnamese strings in tsx files.
- A11Y fixes applied: `text-edu-text-secondary` (5.10:1) replaces `text-muted-foreground` (2.75:1); aria-label on score circle; `text-edu-success-text` on empty-violations icon.

## Story coverage gaps (minor)

- `ParentDisciplineScreen_LeaveForm_Valid`: success banner asserts GVCN name visible but does NOT assert the new pending row appears in the leave history list with status "Chờ duyệt". AC4 optimistic update partially untested in stories.
- No story exercises `startDate` past-date validation (AC-04 date validation path). The unit test covers it in `SubmitChildLeaveRequestUseCase` but the form story (`LeaveForm_Validation`) only covers reason-too-short.
- No story for no-linked-children empty state (AC edge case).

## Integration test coverage

`MockDisciplineRepository` child-scoped tests in `discipline.repository.test.ts`: getChildConductSummary not-found, getChildViolations c1/c2, getChildLeaveRequests rejected entry, submitLeaveForChild prepend + not-found.
