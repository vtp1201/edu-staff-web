# US-E15.2 Teacher Schedule View (Read-only — lịch dạy cá nhân)

## Status

planned

## Lane

normal

## Dependencies

- Depends on: US-E15.1 (Timetable read-only view — chung `features/timetable/` + `TimetableGrid`), US-E12.5 (Timetable Builder — admin xếp TKB; US-E15.2 consume kết quả filter theo giáo viên)
- Blocks: none
- Feature module(s) chạm: `src/features/timetable/` (extends — reuse `TimetableGrid` từ US-E15.1; KHÔNG tạo module mới)
- Shared contract/file: `bootstrap/endpoint/timetable.endpoint.ts` (thêm query lịch theo teacher), `TimetableGrid` component (shared visual với US-E15.1 + admin builder)

## Bối cảnh — vì sao tách thành US riêng (không gộp US-E15.1)

Quyết định 2026-06-19: user xác nhận **giáo viên cũng cần xem TKB**. Tách thành US-E15.2
(không mở rộng US-E15.1) vì **nguồn dữ liệu khác nhau**:
- US-E15.1 (student/parent): TKB của **một lớp** (`classId` từ profile học sinh / con).
- US-E15.2 (teacher): **lịch dạy cá nhân** — tổng hợp các tiết giáo viên dạy **xuyên nhiều lớp**
  (`teacherId` → các slot trải nhiều lớp khác nhau trong cùng một grid tuần).

Visual grid giống nhau (reuse `TimetableGrid`), nhưng query + ô hiển thị khác (ô teacher
hiển thị **tên lớp** thay vì tên giáo viên). EPIC-OVERVIEW E15 trước đây để teacher view ở
"TBD (US-E15.2)" — nay chính thức hoá.

## Product Contract

Màn hình thời khoá biểu **chỉ đọc** dành cho giáo viên (`teacher`): hiển thị lịch dạy cá
nhân trong tuần. Design source: `edustaff_5/edu/timetable-view.jsx` (`TimetableViewScreen` —
biến thể teacher; reuse grid layout).

Deliberately **decoupled** khỏi `TimetableBuilderScreen` (admin, US-E12.5):
- Không có edit affordance, không slot editor, không conflict detection/panel.
- Ô trống hiển thị "—".

**Route:**
- `/teacher/schedule` — giáo viên xem lịch dạy của mình.

### Layout màn hình

**Top bar:**
- `Năm học` selector (read-only label hoặc dropdown nếu multi-year).
- Label "Lịch dạy của tôi" (hoặc tên giáo viên đang đăng nhập).
- `Xuất PDF` ghost button (optional, có thể defer).

**Weekly grid (reuse `TimetableGrid`):**
- Cột: Thứ 2 → Thứ 7 (6 cột). Hàng: Tiết 1–5, "Giải lao trưa" (striped, merged), Tiết 6–10.
- Tiết label trái: số tiết + giờ bắt đầu/kết thúc (muted).

**Cell states (biến thể teacher):**
- **Trống (giáo viên không dạy tiết này):** nền `#F5F7FA`, text "—" muted, không click.
- **Có tiết dạy:** nền `subjectColor/15`, 3px left border `subjectColor`. Hiển thị:
  - Line 1: tên môn học (12px fw-700, màu subjectColor).
  - Line 2: **tên lớp** (10px muted) — khác US-E15.1 (vốn hiển thị tên giáo viên).
  - Line 3: phòng học (10px muted).
  - Không có pencil/edit icon khi hover.

**Subject legend:** dưới grid — chỉ môn giáo viên thực sự dạy trong tuần.

**Mock-first:** `core` service chưa ship. `GET /timetable/teacher/{teacherId}?week={weekISO}` →
`MockTimetableRepository` trả lịch dạy mock của giáo viên (reuse fixture `TV_TIMETABLE` filter
theo teacher, hoặc thêm fixture `TV_TEACHER_SCHEDULE`).

## Relevant Product Docs

- `docs/product/screens.md` — Teacher `/teacher/schedule` row
- Design source: `edustaff_5/edu/timetable-view.jsx` `TimetableViewScreen`
- `docs/product/roles-permissions.md` — teacher read-only scope (lịch dạy cá nhân)
- ADR 0044 — design handoff edustaff_5 baseline
- US-E15.1 — student/parent timetable read view (sibling, shared `TimetableGrid`)

## Acceptance Criteria

- AC1 — Teacher: xem lịch dạy của mình:
  - Teacher login → `/teacher/schedule` → grid hiển thị đúng các tiết giáo viên dạy trong tuần (xuyên nhiều lớp).
  - Ô có tiết: tên môn, **tên lớp**, phòng học.
  - Ô trống: "—".
  - Dải "Giải lao trưa" giữa Tiết 5 và Tiết 6.
- AC2 — Không có edit affordance: không nút `+`, không hover pencil, không slot editor, không conflict panel.
- AC3 — Visual consistency: màu môn học (subjectColor/15 + 3px left border) trùng với US-E15.1 + admin TimetableBuilder; reuse `TimetableGrid`.
- AC4 — Subject legend chỉ hiển thị môn giáo viên thực sự dạy.
- AC5 — Loading + Empty + Error:
  - Loading: skeleton grid.
  - Empty (giáo viên chưa có lịch dạy): empty-state + "Bạn chưa có lịch dạy trong tuần này."
  - Error: banner + retry.
- AC6 — Responsive: mobile (320px) grid scroll ngang; tiết label readable.
- AC7 — Accessibility: `<table>` semantics (`<th scope="col">` ngày, `<th scope="row">` tiết), `<caption>` sr-only; màu không là phương tiện thông tin duy nhất; "Giải lao trưa" có `role="row"` + text.
- AC8 — i18n: ngày `t('Thứ 2'...)`, tiết `t('Tiết {n}')`, "Giải lao trưa", "Lịch dạy của tôi" qua namespace `timetable`/`schedule`. Tên môn/lớp/phòng từ BE data.

## Design Notes

- Design source: `edustaff_5/edu/timetable-view.jsx` (reuse grid; teacher cell variant)
- Commands: none (read-only)
- Queries: `GetMyTeachingScheduleUseCase` (teacher) — lấy `teacherId` từ profile → fetch lịch dạy tuần
- API: `core` service — mock-first (decision 0014)
  - `GET /timetable/teacher/{teacherId}?weekStart={YYYY-MM-DD}`
- Domain (reuse + extend `features/timetable/domain/`):
  - Reuse `TimetableSlot` nhưng cell teacher cần `className` thay vì `teacherName` — bổ sung field optional `className?` vào `TimetableSlot`, hoặc `TeacherScheduleSlot { subjectName, className, room, subjectColor }`.
  - `WeeklyTeachingSchedule { teacherId, teacherName, slots: Record<dayIndex, Record<periodNumber, TeacherScheduleSlot | null>> }`
  - Failure: reuse `TimetableFailure = 'not-found' | 'network-error'`
- Component placement (decision 0026):
  - **Reuse `TimetableGrid`** (US-E15.1) — thêm prop `cellVariant: 'class' | 'teacher'` để đổi line 2 (teacher hiển thị tên lớp). KHÔNG fork grid mới.
  - `TeacherScheduleScreen` → `features/timetable/presentation/teacher-schedule/`
  - `SubjectLegend` → reuse từ US-E15.1

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `GetMyTeachingScheduleUseCase` (ok / not-found / network); mapping DTO → `TeacherScheduleSlot` (className present) |
| Integration | `MockTimetableRepository.getTeacherSchedule(teacherId)` — trả đúng slot xuyên nhiều lớp; `not-found` cho unknown teacherId |
| E2E | Storybook: `TeacherView_FullWeek`, `TeacherView_EmptySchedule`, `Loading_Skeleton`, `ErrorState` + mobile (375px); `TimetableGrid` với `cellVariant="teacher"` |
| Platform | bun build + tsc clean |
| Release | design-review gate pass; WCAG 2.1 AA (table semantics + color independence) |

## Harness Delta

- Add row `US-E15.2` to `docs/TEST_MATRIX.md` when implemented.
- Update `docs/product/screens.md`: `/teacher/schedule` → `design-ready` (US-E15.2; `timetable-view.jsx`).
- Update `docs/product/roles-permissions.md`: teacher có quyền xem lịch dạy cá nhân (read-only).

## Evidence

(empty — fill after implementation)
