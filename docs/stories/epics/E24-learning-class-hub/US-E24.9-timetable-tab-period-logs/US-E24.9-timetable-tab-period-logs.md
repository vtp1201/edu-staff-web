# US-E24.9 Tab Thời khoá biểu — lịch tuần lớp + sổ đầu bài TIẾT (GVBM) + sổ chủ nhiệm NGÀY (GVCN) + chuẩn bị tiết

## Status

implemented

## Lane

high-risk

> Lý do: 3 write surface mới (`period-logs`, `period-preps` PUT/DELETE; `homeroom-entries` submit)
> gated theo slot/role (ADR core 0144/0145); phải thread `authCtx` server-derived (decision 0063).

## Dependencies

- Depends on: US-E24.8 (shell)
- Blocks: none
- Feature module(s) chạm: `src/features/period-log/**` (mới: period-logs + period-preps),
  `features/class-log` (reuse use-cases; thêm VM gọn cho tab), `features/timetable` (class weekly
  read), `bootstrap/endpoint/period-log.endpoint.ts` (mới), `bootstrap/di/period-log.di.ts`
- Shared contract/file: `messages` `teacher.classHub.timetable`; `class-log` entity/status không đổi

## Product Contract

Design v3: `class-hub.jsx` → `ChSessionsTab`, `ChPeriodLogForm`, `ChPrepForm`, `CH_DAILY_STATUS`,
`ChDailyBadge`; BE `2026-09-02-be-to-fe-contract-update.md` §2.1/§2.2.

Layout: 2 cột (`minmax(0,1.7fr) minmax(260px,1fr)`), mobile 1 cột.

**Cột trái — tuần hiện tại của LỚP** (`GET /core/api/v1/classes/{id}/timetable` + bell schedule
`startTime/endTime` khi có — draft US-244), mỗi ngày 1 card:
- Header ngày (Hôm nay highlight primary-light + badge), ngày lễ → dòng "Nghỉ lễ …" error-text.
- Mỗi tiết: "Tiết n", giờ (nếu có), môn, GV (`teacherName` từ slot), phòng; tiết của tôi
  (`teacherMemberId === memberId`) tint primary/0C + "— tiết của bạn"; tiết đang diễn ra (now trong
  [start,end]) → badge "Đang diễn ra" success (chữ + dot).
- **Trên tiết của tôi (GVBM)** 2 hành động inline: "Ghi sổ đầu bài tiết" / "Đã ghi sổ tiết" và
  "Chuẩn bị tiết" / "Đã chuẩn bị" → mở form inline dưới tiết:
  - Sổ tiết (`PUT period-logs/{date}/{n}`): Tên bài dạy (bắt buộc ≤200), Nhận xét (≤2000),
    Xếp loại A/B/C/D (segmented radio), Số HS vắng 0–200 + note "tham khảo — không thay điểm danh";
    body kèm `termId`, `academicYearId` (từ `GET academic-years/active` — helper có sẵn?). Xoá entry
    = DELETE (confirm). GVCN thấy các entry của tiết khác **chỉ đọc** ("Sổ tiết (GVCN chỉ đọc)").
  - Chuẩn bị tiết (`PUT period-preps/{date}/{n}`): Ghi chú, chọn 1 giáo án (`lessonPlanId` từ
    `features/lesson-plan` list của tôi), Tài liệu = list link {title ≤200, url http(s)} ≤20, thêm/xoá;
    update = full replace. Không upload.
  - Lỗi: 422 (không có slot / không phải GV slot / ngoài term) → banner "Bạn không được phân công tiết
    này hoặc ngày ngoài học kỳ" (không phân biệt 403/422); 409 term-mismatch → thông báo riêng.
- **Cuối mỗi ngày — Sổ chủ nhiệm (theo ngày)** = `homeroom-entries` (reuse `features/class-log`
  use-cases `list/create/submit/revise`): badge trạng thái Nháp / Chờ BGH duyệt / Đã duyệt / Bị trả
  lại (+ `reason` khi trả lại); GVCN: textarea + "Lưu nháp" (create/update DRAFT) + "Gửi duyệt"
  (submit); REJECTED → "Sửa & gửi lại" (revise). GVBM: chỉ đọc, chú thích "Chỉ GVCN sửa được".
  (ask #9: GVBM có GET được không — nếu 403 → ẩn khối cho GVBM.)

**Cột phải — panel "Chuẩn bị cho tiết X sắp tới"**: tiết của tôi gần nhất trong tương lai
(hoặc đang diễn ra), 2 dòng trạng thái "Chuẩn bị tiết: đã/chưa", "Sổ đầu bài tiết: đã/chưa" (chip
màu + chữ), 3 lối tắt: Kế hoạch giảng dạy → `/teacher/teaching-plan`, Điểm danh → `/teacher/attendance?classId=`,
Sổ đầu bài → `/teacher/class-log?classId=`. Footer: "Tài liệu chuẩn bị gắn vào từng tiết."

Điều hướng tuần: prev/next tuần (URL `?week=YYYY-Www`), range ≤31 ngày cho GET list.

## Relevant Product Docs

- `docs/product/design-spec.jsonc#teacher-class-hub` (tab timetable, v3)
- `docs/reports/2026-09-02-be-to-fe-contract-update.md` §1, §2.1, §2.2
- edu-api `services/core/docs/openapi.yaml` period-logs/period-preps/homeroom-entries, `ERROR_CODES.md`
  `PERIOD_LOG_ENTRY_*`, `PERIOD_PREP_*`; ADR core 0144/0145
- `docs/decisions/0063-*` (repository-boundary authorization), `0074-*`

## Acceptance Criteria

- Tuần render 5–6 ngày từ timetable; tiết của tôi highlight theo `memberId` (test forge `sub` ≠ `memberId`
  → không highlight).
- GVBM: PUT period-log với body đúng (`termId`, `academicYearId`, `lessonTitle`, `remark`, `grade`,
  `absentCount`) → hiện "Đã ghi sổ tiết" + nội dung; validate client ≤200/≤2000/0–200; 422 → banner
  không phân biệt 403/422 (integration test 2 code cùng 1 UI).
- GVBM: PUT period-prep ≤20 link, url phải http(s); link thứ 21 bị chặn với thông báo.
- GVCN không phải GV slot: không thấy nút ghi/chuẩn bị, thấy nội dung chỉ đọc; repository test
  forge-role gọi thẳng `savePeriodLog` với authCtx role SUBJECT sai slot → failure không gọi http
  (decision 0063).
- Sổ ngày: GVCN Lưu nháp → DRAFT; Gửi duyệt → SUBMITTED; REJECTED hiện `reason` + nút Sửa & gửi lại
  → revise; GVBM chỉ đọc. Tái dùng `features/class-log` use-cases — không viết repo mới cho
  homeroom-entries.
- Panel phải chọn đúng tiết sắp tới (unit test với `now` inject; qua ngày cuối tuần → tiết đầu tuần
  sau hoặc "Không có tiết sắp tới").
- Bell schedule chưa có (`startTime` undefined) → không hiện giờ, không "Đang diễn ra"; có → hiện.
- Storybook: both-roles-today / subject-only / homeroom-only-readonly-period / rejected-daily /
  holiday / no-slots / error. Mobile 375: 1 cột, form không tràn.
- i18n `teacher.classHub.timetable.*` vi+en đầy đủ (labels, statuses, errors).
- Gate xanh; design-review + a11y (radio A–D có label, textarea có label, badge có chữ).

## Design Notes

- Endpoints mới `PERIOD_LOG_EP`: `logs(classId, date, n)`, `logsRange(classId, from, to)`,
  `preps(classId, date, n)`, `prepsRange(classId, from, to)` — tất cả `/core/api/v1/classes/...`.
- Domain `features/period-log`: entities `PeriodLog`, `PeriodPrep`; failures
  `slot-forbidden-or-missing`(422/403 gộp) | `term-mismatch`(409) | `validation`(422 fields) |
  `not-found`; use-cases `GetWeekPeriodLogs`, `SavePeriodLog`, `DeletePeriodLog`, `GetWeekPeriodPreps`,
  `SavePeriodPrep`, `DeletePeriodPrep` với `authCtx {role, memberId}` từ DI.
- Server Actions trong `teacher/classes/[classId]/actions.ts` (`savePeriodLogAction`,
  `savePeriodPrepAction`, `saveDailyEntryAction`, `submitDailyEntryAction`, `reviseDailyEntryAction`).
- Client: form state react-hook-form + zod; sau action `revalidatePath`. Không TanStack cần thiết.
- Tokens: highlight `bg-primary/5`, live badge `StatusBadge` success; daily badge map
  DRAFT→muted, SUBMITTED→warning, APPROVED→success, REJECTED→error (giữ map class-log hiện có).

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | week/next-period selectors, validators, failure mapping |
| Integration | repo ↔ mock http (PUT bodies, 422/409/403 mapping), forge-role authCtx test |
| E2E | Storybook forms + Playwright happy path (ghi sổ tiết) nếu stack lên |
| Platform | tsc/vitest/build; curl smoke PUT period-log qua Kong khi stack lên |
| Release | design-review + a11y + security (authCtx) |

## Harness Delta

Có thể cần ADR "period-log feature wiring (authCtx slot-scoped)" nếu reviewer yêu cầu — mặc định
không, decision 0063 đã phủ.

## Evidence

Commits: 9880bc2d (feat, initial TDD) + f7272c5f (ADR 0063 amendment, fe-lead) +
f8ed1a5d (fix, review+a11y round).

Tech-lead review round 1: **REVISION REQUIRED** (fe-tech-lead-reviewer, high-risk
lane). 5 MUST FIX: (1) stale week-nav client state — silent-overwrite risk fixed
via `key={vm.weekParam}` remount; (2) homeroom "Sửa"/"Gửi duyệt" path unreachable
against real contract (no update endpoint) — rewritten into 3 disjoint states
(create/submit-only/revise); (3) authCtx used `decodeMemberId` (sub-fallback) —
fixed to `decodeMemberIdClaim` (claim-only, ADR 0074); (4) real timetable mapper
dropped LIVE `startTime`/`endTime` fields — added pass-through; (5) escalate ADR
0063 compliance claim (client-supplied scope key `assignedTeacherMemberId`, not
server-derived) — resolved by fe-lead amending
`docs/decisions/0063-server-derived-auth-context-explicit-param.md` with a "4th
instance" carve-out (BE is authoritative, FE check is UX-only defense-in-depth).
4 SHOULD FIX (secondary-read silent-swallow → secondaryErrorKey banner; use
existing `makeListEntriesUseCase()` not repo directly; add `period-log.di.test.ts`
proving real mode ignores mock hint; narrow failure-type guard to known union)
+ 4 CONSIDER (rename duplicate export, materials url zod max, aria-describedby
wiring, Saturday day intentional-documented) all applied in f8ed1a5d.

Tech-lead re-check round 2: **APPROVED**. All 8 MUST/SHOULD FIX verified in code
(not just claimed) — `weekParam` remount key, 3-state daily-log-panel, claim-only
memberId decoder, startTime/endTime pass-through ground-truthed against edu-api
core openapi.yaml SlotResponse (live, not draft), secondaryErrorKey rendered
(role="status"), di.test.ts proves real-mode-ignores-mock-hint, failure-type
union validated. Gates green: tsc clean, 562 files/4584 tests, lint clean,
build green. Two non-blocking CONSIDER items noted for future (exhaustiveness
comment softening, di.test.ts double-import weakness) — do not block merge.

A11y audit round 1: 1 Blocking (period-row.tsx "— tiết của bạn" text-primary on
bg-primary/5 ≈3.1:1 contrast fail) + 2 Minor (materials-field-array aria-label
param misleading; day-card "Hôm nay" borderline contrast — pre-existing system
pattern, registered as backlog #3, out of this story's scope). All closed in
f8ed1a5d except backlog #3 (deferred, system-wide). A11y re-check round 2:
CLOSED — recalculated contrast ≈11.7:1 for the fixed label; materials param
renamed to `{position}` matching copy.

Design review: pass
- design-system: conform — tokens-only throughout (bg-primary/5 highlight,
  text-edu-text-primary, text-edu-error-text, bg-edu-error/15, StatusBadge/
  class-log STATUS_TONE reuse), matches design-spec.jsonc#teacher-class-hub
  timetable-tab 2-column layout (minmax(0,1.7fr) minmax(260px,1fr)).
- a11y: WCAG AA OK post-fix (contrast ≥4.5:1 recalculated on the fixed label;
  radio A-D has legend/label; textarea labeled; badges color+text; keyboard
  Tab/Enter native; motion-safe gates).
- impeccable audit: code-level pass — no anti-pattern tells (no side-stripe,
  no gradient text, no glassmorphism, no hero-metric template; 2-column layout
  and inline forms are design-spec-prescribed).
- states: loading/empty/error/holiday/no-slots/both-roles-today/subject-only/
  homeroom-only-readonly-period/rejected-daily covered in Storybook (15/15
  interaction tests); mobile 375 form does not overflow; secondary-read-failed
  banner state added in fix round.

Test proof: unit (week/next-period selectors incl. year-boundary + fail-closed
sub≠memberId case, validators, failure-type narrowing) + integration (repo↔mock
http PUT/DELETE body shape, 422/409/403 error-code mapping ground-truthed
against ERROR_CODES.md, forge-role authCtx sweep across all 5 roles for every
mutating op with zero-HTTP-call proof, di.test.ts real-mode-ignores-mock-hint)
+ Storybook interaction (15/15 for the timetable tab, full suite 1319/1320 —
1 pre-existing unrelated flake in admin/invitations-screen, confirmed passes
46/46 in isolation) — 562 files/4584 tests all green. `bunx tsc --noEmit`,
`bun lint`, `bun run build` green. Pre-push gate green on all pushed commits.

Descoped/deferred:
- Backlog #3 registered (day-card "Hôm nay" contrast, system-wide pattern
  recurring across multiple screens — design-system ticket, not this story's
  fault).
- Bell schedule (startTime/endTime) remains scaffolding for `getByClass`
  (teacher class-hub timetable) — now wired for real; the BY-MEMBER mapper
  (`mapMemberWeeklyTimetable`, used by teacher/parent personal schedule views)
  still drops the same live fields — flagged as a follow-up story candidate,
  same contract field, different mapper.
- Homeroom DRAFT entry content cannot be edited anywhere in the product (core
  has no update endpoint for homeroom-entries) — UI now states this honestly
  rather than offering a dead edit path; if editing is a real product
  requirement, it is a BE ask, not an FE gap.
- `assertHomeroomOf` re-scans `listMyClasses()` per daily action (cheap,
  correctness-first) — no evidence of a perf problem, accepted as-is.
- Last-write-wins on concurrent period-log/prep edits (core exposes no
  `If-Match`/`updatedAt` precondition) — nothing to send client-side, accepted.
