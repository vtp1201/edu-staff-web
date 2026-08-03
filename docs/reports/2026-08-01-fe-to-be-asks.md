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

1. **#39 — Thêm `MANAGER` vào RBAC `list_classes`** *(nhỏ nhất, làm trước)*
   - File: `services/core/internal/class/core/application/usecase/list_classes.go`
     — branch `isAdmin → ListByYear` / `isTeacher → listForTeacher` / else →
     `ErrClassForbidden`. `MANAGER` rơi vào else → 403.
   - Ask: `MANAGER` được `ListByYear` (tenant-wide), khớp intent MANAGER đã có
     trên grades / per-class reports / teaching-plans.
   - Chặn: màn **Principal Classes** (US-E13.8) — principal thật ăn 403.

2. **#40(a) — Feed author identity trên `Post`/`Comment`**
   - Hiện trạng: `Post`/`Comment` chỉ có `authorUserId`
     (`services/social/docs/openapi.yaml:165` tự ghi "no author display-name
     join"). US-144 directory KHÔNG dùng được cho feed: role-gate
     ADMIN/MANAGER/TEACHER → STUDENT/PARENT đọc feed bị 403; profile endpoint
     (US-127) visibility-gate theo shared-room → 404 không đoán được với
     SCHOOL-scope post.
   - Ask (chọn 1): (a) denormalize `authorName`/`authorRole`/`avatarUrl` lên
     `Post`/`Comment` lúc write; hoặc (b) relax profile-visibility cho
     feed-context read (ai đọc được post thì đọc được basic profile của author).
   - Chặn: **toàn bộ màn feed** (mọi row một author khác nhau, không có
     fallback nào chấp nhận được).

3. **#40(b) — Moderation queue: filter/stats/detail + COMMENT target**
   - Hiện trạng: `GET /reports` chỉ là inbox PENDING trần (không
     `status`/`contentType`/`search` filter, không stats); không có
     `GET /reports/{reportId}` detail; `SubmitReportRequest.targetType` chỉ
     `MESSAGE`/`POST` (không `COMMENT`, cũng không có comment moderate-delete).
   - Ask: thêm filter params + stats (endpoint hoặc field) +
     `GET /reports/{reportId}` + `COMMENT` targetType kèm route
     moderate-delete tương ứng.
   - Chặn: màn moderation queue (tab resolved/all, search, stat row, detail
     sheet, report comment).

4. **#20 (phần còn lại) — tên học sinh cho PARENT child-switcher**
   - US-148 đã thêm `classId`/`className` vào `linked-students` nhưng vẫn
     KHÔNG có `studentName`; PARENT không gọi được batch lookup US-144 (403).
   - Ask (chọn 1): denormalize `studentName` lên `LinkedStudentsResponse`;
     hoặc cho PARENT batch-lookup đúng các id đã linked của mình.
   - Chặn: parent child-switcher ở grades + timetable (hiện mock).

5. **#9 (phần còn lại) — roster cần DOB/gender**
   - `EnrollmentResponse` (`GET /classes/{id}/students`) vẫn zero display
     fields. Tên giờ join được qua US-144 batch (caller là ADMIN) nhưng
     `dob`/`gender` không tồn tại ở đâu trên public API
     (`MemberListItem`/`MemberBatchItem` không có).
   - Ask (chọn 1): (a) denormalize `studentName`/`dob`/`gender` lên
     `EnrollmentResponse`; hoặc (b) thêm `dob`+`gender` vào batch lookup item.
   - Chặn: admin roster listing + unassigned-student search pool (US-E18.5
     đang mock vĩnh viễn).

### P2 — field/endpoint bổ sung (mở khóa từng phần UI)

6. **#8** — `ClassResponse` thêm `studentCount` + `homeroomTeacherId`/
   `homeroomTeacherName` — hiện web phải fan-out 2×N round-trip mỗi trang
   danh sách lớp.
7. **#21 (phần còn lại)** — `sealed-students` listing + seal/unseal
   `audit-trail` (US-150 mới ship list + seal-status).
8. **#18** — rollup tenant-wide "grade entries pending approval" — admin
   batch-oversight dashboard không tự populate được (phải biết trước
   `(classId,subjectId,termId)`).
9. **#19** — reject/request-revision transition cho `GradeEntry`
   (`PENDING_APPROVAL → DRAFT`/`REJECTED`, mirror conduct-grade reject đã có).
10. **#28** — `GET /classes/{classId}/attendance?startDate=&endDate=`
    (class-scoped range, mirror member-range đã có) — bỏ fan-out ≤31 ngày
    phía client.
11. **#12** — `GET /subjects` thêm query `gradeLevel=` (field đã có trên
    `SubjectResponse`, chỉ thiếu filter).
12. **#16** — bulk/whole-school timetable-conflicts scan (nếu proactive
    conflict dashboard là real requirement; hiện chỉ có reactive 409).
13. **#10/#11** — `bands: [{label, minThreshold}]` cho numeric grade scales;
    `requiredCount` cho `AssessmentColumnResponse` — hoặc BE confirm 2 cái
    này là client-only label để FE ngừng imply persist.

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

19. **#41 — `StaffLeaveRequestResponse` thiếu `department` + `leaveType`**
    (phát hiện khi wire US-E18.23). US-149 (tenant-wide list) + US-144 (tên
    qua batch lookup) đã đóng 2/3 blocker của màn admin staff-leave; đây là
    mảnh cuối. Ask kèm câu hỏi: 2 field này sẽ land **required hay nullable**?
    (FE cần biết để model entity + empty state.)
20. **#42 — notification inbox thiếu filter `?read=false`** (phát hiện khi
    wire US-E18.25). BE đã có per-status count chính xác (`unread-count`)
    nhưng list không filter được theo trạng thái đọc → tab "Chưa đọc" phía FE
    phải drain client-side (bounded, hoạt động đúng nhưng tốn round-trip).
    Nice-to-have, không phải defect.

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
