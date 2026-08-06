# FE → BE (2026-08-01, cập nhật 2026-08-02): xác nhận batch US-144..153 + danh sách asks còn treo

> FE đã verify trực tiếp trên `edu-api origin/main` (147 commit từ 26/7).
> Phần 1 = cái BE đã giải, FE xác nhận, KHÔNG cần làm lại. Phần 2 = cái còn
> treo, xếp theo ưu tiên, kèm file/endpoint cụ thể. Số ask (#N) theo registry
> `docs/stories/epics/E18-be-wiring/EPIC-OVERVIEW.md` (repo edu-staff-web).
>
> **Cập nhật 2026-08-02:** FE đã TIÊU THỤ XONG toàn bộ batch qua 7 US wiring
> (US-E18.22→29, đều merged `main`, suite 3191 tests xanh) — xem Phần 3 mới:
> 2 asks mới phát sinh khi wire (#41, #42) + 1 observation SSE cho BE.

## Phần 1 — Xác nhận các asks ĐÃ được giải (verify trên contract + openapi)

| Ask | Giải bởi | Evidence |
| --- | --- | --- |
| #1/#36 Kong route social/notification/lms + compose | US-145, US-137-debt | `gateway/kong/kong.yml` đủ 5 service; compose có notification server + social server/worker + lms |
| #6/#7 IAM member listing + display name | US-144 | `GET /tenants/{id}/members?role=&search=` + `GET /members?ids=` batch display lookup (`MemberListItem.displayName`) |
| #13 staff-leave tenant-wide oversight list | US-149 | `staffMemberId` optional + `status` filter + by-tenant clone |
| #14 teaching-plan entries edit route | US-151 | entries-edit route đã mount (trước đây `UpdateEntries()` là dead code) |
| #15/#22 self-scope classId discovery (STUDENT/PARENT) | US-148 | `GET /members/{id}/enrollment?yearLabel=` — STUDENT-self / PARENT-linked |
| #20 (phần classId) child-switcher | US-148 | `linked-students` enriched `classId`/`className` |
| #21 (phần listing) unseal workflow | US-150 | `GET .../unseal-requests?status=` + `GET .../seal-status` |
| #17 slot `room` field + timetable by-member | US-153 | `GET /members/{id}/timetable?termId=` (teacher/student/parent view) |
| #24/#25/#26 exam-bank MCQ options + doc drift + update/delete | US-152 | paper update/delete + question edit/remove + MCQ options + contract sync |
| #29/#30 invitations listing + resend | US-147 | `GET /tenants/{id}/invitations` + `POST .../invitations/{id}/resend` |
| #34 generic notification center | US-146 | `GET /notifications` + `unread-count` + `PATCH read-batch`/`{id}/read` |
| #4 refresh reuse-detection | US-102 | đã verify 26/7 |
| #5 SUPER_ADMIN seed | US-103 | đã verify 26/7 |

Phía FE sẽ mở loạt US wiring tiêu thụ batch này (member directory, unseal
visibility, notification center, timetable by-member, exam-bank edit) + flip
`USE_MOCK` + re-architect SSE proxy đi qua Kong (ADR 0047 — việc FE, BE không
cần làm thêm; chỉ nhờ BE xác nhận Kong route SSE `/noti/api/v1/stream` không
buffer/timeout sớm với long-lived connection).

## Phần 2 — Asks CÒN TREO (xếp theo ưu tiên)

### P1 — đang chặn nguyên màn hình force-mock

1. **#39 — RESOLVED (BE US-164, FE US-E18.30, 2026-08-03).** `MANAGER` đã có
   nhánh `ListByYear` trong `list_classes.go`; màn Principal Classes đã wire
   real (kèm tiêu thụ enrichment US-173, xem #8).

2. **#40(a) — RESOLVED (BE US-165, FE US-E18.31, 2026-08-03).** BE chọn
   option (a): denormalize `authorName`/`authorRole` lên `Post`/`Comment` lúc
   write (`avatarUrl` reserved, luôn `null`). FE wire feed reads real; writes
   còn honest-degrade (gap khác của feed, không thuộc ask này) — ADR 0067.

3. **#40(b) — RESOLVED (BE US-172, FE US-E18.32, 2026-08-03).** Đã ship:
   filter `status`/`contentType`/`search` trên `GET /reports`,
   `GET /reports/stats`, `GET /reports/{reportId}` detail, targetType
   +`COMMENT`. FE wire 4/5 gap (ADR 0068); doc-drift #40(iii) ở P3 vẫn treo.

4. **#20 — RESOLVED (BE US-167, FE US-E18.33, 2026-08-03).** BE chọn hướng
   tiered batch lookup: PARENT/STUDENT gọi được `GET /members?ids=` nhận
   `memberId`+`displayName` (field khác ABSENT = tier signal, ADR-0120).
   Child-switcher ở grades/timetable/children-overview đã hiển thị tên thật.

5. **#9 — PARTIALLY RESOLVED (US-E18.35, 2026-08-03).** Option (b) đã ship:
     BE US-169 thêm `dob`+`gender` vào `MemberBatchItem` (staff-tier, ADR-0122
     PII). FE đã wire `getClassRoster` real bằng cách compose enrollment list
     (`core`) + batch lookup (`iam`, US-E18.33's `BatchResolveMembersUseCase`)
     — admin roster listing giờ hiển thị tên/dob/gender thật (ADR 0069).
     **Phần CÒN LẠI, vẫn treo**: unassigned-student search pool
     (`getSearchPool`) — không có endpoint core nào cho tập học sinh chưa
     enroll, nên enroll/transfer flow vẫn không dùng được với backend thật.
     Cần BE endpoint riêng cho search pool (không liên quan gì đến dob/gender
     nữa — đã tách bạch rõ 2 gap này).

### P2 — field/endpoint bổ sung (mở khóa từng phần UI)

6. **#8 — RESOLVED (BE US-173, FE US-E18.30, 2026-08-03).** `ClassResponse`
   đã có `studentCount` + `homeroomTeacherId`/`homeroomTeacherName` (list +
   get); FE đã bỏ 5 chỗ fan-out 2×N.
7. **#21 (phần còn lại)** — `sealed-students` listing + seal/unseal
   `audit-trail` (US-150 mới ship list + seal-status).
8. **#18 — RESOLVED (BE US-186, 2026-08-05).** Mới:
   `GET /api/v1/grade-entries/pending-approval?cursor=&limit=` (ADMIN/MANAGER/
   SUPER_ADMIN — cùng gate với approve/reject). Trả
   `items[{classId, subjectId, termId, pendingCount, submittedAt}]` + cursor
   pagination (limit mặc định 20, max 100, clamp) — dashboard tự populate,
   không cần biết trước tuple. Đã deploy (migration 049).
9. **#19 — RESOLVED (BE US-184, 2026-08-04).** Đã có
   `POST .../grade-entries/.../reject` — `PENDING_APPROVAL → DRAFT` kèm
   `reason`, mirror conduct-grade reject. Xem `INTEGRATION.md` core.
10. **#28 — RESOLVED (BE US-187, 2026-08-06).**
    `GET /api/v1/classes/{classId}/attendance?startDate=&endDate=` đã ship —
    range mode trên chính route cũ (`date` giờ optional; `date` XOR
    `startDate+endDate`, trộn 2 mode → 400). Response
    `{classId, records[{date, studentMemberId, status}]}`, không pagination,
    cap 366 ngày. Bỏ được fan-out ≤31 call/ngày. Đã deploy (không migration).
11. **#12** — `GET /subjects` thêm query `gradeLevel=` (field đã có trên
    `SubjectResponse`, chỉ thiếu filter).
12. **#16 — RESOLVED (BE US-188, 2026-08-06).** Mới:
    `GET /api/v1/timetable/conflicts?termId=` (ADMIN/SUPER_ADMIN only —
    MANAGER không có quyền whole-school scan). Trả `{termId, conflicts[],
    truncated}`; mỗi conflict: `{type: TEACHER_DOUBLE_BOOKED |
    ROOM_DOUBLE_BOOKED, day, period, classes[≥2]{classId, subjectId},
    teacherMemberId?, room?}`. termId lạ → 200 rỗng (không 404). Lưu ý
    (ADR 0128): ROOM_DOUBLE_BOOKED chỉ được *phát hiện* khi đọc — write path
    hiện KHÔNG chặn room trùng, FE đừng assume tạo mới sẽ 409 vì room. Đã
    deploy (không migration).
13. **#10/#11 — RESOLVED (BE US-189, 2026-08-06) — persist thật, không phải
    client-only.** (#10) Numeric grade scale nhận + trả
    `bands: [{label, minThreshold}]` (optional, ≤10 bands, label ≤32 ký tự,
    threshold trong [min,max], **giảm dần nghiêm ngặt, band cao nhất trước**;
    sai → 422 `GRADE_SCALE_INVALID_BANDS`; letter scale không nhận bands).
    (#11) `requiredCount` (int 1–100, optional/nullable) persist trên
    assessment column, nhận ở write path + trả trên
    `AssessmentColumnResponse`. Lưu ý: `requiredCount` hiện là display
    metadata — BE chưa enforce với số điểm thực tế đã nhập. FE bỏ mock được.
    Đã deploy (migration 050).

### P3 — cần quyết định product / doc hygiene

14. **#32** — messaging: (a) self-service group-room endpoint (member set +
    name tùy ý) hoặc confirm redesign quanh model `class_chat`/`parent_group`;
    (b) message-pin endpoint (chưa có); (c) directory variant cho
    STUDENT/PARENT (homeroom teacher + linked child/parent) hoặc confirm
    contact picker staff-only.
15. **#31** — self-serve registration gắn invitation token (account creation
    + consume invite 1 transaction) — joint FE+BE, tương lai.
16. **Viewer học bạ** — BE confirm model `classId+termId` là chốt (FE sẽ
    remodel màn student/parent viewer) hay sẽ có year-grouping đọc theo
    member. (`GET /members/{id}/academic-records` đã có nhưng snapshot là
    dynamic column array, không có year-grouping/fixed columns.)
17. **#40(iii)** — doc drift: `POST /reports/{id}/resolve` — openapi nói
    POST-target delete "wired", `ERROR_CODES.md` nói 501 follow-up. Reconcile.
18. **ADR 0064 (mới, thấp)** — nếu audit-trail parent-student-links thành
    real: `GET /parent-student-links/{linkId}/audit-trail` →
    `LinkAuditEntry[]` (contract đề xuất đã ghi ở
    `US-E20.3-link-audit-trail/integration.md` §INT-108, camelCase khớp sẵn).

## Phần 3 — Cập nhật 2026-08-02: kết quả tiêu thụ batch + asks mới

FE đã wire xong toàn bộ batch US-144..153 qua 7 US (US-E18.22 SSE-qua-Kong,
US-E18.23 member directory, US-E18.24 unseal + seal-status, US-E18.25
notification center, US-E18.26 timetable by-member + room, US-E18.28
exam-bank edit/delete, US-E18.29 invitations list/resend). Tất cả đã merge
`main`, không phát hiện contract drift nào so với docs — batch chất lượng tốt.

### Asks MỚI phát sinh khi wire (thêm vào P2)

19. **#41 — RESOLVED (US-E18.36, 2026-08-03).** BE US-170 đã thêm cả
    `department` và `leaveType` vào `StaffLeaveRequestResponse`, cả hai đều
    `nullable: true` nhưng với 2 LÝ DO null khác nhau: `leaveType` null chỉ
    cho row cũ trước migration (sẽ giảm dần theo thời gian, không backfill);
    `department` null là trạng thái nghiệp vụ hợp lệ, có thể xảy ra vô thời
    hạn (staff không có department-scoped assignment đang active). FE đã
    model đúng 2 lý do khác nhau (2 câu placeholder khác nhau, không dùng
    chung 1 "N/A"), và wire TOÀN BỘ màn staff-leave real (cả đọc lẫn
    approve/reject) — đóng US-E18.8's permanent force-mock.
20. **#42 — RESOLVED (US-E18.37, 2026-08-03).** BE US-171 đã thêm
    `?read=false` vào `GET /notifications` (nguồn từ
    `notifications_unread_by_user` materialized view). FE đã bỏ hoàn toàn
    client-side drain (`drainUnread`/`MAX_PAGES`/`DRAIN_PAGE_SIZE`, tất cả đã
    xoá, grep xác nhận zero reference còn lại) — tab "Chưa đọc" giờ gửi thẳng
    1 request/trang, dùng cursor/hasMore thật của server. `read=true` bị BE
    từ chối (400) và `read`+`type` xung đột (400) — client không bao giờ gửi
    2 tổ hợp này (đảm bảo ở tầng type, không phải quy ước UI). ADR 0066 đã
    amend.

### Cập nhật 2026-08-02 (tiếp) — 2 asks mới phát sinh khi đóng dead sidebar links (US-E13.10, US-E15.3)

21. **#43 — `GET /members/{memberId}/timetable`'s `authorize()` thiếu nhánh
    `MANAGER`** (phát hiện khi wire US-E15.3, principal xem TKB giáo viên).
    `services/core/internal/timetable/core/application/usecase/get_member_timetable.go:113-125`
    chỉ cho SUPER_ADMIN/ADMIN, chính chủ member, hoặc PARENT đã liên kết —
    không có `MANAGER` (principal). FE đã force-mock riêng path này
    (`makeGetMemberTimetableForPrincipalUseCase`, decision `0014`) để không
    chặn story, nhưng cần BE thêm `MANAGER` vào `authorize()` để un-mock
    (sibling của ask #39 — cùng lớp gap "MANAGER thiếu quyền đọc", khác
    endpoint).
22. **#44 — `GET /core/api/v1/teachers` không tồn tại trên BE** (phát hiện
    khi wire US-E15.3, nhưng gap có từ US-E13.5 — ảnh hưởng cả màn
    `/principal/teachers` đã ship trước đó). `CLASS_EP.principalTeachers`
    phía FE trỏ tới path này nhưng không khớp bất kỳ path nào trong
    `services/core/docs/openapi.yaml`. `principal-teachers.di.ts` hiện là
    `USE_MOCK ? Mock : Real` thường (chưa force-mock) → real mode sẽ luôn lỗi
    khi gọi danh sách giáo viên cho principal. Cần BE xác nhận: endpoint này
    sẽ được implement (path/shape gì) hay FE nên đổi sang một nguồn dữ liệu
    khác đã có (vd tenant member directory lọc theo role TEACHER)?
23. **#45 — RESOLVED (US-E18.34, 2026-08-03) — doc drift, không phải gap
    thật.** Ground-truth lại trực tiếp `get_student_attendance.go`'s
    `authorize()`: PARENT đã được phép đọc điểm danh của con đã liên kết
    (`LinkReader.IsLinked`) từ US-047 — CHỈ prose ở
    `services/core/docs/openapi.yaml` (~line 2766, "STUDENT-self or ADMIN")
    là stale, code luôn đúng. FE đã wire `/parent/attendance` real (US-E18.34):
    `GET /members/{memberId}/attendance` cho PARENT đã liên kết hợp lệ, 403
    `ATTENDANCE_FORBIDDEN` cho parent chưa/không liên kết. Đề nghị BE cập nhật
    lại prose openapi cho khớp code (không cần đổi code).
24. **#46 — `ListStudentsInClassUseCase.authorize()` thiếu nhánh MANAGER**
    (phát hiện khi wire US-E18.35, admin roster → `getClassRoster` real).
    `services/core/internal/class/core/application/usecase/list_students_in_class.go`
    chỉ cho `isAdmin` (SUPER_ADMIN/ADMIN) hoặc TEACHER được assign vào lớp —
    không có MANAGER. Principal (web appRole từ MANAGER) hiện 403 trên MỌI
    lớp khi vào `/principal/students`, dù `list_classes.go` (danh sách lớp)
    ĐÃ có nhánh MANAGER từ US-164. Cùng lớp gap với ask #39/#43 (MANAGER
    thiếu quyền đọc trên một use case cụ thể, dù đã có ở use case liền kề).
    FE xử lý honest degrade (403 → `forbidden`, không retry, ẩn hết control
    mutation) — không chặn, nhưng cần BE thêm MANAGER vào `authorize()` để
    principal thực sự xem được roster.

### Observation cho BE (không chặn)

- **SSE flush latency** (US-E18.22, live-proof qua Kong): stream
  `/noti/api/v1/stream` log `200` server-side nhưng không flush byte nào tới
  client trong vài giây im lặng đầu — nghi Fiber-level buffering phía
  `notification`. Client `EventSource` của web chịu được, nhưng đáng xem nếu
  cần reconnect timing chặt hơn.
