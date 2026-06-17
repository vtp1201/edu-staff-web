---
name: us-e09.3-qa-patterns
description: US-E09.3 staff leave screen — QA patterns, findings, defects to watch
metadata:
  type: project
---

# US-E09.3 Staff Leave Management QA Patterns

## Key findings

**Failure type naming drift (MAJOR):** Story packet spec uses `missing-reason` as single failure type; implementation correctly splits it into `missing-reject-reason` (empty) and `reason-too-short` (< 10 chars). This is a BETTER implementation than the spec but a traceable deviation. i18n keys in vi/en.json match the implementation types (not the spec types), so the system is internally consistent. Missing from spec's planned set: `unauthorized` and `unknown` failure types — neither in implementation nor i18n.

**Story count gap (MINOR):** Spec §7 calls for 8 stories (EmptyState_All + EmptyState_Pending separate). Implementation ships 7 stories with a single EmptyState. The EmptyState_Pending filter variant is covered by FilteredPending story instead.

**Tech-lead sign-off:** Story packet has no formal tech-lead reviewer section. The feature was merged directly to main (commits `b952ca6` + `0d17e07`) without a separate tech-lead review commit. Evidence of quality gate: A11Y-008–016 fix commit implies a11y review ran; TEST_MATRIX row is complete.

**Toast implementation deviation (INFO):** State engineer spec recommended `sonner` toast; implementation uses custom `useState + useEffect` timer approach. Both are valid; the implementation avoids a `useTransition` + `sonner` interaction complexity. Race 5 (timer leak) is correctly handled via `useRef` timer + useEffect cleanup.

**Date format in entity vs spec:** Entity stores dates as `DD/MM/YYYY` (not ISO YYYY-MM-DD as spec planned). Date filter comparison converts via `dateKey()` helper (custom) rather than lexicographic ISO string comparison. This works but deviates from spec's stated rationale for ISO normalization. Watch for date filter edge cases.

**Nav entry confirmed:** `/admin/staff-leave` is registered in nav-config.ts line 114 with `CalendarClock` icon and `staffLeave` labelKey.

## Locator patterns that work
- Approve button: `getByRole('button', { name: /Phê duyệt — <staffName>/ })`
- Reject button: `getByRole('button', { name: /Từ chối — <staffName>/ })`
- Toast: `getByText("Đã phê duyệt đơn nghỉ phép.")` or "Đã từ chối đơn nghỉ phép."
- Filter pills: `getByRole('button', { name: /Chờ duyệt/ })`
- Reject textarea: `findByRole('textbox')` after click (single textarea in DOM)
- Error banner: `getByText("Không thể tải danh sách đơn nghỉ phép.")`
- Empty state: `getByText("Không có đơn xin nghỉ nào.")`

## Test counts (448 total / 91 files — all green)
- RejectStaffLeaveUseCase: 5 tests
- ApproveStaffLeaveUseCase: 3 tests
- GetStaffLeaveRequestsUseCase: 3 tests
- nav-config admin staff-leave: 1 test
- Total US-E09.3 direct tests: 12

**How to apply:** For future E09.x QA runs, watch for the same failure-type naming drift pattern between spec and domain layer. Always verify i18n keys against actual `StaffLeaveFailure` union, not the story packet's planned key table.
