# BE → FE (2026-08-04): trả lời open asks trong report 2026-08-03

> BE phản hồi `2026-08-03-fe-to-be-open-asks.md`. CẢ 4 US đã merge `edu-api main`
> (HEAD `7e76c0a3`): US-174 + US-175 + US-177 + US-178. Contract chi tiết luôn ở
> `services/<svc>/docs/{openapi.yaml,INTEGRATION.md}` trên main.

## 🔴 Bug "không có quyền truy cập" — ROOT CAUSE + FIX (US-174, merge `a25d10a5`)

Nghi ngờ "thiếu memberId từ Kong → service" **đúng hiện tượng, sai thủ phạm**:
Kong vô can — **IAM chưa bao giờ đưa `memberId` vào JWT** khi issue tenant-scoped
token (`claimsFor` trong session_issuer chỉ set tenantId/memberRoles). Mọi nhánh
authorize cần identity (chính chủ, TEACHER-assigned, PARENT-linked) đều thấy
`ActorMemberID == ""` → 403. Chỉ ADMIN/SUPER_ADMIN (role-based) là chạy được.

Fix: token tenant-scoped giờ luôn mang claim `memberId` (== `userId`, không có
surrogate id — chốt từ US-020). Refresh path dùng chung code nên cũng có claim.

⚠️ **FE PHẢI biết:**
1. **Token cấp trước fix KHÔNG có claim** — client phải refresh token hoặc
   re-signin một lần sau khi BE deploy. Không có backfill/force-revoke.
2. Đây là lý do mọi flow self/parent/teacher từng 403 ở real mode — sau khi
   refresh token, các flow đó (kể cả những cái FE đã degrade/mock) unblock
   đồng loạt. Đáng re-verify lại các path đã force-mock vì 403.

## P1 — MANAGER RBAC (#43, #46) → US-175 (merge `f68d4a95`)

MANAGER (principal) được **read** tenant-wide, pattern US-164, trên 5 use case:

| Endpoint | Ask |
| --- | --- |
| `GET /api/v1/members/{memberId}/timetable` | #43 — `/principal/schedule` un-mock được |
| `GET /api/v1/classes/{classId}/timetable` | sweep hit (cùng lớp gap) |
| `GET /api/v1/classes/{classId}/students` | #46 — `/principal/students` hết 403 |
| `GET /api/v1/members/{memberId}/enrollment` | sweep hit |
| `GET /api/v1/classes/{classId}/students/{studentMemberId}` (enrollment) | sweep hit |

Sweep toàn bộ 14 hàm authorize trong core đã chạy (gợi ý của FE là đúng):
assessment / lms / school-homeroom / conduct / parentlink **đã có** MANAGER từ
trước. 4 read còn sót → **US-178 (merge `89535b65`)**: `GET /classes/{classId}`
(class detail), `GET /classes/{classId}/homeroom-teacher`, và
`GET /members/{memberId}/attendance`. MANAGER **không** được thêm bất kỳ quyền
write nào (by design — có negative test pin lại).

⚠️ Lưu ý cho #44/teachers: use case subject-assignments của class context
**không có route HTTP** (route cũ `GET /classes/{classId}/subjects` đã bị gán
cho curriculum ClassSubject listing từ US-057). Nếu màn teachers cần "môn dạy /
số lớp phụ trách", việc re-mount route này là follow-up story — gửi ask nêu rõ
field cần.

Còn 1 read chưa có MANAGER (biết trước, fail-closed): `GET
/classes/{classId}/attendance?date=` (by-date, ADMIN/GVCN only). Nếu principal
cần màn này, nói để BE mở US nhỏ.

## Trả lời các asks còn lại

### #44 — `GET /core/api/v1/teachers`: chọn (b), KHÔNG implement

Path này sẽ không tồn tại. FE đổi sang IAM member directory:
`GET /iam/api/v1/tenants/{tenantId}/members?role=TEACHER` (US-144, đã ship).
Field "môn dạy / số lớp phụ trách" chưa có nguồn nào trả sẵn — nếu màn teachers
thật sự cần, gửi ask mới liệt kê chính xác field; BE sẽ cân nhắc endpoint
compose bên core (staffing đã có subject-assignments data).

### #40(iii) — resolve doc drift: ĐÃ RESOLVED từ US-166, report FE stale

`ERROR_CODES.md` (dòng `REPORT_RESOLVE_DELETE_NOT_IMPLEMENTED`) đã ghi rõ: từ
US-166 cả 3 targetType (MESSAGE/POST/COMMENT) đều wired; 501 chỉ còn là
defensive branch không reachable từ public surface. Không còn drift — FE
re-read là khớp.

### #45 — attendance openapi prose: FIXED trong US-178

Đúng là drift (code cho PARENT-linked từ US-047, prose ghi "STUDENT-self or
ADMIN"). Prose giờ đầy đủ: ADMIN/SUPER_ADMIN + MANAGER (mới) + STUDENT-self +
PARENT-linked.

### #12 — `gradeLevel=` trên `GET /subjects`: US-177 (merge `7e76c0a3`)

Optional query param `gradeLevel=` (int 1..13), AND với `status=` hiện có,
filter áp TRƯỚC pagination (page luôn đầy row khớp). Giá trị ngoài range hoặc
không phải số → 422 `VALIDATION_FAILED` field `gradeLevel`.

### #9 (còn lại) — pool học sinh chưa enroll: NHẬN, cần design story riêng

Xác nhận chưa có endpoint nào. Không phải one-liner: cần query "STUDENT members
∖ active enrollments trong năm học" trên Scylla (query-first, không ALLOW
FILTERING) — phải design table/flow. BE sẽ mở story qua Feature Intake và báo
contract sau. Chưa cam kết ngày.

### P2/P3 còn lại — ghi nhận backlog, chưa xếp lịch

#21 (sealed-students listing + audit-trail), #18 (pending-approval rollup),
#19 (GradeEntry reject/request-revision), #28 (class-scoped attendance range),
#16 (bulk conflict scan — cần confirm đây là real requirement trước khi build),
#10/#11 (bands + requiredCount — BE nghiêng về client-only, sẽ confirm sau),
#32 (messaging product decisions), #31 (invitation token), viewer học bạ
year-grouping, ADR 0064 link audit-trail. Các mục cần product decision sẽ được
trả lời riêng — đừng block UI theo chúng.

### Observation SSE flush latency: ghi nhận, chưa điều tra

Nghi Fiber buffering phía notification là hợp lý. Chưa ảnh hưởng chức năng
(EventSource chịu được) → xếp sau các P1/P2. Nếu FE cần reconnect timing chặt
cho feature cụ thể, nói rõ requirement để BE ưu tiên.

---

**Tóm tắt hành động phía FE:**
1. Deploy mới của IAM → **refresh/re-signin** để lấy token có `memberId`, rồi
   re-verify toàn bộ path từng 403 ở real mode (nhiều cái sẽ tự hết).
2. Un-mock `/principal/schedule` + `/principal/students` (US-175 đã land).
3. `CLASS_EP.principalTeachers` → repoint sang IAM member directory (#44 = (b)).
4. Re-read `ERROR_CODES.md` social cho #40(iii) — hết drift từ US-166.
