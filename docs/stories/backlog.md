# Story Backlog

This backlog will be populated after a user provides a project spec or selects a
specific initiative.

Do not create every possible story packet up front. Create story packets when
the work is selected or when a product decision needs a durable place to land.

## Candidate Epics

Xem chi tiết ở `docs/product/spec-intake.md`.

| Epic | Description | Status |
| --- | --- | --- |
| E01 | Auth & RBAC | partial |
| E02 | Teacher · Attendance | sliced |
| E03 | Principal dashboard | unsliced |
| E04 | Student & Parent portal | unsliced |
| E05 | Multi-tenancy (path-first, decision 0007) | implemented (phase 1) |
| E06 | BE Integration Foundation (envelope, SSE) | sliced |
| E07 | Design System Foundation (tokens, a11y, impeccable gate) | sliced |
| E08 | App Shell & Navigation | sliced |
| E09 | Discipline (vi phạm/hạnh kiểm/nghỉ phép) | unsliced |
| E10 | Messaging (chat, realtime) | unsliced |
| E11 | Student LMS + Exams | unsliced |

## Active Story Packets

| Story | Lane | Status |
| --- | --- | --- |
| `epics/E01-auth-rbac/US-001-auth-endpoint-alignment/` | high-risk | planned |
| `epics/E02-teacher-attendance/US-001-teacher-attendance.md` | normal | implemented |
| `epics/E05-multi-tenancy/US-001-tenant-path-resolver/` | high-risk | implemented (enforcement + route-move; slug migrate later) |
| `epics/E06-be-integration/US-001-response-envelope-parser.md` | normal | implemented |
| `epics/E06-be-integration/US-002-sse-realtime-foundation.md` | normal | implemented (contract-first, mock upstream) |
| `epics/E07-design-system/US-001-design-system-foundation.md` | normal | implemented (build green) |
| `epics/E08-app-shell/US-001-app-shell.md` | normal | implemented |
