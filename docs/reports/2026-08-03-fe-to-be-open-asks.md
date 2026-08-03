# FE → BE (2026-08-03): danh sách asks CÒN MỞ sau batch 2

> FE đã tiêu thụ xong batch BE US-164..173 qua 8 US wiring (US-E18.30→37,
> đều merged `main`, suite 477 files / 3551 tests xanh, build xanh cả mock lẫn
> real mode). **Không phát hiện contract drift nào** so với openapi/INTEGRATION
> của batch — chất lượng tốt, cảm ơn team. Các asks #8, #9(dob/gender), #20,
> #39, #40(a), #40(b), #41, #42, #45 đã ĐÓNG — chi tiết evidence ở
> `2026-08-01-fe-to-be-asks.md` (Phần 1 + các mục RESOLVED).
>
> Dưới đây CHỈ còn những gì đang mở, xếp theo ưu tiên. Số ask (#N) theo
> registry `docs/stories/epics/E18-be-wiring/EPIC-OVERVIEW.md` (repo
> edu-staff-web).

## P1 — RBAC gap MANAGER + endpoint thiếu (chặn màn principal ở real mode)

1. **#43 — `MANAGER` thiếu trong `authorize()` của member-timetable**
   - File: `services/core/internal/timetable/core/application/usecase/get_member_timetable.go:113-125`
     — hiện cho SUPER_ADMIN/ADMIN, chính chủ member, hoặc PARENT-linked;
     không có `MANAGER`.
   - Chặn: principal xem TKB giáo viên (`/principal/schedule`) — FE đang
     force-mock riêng path này (`makeGetMemberTimetableForPrincipalUseCase`),
     un-mock được ngay khi BE thêm nhánh MANAGER.
   - Sibling của #39 (đã giải ở `list_classes.go` qua US-164) — cùng lớp gap.

2. **#46 — `MANAGER` thiếu trong `authorize()` của list-students-in-class**
   - File: `services/core/internal/class/core/application/usecase/list_students_in_class.go`
     — chỉ cho isAdmin hoặc TEACHER được assign vào lớp.
   - Chặn: principal 403 trên MỌI lớp ở `/principal/students`, dù danh sách
     lớp (`list_classes`) đã có MANAGER từ US-164. FE degrade honest
     (403 → forbidden, ẩn mutation control) — không crash nhưng principal
     chưa xem được roster thật.
   - Gợi ý: quét luôn các use case core còn lại xem MANAGER có bị bỏ sót
     tương tự không (pattern đã lặp 3 lần: #39, #43, #46).

3. **#44 — `GET /core/api/v1/teachers` không tồn tại**
   - FE (`CLASS_EP.principalTeachers`, từ US-E13.5) đang trỏ path này; không
     khớp path nào trong `services/core/docs/openapi.yaml` → real mode luôn
     lỗi màn `/principal/teachers` (đã ship từ trước).
   - Cần BE trả lời (chọn 1): (a) sẽ implement — cho FE path + shape; hoặc
     (b) confirm không làm — FE sẽ đổi sang IAM member directory
     (`GET /tenants/{id}/members?role=TEACHER`, US-144) và cần biết mọi field
     màn teachers cần (môn dạy, số lớp phụ trách...) lấy ở đâu.

4. **#9 (phần còn lại) — search pool học sinh chưa enroll**
   - Phần dob/gender đã giải (US-169 + FE US-E18.35). CÒN LẠI: không có
     endpoint core nào trả tập học sinh CHƯA enroll vào lớp → enroll/transfer
     flow (`getSearchPool`, admin roster) vẫn không dùng được với backend thật.
   - Ask: endpoint search/listing thành viên role STUDENT chưa có enrollment
     active trong năm học (hoặc filter `unassigned=true` trên endpoint có sẵn).

## P2 — field/endpoint bổ sung (mở khóa từng phần UI)

5. **#21 (còn lại)** — `sealed-students` listing + seal/unseal `audit-trail`
   (US-150 mới ship unseal-requests list + seal-status rollup).
6. **#18** — rollup tenant-wide "grade entries pending approval" — admin
   batch-oversight dashboard không tự populate được (phải biết trước
   `(classId,subjectId,termId)`).
7. **#19** — transition reject/request-revision cho `GradeEntry`
   (`PENDING_APPROVAL → DRAFT`/`REJECTED`, mirror conduct-grade reject đã có).
8. **#28** — `GET /classes/{classId}/attendance?startDate=&endDate=`
   (class-scoped range, mirror member-range đã có) — bỏ fan-out ≤31 request
   phía client.
9. **#12** — `GET /subjects` thêm query `gradeLevel=` (field đã có trên
   `SubjectResponse`, chỉ thiếu filter).
10. **#16** — bulk/whole-school timetable-conflicts scan (nếu proactive
    conflict dashboard là real requirement; hiện chỉ có reactive 409).
11. **#10/#11** — `bands: [{label, minThreshold}]` cho numeric grade scales;
    `requiredCount` cho `AssessmentColumnResponse` — hoặc BE confirm 2 cái này
    là client-only để FE ngừng imply persist.

## P3 — quyết định product / doc hygiene

12. **#32** — messaging: (a) self-service group-room endpoint hoặc confirm
    redesign quanh `class_chat`/`parent_group`; (b) message-pin endpoint;
    (c) directory variant cho STUDENT/PARENT hoặc confirm contact picker
    staff-only.
13. **#31** — self-serve registration gắn invitation token (joint FE+BE,
    tương lai).
14. **Viewer học bạ** — BE confirm model `classId+termId` là chốt hay sẽ có
    year-grouping đọc theo member.
15. **#40(iii)** — doc drift: `POST /reports/{id}/resolve` — openapi nói
    POST-target delete "wired", `ERROR_CODES.md` nói 501 follow-up. Reconcile.
16. **#45 follow-up (doc-only)** — sửa prose `services/core/docs/openapi.yaml`
    (~line 2766, `GET /members/{memberId}/attendance`): ghi "STUDENT-self or
    ADMIN" nhưng code (`get_student_attendance.go`) đã cho PARENT-linked từ
    US-047. FE đã wire real dựa trên code; chỉ cần sync doc.
17. **ADR 0064** — nếu audit-trail parent-student-links thành real:
    `GET /parent-student-links/{linkId}/audit-trail` → `LinkAuditEntry[]`
    (contract đề xuất ở `US-E20.3-link-audit-trail/integration.md` §INT-108).

## Observation (không chặn)

- **SSE flush latency**: `/noti/api/v1/stream` log `200` server-side nhưng
  không flush byte nào tới client trong vài giây im lặng đầu — nghi
  Fiber-level buffering phía `notification`. Client `EventSource` chịu được;
  đáng xem nếu cần reconnect timing chặt hơn.
