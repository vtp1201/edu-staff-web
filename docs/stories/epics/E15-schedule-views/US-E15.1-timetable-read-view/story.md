# US-E15.1 Timetable Read-only View (Student + Parent)

## Status

planned

## Lane

normal

## Dependencies

- Depends on: US-E12.5 (Timetable Builder — admin creates TKB; US-E15.1 consumes published data)
- Blocks: none
- Feature module(s) chạm: `src/features/timetable/` (new feature — separate from `features/admin/timetable` builder)
- Shared contract/file: `bootstrap/endpoint/timetable.endpoint.ts` (new — or extend existing if admin builder uses same); token colors for subject cells shared visually with TimetableBuilder

## Product Contract

Màn hình thời khoá biểu **chỉ đọc** dành cho học sinh (`student`) và phụ huynh (`parent`).
Design source: `edustaff_5/edu/timetable-view.jsx` (`TimetableViewScreen`).

Deliberately **decoupled** khỏi `TimetableBuilderScreen` (admin, US-E12.5):
- Không có nút chỉnh sửa (edit affordance hoàn toàn bị bỏ).
- Ô trống hiển thị "—" thay vì "+" button.
- Không có slot editor, không có conflict detection.
- Không có conflict summary panel.

**Routes:**
- `/student/schedule` — học sinh xem TKB lớp của mình.
- `/parent/schedule` — phụ huynh xem TKB của con (có child selector nếu nhiều con).

### Layout màn hình

**Top bar:**
- `Năm học` selector (read-only label hoặc dropdown nếu multi-year data).
- `Lớp` label (học sinh thấy lớp của mình; phụ huynh thấy lớp của con đang chọn).
- `Xuất PDF` ghost button (optional, có thể defer).

**Weekly grid:**
- Cột: Thứ 2 → Thứ 7 (6 cột).
- Hàng: Tiết 1–5, dải "Giải lao trưa" (striped, merged), Tiết 6–10.
- Tiết label trái: số tiết + giờ bắt đầu/kết thúc (muted text).

**Cell states:**
- **Trống:** nền `#F5F7FA`, text "—" màu muted, không có click handler.
- **Có tiết:** nền `subjectColor/15`, 3px left border `subjectColor`. Hiển thị:
  - Line 1: tên môn học (12px fw-700, màu subjectColor).
  - Line 2: tên giáo viên (10px muted).
  - Line 3: phòng học (10px muted).
  - Không có pencil/edit icon khi hover.

**Subject legend:**
- Dưới grid: chỉ hiển thị môn học thực sự có trong TKB tuần này (màu dot + tên).

**Parent multi-child:**
- Nếu phụ huynh có nhiều con, hiển thị `ChildSwitcher` tab tương tự US-E13.7.
- Mỗi con học lớp khác → TKB grid thay đổi theo lớp của con đang chọn.

**Mock data (`TV_TIMETABLE` trong `timetable-view.jsx`):**
- `11A2` — full week đầy đủ (học sinh Nguyễn Minh Khoa).
- `8B1` — tuần thưa hơn (con thứ hai của phụ huynh — Nguyễn Thị Lan Anh).

**Mock-first:** `core` service chưa ship. `GET /timetable/{classId}?week={weekISO}` →
`MockTimetableRepository` trả `TV_TIMETABLE[classId]`.

## Relevant Product Docs

- `docs/product/screens.md` — Student `/student/schedule` + Parent `/parent/schedule` (cả hai đều `⬜ planned`)
- Design source: `edustaff_5/edu/timetable-view.jsx` `TimetableViewScreen`
- `docs/product/roles-permissions.md` — student/parent read-only scope
- ADR 0044 — design handoff edustaff_5 baseline (timetable-view.jsx là file mới)

## Acceptance Criteria

**AC1 — Student: xem TKB lớp mình:**
- Student login → `/student/schedule` → grid hiển thị đúng TKB lớp của mình.
- Ô có tiết: tên môn, tên giáo viên, phòng học.
- Ô trống: "—".
- Dải "Giải lao trưa" nằm giữa Tiết 5 và Tiết 6.

**AC2 — Parent: xem TKB của con:**
- Parent → `/parent/schedule` → thấy TKB của con (classId từ child profile).
- Single child: không có switcher.
- Multi-child: có ChildSwitcher tab; đổi tab → grid reload TKB lớp con khác.

**AC3 — Không có edit affordance:**
- Không có nút `+` ở ô trống.
- Không có hover pencil icon.
- Không có slot editor modal.
- Không có conflict panel.

**AC4 — Visual consistency với TimetableBuilder:**
- Màu môn học (subjectColor/15 background, 3px left border) trùng với admin TimetableBuilder.
- Subject legend chỉ hiển thị môn thực sự dùng trong grid.

**AC5 — Loading + Empty states:**
- Loading: skeleton grid (rows + columns outline).
- Empty class (chưa xếp TKB): empty-state illustration + "Thời khoá biểu chưa được xếp cho lớp này."
- Error: banner + retry button.

**AC6 — Responsive:**
- Trên mobile (320px): grid scroll ngang; tiết label vẫn readable.
- Touch target: ô tiết không cần ≥44px (read-only, không cần tap target).

**AC7 — Accessibility:**
- `<table>` semantics cho grid: `<thead>`, `<th scope="col">` (ngày), `<th scope="row">` (tiết).
- `<caption>` mô tả TKB (sr-only).
- Màu môn học không là phương tiện thông tin duy nhất — có text tên môn.
- Dải "Giải lao trưa" có `role="row"` và text "Giải lao trưa".

**AC8 — i18n:**
- Ngày: `t('Thứ 2', 'Mon')` ... `t('Thứ 7', 'Sat')`.
- Tiết: `t('Tiết {n}', 'Period {n}')`.
- Giải lao: `t('Giải lao trưa', 'Lunch break')`.
- Tên môn, giáo viên, phòng: từ BE data (không i18n mock strings).

## Design Notes

- Design source: `edustaff_5/edu/timetable-view.jsx` `TimetableViewScreen` + `TV_TIMETABLE` seed data
- Subject color palette: `TV_SUBJECTS` trong file (khớp với `TimetableBuilderScreen`)
- Commands: none (read-only)
- Queries:
  - `GetMyTimetableUseCase` (student): lấy `classId` từ student profile → fetch TKB
  - `GetChildTimetableUseCase` (parent): lấy `classId` từ selected child → fetch TKB
- API: `core` service — mock-first (decision 0014)
  - `GET /timetable/class/{classId}?weekStart={YYYY-MM-DD}` (hoặc không filter tuần nếu BE trả full)
- Domain: `TimetableSlot { subjectName, teacherName, room, subjectColor }`, `WeeklyTimetable { classId, className, slots: Record<dayIndex, Record<periodNumber, TimetableSlot | null>> }`
- Failure: `TimetableFailure = 'not-found' | 'network-error'`
- UI surfaces:
  - `/student/schedule` — RSC page → `TimetableViewScreen` client component
  - `/parent/schedule` — RSC page → `TimetableViewScreen` với child-switcher wrapper
- Component placement:
  - `TimetableViewScreen` → `features/timetable/presentation/timetable-view/` (new feature)
  - `TimetableGrid` (shared grid render) → `features/timetable/presentation/timetable-view/timetable-grid.tsx`
  - `SubjectLegend` → same folder (single-screen, feature-local)
  - Không đặt vào `features/admin/timetable` — admin builder là module riêng biệt

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `GetMyTimetableUseCase` (student — ok/not-found/network); `GetChildTimetableUseCase` (parent — ok/not-found/no-child); `TimetableSlot` mapping từ DTO |
| Integration | `MockTimetableRepository.getClassTimetable(classId)` — trả đúng data cho `11A2` và `8B1`; trả `not-found` cho unknown classId |
| E2E | Storybook: `StudentView_FullWeek`, `StudentView_EmptyTimetable`, `ParentView_SingleChild`, `ParentView_MultiChild_Switch`, `Loading_Skeleton`, `ErrorState` + mobile (375px viewport) |
| Platform | — |
| Release | Design review gate passed; WCAG 2.1 AA audit (table semantics + color independence) |

## Harness Delta

- Add row `US-E15.1` to `docs/TEST_MATRIX.md` when implemented.
- Update `docs/product/screens.md`: `/student/schedule` → `planned`, `/parent/schedule` → `planned`.
- Register Epic E15 in harness if applicable.
- Copy `edustaff_5/edu/timetable-view.jsx` → `design_src/edu/timetable-view.jsx` when story starts (per ADR 0044 follow-up).

## Evidence

(empty — fill after implementation)
