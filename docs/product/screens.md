# Screen Inventory — EduPortal

Map ~30 màn từ legacy handoff → route + feature theo kiến trúc thật (decision
`0011`: lấy UX/visual, bỏ kiến trúc của handoff). Route theo
`app/[locale]/t/[tenant]/(app)/<role>/...` (tenant segment live — E05.1, decision `0007`).
Status: ✅ done · 🟡 partial · ⬜ planned.

## Auth (Epic E01)

| Screen | Route | Feature | Status |
| --- | --- | --- | --- |
| Login (email + SSO Google/FB/VneID) | `(auth)/login` | `features/auth/presentation/login-form` | 🟡 (email có; SSO ⬜) |
| Select role/tenant (multi-role) | `(auth)/select-role` | `features/auth/presentation` | ⬜ |
| Forgot password (email→OTP→new pw→done) | `(auth)/forgot-password` | `features/auth/presentation` | ⬜ |

## All roles (Epic E08 shell + E10 messaging)

| Screen | Route | Feature | Status |
| --- | --- | --- | --- |
| App shell (Sidebar + Header) | `(app)/layout` | `components/layout/app-shell` | 🟡 |
| Profile (info / security / sessions) | `(app)/(shared)/profile` | `features/user/presentation` | 🟡 (khung) |
| Notifications | `(app)/(shared)/notifications` | `features/notification` | ⬜ (gắn SSE, decision 0009) |
| Messaging (inbox + 1:1 + group) | `(app)/(shared)/messages` | `features/messaging` | ⬜ (Epic E10) |

## Teacher (Epics E02 class-ops, E09 discipline, core)

| Screen | Route | Feature | Status |
| --- | --- | --- | --- |
| Dashboard | `(app)/teacher` | `features/teacher/presentation` | ✅ (UI mock-first) |
| Attendance (điểm danh 3-state) | `(app)/teacher/attendance` | `features/attendance` | ✅ |
| Class Log (sổ đầu bài + submit) | `(app)/teacher/class-log` | `features/class-log` | ⬜ (E02) |
| Discipline (vi phạm/hạnh kiểm/nghỉ phép) | `(app)/teacher/discipline` | `features/discipline` | ⬜ (E09) |
| Grade Book | `(app)/teacher/grades` | `features/grades` | ⬜ |
| Schedule | `(app)/teacher/schedule` | `features/schedule` | ⬜ |
| Classes / Students | `(app)/teacher/classes`,`/students` | `features/teacher` | ⬜ |

## Principal (core + E09)

| Screen | Route | Feature | Status |
| --- | --- | --- | --- |
| School overview dashboard | `(app)/principal` | `features/principal` | ✅ (UI mock-first) |
| Teachers / Classes | `(app)/principal/teachers`,`/classes` | `features/principal` | ⬜ |
| Class Log review/approve | `(app)/principal/class-log` | `features/class-log` | ⬜ (E02) |
| Discipline (school-wide) | `(app)/principal/discipline` | `features/discipline` | ⬜ (E09) |
| Reports | `(app)/principal/reports` | `features/principal` | ⬜ |

## Student (Epic E11 LMS + Exams, E09 conduct)

| Screen | Route | Feature | Status |
| --- | --- | --- | --- |
| Overview | `(app)/student` | `features/student` | ✅ (UI mock-first) |
| Courses + lesson player | `(app)/student/courses`,`/courses/[id]` | `features/lms` | ⬜ (E11) |
| Assignments | `(app)/student/assignments` | `features/lms` | ⬜ (E11) |
| Exams (list/briefing/taking/result) | `(app)/student/exams`,`/exams/[id]` | `features/exam` | ⬜ (E11) |
| Grades | `(app)/student/grades` | `features/grades` | ⬜ |
| Conduct + leave request | `(app)/student/conduct` | `features/discipline` | ⬜ (E09) |
| Schedule / Resources | `(app)/student/schedule`,`/resources` | `features/schedule`,`lms` | ⬜ |

## Parent (core)

| Screen | Route | Feature | Status |
| --- | --- | --- | --- |
| Children overview | `(app)/parent` | `features/parent` | ✅ (UI mock-first) |
| Grades (per child) / Schedule | `(app)/parent/grades`,`/schedule` | `features/grades`,`schedule` | ⬜ |

## Ghi chú

- Tên `features/*` mới (class-log, discipline, lms, exam, messaging, grades,
  schedule, notification) là **đề xuất** — scaffold đúng Clean Architecture
  per-feature khi epic vào implementation (dùng skill `add-feature`).
- Spec layout/giá trị từng màn (normative): `docs/product/design-spec.jsonc`
  (relocate từ backup — decision `0014`).
- Chi tiết pixel bổ sung: legacy `SCREENS.md`/`COMPONENT_SPECS.md` + file
  `untitled.pen` (mở bằng Pencil MCP).
