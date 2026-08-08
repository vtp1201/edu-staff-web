# FE → BE (2026-08-08, ask riêng): #51 — LMS consumption contract cho học sinh

> Không thuộc chuỗi batch wiring (batch 6 đã đóng cả hai chiều). Đây là ask
> mở service mới, phát hiện khi smoke-test role HỌC SINH trên stack thật
> (real mode, edu-api `f5ed5a86`).

## #51 — Build LMS consumption contract (student courses / lessons / assignments)

**Hiện trạng verify trực tiếp:** service `lms` đang chạy trong stack nhưng là
scaffold — `services/lms/docs/openapi.yaml` chỉ có đúng `/health`; mọi route
`/lms/api/v1/*` trả 404 từ chính service (không phải lỗi gateway). Hệ quả:
tab **Khoá học** và **Bài tập** của HỌC SINH ở real mode degrade thành error
card vĩnh viễn.

**FE đã làm gì trong lúc chờ:** force-mock DI của feature `lms` trong real
mode (precedent ADR 0054 — grade-approval dashboard), để hai tab chạy mock
data thay vì lỗi. Điều kiện gỡ force-mock = ask này được ship.

**Contract FE cần** (đã mirror sẵn trong `src/bootstrap/endpoint/lms.endpoint.ts`
+ mock repository từ US-E11.6/E11.7 — DTO shape lấy từ đó làm tham chiếu):

| Method | Path | Dùng cho |
| --- | --- | --- |
| GET | `/api/v1/courses?status=` | Danh sách khoá học của học sinh (grid + tabs) |
| GET | `/api/v1/courses/{courseId}/lessons` | Lesson player — danh sách bài trong khoá |
| POST | `/api/v1/lessons/{lessonId}/complete` | Mark-complete một bài |
| GET/PUT | `/api/v1/lessons/{lessonId}/note` | Ghi chú cá nhân của học sinh trên bài |
| GET/POST | `/api/v1/lessons/{lessonId}/questions` | Q&A thread per-lesson |
| GET | `/api/v1/students/{studentMemberId}/assignments?status=` | Danh sách bài tập (list + filter) |
| POST | `/api/v1/assignments/{assignmentId}/submissions` | Nộp bài |

Yêu cầu chung như mọi service: envelope chuẩn (decision 0008), camelCase,
RBAC theo tenant-scoped token (STUDENT self; TEACHER/ADMIN theo scope lớp —
BE quyết chi tiết), route qua Kong prefix `/lms`.

**Ưu tiên:** trung bình-cao — đây là 2 tab chính của trải nghiệm học sinh;
mock che được demo nhưng không đi live được. Không chặn go-live các phần khác.

**Lưu ý phạm vi:** exam / exam-bank / lesson-bank / lesson-plan / question-bank
KHÔNG thuộc ask này — đã wire `core` thật và đang hoạt động. Ask chỉ là phần
consumption của học sinh trên service `lms`.

## Observation (không chặn, vận hành dev stack)

Hôm nay hai lần liên tiếp: `edu-scylla` restart nhưng các service Go
(iam/core/lms/social) giữ connection cũ → mọi read Scylla fail cho tới khi
restart service thủ công (triệu chứng phía ngoài: IAM trả `USER_INVALID_CLIENT`
dù client seed đúng; social 500 `internal_server_error` ở `GET /rooms`).
Đề nghị BE cân nhắc cấu hình reconnect/health-eviction cho gocql session
(driver hỗ trợ) hoặc ghi vào runbook "restart Scylla ⇒ restart cụm service" —
tuỳ BE chọn, FE chỉ báo hiện tượng.

## Còn treo (không đổi)

- #21 (audit-trail seal/unseal đa cycle) — giữ treo.

## Tham chiếu

| Thứ | Ở đâu |
| --- | --- |
| FE endpoint mirror + mock contract | `src/bootstrap/endpoint/lms.endpoint.ts`, `src/features/lms/infrastructure/repositories/mocks/` |
| Story gốc màn student | US-E11.6 (courses + lesson player), US-E11.7 (assignments) |
| Force-mock stopgap | US mới trong `docs/stories/epics/` (đang chạy, xem git log `force-mock lms`) |
