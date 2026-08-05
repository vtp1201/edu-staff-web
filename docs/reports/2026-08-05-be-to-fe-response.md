# BE → FE (2026-08-05): batch P2 — 6 US mới trên `edu-api main`

> Tiếp nối `2026-08-04-be-to-fe-response.md`. CẢ 6 US đã merge `edu-api main`
> (HEAD `1042aa94`): US-179, US-180, US-181, US-182, US-183, US-184. Contract
> chi tiết luôn ở `services/<svc>/docs/{openapi.yaml,INTEGRATION.md}` trên main.

## Đã đóng nốt gap MANAGER cuối (INFO-178-002) → US-179

`GET /core/api/v1/classes/{classId}/attendance?date=` giờ cho **MANAGER** đọc
(trước: ADMIN/GVCN-only). Đây là read-surface cuối còn thiếu cho màn principal —
attendance theo lớp/ngày. Write (record attendance) vẫn GVCN-only.

## Fix 422 field-name trên notification → US-180

`GET /noti/api/v1/notifications`: 422 `fields[].field` giờ trả wire name
**`limit` / `type` / `read` / `cursor`** thay vì `Limit/Type/Read/Cursor` (tên
field Go bị leak). ⚠️ Client nào đang match tên cũ phải đổi sang chữ thường.

## #44 follow-up (teachers screen) → US-181

Route mới: **`GET /core/api/v1/classes/{classId}/subject-assignments`**
(ADMIN/SUPER_ADMIN/MANAGER, hoặc TEACHER được assign vào lớp).
- Trả `data: SubjectAssignmentResponse[]` — `{classId, subjectId,
  teacherMemberId, assignedAt, assignedBy}`, unpaginated (≤ ~15 row/lớp),
  lớp rỗng → `[]`.
- Path segment riêng `subject-assignments` — `GET /classes/{id}/subjects` vẫn
  thuộc curriculum ClassSubject (US-057), không đổi.
- Màn teachers: "môn dạy / số lớp phụ trách" = group kết quả này theo
  `teacherMemberId` (per-class read; chưa có endpoint compose tenant-wide —
  gửi ask mới nếu cần).

## #9 (phần còn lại — search pool chưa enroll) → US-182 + ADR 0125

Chốt phương án **FE compose** (ADR 0125 trong edu-api):

1. FE lấy directory: `GET /iam/api/v1/tenants/{tenantId}/members?role=STUDENT`
   (US-144, đã có).
2. FE lấy tập đã enroll: **`GET /core/api/v1/enrollments/student-ids?academicYear=2025-2026`**
   (mới, ADMIN/SUPER_ADMIN/MANAGER) → `{academicYear, studentMemberIds: [uuid…]}`
   — dedup, unpaginated, ids-only (không PII).
3. Pool chưa enroll = (1) − (2). Stale-window giữa 2 call vô hại: enroll trùng
   đã bị chặn bởi LWT per-year → 409 mà FE đã handle.

Lưu ý: học sinh của lớp **ARCHIVED vẫn tính là đã enroll** (không quay lại
pool). Nếu product muốn ngược lại, gửi ask — BE sẽ thêm variant ACTIVE-only.

## #21 (phần còn lại — sealed-students) → US-183

Route mới: **`GET /core/api/v1/classes/{classId}/terms/{termId}/academic-records/sealed-students`**
(ADMIN/SUPER_ADMIN) → `data: [{studentMemberId, sealedAt, sealedBy,
resealCount}]` — subset đang SEALED của roster hiện tại, unpaginated.

Về **audit-trail** seal/unseal: record chỉ giữ **cycle mới nhất**
(sealedAt/sealedBy + resealCount); lịch sử unseal (ai request/approve, reason,
timestamps) đã có đủ ở unseal-requests listing (US-150). **Không tồn tại
event-log seal đa cycle trong data model** — nếu màn audit thật sự cần nhiều
hơn "cycle mới nhất + lịch sử unseal-request", gửi ask nêu rõ field; BE sẽ mở
design story (bảng mới).

## #19 (reject/request-revision GradeEntry) → US-184

Route mới: **`POST /core/api/v1/classes/{classId}/subjects/{subjectId}/terms/{termId}/grades/{studentId}/columns/{columnId}/reject`**
(ADMIN/MANAGER), body `{"reason": "..."}` (bắt buộc, ≤500 ký tự).

- Transition: `PENDING_APPROVAL → DRAFT` (request-revision, mirror
  conduct-reject). **Không có state REJECTED mới** — entry quay lại vòng
  DRAFT→submit bình thường, teacher sửa rồi resubmit.
- 200 → `GradeEntryResponse` giờ có thêm `rejectionReason` / `rejectedBy` /
  `rejectedAt` (cycle rejection mới nhất, không bị clear sau resubmit —
  approver luôn thấy lý do lần trước).
- Lỗi: `409 GRADE_ENTRY_NOT_PENDING_APPROVAL`, `422
  GRADE_REJECTION_REASON_REQUIRED`.
- ⚠️ **3 field rejection là STAFF-ONLY**: luôn bị strip trên read STUDENT/PARENT
  (`/members/{id}/grades`, `/members/{id}/grade-report`) — FE đừng expect chúng
  ở màn học sinh/phụ huynh. FE cũng nên escape khi render `rejectionReason`
  (free text do staff nhập).
- Không có event/notification khi reject (giống conduct) — teacher thấy qua
  status DRAFT + rejectionReason khi mở gradebook.

## ⚠️ Deploy notes

1. **Migration `047_grade_entries_rejection`** (core) phải chạy trước khi bật
   US-184 (ALTER thêm 3 cột vào `grade_entries` + `grade_entries_by_student`).
2. Các US còn lại không cần migration.

## Known issue BE tự phát hiện (không cần FE làm gì)

Audit US-184 phát hiện bug pre-existing (**US-185**, đã đăng ký, ưu tiên cao):
clone `grade_entries_by_student` không được cập nhật sau lần nhập điểm đầu —
màn điểm học sinh (`/members/{id}/grades`) có thể hiển thị **status/value cũ**
so với gradebook của giáo viên. BE sẽ fix + backfill; sẽ báo khi ship.

## Trạng thái asks còn mở phía BE

- #18 (rollup pending-approval tenant-wide): cần design story — chưa có read
  path tenant-wide; sẽ làm sau US-185.
- #28 (attendance range theo lớp): nhận, sẽ xếp sau US-185.
- #16, #10/#11, #32, #31, viewer học bạ: chưa đổi trạng thái so với 08-04.
