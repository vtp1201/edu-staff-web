# US-E09.4 Parent Discipline & Leave View

## Status

planned

## Lane

normal

## Dependencies

- Depends on: US-E09.2 (student conduct screen — shared domain entities `ConductSummary`, `Violation`, `LeaveRequest`; shared `features/discipline` module)
- Blocks: none
- Feature module(s) chạm: `src/features/discipline/` (extends existing module with parent role variant)
- Shared contract/file: `bootstrap/endpoint/discipline.endpoint.ts` (existing, extend with `/parent/children/:childId/conduct` and `/parent/children/:childId/leave-requests`); `features/discipline/domain/` entities reused

## Product Contract

Màn hình dành cho **phụ huynh** (`parent` role) để xem hồ sơ kỷ luật và hạnh kiểm
của con, đồng thời nộp đơn xin nghỉ phép thay cho con. Route: `/parent/discipline`.

**Cấu trúc màn hình (ParentDisciplineScreen từ `discipline.jsx` edustaff_5):**

### 1. Child selector (nếu có nhiều con)
- Dropdown hoặc tab chọn con khi phụ huynh có nhiều con đang học.
- Mỗi lần đổi con, toàn bộ dữ liệu reload theo `childId`.

### 2. Thẻ tổng hợp hạnh kiểm của con
- Điểm hạnh kiểm hiện tại (0–100, auto-calc từ vi phạm).
- Xếp loại hạnh kiểm: Tốt ≥90 / Khá ≥70 / TB ≥50 / Yếu <50.
- Badge màu theo xếp loại (success/primary/warning/error).
- Tên con + lớp + GVCN.
- Read-only (phụ huynh không override được).

### 3. Lịch sử vi phạm của con (read-only)
- Danh sách vi phạm: ngày, loại, mức độ (Nhẹ/Vừa/Nặng badge), trừ điểm.
- Empty state khi con chưa có vi phạm.
- Không có form "ghi nhận vi phạm" (chỉ giáo viên/BGH mới có).

### 4. Form xin nghỉ phép cho con (Leave Request on child's behalf)
- Cùng UI pattern với US-E09.2 (StudentDisciplineScreen — LeaveRequestForm):
  - Ngày bắt đầu (≥ ngày hôm nay).
  - Ngày kết thúc (≥ ngày bắt đầu).
  - Loại nghỉ: nghỉ bệnh / việc gia đình / khác.
  - Lý do (≥ 10 ký tự).
  - Submit → trạng thái `pending`.
- Validation giống US-E09.2 (reuse domain `SubmitLeaveRequestUseCase`).

### 5. Danh sách đơn xin nghỉ của con
- Lịch sử đơn: ngày nộp, khoảng thời gian, lý do (rút gọn), trạng thái (pending/approved/rejected).
- Khi rejected: hiển thị lý do từ chối của giáo viên/BGH.
- Phụ huynh không hủy được đơn đã nộp (read-only sau khi submit).

**RBAC:** Chỉ `parent` role thấy màn này. Phụ huynh chỉ truy cập được dữ liệu của
con mình (`parentId` scoped — BE enforce). Admin/teacher không có route `/parent/discipline`.

**Mock-first:** `core` service chưa ship — dùng `MockDisciplineRepository` kết hợp
mock con theo `childId` (tương tự pattern trong US-E09.2 parent variant).

## Relevant Product Docs

- `docs/product/screens.md` — Parent section
- `docs/product/roles-permissions.md` — parent role constraints
- Design source: `design_src/edu/discipline.jsx` `ParentDisciplineScreen` (edustaff_5 handoff, line ~969)
- Epic overview: `docs/stories/epics/E09-discipline-conduct/EPIC-OVERVIEW.md`

## Acceptance Criteria

**AC1 — Xem hạnh kiểm con:**
- Parent login → `/parent/discipline` → thấy thẻ hạnh kiểm với điểm, xếp loại badge, tên con, lớp.

**AC2 — Multi-child switcher:**
- Khi phụ huynh có ≥2 con, switcher hiển thị. Đổi con → dữ liệu reload đúng childId.
- Khi chỉ có 1 con, switcher ẩn (không hiển thị).

**AC3 — Xem vi phạm (read-only):**
- Danh sách vi phạm của con hiển thị đúng mức độ badge (Nhẹ/Vừa/Nặng).
- Empty state: "Con bạn chưa có vi phạm nào" khi list trống.
- Không có nút "Ghi nhận vi phạm" (forbidden cho parent role).

**AC4 — Nộp đơn xin nghỉ:**
- Form xin nghỉ hiển thị. Submit với dữ liệu hợp lệ → đơn xuất hiện trong danh sách với trạng thái `pending`.
- Ngày bắt đầu < hôm nay → validation error "Ngày bắt đầu phải từ hôm nay trở đi".
- Lý do < 10 ký tự → validation error "Lý do phải có ít nhất 10 ký tự".

**AC5 — Xem lịch sử đơn:**
- Đơn đã nộp xuất hiện với status badge (pending=warning / approved=success / rejected=error).
- Đơn bị từ chối: hiển thị "Lý do từ chối: [reason]".

**AC6 — RBAC enforcement:**
- Teacher/principal/student/admin truy cập `/parent/discipline` → redirect hoặc 403 trang.
- Parent chỉ thấy đúng con của mình (childId scoped).

**AC7 — Loading + Error states:**
- Loading skeleton hiển thị khi đang fetch dữ liệu.
- Error state với nút retry khi API thất bại.

**AC8 — Accessibility:**
- Conduct badge có `aria-label` mô tả đầy đủ (không chỉ màu).
- Form fields có `<label>` liên kết, `aria-invalid` + `aria-describedby` khi lỗi.
- Touch targets ≥ 44×44px.

## Design Notes

- Design source: `edustaff_5/edu/discipline.jsx` `ParentDisciplineScreen` (line ~969), `ParentLeaveView` sub-components
- Commands: `SubmitLeaveRequestUseCase` (reuse từ US-E09.2, thêm `childId` param)
- Queries: `GetChildConductSummaryUseCase`, `GetChildViolationsUseCase`, `GetChildLeaveRequestsUseCase`
- API: `core` service — mock-first (decision 0014)
  - `GET /discipline/children/:childId/conduct-summary`
  - `GET /discipline/children/:childId/violations`
  - `GET /discipline/children/:childId/leave-requests`
  - `POST /discipline/children/:childId/leave-requests`
- Domain rules:
  - Conduct score = 100 + sum(violation.points) — sàn 0 (reuse logic từ E09.1).
  - Leave request date validation: `startDate >= today`, `endDate >= startDate`, `reason.trim().length >= 10`.
  - Parent chỉ access `childId` thuộc danh sách con của mình (BE enforce; FE trust token claim).
- UI surfaces: `/parent/discipline` — Page RSC + `ParentDisciplineScreen` client component (extends `features/discipline/presentation/`).
- Component placement: `ParentDisciplineScreen` → `features/discipline/presentation/parent-discipline/` (single-screen → feature-local per component-organization.md rule).
- Extend `MockDisciplineRepository` với mock children data keyed by `childId`.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `GetChildConductSummaryUseCase`, `GetChildViolationsUseCase`, `GetChildLeaveRequestsUseCase`, `SubmitLeaveRequestUseCase` (extended với childId — thêm 3–5 test cases); conduct score calc với childId |
| Integration | `MockDisciplineRepository` child-scoped methods (getChildConduct, getChildViolations, submitLeaveForChild) |
| E2E | Storybook: Loading / ConductCard / ViolationsReadOnly / EmptyViolations / LeaveRequestForm (validation) / LeaveHistoryWithRejection / MultiChildSwitcher / ErrorState |
| Platform | — |
| Release | Design review gate passed; WCAG 2.1 AA audit (fe-accessibility-auditor) |

## Harness Delta

- Add row `US-E09.4` to `docs/TEST_MATRIX.md` when implemented.
- Update `docs/product/screens.md` Parent section: `/parent/discipline` → `implemented`.

## Evidence

(empty — fill after implementation)
