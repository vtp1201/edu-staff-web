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

12. ~~**#18** — rollup tenant-wide "grade entries pending approval"~~ — **ĐÓNG (FE tiêu thụ 2026-08-07, US-E18.46).** BE US-186 ship `GET /api/v1/grade-entries/pending-approval?cursor=&limit=` (rollup theo `(classId,subjectId,termId)`, KHÔNG có `batchId`/per-entry id) — FE wire vào 2 route approver (`admin/grade-book`, `principal/grade-book`) + wire luôn `approveEntry` (dormant real endpoint đã có sẵn từ US-E18.44). **`IGradeApprovalRepository`/`admin/grades/approval` (batch dashboard cũ) VẪN force-mock, không đụng** — US-186 xác nhận `batchId` chưa từng có nguồn wire, nên dashboard batch-level đó là gap riêng, khác với discovery-rollup vừa đóng.
13. **#21 (còn lại)** — audit-trail seal/unseal đa cycle. BE đã chốt: chỉ giữ cycle mới nhất + lịch sử unseal-request (US-150) — không có event-log seal đa cycle trong data model. Nếu cần hơn, phải gửi ask mới nêu field cụ thể cho một design story.
14. **#28** — `GET /classes/{classId}/attendance?startDate=&endDate=` (class-scoped range) — nhận, xếp sau US-185.
15. ~~**#16** — bulk/whole-school timetable-conflicts scan~~ — **ĐÓNG (FE tiêu thụ xong 2026-08-07, US-E18.48).** BE US-188 đã ship `GET /api/v1/timetable/conflicts?termId=` (ADMIN/SUPER_ADMIN, MANAGER không được cấp); FE đã wire real + dựng UI "Xung đột toàn trường" trên `(app)/admin/timetable`. Ghi nhận **ADR 0128**: `ROOM_DOUBLE_BOOKED` chỉ phát hiện khi ĐỌC — write path KHÔNG chặn room trùng, nên copy phía FE nói rõ "cần xử lý thủ công", không hứa hẹn 409. Không còn ask nào treo cho timetable conflicts.
16. ~~**#10/#11** — `bands`/`requiredCount` — BE nghiêng client-only, sẽ confirm sau.~~
    **RESOLVED 2026-08-07 (BE US-189):** BE đã làm cả hai field thành real +
    persisted (`GradeBand{label,minThreshold}` cho scale số, `requiredCount`
    integer 1..100 optional trên assessment column, **display metadata — BE
    KHÔNG enforce theo điểm đã nhập**). FE tiêu thụ ở **US-E18.49** (Wave 7):
    mapper hết fallback-preset vô điều kiện + hết hardcode `count: 1`, write
    path gửi bands cho scale số / omit `requiredCount` khi chưa đặt, thêm
    failure `invalid-bands` cho 422 `GRADE_SCALE_INVALID_BANDS`.
17. **#32** — messaging product decisions (self-service group room, message-pin, STUDENT/PARENT directory variant).
18. **#31** — self-serve registration + invitation token (joint FE+BE, tương lai).
19. ~~**Viewer học bạ** — BE confirm model `classId+termId` là chốt hay sẽ có year-grouping.~~ — **ĐÃ TRẢ LỜI + TIÊU THỤ (2026-08-07, US-E18.54).** BE chốt `classId+termId` vĩnh viễn, year-grouping làm client-side qua `GET /members/{memberId}/academic-records` (US-064, đã ship từ lâu, chưa ai gọi). FE đã bỏ force-mock viewer + remodel entity sang derived-view. Phát sinh **2 ask mới** (`docs/reports/2026-08-07-fe-to-be-academic-record-viewer-asks.md`): **#47** denormalize `academicYear` lên record row (join client-side KHÔNG khả thi cho PARENT — không read class-context nào cho PARENT), **#48** TEACHER không nằm trong allow-list của chính read học bạ (route teacher hiện degrade `forbidden`).

## Phần 3 — Batch 4 tiêu thụ xong (BE US-186..189, 2026-08-07)

> FE tiêu thụ 4 US wiring mới (US-E18.46→49, Wave 7), đóng nốt 4 asks P2 cuối
> BE đã báo resolved ở commit `1aca5e47`: #18 (rollup, item 12 trên), #28
> (item bên dưới), #16 (item 15 trên), #10/#11 (item 16 trên).

20. ~~**#28** — `GET /classes/{classId}/attendance?startDate=&endDate=`~~ — **ĐÓNG (US-E18.47).** BE US-187 mở range-mode trên chính route cũ (`date` optional, XOR `startDate+endDate`, cap 366 ngày). FE thay fan-out ≤31 call/ngày bằng 1 call range; `AttendanceDaySummary[]` re-aggregate từ `records[]` phẳng, cùng contract, zero UI diff. `MAX_HISTORY_DAYS=31` giữ nguyên (ADR 0058 §5 cần amend nếu muốn tăng — flagged, chưa làm).

**Phát hiện mới, KHÔNG chặn batch này nhưng đáng một ADR riêng (từ US-E18.48 review):**
`ROLE_ENUM_TO_APP` (`src/features/auth/domain/policies/role-meta.ts` hay tương đương) không có entry nào map sang appRole `"admin"` — cả BE `ADMIN` lẫn `MANAGER` đều map vào `principal`. Hệ quả: toàn bộ namespace `/admin/*` (kể cả `/admin/timetable` mới xong ở US-E18.48) hiện chỉ reachable qua mock-mode (`NEXT_PUBLIC_USE_MOCK=true`, nhánh cấp quyền `admin` riêng trong `bootstrap/lib/jwt.ts`), không có token IAM thật nào đưa một actor vào appRole `admin`. Đây KHÔNG phải lỗ hổng bảo mật (namespace vẫn fail-closed đúng), nhưng là gap platform-wide cần quyết định kiến trúc (BE mint claim `ADMIN`-riêng, hay FE tách `ADMIN` khỏi `principal`) — đã đăng ký **ADR `0070`** (`docs/decisions/0070-admin-approle-unreachable-finding.md`), không gộp vào US nào ở batch này.

## Observation (không chặn)

- Migration `047_grade_entries_rejection` (core) phải chạy trước khi US-184 sống thật ở môi trường real — không ảnh hưởng mock/unit, chỉ ghi chú vận hành.
- BE tự phát hiện US-185 (clone `grade_entries_by_student` stale sau lần nhập điểm đầu) — nếu QA/real-mode thấy điểm học sinh lệch gradebook giáo viên, đó là bug BE đã biết, KHÔNG phải bug FE.
- Storybook flake pre-existing, không liên quan batch này: `principal-classes-screen.stories.tsx`'s sort-Select story thiếu retry wrapper cho Radix portal timing — chore riêng, chưa fix.

---

**Tóm tắt hành động phía FE đã hoàn tất (batch 3 + batch 4):** 12/12 US wiring
merged, 0 regression, zero contract drift phát hiện thêm ngoài các bug thật đã
ghi nhận trong từng US. Asks #43/#46/#44/#9/#12/#19/#18/#28/#16/#10/#11 đóng
đầy đủ; #21 đóng một nửa (listing, audit-trail vẫn treo theo model BE đã
chốt); #32/#31/viewer-học-bạ còn treo theo đúng trạng thái BE đã xác nhận,
không cần FE hành động thêm lúc này. 1 phát hiện mới (ROLE_ENUM_TO_APP admin
gap) cần ADR riêng, không chặn batch.
