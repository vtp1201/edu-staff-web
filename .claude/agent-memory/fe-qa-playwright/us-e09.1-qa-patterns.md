---
name: us-e09.1-qa-patterns
description: QA patterns and coverage gaps found during US-E09.1 Discipline Screen review
metadata:
  type: project
---

US-E09.1 passed QA with CONDITIONAL PASS (2 MAJOR gaps tracked, no BLOCKER/CRITICAL).

**Why:** Story status was "planned" in story.md but the branch had a full implementation.
Story packet `story.md` status was never updated to "implemented".

**Known gaps to track:**
1. AC-3 notifyParent toggle path not exercised in any story `play()` — ViolationsTab_Teacher
   asserts badge/button but never clicks "Nhập vi phạm mới", fills form, and toggles notify.
2. AC-9 (RBAC) student-route guard: no test asserts student can't access the discipline URL;
   relies on middleware-level role routing only; no unit or story coverage.
3. ConductTab empty state story is missing (no story with `conductSummary: []`).
4. Loading story play() only asserts heading present — does not assert `aria-busy=true` on skeleton grid.

**Reliable locators for this screen:**
- `getByRole("button", { name: "Nhập vi phạm mới" })` — teacher CTA
- `queryByRole("button", { name: "Nhập vi phạm mới" })` for principal (absent)
- `getAllByRole("button", { name: /Duyệt đơn nghỉ của/ })` — leave approve buttons
- `getAllByRole("button", { name: /Từ chối đơn nghỉ của/ })` — leave reject buttons
- `getByRole("button", { name: /Sửa hạnh kiểm của/ })` — conduct override
- `getByRole("alert")` — error banner
- `findByRole("dialog")` — reject dialog (teleported to document.body)

**How to apply:** Use these locators in future interaction tests on this screen.
