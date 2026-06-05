# Attendance — EduPortal (E02)

Hợp đồng nghiệp vụ điểm danh của **giáo viên**. Slice đã chạy được (mock + real
repository).

## Khái niệm

```text
ClassSummary     = { id, name }
ClassPeriod      = { id, classId, className, subject, date, period }
AttendanceStatus = "present" | "excused" | "absent"
AttendanceRecord = { studentId, studentName, studentCode, avatarUrl?, status, note? }
AttendanceRoster = { period: ClassPeriod, records: AttendanceRecord[] }
```

- **ClassPeriod** = một buổi/tiết của một lớp trong một ngày (`date` + `period`
  số tiết).
- **Roster** = danh sách học sinh của một buổi kèm trạng thái điểm danh.

## Luồng nghiệp vụ

```text
1. Liệt kê lớp của tôi        listMyClasses() -> ClassSummary[]
2. Chọn lớp + ngày + tiết     getRoster(classId, date, period) -> AttendanceRoster
3. Đánh trạng thái từng HS    (present / excused / absent, kèm note tùy chọn)
4. Lưu                        saveAttendance(periodId, records)
5. Xem lịch sử buổi đã ĐD     listHistory(classId, from, to) -> ClassPeriod[]
```

## Use-case & endpoint

| Use-case | Hành vi | Endpoint (`ATTENDANCE_EP`) |
| --- | --- | --- |
| `ListMyClassesUseCase` | lớp giáo viên đang dạy | `GET /attendance/classes` |
| `GetRosterUseCase` | roster theo lớp/ngày/tiết | `GET /attendance/classes/:classId/roster` |
| `SaveAttendanceUseCase` | lưu trạng thái cả buổi | `PUT/POST /attendance/periods/:periodId` |
| `ListAttendanceHistoryUseCase` | các buổi đã điểm danh trong khoảng ngày | `GET /attendance/classes/:classId/history` |

## Quy tắc (đã có)

- `saveAttendance` yêu cầu `periodId` không rỗng → thiếu thì lỗi.
- `records` rỗng → **no-op** (không gọi API), coi như không có gì để lưu.
- `status` mặc định và giá trị hợp lệ chỉ trong tập 3 trạng thái trên.

## Thất bại (typed)

```text
AttendanceFailure =
  | { type: "period-not-found" }
  | { type: "save-failed"; message? }
  | { type: "unauthorized" }
  | { type: "network-error" }
  | { type: "unknown"; message? }
```

## UI

Màn hình `attendance-screen` gồm: filters (lớp/ngày/tiết), roster table với
status toggle per HS, summary card, và tab lịch sử. Chi tiết VM ở
`attendance-screen.i-vm.ts`.

## Chưa chốt / cần story

- Real repository khi backend sẵn sàng (hiện có cả mock + real).
- Edge case: buổi đã "chốt sổ" có cho sửa lại không; roster rỗng; điểm danh trễ.
- Quyền của hiệu trưởng đối với dữ liệu điểm danh (xem
  `docs/product/roles-permissions.md`).
- Tenant scope của lớp/học sinh khi multi-tenancy được chốt.
