# Screen Inventory — EduPortal

Map màn hình từ design handoff → route + feature theo kiến trúc thật (decision
`0011`: lấy UX/visual, bỏ kiến trúc của handoff). Route theo
`app/[locale]/t/[tenant]/(app)/<role>/...` (tenant segment live — E05.1, decision `0007`).

**Design source (normative):** `design_src/EduPortal.html` + component files
(1506 handoff = current; `design_src/edu/*.jsx` is canonical — see decision `0034`).
`design-spec.jsonc` re-baselined to 1406 (2026-06-14, ADR 0034). 1506 handoff
(2026-06-15) adds: exam.jsx, discipline.jsx, messaging.jsx, notifications.jsx,
announcements.jsx, grade-entry.jsx, gradebook.jsx, grade-approval.jsx,
academic-record-view.jsx, academic-records.jsx, assessment.jsx, lesson-bank.jsx,
exam-bank.jsx, teaching-plan.jsx, staff-leave.jsx, audit-log.jsx, admin-settings.jsx.
Current design version: 1506.

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
| SSE Disconnect Banner + Pending-Message Pill | shell-level (DashboardLayout) | `components/shared/sse-status/` | ⬜ US-E08.6 |
| Profile (info / security / sessions / linked accounts) | `(app)/(shared)/profile` | `features/user/presentation` | ✅ US-E08.5 |
| Notifications Center | `(app)/(shared)/notifications` | `features/notification` | 🎨 design-ready (US-E10.2; `notifications.jsx` 1506; SSE decision 0009) |
| Messaging (inbox + 1:1 + group) | `(app)/(shared)/messages` | `features/messaging` | 🎨 design-ready (US-E10.1 base; US-E10.4 group-chat design in `messaging.jsx` DR-008 2026-06-20) |

## Teacher (Epics E02 class-ops, E09 discipline, E11 LMS, E13 workspace, E14 grades)

| Screen | Route | Feature | Status |
| --- | --- | --- | --- |
| Dashboard (TeacherDashboardHome — StatCards + TKB tiet + pending grades) | `(app)/teacher` | `features/teacher/presentation` | ✅ US-E13.4 |
| Attendance (diem danh 3-state) | `(app)/teacher/attendance` | `features/attendance` | ✅ |
| Class Log (so dau bai + submit) | `(app)/teacher/class-log` | `features/class-log` | ⬜ (E13.3) |
| Discipline (vi pham/hanh kiem/nghi phep) | `(app)/teacher/discipline` | `features/discipline` | 🎨 design-ready (US-E09.1; `discipline.jsx` 1506) |
| Grade Entry | `(app)/teacher/grades/enter` | `features/grades` | 🎨 design-ready (US-E14.2; `grade-entry.jsx` 1506) |
| Grade Book | `(app)/teacher/grades` | `features/grades` | 🎨 design-ready (US-E13.6; `gradebook.jsx` 1506) |
| Lesson Bank | `(app)/teacher/lesson-bank` | `features/lesson-bank` | 🎨 design-ready (US-E11.2; `lesson-bank.jsx` 1506) |
| Exam Bank + Builder | `(app)/teacher/exam-bank`,`/exam-bank/create`,`/exam-bank/:id/edit` | `features/exam-bank` | 🎨 design-ready (US-E11.3; `exam-bank.jsx` 1506) |
| Teaching Plan / PPCT | `(app)/teacher/teaching-plan` | `features/teaching-plan` | 🎨 design-ready (US-E11.4; `teaching-plan.jsx` 1506) |
| Schedule (lịch dạy cá nhân, read-only) | `(app)/teacher/schedule` | `features/timetable` | 🎨 design-ready (US-E15.2; `timetable-view.jsx` edustaff_5) |
| Classes / Students | `(app)/teacher/classes`,`/students` | `features/teacher` | ✅ US-E13.1 |

## Principal / Admin (E03, E09, E10, E11, E12 Admin Core, E14 Academic Records)

> **Admin namespace guard (US-E12.8):** `(app)/admin/layout.tsx` enforces `role === "admin"` server-side (RSC). Non-admin users are redirected to their default route; unauthenticated users to select-tenant. Mock-first: `NEXT_PUBLIC_USE_MOCK=true` + `NODE_ENV!==production` bypasses the real claim check (decision 0024). ADR 0022.

| Screen | Route | Design file | Feature | Status |
| --- | --- | --- | --- | --- |
| School overview dashboard | `(app)/principal` | `teacher.jsx` (PrincipalDashboardHome) | `features/principal` | ✅ (UI mock-first) |
| Teachers (GVCN/GVBM assignment sheet) | `(app)/principal/teachers` | `teacher.jsx` (PrincipalTeachersScreen + AssignmentSheet) | `features/principal` | ✅ US-E13.5 |
| Classes | `(app)/principal/classes` | `teacher.jsx` | `features/principal` | ⬜ |
| Class Log review/approve | `(app)/principal/class-log` | `classops.jsx` | `features/class-log` | ⬜ (E13.3) |
| Discipline (school-wide) | `(app)/principal/discipline` | `discipline.jsx` | `features/discipline` | 🎨 design-ready (US-E09.1; `discipline.jsx` 1506) |
| Grade Book (principal read) | `(app)/principal/grades` | `gradebook.jsx` | `features/grades` | 🎨 design-ready (US-E13.6; `gradebook.jsx` 1506) |
| Teaching Plan review | `(app)/principal/teaching-plan` | `teaching-plan.jsx` | `features/teaching-plan` | 🎨 design-ready (US-E11.4; `teaching-plan.jsx` 1506) |
| Reports | `(app)/principal/reports` | — | `features/principal` | ⬜ |
| **School Setup (grade range + settings)** | `(app)/admin/school-setup` | `school-setup.jsx` (US-049, ADR 0035) | `features/admin-school-setup` | ✅ implemented US-E12.1 (2026-06-13) |
| **Academic Calendar config** | `(app)/admin/calendar` | `calendar.jsx` (US-042) | `features/admin/calendar` | 🎨 (design done) |
| **Subject Departments (SubjectParent)** | `(app)/admin/subject-departments` | `subject-parents.jsx` (US-048) | `features/admin/subjects` | 🎨 (design done) |
| **Subject Catalogue (grade-scoped)** | `(app)/admin/subjects` | `subjects.jsx` + `subjects-dialogs.jsx` | `features/admin/subjects` | 🎨 (design done) |
| **Subject Detail (master editor)** | `(app)/admin/subjects/[id]` | `subject-detail.jsx` (US-048, ADR 0036) | `features/admin/subjects` | 🎨 (design done NEW-02) |
| **Student Roster / Enrollment** | `(app)/admin/roster` | `roster.jsx` (US-043) | `features/admin/roster` | 🎨 (design done) |
| **Timetable Builder** | `(app)/admin/timetable` | `timetable.jsx` (US-045) | `features/admin/timetable` | 🎨 (design done) |
| **Class Management** | `(app)/admin/classes` | — (US-E12.10) | `features/admin/class-management` | ✅ US-E12.10 |
| **Assessment Scheme Config** | `(app)/admin/assessment` | `assessment.jsx` (1506) | `features/admin/assessment` | 🎨 design-ready (US-E12.6/E14.1) |
| **Grade Approval** | `(app)/admin/grades/approval` | `grade-approval.jsx` (1506) | `features/grades` | 🎨 design-ready (US-E14.4) |
| **Academic Record Seal** | `(app)/admin/academic-records` | `academic-records.jsx` (1506) | `features/academic-records` | ✅ US-E14.6 |
| **Audit Log** | `(app)/admin/audit-log` | `audit-log.jsx` (1506) | `features/audit-log` | 🎨 design-ready (US-E12.12) |
| **Admin Settings** | `(app)/admin/settings` | `admin-settings.jsx` (1506) | `features/admin-settings` | 🎨 design-ready (US-E12.11) |
| **Announcements** | `(app)/admin/announcements` | `announcements.jsx` (1506) | `features/announcements` | 🎨 design-ready (US-E10.3) |
| **Staff Leave Management** | `(app)/admin/staff-leave` | `staff-leave.jsx` (1506) | `features/staff-leave` | 🎨 design-ready (US-E09.3) |
| **Exam Bank (admin aggregate)** | `(app)/admin/exam-bank` | `exam-bank.jsx` (1506) | `features/exam-bank` | 🎨 design-ready (US-E11.3) |
| **Staffing — Departments** | `(app)/admin/staffing/departments` | — (US-E06.8) | `features/admin/staffing` | ✅ US-E12.9 |
| **Staffing — Position Titles** | `(app)/admin/staffing/position-titles` | — (US-E06.8) | `features/admin/staffing` | ✅ US-E12.9 |
| **Staffing — Position Assignments** | `(app)/admin/staffing/assignments` | — (US-E06.8) | `features/admin/staffing` | ✅ US-E12.9 |

## Student (Epic E11 LMS + Exams, E09 conduct, E13/E14 grades)

| Screen | Route | Feature | Status |
| --- | --- | --- | --- |
| Overview | `(app)/student` | `features/student` | ✅ (UI mock-first) |
| Courses + lesson player | `(app)/student/courses`,`/courses/[courseId]` | `features/lms` | ⬜ US-E11.6 (design-ready; `student.jsx` edustaff_5) |
| Assignments | `(app)/student/assignments` | `features/lms` | ⬜ (E11) |
| Exams (list/briefing/taking/result) | `(app)/student/exams`,`/exams/[id]` | `features/exam` | ✅ US-E11.1 (base); ⬜ US-E11.5 (mixed MCQ+essay variant) |
| Grades (Grade Book) | `(app)/student/grades` | `features/grades` | 🎨 design-ready (US-E13.6; `gradebook.jsx` 1506) |
| Academic Record (Hoc ba) | `(app)/student/academic-record` | `features/academic-records` | 🎨 design-ready (US-E14.5; `academic-record-view.jsx` 1506) |
| Conduct + leave request | `(app)/student/conduct` | `features/discipline` | 🎨 design-ready (US-E09.2; `discipline.jsx` 1506) |
| **Schedule (Timetable read-only)** | `(app)/student/schedule` | `features/timetable` | 🎨 design-ready (US-E15.1; `timetable-view.jsx` edustaff_5) |
| Resources | `(app)/student/resources` | `features/lms` | ⬜ |

## Parent (core, E09 conduct, E13/E14 grades)

| Screen | Route | Feature | Status |
| --- | --- | --- | --- |
| Children overview | `(app)/parent` | `features/parent` | ✅ (UI mock-first) |
| Grades (Grade Book — per child) | `(app)/parent/grades` | `features/grades` | 🎨 design-ready (US-E13.6; `gradebook.jsx` 1506) |
| Academic Record (Hoc ba — per child) | `(app)/parent/children/:id/academic-record` | `features/academic-records` | 🎨 design-ready (US-E14.5; `academic-record-view.jsx` 1506) |
| **Schedule (Timetable read-only, per child)** | `(app)/parent/schedule` | `features/timetable` | 🎨 design-ready (US-E15.1; `timetable-view.jsx` edustaff_5) |
| **Discipline & Leave (parent view for child)** | `(app)/parent/discipline` | `features/discipline` | 🎨 design-ready (US-E09.4; `discipline.jsx` `ParentDisciplineScreen` edustaff_5) |

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
  - `design_src/edu/exam.jsx` — Student Exam list/briefing/taking/result (US-E11.1)
  - `design_src/edu/discipline.jsx` — Discipline + Conduct + Leave + Staff Leave mock data (US-E09.1, E09.2, E09.3)
  - `design_src/edu/messaging.jsx` — Messaging inbox + chat (US-E10.1)
  - `design_src/edu/notifications.jsx` — Notifications Center (US-E10.2)
  - `design_src/edu/announcements.jsx` — Announcements composer (US-E10.3)
  - `design_src/edu/grade-entry.jsx` — Grade Entry screen (US-E14.2)
  - `design_src/edu/gradebook.jsx` — Grade Book multi-role (US-E13.6)
  - `design_src/edu/grade-approval.jsx` — Grade Approval pipeline (US-E14.4)
  - `design_src/edu/academic-record-view.jsx` — Hoc ba viewer multi-role (US-E14.5)
  - `design_src/edu/academic-records.jsx` — Academic Record Seal (US-E14.6)
  - `design_src/edu/assessment.jsx` — Assessment Scheme Config (US-E12.6/E14.1)
  - `design_src/edu/lesson-bank.jsx` — Lesson Bank (US-E11.2)
  - `design_src/edu/exam-bank.jsx` — Exam Bank + Builder (US-E11.3)
  - `design_src/edu/teaching-plan.jsx` — Teaching Plan / PPCT (US-E11.4)
  - `design_src/edu/staff-leave.jsx` — Staff Leave Management (US-E09.3)
  - `design_src/edu/audit-log.jsx` — Audit Log (US-E12.12)
  - `design_src/edu/admin-settings.jsx` — Admin Settings / gradePublishMode (US-E12.11)
- Chi tiet pixel cu (reference only): file `untitled.pen` (mo bang Pencil MCP).
- **edustaff_5 handoff (2026-06-19, ADR 0044)** adds:
  - `design_src/edu/exam-bank.jsx` — Exam Bank + Builder (US-E11.3, design-spec reconciled DR-005 2026-06-20)
  - `design_src/edu/timetable-view.jsx` — Timetable read-only view (US-E15.1 student/parent; US-E15.2 teacher)
  - `discipline.jsx` `ParentDisciplineScreen` — Parent discipline+leave view (US-E09.4)
  - `gradebook.jsx` `ChildSwitcher` (DR-002) — Parent multi-child grade book (US-E13.7)
  - `messaging.jsx` DR-008 group features — Group creation, context menu, reply/quote (US-E10.4; design-spec groupChat section + i18n keys reconciled 2026-06-20)
