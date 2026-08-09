# FE verify: 13 ask của 2026-08-09 sau khi BE apply

> Verify bằng curl thật qua Kong `localhost:8000`, tenant
> `aeb0e462-9ced-48b3-ba36-803f9266b09d`, 4 role (TEACHER / ADMIN-hiệu trưởng /
> PARENT / STUDENT). **13/13 đúng như BE mô tả.** Bảng dưới ghi bằng chứng và
> việc FE làm theo (nếu có).

| # | Ask | Verify | FE làm theo |
| --- | --- | --- | --- |
| 1 | `displayName` trên roster | `.../classes/{id}/students` → `displayName: "Hoàng Văn An"` | Không cần đổi: FE chỉ gọi IAM cho dòng THIẾU tên, giờ tự động 0 lượt |
| 2 | `homeroomTeacherName` | `GET /classes` → `"Giao Vien Demo 4"` | Không |
| 3 | `memberId` ↔ `userId` | — (xác nhận contract) | **ADR `0074`** + ghi vào `.claude/rules/api-integration.md` |
| 4 | `unread-count` 500 | → `200 {"count":2}` | Không (badge chuông giờ có số thật) |
| 5 | SSE 0 byte | `ttfb=0.0038s bytes=13` (trước 30s) | Không — giữ backoff luỹ thừa |
| 6 | TKB phi thực tế | GV Toán: 15 slot, **chỉ môn Toán**, rải 5 ngày | Không |
| 7 | `termName` học bạ | BE từ chối, có lý do | Giữ join calendar (đã làm) |
| 8 | ADMIN 403 ở `tenants/{id}/members` | → `200`, 6 giáo viên | Nối lại ô **Giáo viên** trên Tổng quan hiệu trưởng (đang "—") |
| 9 | `classes` rỗng khi thiếu year | Không filter → **31 lớp** (5 năm) | Không — vẫn truyền year tường minh |
| 10 | Seed dữ liệu hiệu trưởng | 31 lớp / 150 HS / 1.512 bản ghi điểm danh | Không |
| 11 | `GET .../consents` 405 | → `200` (query `parentMemberId`+`studentMemberId`) | **Chưa nối** — xem "Còn mở" |
| 12 | `me` + tên con | `studentName: "Hoàng Thanh Oanh"` trên mỗi link | Ưu tiên `studentName` của wire, chỉ fallback IAM khi vắng |
| 13 | Conduct seed | (ask mới, BE chưa trả lời trong reply này) | Chờ |

## Màn hình đã smoke lại sau seed mới

| Màn | Trước | Sau |
| --- | --- | --- |
| GV · Điểm danh | 10A1, 2 HS | 11A2, **sĩ số 25**, tỉ lệ 100% |
| GV · Học sinh | 2 HS | **150 học sinh**, tên thật |
| GV · Nhập điểm | uuid ở cột tên | `Phạm Thị Dũng` · TX1 7.8 "Đã công bố" |
| HT · Tổng quan | Giáo viên — / HS 2 / Lớp 1 | **GV 6 · HS 150 · Lớp 6** (chuyên cần vẫn "—", đúng khuyến nghị BE) |
| HT · Giáo viên | "Bạn không có quyền truy cập" | **6 giáo viên**, bảng phân công |
| HT · Sổ đầu bài | "Chọn một lớp" (không có lớp) | `Sổ đầu bài · 11A1` + dropdown đổi lớp |
| HS · Bảng điểm | trống (năm ACTIVE toàn DRAFT) | 3 nhóm môn, cột TX **Đã công bố** 6.8 / 8.1 / 9.2 |
| HS · Học bạ | tiêu đề là uuid | `Hoc ky 2`, 5 năm học đã ký |
| PH · Con của tôi | "Bạn không có quyền xem" | 3 con, tên do BE resolve |
| PH · Bảng điểm | "lỗi không xác định" | bảng điểm của con đầu tiên |

## Còn mở (FE chưa làm, cần quyết định)

1. **Consent (ask #11)** — endpoint đọc đã có, nhưng shape lệch hẳn với UI hiện tại:
   BE có **một** `category: CONDUCT_NOTIFICATION` với `status: GRANTED|REVOKED`,
   ghi nhận bởi ADMIN, `404` khi chưa từng ghi; FE đang model **ba** toggle
   boolean (`disciplineAlerts` / `absenceAlerts` / `gradeAlerts`) **do phụ huynh
   tự bật/tắt**. BE nói rõ self-service không nằm trong MVP (ADR 0075) → đây là
   **thay đổi chính sách + redesign section**, không phải wiring. Cần một DR/US
   riêng, không tự làm.
2. **Conduct/discipline (ask #13)** — hai blocker đã hết (verify: 3 endpoint
   trả 200 cho PARENT với `classId` của con), nhưng dữ liệu vẫn rỗng. Un-mock
   là một US wiring; nên chờ seed rồi làm một lượt.
3. **Tỉ lệ chuyên cần toàn trường** — theo khuyến nghị của BE, giữ "—" cho tới
   khi có `GET /attendance/summary?date=`. Nếu ô này cần cho demo, FE mở ask.
