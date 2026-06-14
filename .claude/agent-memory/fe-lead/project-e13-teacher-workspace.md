---
name: project-e13-teacher-workspace
description: E13 Teacher Workspace epic status — US-E13.4 TeacherDashboardHome implemented; upcoming US-E13.1/E13.2/E13.3/E13.5
metadata:
  type: project
---

## E13 Teacher Workspace Epic Status (2026-06-14)

### Implemented
- **US-E13.4**: TeacherDashboardHome — 5 StatCards (totalStudents real from `GET /core/api/v1/classes` + per-class roster sum; schedule/grades/notifs mock-first), today's schedule by Tiết 1–10, pending grades list with "Nhập điểm" Link, notifications list. 291/291 tests pass.

**Why:** Real BE for "Tổng học sinh" available via core service classes endpoint; ClassResponse has no studentCount field, so we fetch classes then do parallel per-class roster count with cursor pagination.

**Key implementation detail:** `TEACHER_EP = { classes: "/core/api/v1/classes", classStudents: (id) => "/core/api/v1/classes/{id}/students" }`. Real repo sums enrollment counts across paginated rosters. Mock repo returns seed data from teacher.jsx 1406.

### Implemented (cont.)
- **US-E13.5**: Principal Teachers Management — teacher-list table (GVCN badge, subject-assignment badges, status), TeacherAssignmentSheet (GVCN picker, GVBM rows with per-class subject availability, conflict indicator). 5 use-cases, 22 unit tests, 11 repo integration tests, 5 action tests, 7 Storybook stories, 379/379 pass; build green. WCAG A11Y-001–006 all fixed including StatusBadge primary tone (`text-edu-text-primary`), TableHead `scope="col"` global fix, conflict icon `role="img"`.

### Remaining (all planned)
- **US-E13.1**: Teacher Class View (shares classes API)
- **US-E13.2**: Attendance BE Wiring (mock-first, BE US-046 pending)
- **US-E13.3**: Class Log Screen (mock-first, BE US-044 pending)

### A11y lessons from E13.4
- `text-muted-foreground` (#8898a9 = 2.95:1) fails WCAG for text ≤12px → use `text-edu-text-secondary` (#5a6a85 = 5.9:1)
- `bg-primary` (#5D87FF = 3.15:1) fails WCAG for small text buttons → use `bg-edu-primary-accessible` (#4468e0 = 4.88:1)
- "Nhập điểm" CTA: must be `<Link>` with `min-h-[44px]` + `aria-label` (not an optional callback)
- RSC wrappers must not import from `infrastructure/` layer — inline any pure util logic
