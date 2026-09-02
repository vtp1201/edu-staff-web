# FE → BE (2026-09-02): ask còn lại để FE wire design 0209 lên ADR 0143 + class hub

> Bối cảnh: FE nhận design bundle 02/09 (student course timeline + course player +
> teacher Class Hub). Đã đọc `2026-09-02-be-to-fe-contract-update.md` (edu-api
> `af648068`) — cảm ơn BE, nó đóng sẵn nhiều ask. Dưới đây chỉ giữ **cái còn treo**
> sau khi đối chiếu `services/lms/docs/openapi.yaml`, `openapi.draft.yaml` (US-254),
> `services/core/docs/openapi.yaml`, ADR 0143/0144/0145/0147.
>
> Đã đóng nhờ contract-update (không hỏi lại): Kong path `/lms/api/v1/lms/…` chủ ý
> (FE theo) · ghi chú/Q&A theo bài **không planned** (FE bỏ khỏi design) ·
> `teachingSubjectIds[]` trên `ClassResponse` (bỏ N+1 suy GVBM) · `teacherName` trên
> `SlotResponse` · chấm submission = US-141 (eventual qua RabbitMQ) · KPI lớp =
> draft US-245 (attendance summary), US-251 (pending-counts), US-255
> (`absentToday`/`pendingGrading`) · đính kèm đơn nghỉ = draft US-249 ·
> period-logs (GVBM, theo tiết) và homeroom-entries (GVCN, theo ngày) **cùng tồn tại**.
>
> Ký hiệu: 🔴 chặn màn theo design · 🟡 FE làm được nhưng xấu · 🟢 chỉ cần xác nhận.

## #1 🔴 Nộp bài tập bằng tệp — `CreateSubmissionRequest` chỉ có `content: string ≤ 20000`

Design: kéo-thả PDF/JPG/PNG ≤ 20 MB, nộp 1 lần. §3 contract-update xác nhận "không
attachment". US-249 đã có mẫu multipart cho đơn nghỉ (≤5 MB, jpg/png/pdf, ≤3) — xin
**một draft story tương tự cho submission** (`multipart` hoặc presigned) để FE mock
theo draft (ADR 0147). Nếu BE chốt "không bao giờ upload", FE sẽ đề nghị design đổi
sang nộp text + link. Cần câu trả lời để chốt design.

## #2 🟡 US-141 chấm submission — xin draft contract + field trên `Submission`

Design student hiện "Đã nộp · Điểm 8.5/10"; teacher cần "bài chờ chấm" (US-255 lo
count). Xin publish draft cho US-141: `score`, `feedback`, `gradedAt`,
`status(SUBMITTED|GRADED)` trên `Submission` + endpoint GV chấm, để FE build
mock-first thay vì đoán shape.

## #3 🟡 Bài giảng có video — `Lesson.content: string`

Design LESSON = video player 16:9. `content` là markdown/HTML hay plain text? Có kế
hoạch `mediaUrl`/`mediaType` không? Nếu không, FE render rich text + nhúng khi
`content` chứa link YouTube/Drive, và đề nghị design bỏ player mặc định.

## #4 🟡 US-254 `GET /lms/courses/me` — xin thêm summary cho card môn

Card cần per course `openItemCount` + `nextDue { itemId, itemType, title, dueAt }`.
Draft hiện chỉ có `percentComplete`. Không có thì FE phải `courses` + N×`items`. Kèm
ETA deploy US-254.

## #5 🟢 Nhóm timeline theo tuần — có "tuần học" (Tuần 30) từ core không?

FE sẽ group client theo ISO-week của `startAt` (`null` → "Luôn mở"). Core
academic-calendar có expose số tuần học không? Nếu không, FE dùng nhãn
"Tuần 20/04 – 26/04" và đề nghị design đổi nhãn.

## #6 🟢 Thêm mục "Kiểm tra" từ timeline giáo viên

EXAM item chỉ sinh từ projection `core.exam.published`. FE sẽ đổi "Thêm mục → Kiểm
tra" thành link tạo class-exam ở core. Xác nhận: (a) độ trễ projection và có event
(SSE) để FE invalidate timeline không; (b) endpoint tạo là
`POST /core/api/v1/courseware/class-exams` với `classId+subjectId`?

## #7 🔴 GVCN xem readonly khoá học môn khác trong lớp mình

`GET /lms/courses?classId` nhánh teacher = "own subjects". GVCN của lớp có được list +
`GET items` course môn khác (PUBLISHED) không, hay 404 `LMS_COURSE_NOT_FOUND`? Design
có dropdown môn ở chế độ chỉ đọc — nếu không mở scope, FE ẩn dropdown.

## #8 🟢 "Tiết đã dạy X/Y" trên card lớp GVBM

Không thấy trong US-245/251/255. FE có thể đếm `period-logs` của mình / tổng slot môn
trong term (2 query/lớp). BE có định thêm vào US-255 không? Nếu không, FE đề nghị
design thay bằng `absentToday` + `pendingGrading`.

## #9 🟢 Period-logs `?from&to` ≤ 31 ngày — dùng cho tab Thời khoá biểu tuần OK

Chỉ xác nhận: GVBM gọi range 7 ngày nhận entry mọi tiết mình dạy + (GVCN) cả lớp;
`homeroom-entries` GVBM (không phải homeroom) có được GET đọc không? Design hiện
"GVBM chỉ xem" sổ ngày.

## #10 🟢 Draft ưu tiên cho web

Web xin đảo ưu tiên draft: **US-254, US-255, US-245, US-251, US-244** (course/class
hub) lên trước US-235..241 nếu được. US-249 (đính kèm đơn nghỉ) theo sau.

---

FE sẽ: sửa mirror `LMS_EP` + DTO, gỡ ADR 0073 (ADR mới supersede), ghi ADR
"mock-first theo draft contract" + thêm `openapi.draft.yaml` vào
`.claude/rules/api-integration.md` — trong US-E24.1 (`docs/stories/epics/E24-learning-class-hub/EPIC-OVERVIEW.md`).
