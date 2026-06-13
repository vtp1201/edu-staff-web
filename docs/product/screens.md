# Screen Inventory — EduPortal

Map màn hình từ design handoff → route + feature theo kiến trúc thật (decision
`0011`: lấy UX/visual, bỏ kiến trúc của handoff). Route theo
`app/[locale]/t/[tenant]/(app)/<role>/...` (tenant segment live — E05.1, decision `0007`).

**Design source (normative):** `design_src/EduPortal.html` + component files
(1406 handoff = current; `design_src/edu/*.jsx` is canonical — see decision `0034`).
`design-spec.jsonc` re-baselined to 1406 (2026-06-14, ADR 0034): sections login,
selectRole, teacherDashboard, teacherScheduleFull, principalTeachers, profile
(incl. linkedAccounts + accountRequests) and layout shell navMap now reflect 1406.
Design hoàn chỉnh đến: NEW-02 (Grade Scale & Assessment Scheme Config).

Status: ✅ done · 🟡 partial · ⬜ planned · 🎨 design-ready (có design, chưa impl).

## Auth (Epic E01)

| Screen | Route | Feature | Status |
| --- | --- | --- | --- |
| Login (email + SSO Google/VNeID) | `(auth)/login` | `features/auth/presentation/login-form` | 🟡 (email done; SSO 🎨 US-E01.2) |
| Select role/tenant (multi-role) | `(auth)/select-role` | `features/auth/presentation` | 🎨 design-ready (US-E01.2) |
| Forgot password (email→OTP→new pw→done) | `(auth)/forgot-password` | `features/auth/presentation` | ✅ (BE-wired US-030) |

## All roles (Epic E08 shell + E10 messaging)

| Screen | Route | Feature | Status |
| --- | --- | --- | --- |
| App shell (Sidebar + Header) | `(app)/layout` | `components/layout/app-shell` | 🟡 |
| Profile (info / security / sessions / linked accounts) | `(app)/(shared)/profile` | `features/user/presentation` | 🟡 (base ✅; Linked Accounts + Account Requests ⬜ US-E08.5) |
| Notifications | `(app)/(shared)/notifications` | `features/notification` | ⬜ (gắn SSE, decision 0009) |
| Messaging (inbox + 1:1 + group) | `(app)/(shared)/messages` | `features/messaging` | ⬜ (Epic E10) |

## Teacher (Epics E02 class-ops, E09 discipline, core)

| Screen | Route | Feature | Status |
| --- | --- | --- | --- |
| Dashboard (TeacherDashboardHome — StatCards + TKB tiết + pending grades) | `(app)/teacher` | `features/teacher/presentation` | 🎨 design-ready (US-E13.4; existing mock-first placeholder needs replacement) |
| Attendance (điểm danh 3-state) | `(app)/teacher/attendance` | `features/attendance` | ✅ |
| Class Log (sổ đầu bài + submit) | `(app)/teacher/class-log` | `features/class-log` | ⬜ (E02) |
| Discipline (vi phạm/hạnh kiểm/nghỉ phép) | `(app)/teacher/discipline` | `features/discipline` | ⬜ (E09) |
| Grade Book | `(app)/teacher/grades` | `features/grades` | ⬜ |
| Schedule | `(app)/teacher/schedule` | `features/schedule` | ⬜ |
| Classes / Students | `(app)/teacher/classes`,`/students` | `features/teacher` | ⬜ |

## Principal / Admin (E03, E09, E12 Admin Core)

> **Admin namespace guard (US-E12.8):** `(app)/admin/layout.tsx` enforces `role === "admin"` server-side (RSC). Non-admin users are redirected to their default route; unauthenticated users to select-tenant. Mock-first: `NEXT_PUBLIC_USE_MOCK=true` + `NODE_ENV!==production` bypasses the real claim check (decision 0024). ADR 0022.

| Screen | Route | Design file | Feature | Status |
| --- | --- | --- | --- | --- |
| School overview dashboard | `(app)/principal` | `teacher.jsx` (PrincipalDashboardHome) | `features/principal` | ✅ (UI mock-first) |
| Teachers (GVCN/GVBM assignment sheet) | `(app)/principal/teachers` | `teacher.jsx` (PrincipalTeachersScreen + AssignmentSheet) | `features/principal` | 🎨 design-ready (US-E13.5; real BE: homeroom-teacher + class-subjects endpoints; NOT `/teaching-assignments`) |
| Classes | `(app)/principal/classes` | `teacher.jsx` | `features/principal` | ⬜ |
| Class Log review/approve | `(app)/principal/class-log` | `classops.jsx` | `features/class-log` | ⬜ (E02) |
| Discipline (school-wide) | `(app)/principal/discipline` | `discipline.jsx` | `features/discipline` | ⬜ (E09) |
| Reports | `(app)/principal/reports` | — | `features/principal` | ⬜ |
| **School Setup (grade range + settings)** | `(app)/admin/school-setup` | `school-setup.jsx` (US-049, ADR 0035) | `features/admin-school-setup` | ✅ implemented US-E12.1 (2026-06-13) |
| **Academic Calendar config** | `(app)/admin/calendar` | `calendar.jsx` (US-042) | `features/admin/calendar` | 🎨 (design done) |
| **Subject Departments (SubjectParent)** | `(app)/admin/subject-departments` | `subject-parents.jsx` (US-048) | `features/admin/subjects` | 🎨 (design done) |
| **Subject Catalogue (grade-scoped)** | `(app)/admin/subjects` | `subjects.jsx` + `subjects-dialogs.jsx` | `features/admin/subjects` | 🎨 (design done) |
| **Subject Detail (master editor)** | `(app)/admin/subjects/[id]` | `subject-detail.jsx` (US-048, ADR 0036) | `features/admin/subjects` | 🎨 (design done NEW-02) |
| **Student Roster / Enrollment** | `(app)/admin/roster` | `roster.jsx` (US-043) | `features/admin/roster` | 🎨 (design done) |
| **Timetable Builder** | `(app)/admin/timetable` | `timetable.jsx` (US-045) | `features/admin/timetable` | 🎨 (design done) |
| **Staffing — Departments** | `(app)/admin/staffing/departments` | — (US-E06.8) | `features/admin/staffing` | ⬜ planned (BE wiring done US-E06.8; no UI yet) |
| **Staffing — Position Titles** | `(app)/admin/staffing/position-titles` | — (US-E06.8) | `features/admin/staffing` | ⬜ planned (BE wiring done US-E06.8; no UI yet) |
| **Staffing — Position Assignments** | `(app)/admin/staffing/assignments` | — (US-E06.8) | `features/admin/staffing` | ⬜ planned (BE wiring done US-E06.8; no UI yet) |

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
  schedule, notification, admin/*) là **đề xuất** — scaffold đúng Clean Architecture
  per-feature khi epic vào implementation (dùng skill `add-feature`).
- Spec layout/giá trị từng màn (normative): `docs/product/design-spec.jsonc`
  (relocate từ backup — decision `0014`).
- **Design source chuẩn**: `design_src/EduPortal.html` (mở trong browser) —
  quyết định sử dụng nguồn này theo decision `0021`. Current version = 1406 (ADR 0034).
  - `design_src/edu/login.jsx` — Login SSO + multi-role select (US-E01.2; design-spec.jsonc updated 2026-06-14)
  - `design_src/edu/teacher.jsx` — Teacher Dashboard Home + Principal Teachers Management (US-E13.4, US-E13.5; design-spec.jsonc updated 2026-06-14)
  - `design_src/edu/profile.jsx` — Profile + Linked Accounts + Account Requests (US-E08.5; design-spec.jsonc updated 2026-06-14)
  - `design_src/edu/school-setup.jsx` — Admin school setup (US-049/ADR 0035)
  - `design_src/edu/calendar.jsx` — Academic calendar (US-042)
  - `design_src/edu/subjects.jsx` + `subject-detail.jsx` + `subjects-dialogs.jsx` + `subjects-data.jsx` — Subject catalogue (US-048)
  - `design_src/edu/subject-parents.jsx` — SubjectParent departments
  - `design_src/edu/roster.jsx` — Student roster / enrollment (US-043)
  - `design_src/edu/timetable.jsx` — Timetable builder (US-045)
  - `design_src/edu/classops.jsx` — Class Log (E13.3)
- Chi tiết pixel cũ (reference only): file `untitled.pen` (mở bằng Pencil MCP).
