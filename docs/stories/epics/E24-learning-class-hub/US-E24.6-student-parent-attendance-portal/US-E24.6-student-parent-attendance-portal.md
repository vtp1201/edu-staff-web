# US-E24.6 Chuyên cần — cổng học sinh (`/student/attendance`) + dialog "Xin phép nghỉ học" cho phụ huynh

## Status

planned

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

## Evidence

(chưa có — planned)
