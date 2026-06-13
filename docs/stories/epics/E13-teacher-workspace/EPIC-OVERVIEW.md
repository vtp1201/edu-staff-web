# Epic E13 — Teacher Workspace

## Summary

Xây dựng workspace cho giáo viên: dashboard home với StatCards + TKB theo tiết,
xem danh sách lớp và học sinh được phân công, màn hình điểm danh nối với BE thật,
và sổ đầu bài (Class Log). Đây là bước kế tiếp sau khi admin đã setup trường (E12).

## Design Source (re-baselined — ADR 0034)

Tất cả stories trong E13 derive từ `design_src/edu/teacher.jsx` **phiên bản 1406**
(1102 dòng). Epic overview cũ derive từ phiên bản gốc 29/04 (501 dòng) — đã
được revise sau khi re-baseline theo ADR 0034.

## Scope

| US | Screen | BE readiness | Design source |
| --- | --- | --- | --- |
| E13.1 | Teacher class view (danh sách lớp + học sinh assigned) | core REAL | `teacher.jsx` — `TeacherClasses`, `TeacherStudents` |
| E13.2 | Attendance BE wiring (điểm danh → core API) | mock-first (BE US-046 planned) | existing UI — wiring only |
| E13.3 | Class Log screen (sổ đầu bài) | mock-first (BE US-044 planned) | `classops.jsx` |
| E13.4 | Teacher Dashboard Home (StatCards + TKB theo tiết + pending grades) | partial REAL (student count); rest mock-first | `teacher.jsx` — `TeacherDashboardHome` |
| E13.5 | Principal Teachers Management (GVCN/GVBM assignment sheet + conflict detection) | mock-first (teaching-assignments API planned) | `teacher.jsx` — `PrincipalTeachersScreen` + `TeacherAssignmentSheet` |

## BE Dependencies

- `core` service `/api/v1/classes` — REAL, live (E13.1, E13.4 student count)
- `core` service attendance endpoints — mock-first (US-046 BE planned)
- `core` service class-log / homeroom-book — mock-first (US-044 BE planned)
- `core` service teaching-assignments — mock-first (planned)
- Schedule BE — not yet planned; TKB display in E13.4 uses mock data
- Grade entry BE — mock-first (US-060 BE planned)

## Prerequisites

- US-E12.1 school setup done
- US-E12.10 class management done (admin creates classes, assigns GVCN)
- US-E12.4 student roster done (students enrolled in classes)
- US-E12.3 subject catalogue done (subjects available for E13.5 subject picker)

## Key Design Notes (teacher.jsx 1406)

### TeacherDashboardHome (E13.4)
5 StatCards in auto-fit grid. Today's schedule keyed by Tiết 1–10 (not clock time).
"Điểm chờ duyệt" stat = grades in ADMIN_APPROVAL mode (grade state machine).
CTA "Nhập điểm" on pending items → navigates to grades section.

### PrincipalTeachersScreen + TeacherAssignmentSheet (E13.5)
Teacher list for principal: GVCN badge, subject assignment badges.
Assignment sheet: GVCN picker + GVBM rows (class + subject grouped by SubjectParent).
Subject availability filter: greys out subjects with no ClassSubject row for the class.
Conflict detection: API-enforced; UI shows alertTriangle flag on conflicted rows.

## FE Stories Suggested Order

1. E13.4 (teacher dashboard home — replaces mock-first placeholder; student count stat real)
2. E13.1 (class view — BE real; enables attendance + class log navigation)
3. E13.5 (principal teachers mgmt — mock-first write; class list real)
4. E13.2 (attendance wiring — wait for BE US-046)
5. E13.3 (class log — wait for BE US-044)
