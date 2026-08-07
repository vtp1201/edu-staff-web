# FE → BE (2026-08-06): batch 3 tiêu thụ xong (US-174..184) + asks còn treo

> FE đã tiêu thụ xong batch BE mới nhất (`docs/reports/2026-08-04-be-to-fe-response.md`
> + `2026-08-05-be-to-fe-response.md`, edu-api main HEAD `1042aa94`) qua 8 US
> wiring (US-E18.38→45, đều merged `main`, suite 487 files / 3700 tests xanh,
> `bunx tsc --noEmit` sạch, `bun run build` xanh cả mock lẫn real mode). Không
> phát hiện contract drift nào so với openapi/ERROR_CODES.md của batch này.

## Phần 1 — Đóng nốt các asks batch 3 (verify trực tiếp trên contract/Go source)

| Ask | Giải bởi | FE US | Evidence |
| --- | --- | --- | --- |
| #43 | BE US-175 (`get_member_timetable.go`, `roleManager` trước guard `ActorMemberID`) | US-E18.38 | Bỏ force-mock `makeGetMemberTimetableForPrincipalUseCase`; `/principal/schedule` real, MANAGER đọc bình thường. |
| #46 | BE US-175 (`list_students_in_class.go` thêm `hasRole(..., roleManager)`) | US-E18.39 | `getClassRoster`/`getClasses` đã là plain `USE_MOCK ? Mock : Real` từ trước (không có nhánh honest-degrade riêng cho MANAGER) — chỉ cần sửa doc-comment/test đã stale khẳng định 403 vĩnh viễn. |
| #44 (answered — option b) | BE xác nhận KHÔNG implement `/core/api/v1/teachers`; US-181 mở `subject-assignments` | US-E18.40 | Repoint `listTeachers()` sang IAM directory (`role=TEACHER`, reuse `SearchMembersUseCase`); "môn dạy/số lớp phụ trách" compose per-class qua `GET /classes/{id}/subject-assignments`, group theo `teacherMemberId`, bound tại 40 lớp (2× page-size mặc định), quá bound degrade về homeroom-only chứ không chặn màn. |
| #9 (FULL — cả 2 nửa) | BE US-169 (dob/gender, đã đóng US-E18.35) + US-182/ADR 0125 (search pool FE-compose) | US-E18.41 | `getSearchPool` = IAM STUDENT directory (drain toàn bộ qua `SearchMembersUseCase`) MINUS `GET /core/api/v1/enrollments/student-ids?academicYear=` (ids-only). Không còn force-mock nào sót lại trên `makeRosterRepository()`. |
| #12 | BE US-177 (`GET /subjects?gradeLevel=`, AND với `status`, filter trước pagination) | US-E18.42 | `listSubjectsForGrade` thật ra ĐÃ gọi endpoint thật từ trước (DI luôn là plain gate) — bug thật tìm thấy: `SubjectForGradeDto` là fiction thời mock-era (`id`/`requiredAssessmentCount` luôn `undefined` ở real mode), đã thay bằng DTO thật + cursor-drain đầy đủ (không chỉ trang 1) + map 422 `gradeLevel` cụ thể. |
| #21 (LISTING half) | BE US-183 (`GET /classes/{classId}/terms/{termId}/academic-records/sealed-students`) | US-E18.43 | `listSealedStudents` real, tên học sinh resolve qua `BatchResolveMembersUseCase` đã có sẵn trong factory. **Audit-trail half CÒN TREO** (xem Phần 2 #21). Lưu ý reachability: `listAvailableClasses` (class/term selector) vẫn mock-first nên chuỗi 6 method thật của seal repo (kể cả cái mới này) chưa "meaningfully reachable end-to-end" cho tới khi selector đó cũng thật — không phải gap mới, kế thừa từ US-E18.13. |
| #19 | BE US-184 (`POST .../grades/{studentId}/columns/{columnId}/reject`, `PENDING_APPROVAL→DRAFT`, `rejectionReason`/`rejectedBy`/`rejectedAt` STAFF-ONLY) | US-E18.44 | Per-cell reject wired real trên `IGradeRejectionRepository` mới (tách khỏi `IGradeApprovalRepository` — batch dashboard batch-level của ask #18 KHÔNG đụng, vẫn treo). Privacy boundary structural (`@ts-expect-error` compile-time guard + 2 mapper riêng). Role-discriminated VM (`TeacherGradeEntryVM`/`ApproverGradeEntryVM`) mount trên 2 route ĐÃ tồn tại (`principal/grade-book`, `admin/grade-book`, đổi từ đọc-only `GradeBookRow` sang entry-side `GradeSheet`/`StaffGradeCell`) + thêm nav entry (trước đó 2 route này là orphan, không có trong `NAV_BY_ROLE`). Tìm + fix 1 lỗ hổng RBAC thật (`lockTermAction` thiếu `requireRole`, dormant khi mock, sống khi real) + 1 bug runtime 500 pre-existing (RSC truyền closure literal làm Server Action prop cho `teacher/grades` ở default-load — tsc/build/Storybook đều không bắt được, chỉ bắt bằng unit test invoke trực tiếp prop). |

## Hygiene (US-E18.45, true no-op — verification only)

- **US-174 (memberId claim fix)**: grep toàn `src/bootstrap/di/` — không còn comment nào đổ lỗi cho memberId-claim đã fix; các force-mock còn lại (`teaching-plan`, `academic-records` viewer, `messaging` group-lifecycle, `feed`/`moderation` reaction+attachment, `IGradeApprovalRepository`) đều vì lý do KHÁC (không có endpoint/model gap), không liên quan #174. 2 factory từng bị chặn bởi role (không phải memberId claim) — `principal-classes`/`timetable-view` — đã đóng đúng bởi US-164/US-175, phân biệt rõ để tránh gán sai nguyên nhân.
- **US-180 (422 field casing)**: grep toàn `src/` — không có code nào từng match tên field PascalCase cũ (`Limit`/`Type`/`Read`/`Cursor`); `notification.repository.ts`'s `toFailure()` thậm chí không đọc `error.fields` trên path này — không có gì để fix/regress.
- **#40(iii)**: xác nhận lại `edu-api/services/social/docs/ERROR_CODES.md` hiện ghi rõ "defensive, publicly UNREACHABLE" từ US-166 — hết drift, đánh dấu RESOLVED.

## Phần 2 — Asks CÒN TREO (không đổi so với 2026-08-05, theo BE xác nhận)

12. **#18** — rollup tenant-wide "grade entries pending approval" — chưa có read path tenant-wide; `IGradeApprovalRepository` (batch dashboard) vẫn force-mock 100%. BE nói sẽ làm sau US-185.
13. **#21 (còn lại)** — audit-trail seal/unseal đa cycle. BE đã chốt: chỉ giữ cycle mới nhất + lịch sử unseal-request (US-150) — không có event-log seal đa cycle trong data model. Nếu cần hơn, phải gửi ask mới nêu field cụ thể cho một design story.
14. **#28** — `GET /classes/{classId}/attendance?startDate=&endDate=` (class-scoped range) — nhận, xếp sau US-185.
15. ~~**#16** — bulk/whole-school timetable-conflicts scan~~ — **ĐÓNG (FE tiêu thụ xong 2026-08-07, US-E18.48).** BE US-188 đã ship `GET /api/v1/timetable/conflicts?termId=` (ADMIN/SUPER_ADMIN, MANAGER không được cấp); FE đã wire real + dựng UI "Xung đột toàn trường" trên `(app)/admin/timetable`. Ghi nhận **ADR 0128**: `ROOM_DOUBLE_BOOKED` chỉ phát hiện khi ĐỌC — write path KHÔNG chặn room trùng, nên copy phía FE nói rõ "cần xử lý thủ công", không hứa hẹn 409. Không còn ask nào treo cho timetable conflicts.
16. **#10/#11** — `bands`/`requiredCount` — BE nghiêng client-only, sẽ confirm sau.
17. **#32** — messaging product decisions (self-service group room, message-pin, STUDENT/PARENT directory variant).
18. **#31** — self-serve registration + invitation token (joint FE+BE, tương lai).
19. **Viewer học bạ** — BE confirm model `classId+termId` là chốt hay sẽ có year-grouping.

## Observation (không chặn)

- Migration `047_grade_entries_rejection` (core) phải chạy trước khi US-184 sống thật ở môi trường real — không ảnh hưởng mock/unit, chỉ ghi chú vận hành.
- BE tự phát hiện US-185 (clone `grade_entries_by_student` stale sau lần nhập điểm đầu) — nếu QA/real-mode thấy điểm học sinh lệch gradebook giáo viên, đó là bug BE đã biết, KHÔNG phải bug FE.

---

**Tóm tắt hành động phía FE đã hoàn tất:** 8/8 US wiring merged, 0 regression,
zero contract drift phát hiện thêm. Asks #43/#46/#44/#9/#12/#19 đóng đầy đủ;
#21 đóng một nửa (listing); #18/#28/#16/#10/#11/#32/#31/viewer-học-bạ còn treo
theo đúng trạng thái BE đã xác nhận, không cần FE hành động thêm lúc này.
