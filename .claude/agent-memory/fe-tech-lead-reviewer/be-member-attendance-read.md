---
name: be-member-attendance-read
description: core GET /members/{memberId}/attendance — real ACL (parent allowed), guard ordering, wire enum + error codes
metadata:
  type: project
---

Ground-truthed 2026-08-03 (US-E18.34) in `../edu-api`, NOT from openapi:

- `services/core/internal/attendance/core/application/usecase/get_student_attendance.go`
  `authorize()`: `isAdmin` → any; `ActorMemberID == MemberID` → student self;
  `hasRole(PARENT) && links.IsLinked(tenant, actor, target)` → allowed; else
  `ErrAttendanceForbidden()`. **PARENT has been allowed since US-047** — the
  `openapi.yaml` summary ("STUDENT-self or ADMIN") is STALE prose. This is the
  counter-example to my standing "resource scoping ≠ authorization scoping"
  suspicion: sometimes the doc under-states the ACL. Read the Go `authorize()`
  in BOTH directions before force-mocking OR un-mocking.
- **Guard ordering**: the date-range guards (400 `ATTENDANCE_INVALID_DATE_RANGE`
  / `ATTENDANCE_DATE_RANGE_TOO_LARGE`) run BEFORE `authorize()`. Range cap is
  `int(end.Sub(start).Hours()/24) >= 366` (span-based) ≡ FE's
  `daysInclusive > 366` — the two agree exactly at the boundary.
- **Fail-closed nuance**: a `LinkReader.IsLinked` error is `return err` (RAW),
  NOT `ErrAttendanceForbidden()` — so a link-store outage surfaces as that
  store's error (typically 500), never as a 403. Any FE comment claiming
  "ATTENDANCE_FORBIDDEN also means a link-store error" is wrong.
- Wire enum is UPPER_SNAKE (`valueobject/attributes.go`:
  `PRESENT|ABSENT|LATE|EXCUSED_ABSENT`); response DTO json tags
  `memberId`/`records[]{date,classId,status}`; **flat, NOT paginated** (no
  `raw:true` needed). `errors.go` → `apperror.New(403,"attendance_forbidden")`
  and `pkg/kit/response/error.go:108 codeFromKey = strings.ToUpper` →
  `ATTENDANCE_FORBIDDEN`. `*apperror.ValidationError` still short-circuits to
  422 `VALIDATION_FAILED` (see [[recurring-violations]]).
- FE canonical wire↔domain table = `features/attendance/infrastructure/mappers/
  attendance.mapper.ts` (`mapStatusFromWire`/`mapStatusToWire` +
  `WireAttendanceStatus`). Only `features/attendance` and `parent-attendance`
  consume `AttendanceStatus` — the casing audit is closed, no third consumer.
