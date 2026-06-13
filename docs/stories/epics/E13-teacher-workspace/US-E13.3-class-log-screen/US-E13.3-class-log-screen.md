# US-E13.3 Class Log Screen — Sổ Đầu Bài (Teacher) + Review/Approve (Principal)

## Status

planned

## Lane

normal

## Dependencies

- Depends on: US-E13.1 (teacher class view — class context), BE US-044 (homeroom book API — planned)
- Blocks: none
- Feature module(s) chạm: `src/features/class-log/` (new feature)
- Shared contract/file: `bootstrap/endpoint/class-log.endpoint.ts` (new)

## Product Contract

Sổ đầu bài số hóa theo tiết học. Mỗi buổi học, giáo viên ghi nhận nội dung bài
học, nhận xét lớp, sĩ số, rồi submit. Hiệu trưởng / BGH review và approve.

**Màn hình `/teacher/class-log`:**
- Danh sách tiết học hôm nay / tuần này của GV. Mỗi tiết: lớp, môn, tiết, trạng
  thái (DRAFT / SUBMITTED / APPROVED).
- Form điền sổ: nội dung bài học (text, required), nhận xét lớp (optional),
  sĩ số có mặt, tự động pull từ điểm danh nếu đã điểm danh.
- Submit → SUBMITTED; GV không sửa được sau khi submit.

**Màn hình `/principal/class-log`:**
- Danh sách sổ đầu bài của toàn trường theo ngày / lớp / GV.
- Filter: ngày, lớp, GV, trạng thái.
- Approve từng record hoặc batch approve.
- Comment / reject với lý do (optional).

RBAC: TEACHER write (own records) + read own. PRINCIPAL/ADMIN read all + approve/reject.

**Mock-first flag**: BE US-044 (`homeroom book`) hiện `planned` — implement
clean arch domain + mock repo first; wire real BE khi US-044 ships.

## Relevant Product Docs

- `docs/product/screens.md` — "Class Log" rows (Teacher + Principal)
- `design_src/edu/classops.jsx` — `ClassLogScreen` component (pixel reference)
- BE story: `edu-api/docs/stories/epics/E04-core-school-operations/US-044-homeroom-book/`
- BE API (MOCK-FIRST — US-044 planned):
  - `GET /core/api/v1/class-log` (teacher view)
  - `POST /core/api/v1/class-log` — create entry
  - `PATCH /core/api/v1/class-log/:id` — update draft
  - `POST /core/api/v1/class-log/:id/submit`
  - `POST /core/api/v1/class-log/:id/approve` (principal)
  - `POST /core/api/v1/class-log/:id/reject`

## Acceptance Criteria

**Teacher flow:**
- AC-1: Teacher xem danh sách tiết hôm nay từ timetable (pull from `/admin/timetable` data).
- AC-2: Form điền sổ: nội dung bài học required; sĩ số auto-filled từ attendance nếu có.
- AC-3: Submit → trạng thái SUBMITTED → readonly. Không thể sửa sau submit.
- AC-4: DRAFT saves incrementally (auto-save hoặc Save button).
- AC-5: Loading, empty ("Không có tiết học hôm nay"), error states.

**Principal flow:**
- AC-6: Principal xem toàn bộ class logs, filter by date/class/teacher/status.
- AC-7: Approve single → APPROVED. Batch approve (checkbox select).
- AC-8: Reject với comment → REJECTED + reason stored; GV thấy reason.

**Cross-cutting:**
- AC-9: Tất cả strings qua i18n namespace `classLog`.
- AC-10: WCAG 2.1 AA.

## Design Notes

- `ClassLogScreen` trong `classops.jsx` bao gồm cả attendance + class log — tách thành 2 feature modules riêng.
- Reuse attendance screen pattern cho "pull sĩ số from attendance".
- Status badge: DRAFT=warning, SUBMITTED=primary, APPROVED=success, REJECTED=error.
- Commands: `createClassLog`, `updateClassLog`, `submitClassLog`, `approveClassLog`, `rejectClassLog`.
- Queries: `listMyClassLogs`, `listAllClassLogs`.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Use-cases: createLog (valid/missing-content), submitLog (already-submitted), approveLog (not-submitted) |
| Integration | ClassLogRepository (mock-first) |
| E2E | Storybook: TeacherView/DraftForm/SubmittedReadonly/PrincipalReview/ApprovedState |
| Platform | bun build + tsc clean |

## Harness Delta

- `docs/TEST_MATRIX.md`: thêm hàng US-E13.3 (mock-first).
- `docs/product/screens.md`: update "Class Log" rows → `🎨 design-ready`.
