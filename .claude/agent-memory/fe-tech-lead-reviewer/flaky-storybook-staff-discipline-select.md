---
name: flaky-storybook-staff-discipline-select
description: staff-discipline-screen "CreateViolationDialogStaffMemberStaticSelect" story fails intermittently in the full storybook run but passes in isolation
metadata:
  type: project
---

`src/features/staff-discipline/presentation/staff-discipline-screen/staff-discipline-screen.stories.tsx`
→ `Create Violation Dialog Staff Member Static Select` intermittently fails the FULL
`bun vitest --config vitest.storybook.mts run` with
`expect(trigger).toHaveTextContent("Đỗ Thị Mai")` receiving `"Nguyễn Thị Hương — Tổ Toán"`
(the re-open + second-selection half of the story; Radix Select pointer/typeahead timing).
Re-running that one file alone passes 40/40.

**Why:** observed 2026-09-15 reviewing US-E24.15 (messaging), a branch that touches nothing in
`staff-discipline` — so a full-suite red there is not the branch under review.
**How to apply:** when the storybook suite comes back `1 failed | 172 passed` on an unrelated
branch, re-run the single failing story file before writing a blocking finding; report it as a
flaky-suite follow-up to `fe-lead`, not a story defect.

Related: [[flaky-storybook-principal-classes]], [[flaky-rsc-guard-tests]],
[[review-checks-storybook-module-fixtures]].
