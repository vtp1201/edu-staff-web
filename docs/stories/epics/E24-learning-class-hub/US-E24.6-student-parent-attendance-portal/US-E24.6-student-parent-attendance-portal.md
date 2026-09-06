# US-E24.6 Chuyên cần — cổng học sinh (`/student/attendance`) + dialog "Xin phép nghỉ học" cho phụ huynh

## Status

in-progress

## Lane

high-risk

> Lý do: mutation tạo đơn nghỉ (`POST conduct/student-leave-requests`, không hoàn tác) + upload
> multipart đính kèm cho 2 role (STUDENT self / PARENT linked); route mới cho student; gỡ một phần
> force-mock discipline (`makeRepo()` nhánh submit-leave). Đụng contract + data + nhiều role.

## Dependencies

- Depends on: none (E24.0b mockup v3 đã merge). Độc lập với E24.12–E24.16.
- Blocks: none
- Feature module(s) chạm: `src/features/attendance` (+ block `APSummary` dùng chung student/parent —
  đặt `features/attendance/presentation/shared/` rồi promote khi parent dùng → thực tế dùng ở 2 màn
  ngay → `components/shared/attendance-summary/` theo decision 0026), `src/features/parent-attendance`
  (thêm dialog + prepend hàng `pending`), `src/features/discipline` (reuse `SubmitLeaveRequestUseCase`
  — **remap về wire thật**), `bootstrap/di/discipline.di.ts` (carve-out nhánh submit-leave khỏi
  `makeRepo()` force-mock, theo mẫu `makeLeaveRepo()` của E24.11), `bootstrap/endpoint/discipline.endpoint.ts`
  (+ `leaveAttachments(id)`), `bootstrap/lib/resolve-my-class.ts` (reuse cho student).
- Shared contract/file: `nav-config.ts` (thêm mục sidebar student `attendance` — **serialize với
  E24.12**, cùng file), `messages/{vi,en}.json` (namespace `parentAttendance`, mới `studentAttendance`,
  reuse `discipline.studentConduct.leaveRequest.*`).

## Hiện trạng FE (grep 2026-09-06)

- **Không có** route `/student/attendance`; student nav (`nav-config.ts`) không có mục chuyên cần;
  `shell.nav.attendance` key đã tồn tại (teacher/parent dùng) → reuse label, không tạo key mới.
- `/parent/attendance` **đã có** (US-E20.5, `features/parent-attendance`): child + range là URL state,
  `ChildSwitcher` shared (`components/shared/child-switcher/`), đọc **real** `GET
  /core/api/v1/members/{childId}/attendance?startDate&endDate` (`PARENT_ATTENDANCE_EP`), bảng theo ngày
  + summary chip 4 trạng thái (`ATTENDANCE_STATUS_TONE`). Chưa có nút/dialog xin nghỉ, chưa có StatCard.
- Form xin nghỉ đã có **2 bản** (đều force-mock, shape lệch wire): `discipline/presentation/
  student-conduct-screen/components/leave-request-sheet.tsx` (Sheet, có field `type`) và
  `parent-discipline/components/LeaveRequestForm.tsx` (inline). Wire thật KHÔNG có `type`; body =
  `studentMemberId, classId, startDate, endDate, reason ≤500`. → US này KHÔNG tạo bản thứ 3: viết
  `components/shared/leave-request-dialog/` (Dialog, D6 normative) rồi 2 màn discipline chuyển sang dùng
  ở follow-up (ghi backlog), tránh 3 biến thể.
- i18n có sẵn: `discipline.studentConduct.leaveRequest.*` (title/startDate/endDate/reason/submit/
  submitting/success/close) → reuse; thêm `attachments.*`, `notice`, `studentAttendance.*`.
- `resolveMyClassId()` (bootstrap/lib, US-E24.1) giải quyết blocker "STUDENT không biết classId" mà
  E18.14 ghi trong `discipline.endpoint.ts` → nhánh submit-leave của student giờ **wire được**.
- `StatCard` shared có sẵn; `ProgressBar` **chưa** có shared component (grep `components/shared`) →
  thêm `components/shared/progress-bar/` theo pattern design-system (track `--edu-border`, fill prop).

## Product Contract

Design v3: `design_src/edu/attendance-portal.jsx` → `StudentAttendanceScreen`, `ParentAttendanceScreen`,
`APSummary`, `APExcuseRequestDialog`; design-spec `student-attendance` + `parent-attendance` (D6 normative).

### Student `/student/attendance` (mới)
- Title "Chuyên cần của tôi". **Deviation copy**: BE điểm danh theo NGÀY (`AttendanceStatus`
  PRESENT|ABSENT|LATE|EXCUSED_ABSENT, không có tiết) → subtitle/nhãn dùng "buổi"/"ngày" thay "tiết"
  ("Buổi có mặt", "Tổng hợp từ điểm danh theo ngày của GVCN"). Ghi deviation vào design-spec entry.
- Nguồn: `GET /core/api/v1/members/{memberId}/attendance?startDate&endDate` (STUDENT self — memberId từ
  claim `memberId`, ADR 0074; ≤366 ngày). Mặc định range = học kỳ hiện tại nếu resolve được
  (`CALENDAR_EP.activeYear` + `terms`) — **[OPEN QUESTION Q1]** STUDENT có quyền đọc
  `academic-years/*`? Nếu 403 → fallback range 6 tháng gần nhất (≤366), hiển thị range đang áp dụng.
- `APSummary` (shared, props thuần): 4 StatCard (Tỉ lệ % — tone success ≥95 / warning ≥90 / error;
  Buổi có mặt `present/total`; Vắng có phép; Vắng không phép), card "Theo tháng" (rollup client theo
  `YYYY-MM`, ProgressBar + `nP`/`nKP`/`%`, info strip quy chế 45 buổi), card "Lịch sử vắng mặt"
  (row = ngày + status Badge; **không có** subject/period — bỏ; `reason` = join với đơn nghỉ APPROVED
  trùng ngày từ `GET conduct/student-leave-requests?studentMemberId=`; đơn SUBMITTED → hàng `pending`
  "Chờ duyệt"). Tỉ lệ = present/(present+absent+excused+late) tính client; ghi rõ LATE tính có mặt hay
  không → **theo BE US-245**: LATE **không** vào numerator; hiển thị riêng nếu >0.
- Student KHÔNG có nút xin nghỉ ở màn này (design) — đơn của student ở `/student/conduct` (giữ).
- Sidebar student thêm `{ href: "/student/attendance", labelKey: "attendance" }` sau `conduct`
  (**[OPEN QUESTION Q2]**: design navMap student không liệt kê attendance; mặc định thêm để tránh
  route mồ côi — precedent audit dead-link 2026-08-02).

### Parent `/parent/attendance` (mở rộng)
- Giữ toàn bộ US-E20.5 (ChildSwitcher, range URL). Thêm: nút primary "Xin phép nghỉ học" (header), block
  `APSummary` phía trên bảng hiện có (cùng dữ liệu `records`), prepend hàng `pending` từ đơn SUBMITTED
  của con (`GET student-leave-requests?studentMemberId=childId`, real theo E24.11).
- Dialog `LeaveRequestDialog` (shared): "Nghỉ từ ngày"/"Đến hết ngày" (`type=date`, from clamp to.min),
  "Lý do" textarea required ≤500, "Minh chứng đính kèm" ≤3 tệp jpg/png/pdf ≤5 MB (validate client:
  đuôi + size; BE sniff MIME → 422 `LEAVE_REQUEST_ATTACHMENT_INVALID_FILE`), warning strip
  (`text-edu-warning-text`), footer Huỷ / "Gửi đơn" ("Đang gửi..."). Không có "Theo tiết" (D6).
- Submit = 2 bước server-side trong 1 Server Action: (1) `POST conduct/student-leave-requests`
  `{studentMemberId, classId, startDate, endDate, reason}` → 201 `requestId`; (2) mỗi tệp
  `POST /{requestId}/attachments?studentMemberId=` multipart `file` (tuần tự, ≤3; 409
  `LEAVE_REQUEST_ATTACHMENT_LIMIT_EXCEEDED`, 503 storage → retryable). Tệp lỗi → đơn vẫn tồn tại;
  toast "Đơn đã gửi, N/M tệp thất bại" + cho gửi lại tệp (không tạo đơn mới). **US-249 đã có trong
  `core/docs/openapi.yaml` (deployed), không còn draft** — EPIC-OVERVIEW ghi "draft" đã lỗi thời;
  vẫn smoke qua Kong trước khi bỏ badge; nếu 404 → ADR 0076 mock theo shape đó.
- `classId` của con: **[OPEN QUESTION Q3]** PARENT có gọi được `GET members/{childId}/enrollment`
  (core US-148) không? `resolveMyClassId` chỉ chứng minh cho self. Nếu không → dùng `classId` từ
  `MemberAttendanceDayRecord.classId` của bản ghi gần nhất (có sẵn trong response attendance) — fallback
  hợp lệ, ghi rõ trong Evidence.
- Lỗi map theo `error.code`: `LEAVE_REQUEST_FORBIDDEN` → forbidden; `LEAVE_REQUEST_STUDENT_NOT_ENROLLED`
  → not-enrolled; `LEAVE_REQUEST_INVALID_DATE_RANGE` → invalid-range; 422 fields → hiển thị theo field.
- DI: tách `makeSubmitLeaveRepo()` = `USE_MOCK ? Mock : Real` cho `SubmitLeaveRequestUseCase` (+ read
  `GetMyLeaveRequests` cho student join reason) — `makeRepo()` các nhánh khác giữ force-mock (E18.14).
  `SubmitLeaveRequestInput` bỏ `type`/`submittedBy` (server derive) → cập nhật 2 form cũ chỉ ở mức
  compile (giữ hành vi), hoặc adapter; không mở rộng scope discipline screens.

## Relevant Product Docs

- `docs/product/design-spec.jsonc#student-attendance`, `#parent-attendance`; `docs/product/screens.md`
  hàng Student Attendance (⬜ planned US-E24.6) + Parent Attendance
- `docs/reports/2026-09-02-be-to-fe-contract-update.md` §2.3 (ADR 0146), §4 US-249 (đã ship — xem trên)
- `../edu-api/services/core/docs/openapi.yaml`: `getMemberAttendance`, `student-leave-requests`
  (POST/GET), `uploadStudentLeaveRequestAttachment`, `LeaveRequestAttachmentResponse`
- `docs/decisions/0058-*` (attendance vocabulary), `0063-*`, `0074-*`, `0076-*`; `.claude/rules/api-integration.md`

## Acceptance Criteria

- Student mở `/student/attendance` → 4 StatCard đúng số từ records (unit test rollup: LATE không vào
  numerator; tháng không có bản ghi → không render hàng), lịch sử vắng chỉ gồm ABSENT/EXCUSED_ABSENT
  (+ pending từ đơn SUBMITTED), reason join đúng theo khoảng ngày đơn APPROVED.
- Không có bản ghi → empty "Không có buổi vắng nào" + StatCard 0/0 hiển thị "—" (không NaN).
- Token không có claim `memberId` → không gọi wire, state forbidden (test forge `sub`-only).
- Parent: chọn con → StatCard + bảng cùng dữ liệu; nút "Xin phép nghỉ học" mở dialog focus-trap, Escape,
  focus trả về nút; submit disabled khi reason rỗng (aria-describedby giải thích); tệp thứ 4 / >5 MB /
  đuôi sai bị từ chối client với thông báo text.
- Submit thành công → dialog đóng, hàng `pending` xuất hiện đầu lịch sử, toast; action test: body đúng 5
  field (không `type`), attachments upload tuần tự đúng `requestId` + `studentMemberId`; 403 → toast
  forbidden, không retry; tệp lỗi → đơn vẫn hiển thị + thông báo N/M.
- `discipline.di.ts` test: `USE_MOCK=false` → real repo cho submit-leave; các factory khác giữ mock
  (đảo test E18.14 chỉ phần này).
- Storybook: student full / empty / forbidden; parent with-dialog / attachments-error / pending-row;
  viewport 375 (grid 2×2, dialog 100%-40px).
- i18n vi+en: `studentAttendance.*`, mở rộng `parentAttendance.*`, reuse
  `discipline.studentConduct.leaveRequest.*`; không regenerate key đã có.
- Gate xanh; design-review + a11y (status = icon + text, ProgressBar có `aria-valuenow`/sr-only %).

## Design Notes

- Queries (RSC): `getMyAttendance(range)`, `listMyLeaveRequests()`; parent giữ page.tsx hiện có, thêm
  `listChildLeaveRequests(childId)` `Promise.allSettled`.
- Commands: `submitLeaveRequestAction(input, files: FormData)` — Server Action nhận FormData (không đọc
  file ở client ngoài validate), gọi `SubmitLeaveRequestUseCase` rồi `UploadLeaveAttachmentsUseCase`.
- UI: `features/attendance/presentation/student-attendance-screen/**`,
  `components/shared/attendance-summary/` (APSummary), `components/shared/leave-request-dialog/`,
  `components/shared/progress-bar/`.
- Domain: `summarizeAttendance(records, now)` pure (theo tháng + tổng); `joinAbsenceReasons(records,
  leaveRequests)` pure.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | rollup theo tháng, rate/LATE, join reason, file validator (size/ext/count) |
| Integration | repo ↔ mock http: POST body, multipart tuần tự, 409/422/503 mapping; DI gate test |
| E2E | Storybook dialog flow + focus return; page.test.ts student forbidden path |
| Platform | tsc/vitest/build; curl POST + attachment qua Kong khi stack lên |
| Release | design-review + a11y + security (memberId-only, không nhận classId từ client cho student) |

## Harness Delta

Backlog: hợp nhất `leave-request-sheet.tsx` + `LeaveRequestForm.tsx` vào `LeaveRequestDialog` shared
(decision 0026). Cập nhật ghi chú "draft US-249" trong EPIC-OVERVIEW §Phase 1 → "deployed".

## Plan (fe-planner, 2026-09-06)

Grounded against current code (not just the packet's grep note):
`src/bootstrap/di/discipline.di.ts` (`makeLeaveRepo()` carve-out pattern, E24.11),
`src/features/discipline/domain/{entities/leave-request.entity.ts,repositories/i-discipline.repository.ts}`,
`src/features/discipline/infrastructure/repositories/{discipline.repository.ts,mocks/discipline.mock.repository.ts}`,
`src/features/parent-attendance/**` (US-E20.5/E18.34 — `IChildAttendanceRepository.getChildAttendance(memberId, range)`
already calls the exact `GET /core/api/v1/members/{memberId}/attendance` endpoint the student screen needs),
`src/features/attendance/domain/entities/attendance-status.entity.ts` (existing cross-feature type-import
precedent), `src/bootstrap/lib/resolve-my-class.ts` (mirror for a new `resolveMyMemberId` companion isn't
needed — `decodeMemberIdClaim` is already exported from `bootstrap/lib/jwt.ts` and can be called directly),
`src/components/layout/app-shell/sidebar/nav-config.ts` (icon `ClipboardList` already used for `parent.attendance`),
`edu-api/services/core/docs/openapi.yaml` (`CreateStudentLeaveRequestRequest` needs
`studentMemberId,classId,startDate,endDate,reason`; response is `StudentLeaveRequestResponse` with
`requestId`/`state: SUBMITTED|APPROVED|REJECTED`; list is `GET ?studentMemberId=` cursor-paginated,
newest-first; attachment upload is `POST /{id}/attachments?studentMemberId=` one file per call).

**Key design decision — do NOT touch the 2 existing legacy leave-request call sites.**
`makeGetMyLeaveRequestsUseCase()` / `makeSubmitLeaveRequestUseCase()` (both routed through `makeRepo()`,
force-mock) are already live on `/student/conduct` and `/parent/conduct`
(`app/[locale]/t/[tenant]/(app)/{student,parent}/conduct/{page,actions}.tsx`) using the legacy
`SubmitLeaveRequestInput` shape (`studentId`,`type`,`submittedBy` — no `classId`, no real-wire mapping).
Repointing those factories to a real repo would break those 2 screens (they never collect `classId`).
So this US does NOT "remap `SubmitLeaveRequestUseCase` to wire" by mutating the legacy method/type —
it ADDS a parallel, narrower surface (`submitMyLeaveRequest` / `SubmitMyLeaveRequestInput`,
`getLeaveRequestsForAttendance` — a second factory over the SAME `GetMyLeaveRequestsUseCase` class,
just constructed with a different repo) used only by the new attendance screens. `/student/conduct` and
`/parent/conduct` keep their existing factories → `makeRepo()`, unaffected — this satisfies "cập nhật 2
form cũ chỉ ở mức compile" by not touching them at all rather than adapting their inputs. Consolidating
the 3 leave-request forms into `LeaveRequestDialog` stays a backlog follow-up (Harness Delta, unchanged).

### Phase 1 — Shared `ProgressBar` (`components/shared/progress-bar/`)
- New composed primitive, decision `0026` (design-system.md names it "not yet built"; grep confirmed).
  Props: `{ value: number; max?: number; color?: string; label?: string; className? }`. Pure function
  `clampPercent(value, max)` co-located (`progress-bar.utils.ts`) so 0/0 renders 0%, not `NaN`/`Infinity`
  (AC: "StatCard 0/0 hiển thị '—'" — the StatCard handles the em-dash; ProgressBar only needs the clamp).
- Track `bg-edu-border` (per design-system.md), fill `transition-[width] duration-[600ms]`,
  `role="progressbar"` `aria-valuenow`/`aria-valuemin=0`/`aria-valuemax=100` + `<span className="sr-only">`
  percent text (AC: a11y, `.claude/rules/accessibility.md`).
- **Test first**: `progress-bar.utils.test.ts` (clamp: negative, `>max`, `max=0`) — red before the
  component; then `.stories.tsx` (0%, 45%, 100%, with/without label) — interaction test asserts
  `aria-valuenow`.
- Done when: unit + story green, no raw color.

### Phase 2 — Domain: entities + pure functions (TDD, no framework deps)
1. **Extend `ChildAttendanceRecord`** (`features/parent-attendance/domain/entities/child-attendance-record.entity.ts`):
   add optional `classId?: string` (currently dropped by the mapper's doc comment — now a real consumer
   exists, so re-add rather than fabricate a second read). Update `toChildAttendanceRecords` mapper +
   its doc comment + `child-attendance.mapper.test.ts` (assert `classId` now passes through). This is
   additive (optional field), not a breaking rename — safe for the shipped US-E20.5 callers.
2. **`features/attendance/domain/entities/attendance-summary.entity.ts`** — `AttendanceSummary` (rate,
   presentCount, excusedCount, unexcusedCount, lateCount, total) + `MonthlyRollup` (`month: "YYYY-MM"`,
   presentCount, excusedCount+unexcusedCount as `nP`/`nKP`, rate).
3. **`summarize-attendance.ts`** (`summarizeAttendance(records: ChildAttendanceRecord[], now = new Date())`)
   — pure, total + per-month rollup. `rate = present/(present+absent+excusedAbsent+late)` per AC — LATE
   counted in the denominator but excluded from the numerator (BE US-245 semantics, packet is explicit);
   months with zero records are omitted (not a zero row). **Test first**
   (`summarize-attendance.test.ts`): empty records → `total=0`, rate → sentinel the presentation layer
   renders as "—" (return `null` rate, not `NaN`); LATE-only month excluded from numerator but present in
   denominator; multi-month split.
4. **`join-absence-reasons.ts`** (`joinAbsenceReasons(records, leaveRequests: LeaveRequestEntity[])`) —
   type-only cross-feature import of `LeaveRequestEntity` (same precedent as `AttendanceStatus`'s existing
   cross-feature import into `parent-attendance`). For each `ABSENT`/`EXCUSED_ABSENT` day, find an
   `APPROVED` leave request whose `[startDate,endDate]` covers it → `reason` on the row; a `SUBMITTED`
   request with no matching day yet → synthesize a `pending` history row for its whole range (AC:
   "hàng pending xuất hiện đầu lịch sử"). **Test first**: exact-day match, multi-day range match,
   `SUBMITTED` prepend, no-match day → `reason: null`.
5. **`SubmitMyLeaveRequestInput`** (new type in `discipline/domain/entities/leave-request.entity.ts`,
   sibling to the legacy `SubmitLeaveRequestInput` — NOT a replacement):
   `{ studentMemberId: string; classId: string; startDate: string; endDate: string; reason: string }`
   (matches `CreateStudentLeaveRequestRequest` 1:1 — no `type`/`submittedBy`, server derives submitter).
   New use-case `SubmitMyLeaveRequestUseCase` (mirrors `SubmitLeaveRequestUseCase`'s validation: reason
   trimmed length ∈ (0,500], `startDate <= endDate`, `startDate >= today` injectable clock). **Test
   first**: reason empty/over-500 → `reason-invalid`; `endDate < startDate` → `invalid-date`; happy path
   delegates to `repo.submitMyLeaveRequest`.
6. **Attachment validator** — co-located pure fn in the dialog's folder (Phase 4), not domain, since it's
   generic file-shape validation with no BE dependency beyond the 3 constants (ext allow-list, 5MB, count
   3): `validateLeaveAttachments(files: File[]): { valid: File[]; rejected: { file: File; reason:
   "ext"|"size"|"count" }[] }`. Planned here so its test is written before Phase 4's UI.

### Phase 3 — Infrastructure (server-only)
1. **`IDisciplineRepository`**: add 3 methods — `submitMyLeaveRequest(input: SubmitMyLeaveRequestInput):
   Promise<LeaveRequestEntity>`; `getLeaveRequestsForAttendance(studentMemberId: string):
   Promise<LeaveRequestEntity[]>` (thin alias, see below — kept as a DISTINCT interface method rather than
   reusing `getMyLeaveRequests` so the two call paths can never be silently repointed at each other by a
   future edit); `uploadLeaveAttachment(requestId: string, studentMemberId: string, file: File):
   Promise<LeaveAttachmentEntity>`.
2. **`MockDisciplineRepository`**: implement all 3 against the existing `_leave` fixture array (`state`
   synthesized as `"pending"`; `getLeaveRequestsForAttendance` filters by `studentId`, identical body to
   existing `getMyLeaveRequests`); attachment mock returns a fixture entity, no real file storage.
3. **`DisciplineRepository`** (real): implement all 3 against `DISCIPLINE_EP.submitLeaveRequest` /
   `.leaveRequests` (`GET ?studentMemberId=`) / a new `DISCIPLINE_EP.leaveAttachments(id)` →
   `/core/api/v1/conduct/student-leave-requests/${id}/attachments`. Map `state: SUBMITTED→"pending"`,
   `APPROVED→"approved"`, `REJECTED→"rejected"`; `requestId→id`. New DTOs
   (`student-leave-request-response.dto.ts`, `leave-request-attachment-response.dto.ts`) + mapper. Upload
   sends `multipart/form-data` (`file` field) with `studentMemberId` as a query param (AxiosInstance,
   `FormData` body — Node/edge runtime compatible, no browser-only API).
4. **Error mapping** (`toFailure`/`throwFailure`, extend the discipline failure union):
   `LEAVE_REQUEST_FORBIDDEN`→`forbidden`; `LEAVE_REQUEST_STUDENT_NOT_ENROLLED`→`not-enrolled`;
   `LEAVE_REQUEST_INVALID_DATE_RANGE`→`invalid-date`; 422 `fields[]`→per-field; attachment:
   `LEAVE_REQUEST_ATTACHMENT_INVALID_FILE`→`attachment-invalid`,
   `LEAVE_REQUEST_ATTACHMENT_LIMIT_EXCEEDED`→`attachment-limit`,
   `LEAVE_REQUEST_ATTACHMENT_LOCKED`→`attachment-locked`; 503/`retryable:true`→`network-error`.
   **Test first**: integration test per code → failure type (mirror `child-attendance.repository.test.ts`'s
   `throwFailure` table style).
5. **`bootstrap/endpoint/discipline.endpoint.ts`**: add `leaveAttachments: (id: string) => ...`.
6. **`bootstrap/di/discipline.di.ts`**: add `makeSubmitLeaveRepo()` — `USE_MOCK ? new
   MockDisciplineRepository() : (await ensureFreshSession(), new DisciplineRepository(await
   createServerHttpClient()))` (mirrors `makeLeaveRepo()`'s shape exactly, doc comment cross-references
   it). Export `makeSubmitMyLeaveRequestUseCase()`, `makeGetLeaveRequestsForAttendanceUseCase()`,
   `makeUploadLeaveAttachmentUseCase()` — all three built on `makeSubmitLeaveRepo()`. Do **not** touch
   `makeGetMyLeaveRequestsUseCase()` / `makeSubmitLeaveRequestUseCase()` (still `makeRepo()`, still force-mock,
   still serving `/student/conduct` + `/parent/conduct` unchanged).
   **Test first** (extend `discipline.di.test.ts`): `USE_MOCK=false` → `makeSubmitLeaveRepo()` yields the
   real class; `makeRepo()`-backed factories still yield mock regardless (inverse of E18.14's original
   assertion, scoped to the new factories only).
7. **Student self memberId**: no new bootstrap helper needed — `decodeMemberIdClaim` (`bootstrap/lib/jwt.ts`,
   ADR `0074`) called directly where the RSC page assembles its query (mirrors `resolveMyClassId`'s own
   internal use of the same decoder). Student's `classId` (for `submitMyLeaveRequest` — student screen has
   no submit button per AC, so this only matters for a future symmetry check) comes from
   `resolveMyClassId()` (already exists, US-E24.1).
8. **Parent's child `classId`** (Q3): read `ChildAttendanceRecord.classId` (Phase 2 step 1) off the most
   recent record in the already-fetched attendance range — no extra round-trip. If the range has zero
   records (new student, empty history) → disable the leave-request button with an inline tooltip/notice
   (documented gap, not a blocking question — routes around Q3 without asking).
9. **Academic-year range default** (Q1): try `CALENDAR_EP.activeYear`/`terms`; catch 403 → fall back to a
   client-computed 6-month range `[today-6mo, today]` (`daysInclusive` already caps at 366, well inside),
   show the applied range in the subtitle. No new endpoint.

### Phase 4 — Presentation + i18n + Storybook
1. **`components/shared/attendance-summary/`** (`APSummary`) — pure props component: 4×`StatCard` (reused,
   no changes) in a `grid grid-cols-2 md:grid-cols-4` (375px viewport AC: 2×2), "Theo tháng" card
   (`ProgressBar` + `nP`/`nKP`/rate% per month + the 45-buổi info strip, `text-edu-warning-text`-toned per
   design-system contrast rule), "Lịch sử vắng mặt" card (row = date + `StatusBadge` — reuse existing
   status-tone map, `pending` row gets a distinct `warning` tone + "Chờ duyệt" label). Props only,
   `getMyAttendance`/`joinAbsenceReasons` outputs feed it from the RSC page — no fetching inside.
   **Test first**: `.stories.tsx` states — full, empty (AC: "Không có buổi vắng nào" + StatCard "—"),
   with-pending-row.
2. **`components/shared/leave-request-dialog/`** (`LeaveRequestDialog`) — shadcn `Dialog` (not `Sheet`,
   D6). Fields: `startDate`/`endDate` (`type="date"`, `endDate.min = startDate`), `reason` (`Textarea`,
   `required`, `maxLength=500`, `aria-describedby` counter/error), attachments (`<input type="file"
   multiple accept=".jpg,.jpeg,.png,.pdf">` + client `validateLeaveAttachments` from Phase 2 step 6,
   rejected files listed as text errors, not color-only), warning strip, footer Huỷ/`"Gửi đơn"`→`"Đang
   gửi..."` disabled-while-pending. Radix `Dialog` already gives focus-trap/Escape/focus-return — assert
   it in the interaction test, don't reimplement. **Test first**: `.stories.tsx` interaction — empty reason
   keeps submit disabled, focus returns to trigger button on close, 4th file / >5MB / wrong ext rejected
   with visible text.
3. **`features/attendance/presentation/student-attendance-screen/**`** — new. `student-attendance-screen.tsx`
   (client, VM props) + `.i-vm.ts` + `student-attendance-container.tsx` (server, assembles VM from
   `getMyAttendance`+`getLeaveRequestsForAttendance` via `Promise.allSettled`, `decodeMemberIdClaim` guard:
   no `memberId` claim → forbidden VM state, no wire call — AC's forge-`sub`-only test). New route
   `app/[locale]/t/[tenant]/(app)/student/attendance/{page.tsx,actions.ts}` (RSC + thin action file even
   though no mutation lives here, for symmetry/future).
4. **Extend `features/parent-attendance/presentation/parent-attendance-screen/**`**: add "Xin phép nghỉ
   học" header button opening `LeaveRequestDialog`; render `APSummary` above the existing table (same
   `records` the page already fetches — zero extra query); prepend pending row via `joinAbsenceReasons`
   against `getLeaveRequestsForAttendance(childId)` (new `Promise.allSettled` branch, matches Design
   Notes). Reuses existing `ChildSwitcher` + URL range state untouched (US-E20.5).
5. **Server Action** `submitLeaveRequestAction(input, formData: FormData)` —
   `app/[locale]/t/[tenant]/(app)/parent/attendance/actions.ts` (new). Step 1: `makeSubmitMyLeaveRequestUseCase()`
   → `POST` (client-supplied `classId` per Phase 3 step 8, never trusted for the STUDENT path — there is
   none here — but IS the parent's read-derived fallback, documented as such). Step 2: sequential
   `makeUploadLeaveAttachmentUseCase()` per file, `Promise.allSettled`-style manual loop (sequential, per
   spec) — partial failure → return `{ ok: true, requestId, failedCount, total }`, presentation toasts
   "Đơn đã gửi, N/M tệp thất bại" and offers a retry-attachments affordance (re-invokes step 2 only, same
   `requestId`). **Test first**: action test asserts body has exactly 5 fields (no `type`), attachment
   calls use `requestId`+`studentMemberId`, 403→forbidden no-retry, partial file failure → correct N/M.
6. **`nav-config.ts`**: `{ href: "/student/attendance", labelKey: "attendance", icon: ClipboardList }`
   after `conduct` in the `student` array (icon precedent: `parent.attendance` already uses `ClipboardList`).
   **⚠️ Shared-file serialization**: worktree A (E24.12) also edits this file (profile-item removal). Do
   NOT edit yet — this is the engineer's job at merge time: `git fetch origin && git merge --no-ff
   origin/main` first, re-read the current `nav-config.ts` + `nav-config.test.ts`, then make this one
   additive change last, right before the final gate run.
7. **i18n**: reuse `discipline.studentConduct.leaveRequest.*` verbatim (title/startDate/endDate/reason/
   submit/submitting/success/close — no new keys for the dialog's existing fields). Add
   `studentAttendance.*` (title, subtitle, rate/present/excused/unexcused labels, monthly card, history
   card, empty, forbidden) + extend `parentAttendance.*` (button label, pending-row label) +
   `attachments.*` (label, notice, count/size/ext error text) in both `vi.json`/`en.json` — **not edited by
   this plan** (engineer's job); flagged here so the engineer adds both files in the same commit.

### Phase 5 — Design-spec + Harness Delta cleanup (docs only, low risk)
- `docs/product/design-spec.jsonc#student-attendance`: record the "buổi"/"ngày" vocabulary deviation
  (already directed by the packet) as an inline note on the entry.
- `docs/screens.md`: flip Student Attendance row from ⬜ planned to the in-progress/implemented marker
  used elsewhere once Phase 4 lands.
- EPIC-OVERVIEW §Phase 1: fix the stale "US-249 draft" note → "deployed" (packet already flags this;
  purely a doc correction, zero code risk).

## Component + state sketch

```
student-attendance-screen (RSC container → client VM)
 └─ APSummary (shared)                     — props: summary, monthlyRollups, historyRows, empty?, forbidden?
     ├─ StatCard ×4 (existing, unchanged)
     ├─ ProgressBar (new, Phase 1)          — per-month card
     └─ history list (row = date + StatusBadge, existing tone map)
parent-attendance-screen (extends existing)
 ├─ header button → LeaveRequestDialog (new, Phase 4.2)
 ├─ APSummary (shared, same data as existing table)
 └─ existing table (unchanged) + prepended pending row
```

State classification: server (attendance records, leave requests — RSC `fetch`/use-case, no client cache
needed since it's a read-heavy low-frequency screen, no TanStack Query required — matches
`parent-attendance`'s existing RSC-only pattern, no `fe-state-engineer` needed); URL (parent's child id +
range — already exists, untouched); local-form (dialog's date/reason/files — plain `useState` inside
`LeaveRequestDialog`, no Zustand). No `fe-component-architect` hand-off needed — component shapes are
fully specified above and reuse `StatCard`/`Dialog`/`Textarea` primitives as-is.

## Risks, dependencies, open questions

- **[OPEN QUESTION Q1 default]** Resolved inline (Phase 3 step 9): try academic-year read, 403 → 6-month
  fallback range, shown in subtitle. No blocking.
- **[OPEN QUESTION Q2 default]** Resolved inline (Phase 4 step 6): add the sidebar item; precedent =
  2026-08-02 dead-link audit (an orphaned route is worse than an unlisted-but-linked one).
- **[OPEN QUESTION Q3 default]** Resolved inline (Phase 3 step 8): `classId` from the most recent
  `ChildAttendanceRecord`; empty-history edge case disables the button with a visible reason, not a silent
  failure.
- **BE contract risk**: US-249 (attachments) EPIC-OVERVIEW note says "draft" but `openapi.yaml` (not
  `.draft.yaml`) already has it — Phase 3 step 3 must `curl` through Kong once the stack is up before
  wiring the real path; if 404, fall back to ADR `0076` mock-shaped-on-draft posture and flag to `fe-lead`
  for a story-status footnote (not a blocker, since `USE_MOCK` gate covers local dev either way).
- **No ADR needed**: no new design token (`ProgressBar`/`APSummary`/`LeaveRequestDialog` all compose
  existing tokens); no new architecture pattern (mirrors `makeLeaveRepo()` exactly).
- **a11y risk**: file-input error list must be plain text (not color-only) — explicit AC, covered by
  Phase 4.2's story test.
- **Security (NFR)**: student path never accepts a client-supplied `classId` (uses `resolveMyClassId()`
  server-side only); `submitMyLeaveRequest`'s `studentMemberId` for the STUDENT caller must be the decoded
  claim, never a form field — flag to `fe-tech-lead-reviewer` as a specific check during Phase 4.5 review
  (same shape as decision `0063`'s repository-boundary rule, though this is a self-submit not a
  role-scoped-mutation, so no `authCtx` object is needed — just "never trust the client for whose
  `studentMemberId` this is" on the STUDENT path; the PARENT path legitimately supplies the linked child's
  id, checked server-side by BE's `ParentStudentLinkReader`).

## Evidence

Branch `feat/us-e24.6-student-parent-attendance-portal`, 7 commits, TDD red→green at every step.

### Proof commands (all run on the final tree)

| Command | Result |
| --- | --- |
| `bunx tsc --noEmit` | clean |
| `bun vitest run` | 584 files / **4919 passed**, 0 failed |
| `bun vitest run --config vitest.storybook.mts` | 170 files / **1371 passed**, 0 failed |
| `bun lint` | clean for this story (1 pre-existing warning + 1 info in `features/messaging`, untouched) |
| `bun run build` | ✓ compiled; `ƒ /[locale]/t/[tenant]/student/attendance` present in the route table |
| Kong smoke of `POST .../{id}/attachments` | **NOT RUN — stack down** (`curl localhost:8080/core/health` → connection refused). The real path is `USE_MOCK`-gated, so local dev is unaffected; the wire contract is proved against `openapi.yaml` by integration tests instead. **Open follow-up for `fe-lead`.** |

### Layers proved

- **Unit** — `clampPercent` (7), `summarizeAttendance` (8: LATE out of the numerator/in the denominator,
  empty→`rate: null`, zero-record months omitted), `joinAbsenceReasons` (13: exact-day + multi-day
  APPROVED match, SUBMITTED prepend, `DD/MM/YYYY`↔ISO normalisation), `SubmitMyLeaveRequestUseCase` (9),
  `validateLeaveAttachments` (20), `rateTone`/`monthToDate` (11), `termRangeFor`/`fallbackRange` (9).
- **Integration** — `discipline.repository.test.ts` +13: the POST body is EXACTLY core's five fields
  (key-set asserted, no `type`), the multipart `FormData` + `?studentMemberId=` query, the
  `?studentMemberId=` (never `classId`) list drain, and every attachment error code
  (`…INVALID_FILE`/`…LIMIT_EXCEEDED`/`…LOCKED`/`…STORAGE_UNAVAILABLE`). `discipline.di.test.ts` +6: the
  three new factories follow `USE_MOCK`, and `makeGetMyLeaveRequestsUseCase`/`makeSubmitLeaveRequestUseCase`
  (serving `/student/conduct` + `/parent/conduct`) stay mock-backed in real mode.
- **Action** — `parent/attendance/actions.test.ts` (11): sequential per-file uploads against the new
  `requestId`, partial failure → `{ ok: true, total, failedCount }` with the request kept, 403 → `forbidden`
  with no upload attempted, and the STUDENT-caller override (a client-supplied `studentMemberId` is
  replaced by the `memberId` claim; no claim ⇒ refused before the wire).
- **Route** — `student/attendance/page.test.ts` (7): a `sub`-only token yields `forbidden` with an
  asserted-EMPTY call log; the read addresses the CLAIM's id and never `sub`; a failed leave read still
  renders the summary; core's 403 surfaces as `status: "error"` not as the identity `forbidden`.
- **Storybook** — `ProgressBar` (4), `AttendanceSummaryBlock` (4: full / empty-with-em-dash / pending-row /
  375px), `LeaveRequestDialog` (9: empty-reason-disables-submit + `aria-describedby`, date clamp, rejected
  attachments as TEXT, pending, server error, Escape→focus-returns-to-trigger, 375px),
  `StudentAttendanceScreen` (6: full / empty / forbidden / retryable vs terminal error / 320px overflow),
  `ParentAttendanceScreen` (+4: dialog submit payload, partial-attachment `role="status"` + files-only
  retry, pending row, `aria-disabled` button with a visible reason when no `classId` exists).

### Decisions taken while implementing

1. **`SubmitLeaveRequestUseCase` was NOT remapped** (packet §DI said "remap"). `/student/conduct` and
   `/parent/conduct` still submit the legacy shape and never collect a `classId`, so repointing that
   factory at the real wire would 400 both shipped screens. A parallel narrower surface was added instead
   (`submitMyLeaveRequest` / `SubmitMyLeaveRequestInput` / `makeSubmitLeaveRepo()`); consolidating the
   three forms stays the logged backlog item.
2. **Failure keys reused, not duplicated**: `LEAVE_REQUEST_STUDENT_NOT_ENROLLED` → the EXISTING
   `student-not-enrolled` and `LEAVE_REQUEST_INVALID_DATE_RANGE` → the existing `invalid-date` (the plan
   named `not-enrolled`/`invalid-date`; adding a second key for a mapping that already exists would fork
   the copy). Genuinely new: `reason-too-long`, `attachment-invalid`, `attachment-limit`,
   `attachment-locked`.
3. **No `now`/`today` parameter on `summarizeAttendance` or the Server Action.** Nothing in the AC depends
   on the current date for the rollup, and a Server Action's arguments are ALL client-supplied — a `today`
   parameter would have let a caller back-date a leave request past the "not in the past" check. The
   action's tests freeze the system clock instead.
4. **STUDENT-caller override in the action** (beyond the plan): a STUDENT's `studentMemberId` is forced to
   the `memberId` claim, so a hand-made payload cannot file a request for a classmate even before core's
   own check.
5. **`parseIsoDate` promoted** from `parent-attendance/presentation` to `@/shared/parse-iso-date` (moved,
   re-exported) — a `components/shared/*` component must not import a feature's presentation folder.
6. **No `actions.ts` on `/student/attendance`**: the screen has no mutation, and an empty `'use server'`
   module is dead code.

### Known gaps / follow-ups

- Kong smoke of the create + attachment routes (above).
- The three leave-request forms (`leave-request-sheet.tsx`, `LeaveRequestForm.tsx`,
  `components/shared/leave-request-dialog/`) still coexist — consolidation is the packet's Harness Delta item.
- `LeaveAttachmentEntity` is produced but not yet RENDERED anywhere (no screen lists a request's existing
  attachments); the upload path is complete, the read-back UI is not in this story's scope.
- Q1 remains genuinely open: whether a STUDENT may read `GET /academic-years` is untested against a live
  BE. The screen degrades to the 6-month window and states the applied range, so either answer is correct
  behaviour.
