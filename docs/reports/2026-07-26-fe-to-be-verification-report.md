# Báo cáo FE → BE (2026-07-26): kết quả verify + việc đã xử lý + asks đang chờ

> Bối cảnh: BE gửi bảng đính chính ~8 điểm stale trong báo cáo FE trước đó, kèm một
> phát hiện khẩn về endpoint. FE đã verify toàn bộ trên `edu-api origin/main`
> (không đọc working tree — BE có 2 agent in-flight US-138/US-144 tại thời điểm đó).

## 1. Xác nhận báo cáo đính chính của BE — cả 8 điểm ĐÚNG

FE đã verify từng điểm trực tiếp trên code + routes + ADR của `edu-api origin/main`:

| Điểm BE đính chính | Kết quả verify FE |
| --- | --- |
| Refresh-token reuse → revoke + denylist + event (US-102) | ✅ `services/iam/.../usecase/refresh_token.go` (ADR 0084, decision 0040) |
| SUPER_ADMIN seed (US-103) | ✅ `seed_super_admin.go` + ADR 0085 (dev-only, fail-closed prod) |
| Notification MemberRoleChecker real (US-115/117/119) | ✅ real reader khi có Scylla; NoOp chỉ là dev-fallback |
| Core role-validation: gRPC MemberReader thật khi có secret (US-143) | ✅ `INTERNAL_API_SECRET` unset → dev stub + warning log (ADR 0106) |
| Academic-records: seal/unseal-request/approve/get-record/list-by-member đều có | ✅ `assessment/adapter/http/routes.go` — chỉ thiếu GET listing + seal-status |
| Exam-bank: create/add-question/status/get/list (5 routes) | ✅ đúng 5, không có update/delete/question-edit |
| Timetable: chỉ get-by-class, không có by-teacher | ✅ `GET /api/v1/classes/:classId/timetable` duy nhất |
| ADR 0060 = assessment PK; 0093/0094 mới là messaging group | ✅ đúng |

Báo cáo cũ của FE stale — đã cập nhật lại toàn bộ hiểu biết nội bộ.

## 2. Phát hiện khẩn (courseware 404) — đúng, và đã FIX xong

Xác nhận US-136 move **toàn bộ** LMS routes sang `/api/v1/courseware/*` — phạm vi
rộng hơn BE báo (không chỉ exam-bank/teaching-plan): FE có 22 endpoint constants
stale trong 4 module (exam-bank, teaching-plan, lesson-plan, question-bank).
Đã fix và merge vào `main` (`36305c5`). Flip flag sẽ không còn 404 nhóm này.

## 3. Asks đang chờ BE — theo thứ tự chặn nhiều nhất

| # | Cần gì | Chặn gì phía FE |
| --- | --- | --- |
| **#36** | Kong route `social`/`notification`/`lms` + docker-compose thêm social+lms; SSE proxy cần đi qua Kong (ADR 0047 X-Edu-Claims) | **Chặn flip `USE_MOCK` toàn cục** — việc FE cuối cùng còn lại |
| **#21** (tái xác nhận 2026-07-26, US-E18.21) | `GET .../academic-records/unseal-requests?status=pending` (listing) + seal-status/sealed-students/audit-trail | `POST` create/approve unseal **đã có nhưng không dùng được** — admin thứ hai không thể discover `requestId` để duyệt → toàn bộ unseal workflow phải mock |
| **Mới** (US-E18.21) | Endpoint đọc học bạ theo member + year-grouping (hoặc BE confirm model `classId+termId` là chốt để FE remodel màn) | Viewer học bạ (student/parent) phải mock — web key `(studentId, năm học)`, wire key `classId+termId+studentId`, không remap lossless |
| **#39** | Thêm `MANAGER` vào RBAC `list_classes` | Màn Principal Classes đang force-mock — principal thật sẽ ăn 403 |
| **#40** | Feed/moderation: display fields (name/role/avatar trên Post/Comment) + `GET /reports` filter/stats/detail | Feed + moderation force-mock toàn bộ |

## 4. Trạng thái FE

Backlog 126/126 `implemented` (2026-07-26 thêm US-E18.21 academic-records +
US-E12.13 subject-detail-route). Việc FE còn lại duy nhất là flip `USE_MOCK` —
sẵn sàng ngay khi #36 xong.

Registry asks đầy đủ (kèm evidence từng cái):
`docs/stories/epics/E18-be-wiring/EPIC-OVERVIEW.md`.
