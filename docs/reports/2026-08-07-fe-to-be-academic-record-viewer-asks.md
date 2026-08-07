# FE → BE (2026-08-07): viewer học bạ đã wire thật — 2 ask mới (#47, #48)

> Trả lời cho `docs/reports/2026-08-07-be-to-fe-response.md` §2 ("Trả lời câu
> hỏi viewer học bạ"). FE đã tiêu thụ xong câu trả lời ở **US-E18.54**: bỏ
> force-mock vĩnh viễn của `makeRepository()` trong
> `src/bootstrap/di/academic-records.di.ts` (đứng từ US-E18.21 / ADR 0055
> §Context #6) và remodel toàn bộ entity của viewer sang đúng contract thật.
> `makeSealRepository()` cùng file **không đụng tới** (regression guard trong
> `academic-records.di.test.ts` chạy cả 2 mode).
>
> Item 19 Phần 2 của `2026-08-06-fe-to-be-asks.md` ("Viewer học bạ — BE confirm
> model") → **ANSWERED + CONSUMED**.

## Đã làm phía FE (không cần BE làm gì thêm)

- Port `IAcademicRecordsRepository` đổi từ `getRecord(studentId, yearId?)` +
  `listYears(studentId)` (một shape chưa từng tồn tại trên wire) sang
  `getRecords(memberId)` gọi `GET /core/api/v1/members/{memberId}/academic-records`
  (BE US-064) — 1 call, unpaginated.
- Year-grouping làm **client-side** đúng như BE đề xuất: `buildAcademicRecord`
  gom record phẳng theo năm; `mapAcademicRecordRow` gom `gradeSnapshot` động
  theo `subjectId` và parse decimal string (`coefficient`, `value`,
  `termAverage`). Không còn slot cố định tx1/tx2/giữa-kỳ/cuối-kỳ.
- Bỏ khỏi màn hình các field **không có nguồn wire** thay vì bịa: tên/mã/ngày
  sinh học sinh, và **hạnh kiểm** (conduct nằm ở bounded context khác, không có
  trong `gradeSnapshot`). `sealedBy` là memberId nên UI hiển thị **ngày ký**,
  không hiển thị uuid.

## Ask #47 (P2) — denormalize `academicYear` lên `AcademicRecordResponse`

BE đã pre-offer ở §2 ("làm được nhanh nhưng cần story riêng"). FE xin **gửi
chính thức**, vì client-side join hiện **không thể làm được cho PARENT**:

| Read có `academicYearLabel` | RBAC (ground-truth Go source) | PARENT? |
| --- | --- | --- |
| `GET /classes/{classId}` (`get_class.go`) | ADMIN/SUPER_ADMIN/MANAGER, TEACHER **assigned** | ❌ 403 |
| `GET /classes/{classId}/students/{studentMemberId}` (`get_student_enrollment.go`) | ADMIN/SUPER_ADMIN/MANAGER, TEACHER assigned, STUDENT **self** | ❌ 403 |
| `GET /members/{memberId}/enrollment` (`get_member_enrollment.go`) | ADMIN/MANAGER/TEACHER, self, **linked PARENT** ✅ | ✅ nhưng key theo **yearLabel**, trả về 1 enrollment (`""` → mới nhất) — tức là chiều **year → class**, ngược với join cần (`class → year`), và không enumerate được các năm cũ |

FE đã chọn phương án tốt nhất hiện có: **enrollment point-read**
(`/classes/{classId}/students/{studentMemberId}`) — 1 endpoint phủ
ADMIN + MANAGER + STUDENT-self + TEACHER-assigned, dedupe theo classId, cap 24
call, fail-soft từng lớp. Hệ quả còn lại:

- **PARENT**: không lớp nào resolve được → toàn bộ record rơi vào bucket "Chưa
  xác định năm học" (degrade trung thực, có notice riêng, **không** drop record,
  **không** bịa năm). Đây là AC-2 của US-E18.54 chỉ đạt một phần.
- **TEACHER** (nếu #48 được cấp): chỉ resolve được các lớp đang được phân công —
  các năm cũ vẫn rơi vào bucket unresolved.
- Ngoài ra endpoint enrollment **không có** `className`/`gradeLevel`, nên viewer
  hiện không hiển thị tên lớp (không in uuid).

**Xin**: thêm `academicYear` (và nếu rẻ, `className`) vào
`AcademicRecordResponse` + backfill. Khi có, FE xoá toàn bộ collaborator join
(`enrollment-year.resolver.ts`) và bucket unresolved — đây là một xoá code
thuần, không phải thêm.

## Ask #48 (P2) — TEACHER trong allow-list của read học bạ

`ListStudentAcademicRecordsUseCase.Execute` (và `GetAcademicRecordUseCase`) gate
ADMIN/MANAGER/SUPER_ADMIN, STUDENT-self, PARENT-linked-child, còn lại
`default: ErrAcademicRecordForbidden()` → **TEACHER luôn 403**.

FE đang có route `/(app)/teacher/students/{studentId}/academic-record` (tồn tại
từ US-E14.5, cùng màn với 3 role kia) — ở real mode nó sẽ luôn hiện trạng thái
`forbidden`. FE **không** ẩn route và **không** giả lập dữ liệu: degrade đúng
theo lỗi thật.

**Xin BE quyết** một trong hai, cái nào cũng được, FE làm theo:
(a) cấp cho TEACHER quyền đọc học bạ của học sinh trong lớp mình phụ trách
(giống pattern `teacherAssignedTo` đã dùng ở `get_class.go`), hoặc
(b) xác nhận TEACHER **không** được xem học bạ theo chính sách — khi đó FE sẽ gỡ
route đó (như đã làm với ask #44/option b).

## Ghi chú vận hành (không phải ask)

- Namespace `/admin/*` vẫn chỉ reachable ở mock mode (ADR `0070`, không đổi),
  nên route `/admin/students/{id}/academic-record` chưa exercise được ở real
  mode — không phải gap của story này.
- `GET /core/api/v1/subjects` ("any authenticated member") được dùng làm nguồn
  `subjectId → tên môn` cho viewer (1 lần drain, fail-soft). Nếu BE có ý định
  siết RBAC endpoint này, báo FE trước: mất nó thì cột "Môn học" của học bạ chỉ
  còn placeholder.
