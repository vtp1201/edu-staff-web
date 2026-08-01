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
**Group B handoff v2.2** (commit `0ebcb59`, 2026-07-12, DR-012..019) adds:
feed.jsx, moderation.jsx, parent-links.jsx, invitations.jsx, email-verify.jsx,
tenant-switch.jsx, reports.jsx, plus messaging.jsx extended in place (presence),
and the shared `states.jsx` state-primitive set (see `design-system.md`).
DR-021 (2026-07-17) adds: lesson-plan.jsx, question-bank.jsx (net-new,
US-E18.16 design follow-up).
DR-022 (2026-07-25) adds: staff-discipline.jsx, student-absences.jsx (net-new,
US-E18.14 design follow-up).
Current design version: 1506 (+ group B v2.2 additions above, + DR-021 above,
+ DR-022 above).

Status: ✅ done · 🟡 partial · ⬜ planned · 🎨 design-ready (có design, chưa impl).

## Auth (Epic E01)

| Screen | Route | Feature | Status |
| --- | --- | --- | --- |
| Login (email + SSO Google/VNeID) | `(auth)/login` | `features/auth/presentation/login-form` | 🟡 (email + Google SSO done; VNeID stub — US-E01.2) |
| Select role/tenant (multi-role) | `(auth)/select-role` | `features/auth/presentation` | ✅ implemented (route `(auth)/select-role` live) |
| Forgot password (email→OTP→new pw→done) | `(auth)/forgot-password` | `features/auth/presentation` | ✅ (BE-wired US-030) |
| Accept tenant invitation (public, no shell) | `/invitations/accept?token=...` | `features/auth/presentation/invite-accept` | ✅ (US-E21.2, corrected per ADR `0059` — auth-gate + signed-in join only, no guest account-creation/preview; `invitations.jsx` `InviteAcceptScreen` visual reference is stale for content/states, kept for shell/tone only) |
| Select tenant (post-login, ≥2 tenants) | `(auth)/select-tenant` | `features/tenant` + `app/(auth)/select-tenant` | ✅ implemented (US-E23.2 enhances the E05/US-001-tenant-path-resolver screen in place: DR-018 card grid + error/empty/skip branches; `tenant.switch.postLogin.*` namespace) |

## All roles (Epic E08 shell + E10 messaging)

| Screen | Route | Feature | Status |
| --- | --- | --- | --- |
| App shell (Sidebar + Header) | `(app)/layout` | `components/layout/app-shell` | 🟡 |
| SSE Disconnect Banner + Pending-Message Pill | shell-level (`components/layout/app-shell`) | `components/shared/sse-status/` | ✅ US-E08.6 |
| Email-verify banner (unverified reminder, all pages) | shell-level (`components/layout/app-shell`) | `components/shared/` (proposed) | ✅ US-E22.1 (`features/auth/presentation/email-verify`) |
| Tenant switch (header user-menu "Đổi trường" + dialog, ≥2 tenants) | shell-level (header, all app routes) | `components/layout/app-shell` | ✅ US-E23.1 |
| Profile (info / security / sessions / linked accounts) | `(app)/(shared)/profile` | `features/user/presentation` | ✅ US-E08.5 + email-verify inline row (US-E22.1, DR-016) + parent consent section (US-E20.2, DR-014) — extensions implemented |
| Notifications Center | `(app)/(shared)/notifications` | `features/notification` | ✅ US-E10.2 + US-E18.25 (list/mark-read/mark-all/unread-count đều real, BE US-146; tab "Chưa đọc" drain client-side vì wire không có filter unread — ADR 0066) |
| Messaging (inbox + 1:1 + group) | `(app)/(shared)/messages` | `features/messaging` | ✅ US-E10.1/E10.4/E10.5 (BE hybrid US-E18.17/ADR 0060 — group lifecycle/pin/contacts mock) |

## Social (Epic E19)

| Screen | Route | Feature | Status |
| --- | --- | --- | --- |
| Social Feed (school-wide + per-class post/comment/reaction) | `(app)/(shared)/feed` (all roles) | `features/feed` (proposed) | ✅ US-E19.1 (mock-first — social openapi nay đã có, chờ wiring US) |
| Content Moderation (principal/admin) | `(app)/principal/moderation` | `features/moderation` (proposed) | ✅ US-E19.2 (mock-first — chờ wiring US cùng feed) |

## Teacher (Epics E02 class-ops, E09 discipline, E11 LMS, E13 workspace, E14 grades)

| Screen | Route | Feature | Status |
| --- | --- | --- | --- |
| Dashboard (TeacherDashboardHome — StatCards + TKB tiet + pending grades) | `(app)/teacher` | `features/teacher/presentation` | ✅ US-E13.4 |
| Attendance (diem danh 3-state) | `(app)/teacher/attendance` | `features/attendance` | ✅ |
| Class Log (so dau bai + submit) | `(app)/teacher/class-log` | `features/class-log` | ✅ E13.3 (BE wired US-E18.10) |
| Discipline (vi pham/hanh kiem/nghi phep) | `(app)/teacher/discipline` | `features/discipline` | ✅ US-E09.1 (BE force-mock — US-E18.14 contract block) |
| Staff Discipline self-view (staff member's own violations/conduct notes, read-only) | `(app)/teacher/staff-discipline` | `features/staff-discipline` (proposed) | ✅ US-E09.5 (DR-022; BE force-mock) |
| Student Absences (record/edit, GVCN own class) | `(app)/teacher/absences` | `features/student-absences` (proposed) | ✅ US-E09.6 (DR-022; BE force-mock) |
| Grade Entry | `(app)/teacher/grades/enter` | `features/grades` | ✅ US-E14.2 — route thật `(app)/teacher/grade-book` (drift so với design route) |
| Grade Book | `(app)/teacher/grades` | `features/grades` | ✅ US-E13.6 |
| Lesson Bank | `(app)/teacher/lesson-bank` | `features/lesson-bank` | ✅ US-E11.2 (mock-first — lesson-bank không map BE contract, finding #27) |
| Lesson Plan Authoring + Builder | `(app)/teacher/lesson-plans`,`/lesson-plans/create`,`/lesson-plans/:id/edit` | `features/lesson-plan` (proposed) | ✅ US-E11.8 (DR-021; mock-first — wiring = US-E18.16 reopen, core `/lms/lesson-plans` đã có) |
| Exam Bank + Builder | `(app)/teacher/exam-bank`,`/exam-bank/create`,`/exam-bank/:id/edit` | `features/exam-bank` | ✅ US-E11.3 (BE hybrid ADR 0056 — list/detail/publish real, builder mock) |
| Question Bank + Builder | `(app)/teacher/question-bank`,`/question-bank/create`,`/question-bank/:id/edit` | `features/question-bank` (proposed) | ✅ US-E11.9 (DR-021; mock-first — wiring = US-E18.16 reopen, core `/lms/questions` đã có) |
| Teaching Plan / PPCT | `(app)/teacher/teaching-plan` | `features/teaching-plan` | ✅ US-E11.4 (BE force-mock — US-E18.9 contract block) |
| Schedule (lịch dạy cá nhân, read-only) | `(app)/teacher/schedule` | `features/timetable` | ✅ US-E15.2 (`timetable-view.jsx` edustaff_5) |
| Classes / Students | `(app)/teacher/classes`,`/students` | `features/teacher` | ✅ US-E13.1 |

## Principal / Admin (E03, E09, E10, E11, E12 Admin Core, E14 Academic Records)

> **Admin namespace guard (US-E12.8):** `(app)/admin/layout.tsx` enforces `role === "admin"` server-side (RSC). Non-admin users are redirected to their default route; unauthenticated users to select-tenant. Mock-first: `NEXT_PUBLIC_USE_MOCK=true` + `NODE_ENV!==production` bypasses the real claim check (decision 0024). ADR 0022.

| Screen | Route | Design file | Feature | Status |
| --- | --- | --- | --- | --- |
| School overview dashboard | `(app)/principal` | `teacher.jsx` (PrincipalDashboardHome) | `features/principal` | ✅ (UI mock-first) |
| Teachers (GVCN/GVBM assignment sheet) | `(app)/principal/teachers` | `teacher.jsx` (PrincipalTeachersScreen + AssignmentSheet) | `features/principal` | ✅ US-E13.5 |
| Classes | `(app)/principal/classes` | `teacher.jsx` (reference only, no dedicated mockup) | `features/principal` | ✅ US-E13.8 |
| Class Log review/approve | `(app)/principal/class-log` | `classops.jsx` | `features/class-log` | ✅ E13.3 (route `(app)/principal/class-log` live) |
| Discipline (school-wide) | `(app)/principal/discipline` | `discipline.jsx` | `features/discipline` | ✅ US-E09.1 |
| Grade Book (principal read) | `(app)/principal/grades` | `gradebook.jsx` | `features/grades` | ✅ US-E13.6 — route thật `(app)/principal/grade-book` (drift so với design route) |
| Teaching Plan review | `(app)/principal/teaching-plan` | `teaching-plan.jsx` | `features/teaching-plan` | ✅ US-E11.4 |
| Reports | `(app)/principal/reports` | `reports.jsx` | `features/principal` | ✅ (US-E03.1; `reports.jsx`, DR-019; mock-first) |
| **Parent–Student Links** (admin link management) | `(app)/admin/parent-links` | `parent-links.jsx` (US-E20.1) | `features/admin/parent-links` | ✅ implemented (US-E20.1; `ParentLinksScreen` + high-risk server-side re-auth Unlink, DR-014; consent counterpart attaches to Profile — see All-roles section); link-history audit-trail sub-section added to the detail dialog (US-E20.3, DR-023, mock-first per ADR 0064) |
| **Tenant Invitations** (admin "Mời thành viên") | `(app)/admin/invitations` | `invitations.jsx` (US-E21.1) | `features/admin/invitations` (proposed) | ✅ US-E21.1 (BE hybrid — invite/revoke real, list/resend mock, ask #1/#7) |
| **School Setup (grade range + settings)** | `(app)/admin/school-setup` | `school-setup.jsx` (US-049, ADR 0035) | `features/admin-school-setup` | ✅ implemented US-E12.1 (2026-06-13) |
| **Academic Calendar config** | `(app)/admin/calendar` | `calendar.jsx` (US-042) | `features/admin/calendar` | ✅ (BE wired US-E18.1) |
| **Subject Departments (SubjectParent)** | `(app)/admin/subject-departments` | `subject-parents.jsx` (US-048) | `features/admin/subjects` | ✅ |
| **Subject Catalogue (grade-scoped)** | `(app)/admin/subjects` | `subjects.jsx` + `subjects-dialogs.jsx` | `features/admin/subjects` | ✅ (BE wired US-E18.3; `restore` web-only ẩn) |
| **Subject Detail (master editor)** | `(app)/admin/subjects/[id]` | `subject-detail.jsx` (US-048, ADR 0036) | `features/admin/subject-catalogue` | ✅ US-E12.13 — deep-link route built, shares editor body with the Sheet via `useSubjectDetailForm`/`SubjectDetailFields`; archived subjects read-only |
| **Student Roster / Enrollment** | `(app)/admin/roster` | `roster.jsx` (US-043) | `features/admin/roster` | ✅ (BE hybrid US-E18.5 — roster/search-pool mock vĩnh viễn, ask #9) |
| **Timetable Builder** | `(app)/admin/timetable` | `timetable.jsx` (US-045) | `features/admin/timetable` | ✅ US-E12.5 (BE hybrid US-E18.11 — conflicts mock, ask #16) |
| **Class Management** | `(app)/admin/classes` | — (US-E12.10) | `features/admin/class-management` | ✅ US-E12.10 |
| **Assessment Scheme Config** | `(app)/admin/assessment` | `assessment.jsx` (1506) | `features/admin/assessment` | ✅ US-E12.6 (BE wired US-E18.7/ADR 0053) |
| **Grade Approval** | `(app)/admin/grades/approval` | `grade-approval.jsx` (1506) | `features/grades` | ✅ US-E14.4 (approval repo mock — grades.di) |
| **Academic Record Seal** | `(app)/admin/academic-records` | `academic-records.jsx` (1506) | `features/academic-records` | ✅ US-E14.6 |
| **Audit Log** | `(app)/admin/audit-log` | `audit-log.jsx` (1506) | `features/audit-log` | ✅ implemented US-E12.12 (mock-first, core US-064 pending) |
| **Admin Settings** | `(app)/admin/settings` | `admin-settings.jsx` (1506) | `features/admin-settings` | ✅ US-E12.11 |
| **Announcements** | `(app)/admin/announcements` | `announcements.jsx` (1506) | `features/announcements` | ✅ US-E10.3 (mock-first — BE chưa có cụm announcements) |
| **Staff Leave Management** | `(app)/admin/staff-leave` | `staff-leave.jsx` (1506) | `features/staff-leave` | ✅ US-E09.3 (BE force-mock — US-E18.8 contract block) |
| **Exam Bank (admin aggregate)** | `(app)/admin/exam-bank` | `exam-bank.jsx` (1506) | `features/exam-bank` | ✅ US-E11.3 |
| **Staffing — Departments** | `(app)/admin/staffing/departments` | — (US-E06.8) | `features/admin/staffing` | ✅ US-E12.9 |
| **Staffing — Position Titles** | `(app)/admin/staffing/position-titles` | — (US-E06.8) | `features/admin/staffing` | ✅ US-E12.9 |
| **Staffing — Position Assignments** | `(app)/admin/staffing/assignments` | — (US-E06.8) | `features/admin/staffing` | ✅ US-E12.9 |
| **Staff Discipline** (violations + conduct notes, tabbed; principal authors+approves, teacher self-view) | `(app)/principal/staff-discipline`, `(app)/teacher/staff-discipline` | `staff-discipline.jsx` (US-E09.5, ADR `0062` route fix) | `features/staff-discipline` (proposed) | ✅ US-E09.5 (DR-022, ADR 0062; BE force-mock) |
| **Student Absences** (schoolwide/class-filtered flag view, principal) | `(app)/principal/absences` | `student-absences.jsx` (US-E09.6, ADR `0062` route fix) | `features/student-absences` (proposed) | ✅ US-E09.6 (DR-022, ADR 0062; BE force-mock) |

## Student (Epic E11 LMS + Exams, E09 conduct, E13/E14 grades)

| Screen | Route | Feature | Status |
| --- | --- | --- | --- |
| Overview | `(app)/student` | `features/student` | ✅ (UI mock-first) |
| Courses + lesson player | `(app)/student/courses`,`/courses/[courseId]` | `features/lms` | ✅ US-E11.6 (grid+tabs, 2-col player, video/pdf/text, notes/Q&A, mark-complete; mock-first) |
| Assignments | `(app)/student/assignments` | `features/lms` | ✅ US-E11.7 (mock-first — lms service scaffold) |
| Exams (list/briefing/taking/result) | `(app)/student/exams`,`/exams/[id]` | `features/exam` | ✅ US-E11.1 (base); ⬜ US-E11.5 (mixed MCQ+essay variant) |
| Grades (Grade Book) | `(app)/student/grades` | `features/grades` | ✅ US-E13.6 |
| Academic Record (Hoc ba) | `(app)/student/academic-record` | `features/academic-records` | ✅ US-E14.5 |
| Conduct + leave request | `(app)/student/conduct` | `features/discipline` | ✅ US-E09.2 (BE force-mock — US-E18.14) |
| **Schedule (Timetable read-only)** | `(app)/student/schedule` | `features/timetable` | ✅ implemented (US-E15.1; `timetable-view.jsx` edustaff_5) |
| Resources | `(app)/student/resources` | `features/lms` | ⬜ |

## Parent (core, E09 conduct, E13/E14 grades)

| Screen | Route | Feature | Status |
| --- | --- | --- | --- |
| Children overview | `(app)/parent` | `features/parent` | ✅ (UI mock-first) |
| Grades (Grade Book — per child) | `(app)/parent/grades` | `features/grades` | ✅ US-E13.6/E13.7 (child-list mock — grades.di) |
| Academic Record (Hoc ba — per child) | `(app)/parent/children/:id/academic-record` | `features/academic-records` | 🎨 design-ready (US-E14.5; `academic-record-view.jsx` 1506) |
| **Schedule (Timetable read-only, per child)** | `(app)/parent/schedule` | `features/timetable` | ✅ implemented (US-E15.1; `timetable-view.jsx` edustaff_5) |
| **Discipline & Leave (parent view for child)** | `(app)/parent/discipline` | `features/discipline` | ✅ US-E09.4 (BE force-mock — US-E18.14) |

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
  - `design_src/edu/assignments.jsx` — Student Assignments list + submit sheet + graded feedback (US-E11.7, DR-020 2026-07-14)
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
- **Group B handoff v2.2 (2026-07-12, commit `0ebcb59`, DR-012..019)** adds:
  - `design_src/edu/feed.jsx` — Social Feed (US-E19.1, DR-012)
  - `design_src/edu/moderation.jsx` — Content Reporting & Moderation (US-E19.2, DR-013; shared Report dialog also touches `feed.jsx`/`messaging.jsx`)
  - `design_src/edu/parent-links.jsx` — Parent–Student Links admin screen + `ParentConsentSection`/`ParentConsentScreen` (US-E20.1/US-E20.2, DR-014)
  - `design_src/edu/invitations.jsx` — Tenant Invitations admin screen + public `InviteAcceptScreen` (US-E21.1/US-E21.2, DR-015)
  - `design_src/edu/email-verify.jsx` — Email Verification shell banner + dialog + Profile extension (US-E22.1, DR-016)
  - `messaging.jsx` presence extension — `msgPresence()`/`MSGPresenceDot`/`msgPresenceCaption()` (US-E10.5, DR-017; reuses `messaging` i18n namespace under `messaging.presence.*`)
  - `design_src/edu/tenant-switch.jsx` — Multi-Tenant post-login select screen; header user-menu + dialog logic embedded in `app.jsx` (US-E23.1/US-E23.2, DR-018)
  - `design_src/edu/reports.jsx` — Principal Reports Dashboard, fills the prior placeholder row (US-E03.1, DR-019)
  - `design_src/edu/states.jsx` — shared `EduSkeleton`/`EduEmpty`/`EduError`/`EduComingSoon` state primitives consumed by the above (see `docs/product/design-system.md` §Component patterns)
- **DR-021 (2026-07-17)** adds:
  - `design_src/edu/lesson-plan.jsx` — Teacher Lesson Plan Authoring + Builder (US-E18.16 design follow-up, net-new)
  - `design_src/edu/question-bank.jsx` — Teacher Question Bank + Builder (US-E18.16 design follow-up, net-new)
- **DR-022 (2026-07-25)** adds:
  - `design_src/edu/staff-discipline.jsx` — Staff Discipline: violations + conduct notes tabs, admin author / principal approve-reject (US-E18.14 design follow-up, net-new)
  - `design_src/edu/student-absences.jsx` — Student Absences: teacher record/edit + admin/principal flag mode, role-conditional (US-E18.14 design follow-up, net-new)
