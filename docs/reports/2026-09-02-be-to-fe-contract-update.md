# BE → FE (2026-09-02): cập nhật contract đợt 2026-09-02 + cách tiêu thụ draft contract

> Không trả lời một file ask cụ thể. Đây là thông báo chủ động từ BE sau đợt
> làm việc với team mobile (`edu-staff-mobile/docs/product/ask_be_team.md` →
> `reply_from_be_team.md`), vì phần lớn thay đổi ảnh hưởng cả web.
> Đối chiếu trên `edu-api` main `0c21be25`.
> Toàn bộ endpoint dưới đây đã có trong `services/<svc>/docs/openapi.yaml` +
> `INTEGRATION.md`, trừ mục §4 (draft).
>
> **FE cần làm gì (tóm tắt):** §2 có 3 việc un-mock/đổi field; §3 có 1 việc
> sửa endpoint mirror lms; §4 là quy ước mới để build song song với BE.
> Việc còn treo phía BE với web: ask **#51** (LMS consumption) — trả lời ở §3.

| # | Thay đổi | Trạng thái | FE cần làm |
| --- | --- | --- | --- |
| 1 | Sổ đầu bài theo TIẾT (US-233) | ✅ ĐÃ SHIP | Màn class-log GV bộ môn: wiring mới (§2.1) |
| 2 | Chuẩn bị tiết dạy (US-232) | ✅ ĐÃ SHIP | Màn period-detail GV: wiring mới (§2.2) |
| 3 | `tenantName` trên `members/me/tenants` (US-234) | ✅ ĐÃ SHIP | Tenant switcher bỏ decorate qua JWT/IAM |
| 4 | `teacherName` trên `SlotResponse` (US-234) | ✅ ĐÃ SHIP | TKB bỏ batch `/iam/api/v1/members?ids=` |
| 5 | `teachingSubjectIds` trên `ClassResponse` (US-234) | ✅ ĐÃ SHIP | Card lớp GV hiện môn dạy |
| 6 | Conduct: HS/PH chỉ thấy APPROVED, không `rejectionReason` (ADR 0146) | ✅ ĐÃ SHIP | Màn HS/PH bỏ nhãn DRAFT/REJECTED |
| 7 | PARENT được lọc `student-violations` theo con (US-234) | ✅ ĐÃ SHIP | Bỏ mock/degrade phần vi phạm ở màn phụ huynh |
| 8 | `services/lms` đã lên (US-228..231) | ✅ ĐÃ SHIP | **Gỡ ADR 0073 force-mock**, sửa endpoint mirror (§3) |
| 9 | Push `data` có `tenantId`; catalogue key inbox + params | ✅ ĐÃ SHIP | Không (web dùng SSE); tham khảo nếu làm web-push |
| 10 | `docs/product/api-conventions.md` viết lại | ✅ ĐÃ SỬA | Rule `api-integration.md` của web đang đúng; không đổi |
| 11 | 21 story draft contract (US-235..255) | 📝 DRAFT | Đọc §4, chọn story web cần, mock theo draft |

---

## §1 Bối cảnh

Teacher UI đang gộp về "Lớp học là trung tâm" (ADR 0143, `design-course-container.md`
trong edu-api E10). Hai tính năng mới của core lấp hai khoảng lệch đã xác nhận với
product 2026-09-02. Cả hai nằm trong bounded context mới `services/core/internal/periodprep`.

Định danh một tiết dạy = `(classId, date, periodNumber)` — slot TKB lặp theo tuần
trong term, nên phải thêm NGÀY. Phân quyền theo slot: người ghi phải là giáo viên
đang được phân công dạy đúng slot đó (ADR 0029 SUBJECT). Body write bắt buộc
`termId` + `academicYearId` để BE kiểm tra ngày nằm trong term (VULN-232-001).

## §2 Endpoint mới — core (`/core/api/v1/...`)

### 2.1 Sổ đầu bài theo tiết — US-233 (ADR 0145)

```
PUT    /core/api/v1/classes/{classId}/period-logs/{date}/{periodNumber}   # upsert
GET    /core/api/v1/classes/{classId}/period-logs/{date}/{periodNumber}
DELETE /core/api/v1/classes/{classId}/period-logs/{date}/{periodNumber}
GET    /core/api/v1/classes/{classId}/period-logs?from=YYYY-MM-DD&to=YYYY-MM-DD   # ≤31 ngày
```

Body PUT: `termId`, `academicYearId`, `lessonTitle` (≤200, bắt buộc), `remark`
(≤2000, optional), `grade` enum `A|B|C|D`, `absentCount` 0..200 (tham khảo, KHÔNG
thay điểm danh). Response thêm `dayOfWeek`, `subjectId`, `teacherMemberId`,
`createdAt`, `updatedAt`.

Quyền: GVBM đúng slot ghi/sửa/xoá entry của mình; ADMIN/SUPER_ADMIN ghi; GVCN +
MANAGER đọc cả lớp. Người khác đọc range → lọc theo dòng (chỉ tiết mình dạy),
không 403 cả range. Không có state machine; nhật ký ngày của GVCN (US-044,
`homeroom-entries` DRAFT→SUBMITTED→APPROVED, `/revise`) giữ nguyên. Lỗi:
`PERIOD_LOG_ENTRY_*` trong `services/core/docs/ERROR_CODES.md`; ghi sai term →
**409** term-mismatch.

### 2.2 Chuẩn bị tiết dạy — US-232 (ADR 0144)

```
PUT/GET/DELETE /core/api/v1/classes/{classId}/period-preps/{date}/{periodNumber}
GET            /core/api/v1/classes/{classId}/period-preps?from=&to=
```

Body PUT: `termId`, `academicYearId`, `note` (optional), `lessonPlanId` (optional,
tham chiếu mềm tới `courseware/lesson-plans` của chính GV), `materials[]` ≤20
`{title ≤200, url http(s) ≤2000}` — link, KHÔNG upload file. Update = full
replace. Quyền như 2.1 (GVBM ghi, GVCN/MANAGER đọc). Lưu ý contract: từ US-233,
denial "không có slot"/"không phải GV của slot" gộp thành **422** (không còn
403 `PERIOD_PREP_FORBIDDEN`) để tránh oracle lưới tiết — web không nên phân biệt
403/422 ở đây.

### 2.3 Field mới trên endpoint cũ — US-234

| Endpoint | Field | Ghi chú |
| --- | --- | --- |
| `GET /iam/api/v1/members/me/tenants` | `tenantName` (required) | Render tenant-select trước khi switch; năm học vẫn lấy từ `GET /core/api/v1/academic-years/active` sau switch |
| `GET /core/api/v1/classes/{id}/timetable...` (`SlotResponse`) | `teacherName` (optional) | Omitted khi không resolve được |
| `GET /core/api/v1/classes` (nhánh TEACHER) | `teachingSubjectIds[]` (optional) | Chỉ có ở nhánh danh sách lớp của GV |
| `GET /core/api/v1/conduct/student-violations`, `student-conduct-grades` | — | STUDENT/PARENT: chỉ APPROVED, `rejectionReason` bị strip; PARENT giờ nhận đúng vi phạm của con |

### 2.4 Không đổi nhưng hay nhầm

- `/revise` cho homeroom-entries đã có trong `INTEGRATION.md` từ 2026-06-14.
- `PATCH /iam/api/v1/users/me` là **replace** (bỏ key = xoá) — đã ghi rõ ở
  INTEGRATION.md (VULN-169-001). Không đổi hành vi.
- `/auth/social`: chỉ `google` được wire; `facebook` → 400
  `USER_UNSUPPORTED_SOCIAL_PROVIDER`; VNeID chưa có (khớp ADR 0035 của web).
- `(memberId, date)` là unique trong attendance (`attendance_by_student`).

## §3 Trả lời ask #51 — LMS consumption (2026-08-08) và ADR 0073

`services/lms` đã ship (edu-api US-228..231, ADR 0143 course container). Path
thật khác mirror hiện tại của web (`src/bootstrap/endpoint/lms.endpoint.ts`):
**mọi path lms có thêm segment `lms`**, tức qua Kong là `/lms/api/v1/lms/...`.

| Web đang mirror | Path thật (qua Kong) |
| --- | --- |
| `/lms/api/v1/courses` | `GET /lms/api/v1/lms/courses` (+ `POST`, `GET/PATCH /{courseId}`, `POST /{courseId}/publish`) |
| `/lms/api/v1/courses/{id}/lessons` | `GET/POST /lms/api/v1/lms/courses/{courseId}/lessons`, `GET/PATCH/DELETE .../lessons/{lessonId}` |
| — | `GET /lms/api/v1/lms/courses/{courseId}/items` (timeline LESSON/ASSIGNMENT/DOCUMENT/EXAM), `POST .../items/documents`, `PUT .../items/order`, `PATCH/DELETE .../items/{itemId}` |
| `/lms/api/v1/students/{id}/assignments` | `GET /lms/api/v1/lms/assignments?courseId=` (+ `POST`, `GET/PATCH /{assignmentId}`) |
| `/lms/api/v1/assignments/{id}/submissions` | `POST /lms/api/v1/lms/assignments/{assignmentId}/submissions`, `GET .../submissions` (GV), `GET .../submissions/me` (HS), `GET .../submissions/{studentUserId}` |
| `/lms/api/v1/lessons/{id}/complete` | **Chưa có** — draft US-254 (§4) |
| `/lms/api/v1/lessons/{id}/note`, `/questions` | **Không có, không planned** — bỏ khỏi mirror |

Chưa có: enrolment API (chỉ projection nội bộ; draft `GET /lms/api/v1/lms/courses/me`
US-254), progress/completion (US-254), chấm submission + write-back điểm
(US-141 — OQ-E10-01 đã resolved 2026-09-02: eventual qua RabbitMQ). Submission
`content` là string, không attachment.

**FE cần làm:** (a) sửa mirror + DTO theo `services/lms/docs/openapi.yaml`;
(b) gỡ force-mock ADR 0073 về `USE_MOCK ? Mock : Real` như pattern un-force-mock
của E18; (c) phần completion/progress giữ mock theo draft US-254 (§4) — ghi ADR
"supersede 0073" theo mẫu các ADR wiring-contract remap (0053..0061).

## §4 Quy ước mới: draft contract để build song song (edu-api ADR 0147)

Vấn đề cũ: web/mobile chờ BE ship rồi mới wiring, hoặc tự đoán shape rồi mock.
Từ 2026-09-02 BE publish **draft OpenAPI trước** cho mọi story đã được product
chốt, mobile/web mock theo draft, khi story ship path chuyển sang `openapi.yaml`
**không đổi shape**.

| Thứ | Vị trí (edu-api) |
| --- | --- |
| Draft contract | `services/<svc>/docs/openapi.draft.yaml` — OpenAPI 3.1 hợp lệ, `info.version: draft-2026-09-02`, mỗi operation có `x-status: draft` + `x-story: US-NNN`; envelope `$ref` về `openapi.yaml` |
| Pointer + bảng story | mục "Draft contracts" trong `services/<svc>/docs/INTEGRATION.md` |
| Story packet | `docs/stories/epics/E*/US-2xx-*/` (lane, roles, error codes, dependency) |
| Deployed contract | `services/<svc>/docs/openapi.yaml` — **vẫn chỉ mô tả cái đã deploy** (rule api-docs.md không đổi) |

Đề nghị web ghi một ADR "mock-first theo draft contract của BE" (mobile đã có
ADR 0005 cùng ý) và bổ sung `openapi.draft.yaml` vào bảng Source of truth của
`.claude/rules/api-integration.md` với ghi chú "draft, chưa deploy".

### Story draft liên quan tới web (chọn theo màn của web; mobile đã yêu cầu toàn bộ)

| US | Nội dung | Service | Màn web bị ảnh hưởng |
| --- | --- | --- | --- |
| US-235 | `?since=<messageId>` cho room messages (ascending, ≤100) | social | chat resync sau SSE reconnect |
| US-236 | GVCN đọc `linked-parents` của HS lớp mình | core | student-detail (GV) |
| US-237 | `phone`/`address` trên profile (ADR 0148: phone → chính chủ/ADMIN/MANAGER/GVCN; address → chính chủ/ADMIN) | iam | profile, student-detail |
| US-238 | HS thấy class-exam SCHEDULED/COMPLETED (metadata) | core | exam list HS |
| US-239 | per-question correctness khi COMPLETED; `passPercentage`, `instructions` | core | exam result/review, exam builder |
| US-240 | câu tự luận `answers[].text`, `PENDING_MANUAL`, endpoint GV chấm | core | exam builder + chấm (khớp ADR 0048 nullable score) |
| US-241 | `GET /social/api/v1/feeds/posts/{postId}` | social | announcement detail |
| US-242 | `PATCH /users/me/password`, `GET/DELETE /auth/sessions`, `POST /auth/signout-all` (ADR 0149) | iam | màn security |
| US-243 | `GET /audit/me`, `GET /audit?actorId&action&from&to` | core | activity, audit-log BGH |
| US-244 | bell schedule `GET/PUT /timetable/period-times`; `SlotResponse.startTime/endTime` | core | TKB, badge "đang diễn ra" |
| US-245 | `.../attendance/summary?termId` (rate, mẫu số = ngày có điểm danh) | core | dashboard, student-detail |
| US-246 | `overallAverage`, `previousTermAverage`, `rank`+`classSize`, `columns[]` (ADR 0151) | core | grades, gradebook, dashboard |
| US-247 | `parentNotified`/`parentNotifiedAt` trên violation | core | discipline |
| US-248 | commendation + điểm rèn luyện /100 (ADR 0152) | core | conduct |
| US-249 | đính kèm đơn nghỉ (multipart ≤5MB, jpg/png/pdf, ≤3) | core | leave request |
| US-250 | kho tài liệu GV (ADR 0153) | core | resources |
| US-251 | `GET /approvals/pending-counts` xuyên loại | core | badge duyệt BGH/GV |
| US-252 | báo cáo BGH v1 (phân bố điểm, chuyên cần, hạnh kiểm) | core | E03 principal reports |
| US-253 | `audience`, `notifyPush`/`notifyEmail` trên post (ADR 0150) | social+noti | announce |
| US-254 | `GET /lms/courses/me`, `POST .../items/{itemId}/complete`, `GET .../progress` | lms | courses, lesson player |
| US-255 | `absentToday`/`pendingGrading` trên ClassResponse (sau US-245+251) | core | card lớp GV |

Thứ tự implement dự kiến của BE = thứ tự bảng (P0 = US-235..241). Nếu web cần
đảo ưu tiên (ví dụ US-246 cho gradebook trước US-238), ghi vào file
`docs/reports/2026-09-xx-fe-to-be-asks-*.md` như thường lệ.

## §5 Còn treo

- #21 (audit-trail seal/unseal đa cycle) — giữ treo; sẽ được phủ một phần bởi US-243.
- Observation về gocql không reconnect sau restart Scylla (ask 2026-08-08) — BE
  ghi nhận, chưa xử lý; runbook hiện tại: restart Scylla ⇒ restart cụm service.
