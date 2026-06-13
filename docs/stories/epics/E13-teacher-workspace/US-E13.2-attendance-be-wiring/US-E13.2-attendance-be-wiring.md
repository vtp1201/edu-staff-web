# US-E13.2 Attendance BE Wiring — Wire Real Core Attendance API

## Status

planned

## Lane

normal

## Dependencies

- Depends on: US-E13.1 (teacher class view — needs class context), BE US-046 (attendance API — currently `planned` in edu-api)
- Blocks: none
- Feature module(s) chạm: `src/features/attendance/` (hiện có mock-first + UI implemented US-E02.x)
- Shared contract/file: `bootstrap/endpoint/attendance.endpoint.ts` (new), `AttendanceRepository`

## Product Contract

Wire màn hình điểm danh hiện có (đã implement mock-first) sang BE thật của core
service khi endpoint `/api/v1/attendance` được build.

**Màn hình hiện tại** (`/teacher/attendance`): đã có UI hoàn chỉnh (3-state per
student: present/absent/late), submit per period, history view. Hiện chạy mock-first.

**Wire target** (khi BE US-046 ready):
- `GET /core/api/v1/classes/:classId/attendance?date=YYYY-MM-DD` — lấy bản ghi điểm danh của ngày.
- `POST /core/api/v1/classes/:classId/attendance` — tạo/submit điểm danh.
- `PATCH /core/api/v1/classes/:classId/attendance/:recordId` — sửa (nếu có).
- Map failure codes: `ATTENDANCE_ALREADY_SUBMITTED`, `ATTENDANCE_CLASS_NOT_FOUND`, etc.

**Mock-first flag**: BE US-046 hiện là `planned` (chưa build). FE implement mock
repository wiring first; khi BE live, swap như US-E06.x pattern.

## Relevant Product Docs

- `docs/product/screens.md` — "Attendance" row (Teacher section, ✅)
- `design_src/edu/classops.jsx` — `AttendanceScreen` component (pixel reference)
- BE story: `edu-api/docs/stories/epics/E04-core-school-operations/US-046-attendance/`
- BE API (MOCK-FIRST — US-046 planned, not yet built):
  - `POST /core/api/v1/classes/:classId/attendance`
  - `GET /core/api/v1/classes/:classId/attendance?date=YYYY-MM-DD`

## Acceptance Criteria

- AC-1: `AttendanceRepository` interface defined; mock implementation returns same data as current mock.
- AC-2: `AttendanceRepository` real implementation maps BE envelope per `api-integration.md`.
- AC-3: Error codes mapped: `CLASS_NOT_FOUND` → `not-found`, `ATTENDANCE_ALREADY_SUBMITTED` → `already-submitted`, network → `network-error`.
- AC-4: DI factory (`attendance.di.ts`) wires mock when `NEXT_PUBLIC_USE_MOCK=true`.
- AC-5: Existing UI behaviors unchanged (no regression): 3-state per student, submit, history.
- AC-6: All 284+ existing Vitest tests still pass.

## Design Notes

- Pattern: identical to US-E06.5 (school-config real wiring) — domain already exists, only repo + DI swap needed.
- Commands: `submitAttendance`, `updateAttendance`.
- Queries: `getAttendanceForDate`, `getAttendanceHistory`.
- **Blocked by**: edu-api US-046 must be implemented first. FE team: implement Clean Arch domain + mock repo now; add real repo as follow-up when BE ships.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Use-cases (submit attendance — valid/already-submitted/class-not-found) |
| Integration | AttendanceRepository (mock-first integration tests; real when BE live) |
| E2E | Existing Storybook attendance stories must pass |
| Platform | bun build + tsc clean |

## Harness Delta

- `docs/TEST_MATRIX.md`: thêm hàng US-E13.2 (mock-first until BE US-046 ships).
