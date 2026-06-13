# Story Backlog

This backlog will be populated after a user provides a project spec or selects a
specific initiative.

Do not create every possible story packet up front. Create story packets when
the work is selected or when a product decision needs a durable place to land.

## Candidate Epics

Xem chi tiết ở `docs/product/spec-intake.md`.

Design source (normative): `design_src/` — clone từ
`/Users/vietthangpham/Downloads/design_handoff_eduportal2_1206` (xem decision `0021`).

| Epic | Description | Status |
| --- | --- | --- |
| E01 | Auth & RBAC | partial |
| E02 | Teacher · Attendance + Class Log | sliced |
| E03 | Principal dashboard | unsliced |
| E04 | Student & Parent portal | unsliced |
| E05 | Multi-tenancy (path-first, decision 0007) | implemented (phase 1) |
| E06 | BE Integration Foundation (envelope, SSE) | sliced |
| E07 | Design System Foundation (tokens, a11y, impeccable gate) | sliced |
| E08 | App Shell & Navigation | sliced |
| E09 | Discipline (vi phạm/hạnh kiểm/nghỉ phép) | unsliced — design: `design_src/edu/discipline.jsx` |
| E10 | Messaging + Notifications (chat, realtime SSE) | unsliced — design: `design_src/edu/messaging.jsx` |
| E11 | Student LMS + Exams | unsliced — design: `design_src/edu/exam.jsx`, `student.jsx` |
| E12 | Admin Core Setup (trường học, lịch, môn học, danh sách lớp, TKB) | unsliced — design: `design_src/edu/school-setup.jsx`, `calendar.jsx`, `subjects.jsx`, `timetable.jsx`, `roster.jsx` |

## Active Story Packets

| Story | Lane | Status |
| --- | --- | --- |
| `epics/E01-auth-rbac/US-001-auth-endpoint-alignment/` | high-risk | planned |
| `epics/E02-teacher-attendance/US-001-teacher-attendance.md` | normal | implemented |
| `epics/E05-multi-tenancy/US-001-tenant-path-resolver/` | high-risk | implemented (enforcement + route-move; slug migrate later) |
| `epics/E06-be-integration/US-001-response-envelope-parser.md` | normal | implemented |
| `epics/E06-be-integration/US-002-sse-realtime-foundation.md` | normal | implemented (contract-first, mock upstream) |
| `epics/E07-design-system/US-001-design-system-foundation.md` | normal | implemented (build green) |
| `epics/E07-design-system/US-E07.2-accessible-primary-token.md` | normal | planned |
| `epics/E08-app-shell/US-001-app-shell.md` | normal | implemented |
| `epics/E12-admin-core/US-E12.1-school-setup.md` | normal | implemented |
| `epics/E12-admin-core/US-E12.2-academic-calendar.md` | normal | planned |
| `epics/E12-admin-core/US-E12.3-subject-catalogue.md` | normal | planned |
| `epics/E12-admin-core/US-E12.4-student-roster.md` | normal | planned |
| `epics/E12-admin-core/US-E12.5-timetable-builder.md` | normal | planned |
| `epics/E12-admin-core/US-E12.6-assessment-scheme.md` | normal | planned |
