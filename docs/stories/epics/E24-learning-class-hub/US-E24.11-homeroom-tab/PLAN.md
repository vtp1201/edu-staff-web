# US-E24.11 Implementation Plan — Tab Chủ nhiệm (GVCN)

Owner: fe-planner. No code written here. See story packet
`US-E24.11-homeroom-tab.md` for AC/contract; this file is the phased
breakdown + ground-truth corrections found while reading `discipline`,
`attendance`, `teacher`, US-E18.14, US-E24.8 (merged), and the real
`edu-api/services/core/docs/openapi.yaml`.

## 0. Ground-truth corrections vs the packet (read this before coding)

1. **Card 2 (vi phạm chờ xử lý) CANNOT be un-force-mocked in this US — status
   model mismatch, not a `USE_MOCK` flip.** The packet's conditional text
   ("wire read thật nếu contract đọc đã ổn") assumed a drop-in flip. Ground
   truth: `ViolationEntity.status: "recorded"|"notified"|"parent_confirmed"`
   (shipped US-E09.1 model) has **zero relation** to the real
   `StudentViolationResponse.state: DRAFT|SUBMITTED|APPROVED|REJECTED`
   (openapi.yaml L13233). `DisciplineRepository.getViolations` is a
   permanent blocked stub (throws, never calls `http.*`, per
   `discipline.repository.ts` class doc, US-E18.14) and the real DTO also has
   **zero display fields** (no `studentName`/`className`/`handledBy` — same
   "zero display fields" gap US-E18.14 already logged). Un-mocking for real
   would require redesigning `ViolationEntity`'s status axis to the BE
   workflow, which cascades into `violations-tab.tsx`, `conduct-badge.tsx`,
   `discipline-tones.ts`, and `ViolationsList.tsx` (parent screen) — out of
   scope for a homeroom-tab story. **Decision: Card 2 stays on the existing
   force-mocked `makeGetViolationsUseCase()` unchanged** (same instance the
   `/teacher/discipline` violations tab already reads). The only touch is
   additive: add an optional `state?: "SUBMITTED" | ...` mock-only field (or,
   simpler and zero-risk: reuse the **existing** `status === "recorded"` as
   the "chưa xử lý" proxy — see Domain §1) purely so the homeroom card has
   something to filter/count client-side — mirrors the E24.7/E24.8 "additive
   optional field, mock sets it, real stays absent" convention. **Flag to
   `fe-lead`: backlog a follow-up US to redesign `ViolationEntity`'s status
   model against the ground-truthed BE workflow — prerequisite for ever
   wiring this real.**
2. **Card 3 (leave requests) CAN be un-force-mocked, but the shared
   `makeGetLeaveRequestsUseCase()` factory has a real hard constraint the
   packet didn't ground-truth: `GET .../student-leave-requests` requires
   *exactly one* of `studentMemberId` or `classId`** (openapi.yaml L7366,
   `400 LEAVE_REQUEST_INVALID_INPUT` otherwise) — **not** an optional filter.
   The **existing** caller, `teacher/discipline/page.tsx`, calls
   `(await makeGetLeaveRequestsUseCase()).execute({})` today (no `classId`,
   no `studentMemberId`) to build a multi-class dashboard. That call shape is
   incompatible with the real endpoint. Decision: keep the repository method
   signature `getLeaveRequests(params: { classId?: string })`, but the REAL
   implementation requires `classId` and returns a documented
   `{ type: "not-found" }`-class failure (never calls `http.*`) when it is
   absent, rather than guessing or defaulting. `teacher/discipline/page.tsx`'s
   no-`classId` call is a **pre-existing latent gap this US surfaces, not
   creates** (today it silently works because the file is 100% force-mocked)
   — fixing that page (iterate the teacher's homeroom `classId`s) is flagged
   as a follow-up backlog item, out of scope here. The homeroom-tab's own
   call always supplies `classId` (the class the tab belongs to), so it never
   hits this gap.
   - Server already scopes `?classId=` to the `SUBMITTED`-only inbox for a
     GVCN caller (openapi L7375-7379) — **no client-side state filter
     needed** for card 3 (unlike card 2).
3. **`approve`/`reject` real endpoints require `studentMemberId` as a query
   param in addition to the path `id`** (openapi.yaml L7452-7454,
   L7483-7485, `LeaveRequestStudentMemberId` parameter) — the current
   interface (`approveLeave(id)`, `rejectLeave(id, reason)`) cannot address
   the real route. **Additive signature widening** (not a redesign):
   `approveLeave(id: string, studentMemberId: string)`,
   `rejectLeave(id: string, studentMemberId: string, reason: string)`. Every
   caller already has the full `LeaveRequestEntity` (which carries
   `studentId`) in hand when it invokes approve/reject, so this is a
   mechanical plumb-through, not a new lookup. Cascades to: `IDisciplineRepository`,
   `MockDisciplineRepository` (ignore the new param, same behavior),
   `DisciplineRepository` (real, now implemented for these 3 methods only),
   `ApproveLeaveUseCase`/`RejectLeaveUseCase`, **both** actions files
   (`teacher/discipline/actions.ts` — existing, and this story's new homeroom
   `actions.ts`), and both callers (`leave-tab.tsx` — existing, extend its
   `handleApprove`/`handleReject` calls to pass `request.studentId`; and this
   story's `pending-leave-card.tsx`). No i18n/UI change, no new failure type
   needed (all real leave error codes already map in `toFailure`, US-E18.14).
4. **Decision `0063` (repository-boundary authorization) for approve/reject.**
   The real endpoint already 403s server-side for a non-homeroom GVCN
   (`LEAVE_REQUEST_FORBIDDEN`), but the AC explicitly asks for a repo-level
   forge-role test that **never calls http** on a scope mismatch. Plan:
   thread an `authCtx: { role: StaffRole; homeroomClassIds: string[] }` into
   `ApproveLeaveUseCase`/`RejectLeaveUseCase`'s real construction path only
   (assembled in `bootstrap/di/discipline.di.ts`, per rule — nowhere else).
   `homeroomClassIds` is derived by calling the **already-real**
   `makeListMyTeacherClassesUseCase()` (from `teacher-class.di.ts`) and
   filtering `roles.includes("homeroom")` — a legitimate cross-feature wire
   at the composition root (`bootstrap/di` is allowed to compose across
   features; this mirrors how `teacher-class.di.ts` already composes
   `batchResolve` from the member-directory feature). The use-case checks
   `authCtx.homeroomClassIds.includes(classId)` **before** calling
   `repo.approveLeave(...)`/`.rejectLeave(...)` — a mismatch returns
   `{ type: "forbidden" }` synchronously, proving "no HTTP call" without
   needing a network mock. `classId` must therefore also be threaded through
   the use-case signature (`execute(authCtx, id, studentMemberId, classId,
   reason?)`) — available today via the `LeaveRequestEntity.classId` already
   on every row.
5. **Card 1 (attendance) needs one additive entity field the current mapper
   discards.** `AttendanceRoster`/`mapClassAttendance` already defaults every
   unmarked student to `status: "present"` (`attendance.mapper.ts` L64-77) —
   correct for the mark-attendance screen (blank day = everyone assumed
   present, editable), but this means a genuinely untaken day is
   **indistinguishable** from "everyone present" once mapped — both give
   `records: [...N present]`. The raw signal *does* exist
   (`dto.records.length === 0`, per the repository's own comment,
   `attendance.repository.ts` L80-82) but is discarded before reaching the
   entity. Plan: add `taken: boolean` to `AttendanceRoster` (additive,
   computed in `mapClassAttendance` from `dto.records.length > 0`) — zero
   risk to the existing mark-attendance screen (it never reads the field).
   Card 1's "Đã điểm danh"/"Chưa điểm danh" badge reads `roster.taken`; the 3
   tiles read `countStatuses(roster.records.map(r => r.status))` (existing
   helper) when `taken`, else render `"—"` for all 3 (per AC).
6. **`reject-leave-dialog.tsx` is a promotion trigger (decision `0026`).** It
   currently lives at
   `discipline/presentation/discipline-screen/components/reject-leave-dialog.tsx`
   (1-screen, feature-local). This story is screen #2 needing the identical
   reason-required reject dialog. Per component-organization rule 3
   ("promote ngay khi screen thứ 2 cần — KHÔNG copy"): **move** it to
   `components/shared/reject-leave-dialog/` (folder + `index.ts` +
   `.stories.tsx`), update the one existing import
   (`discipline-screen/components/leave-tab.tsx`), then import it from the
   new homeroom `pending-leave-card.tsx`. Not a fork.
7. **`StatCard` (shared) fits card 1's 3 tiles directly** (`tone` prop
   already has `success`/`warning`/`error`) — no variant needed. Cards 2/3
   are list-cards (not stat tiles) — new composed components, feature-local
   (only 1 screen uses them today).

## 1. Domain

### 1a. `features/discipline/domain/` (extend, no fork)

- `i-discipline.repository.ts`: widen
  `approveLeave(id: string): Promise<LeaveRequestEntity>` →
  `approveLeave(id: string, studentMemberId: string): Promise<LeaveRequestEntity>`;
  `rejectLeave(id, reason)` →
  `rejectLeave(id: string, studentMemberId: string, reason: string): Promise<LeaveRequestEntity>`.
- `use-cases/approve-leave.use-case.ts` / `reject-leave.use-case.ts`: widen
  `execute` to accept an optional `authCtx?: { role: string; homeroomClassIds:
  string[] }` + `classId: string` alongside `id`/`studentMemberId`(/`reason`).
  When `authCtx` is present and `!authCtx.homeroomClassIds.includes(classId)`
  → return `{ ok: false, error: { type: "forbidden" } }` **without calling
  `repo.*`** (this is the decision-0063 proof point). `authCtx` stays
  `undefined` for the existing `teacher/discipline` callers until that page
  is migrated (follow-up, §0.2) — **zero behavior change for existing
  callers**, additive parameter only.
- **New**, pure, `domain/is-homeroom-scope.ts` (or inline in the use-case —
  architect to decide granularity): `isHomeroomScope(authCtx, classId):
  boolean`. This is the TDD centerpiece for the forge-role proof — pure,
  zero I/O.
- No new `DisciplineFailure` type needed — `forbidden` already exists.

### 1b. `features/attendance/domain/`

- `entities/attendance-roster.entity.ts`: add `taken: boolean` (additive).
- No use-case signature change (`GetClassAttendanceUseCase.execute(classId,
  date)` unchanged).

### 1c. `features/teacher/domain/` — resolve "my homeroom classIds"

- No new use-case needed for the DI-level authCtx assembly (§0.4) — reuse
  `ListMyTeacherClassesUseCase.execute()` (already exists, real) directly
  inside `discipline.di.ts`.
- The homeroom-tab's page-level data fetch also needs the current class's
  roles (to gate the tab — already resolved by `resolveClassHubTab` /
  `GetMyClassUseCase` from US-E24.8, reused unchanged).

**Test first**
- `approve-leave.use-case.test.ts` / `reject-leave.use-case.test.ts`
  (extend): forge-role case — `authCtx.homeroomClassIds` does NOT include
  `classId` → `{ ok: false, error: { type: "forbidden" } }`, mock repo's
  `approveLeave`/`rejectLeave` **never called** (spy assertion). Existing
  no-`authCtx` cases stay green unchanged.
- `is-homeroom-scope.test.ts` (or inlined): pure boolean cases.
- `class-attendance.mapper.test.ts` (extend): `taken: false` when
  `dto.records = []`; `taken: true` otherwise — assert existing count
  assertions unaffected.

**Done when**: unit tests green; no framework import in `domain/`.

## 2. Infrastructure

### 2a. `features/discipline/infrastructure/` — un-force-mock 3 leave methods ONLY

- `mocks/discipline.mock.repository.ts`: `approveLeave`/`rejectLeave` accept
  the widened signature, ignore the new params (same fixture-mutation
  behavior as today).
- `repositories/discipline.repository.ts` (real, currently 100% blocked
  stubs): implement **3 methods for real**, leave every other method
  `blocked()` unchanged:
  - `getLeaveRequests({ classId })`: `classId` absent → `blocked()`
    (documented, §0.2). `classId` present → `GET DISCIPLINE_EP.leaveRequests
    ?classId=` → map `StudentLeaveRequestResponseDto[]` (**new DTO**, see
    below) → `LeaveRequestEntity[]`, resolving `studentName`/`submitterName`
    via the **same `resolveNames` (batchResolve) pattern** already proven in
    `teacher-class.repository.ts`/`attendance.repository.ts` (constructor
    param, optional). `className` is NOT resolved via a second lookup — the
    caller (homeroom-tab) already knows its own `className` from the class
    header and can stamp it post-map (mirrors `ClassDate`'s documented
    reasoning for the same avoidance in attendance, §"stale/second value").
    `type: LeaveType` has no real source (BE has no leave-type concept, per
    US-E18.14) → hardcode `"other"`, documented inline. `submittedBy`:
    `"student"` if `submittedByMemberId === studentMemberId` else
    `"parent"` (inference, documented). `status`: `SUBMITTED→"pending"`,
    `APPROVED→"approved"`, `REJECTED→"rejected"` (1:1, unlike violations).
    `approvedBy`/`rejectedBy`: resolve `approverMemberId` via the same
    `resolveNames` batch (added to the same batch call, not a second
    round-trip) when `state !== "SUBMITTED"`.
  - `approveLeave(id, studentMemberId)`: `POST
    DISCIPLINE_EP.approveLeave(id) ?studentMemberId=` → map single DTO →
    entity (reuse the same mapper).
  - `rejectLeave(id, studentMemberId, reason)`: `POST
    DISCIPLINE_EP.rejectLeave(id) ?studentMemberId= { rejectionReason:
    reason }`.
  - Every OTHER method (`getViolations`, `recordViolation`,
    `getConductSummary`, `overrideConductGrade`, self-service, parent) stays
    `blocked()` — **unchanged**, per §0.1 and the AC's "các use-case khác
    giữ hành vi hiện tại".
- **New** `infrastructure/dtos/student-leave-request-response.dto.ts`
  (ground-truthed shape, NOT the stale `LeaveRequestResponseDto` which
  claims fields the real BE never returns): `requestId`, `studentMemberId`,
  `classId`, `startDate`, `endDate`, `reason`, `state`
  (`SUBMITTED|APPROVED|REJECTED`), `submittedByMemberId`,
  `approverMemberId?`, `rejectionReason?`, `createdAt`, `updatedAt`. The
  existing `LeaveRequestResponseDto` stays as-is (still used by the mock
  repo's fixture typing) — this is a genuinely separate, real-wire DTO, not
  a rename.
- **New** `infrastructure/mappers/leave-request.mapper.ts` (real-only, extend
  `discipline.mapper.ts` or new file — architect decides): `toLeaveRequestEntity(dto,
  nameByMemberId, className)`.
- `bootstrap/endpoint/discipline.endpoint.ts`: `approveLeave`/`rejectLeave`
  helpers gain a `studentMemberId` query — extend the call site (`http.post(url,
  body, { params: { studentMemberId } })`), not the constant shape itself
  (URL builder stays `(id) => …`, query passed at call time like
  `ATTENDANCE_EP.classAttendance` precedent).

**Test first**
- `discipline.repository.test.ts` (extend): the 3 real methods —
  success-path mapping (incl. `type: "other"` hardcode, `submittedBy`
  inference, name resolution via injected `resolveNames` stub), `classId`
  absent → documented failure without `http.*` call, full error-code
  passthrough via existing `toFailure` (no new cases needed, confirm via
  test that `LEAVE_REQUEST_FORBIDDEN`/`_INVALID_DATE_RANGE`/etc. still map).
  Every OTHER method's existing "throws without calling http" tests stay
  green unchanged.
- `leave-request.mapper.test.ts` (new): DTO → entity, all branches
  (submittedBy inference, approvedBy/rejectedBy presence per state).

**Done when**: repo tests green; `tsc` clean; existing discipline test
suite has zero regressions outside the 3 touched methods.

### 2b. `features/attendance/infrastructure/`

- `mappers/attendance.mapper.ts`: `mapClassAttendance` sets `taken:
  dto.records.length > 0`.

**Test first**: extend `attendance.mapper.test.ts` (§1b).

## 3. Bootstrap (`src/bootstrap/di/`)

- `discipline.di.ts`:
  - Keep `makeRepo()` (renamed in comments only, not behavior) returning
    `MockDisciplineRepository` **unconditionally** for every factory EXCEPT
    the 3 leave ones — this is the mechanism that keeps "other use-cases
    unchanged" true even after `USE_MOCK` flips (§0.1's AC line).
  - **New** `makeLeaveRepo()`: `USE_MOCK ? new MockDisciplineRepository() :
    new DisciplineRepository(await createServerHttpClient(), resolveNames)`
    where `resolveNames` is composed the same way `teacher-class.di.ts` does
    (batch member-directory lookup) — used ONLY by
    `makeGetLeaveRequestsUseCase`, `makeApproveLeaveUseCase`,
    `makeRejectLeaveUseCase`.
  - `makeApproveLeaveUseCase()`/`makeRejectLeaveUseCase()`: additionally
    assemble `authCtx` — call `(await
    makeListMyTeacherClassesUseCase()).execute()`, filter
    `roles.includes("homeroom")`, map to `classId[]` → `{ role: "teacher",
    homeroomClassIds }` — construct the use-case with this `authCtx` bound
    (e.g. a thin wrapper or the use-case takes authCtx as a constructor arg,
    architect to decide vs. per-`execute` arg to keep the existing
    `teacher/discipline` caller signature-compatible without threading
    `authCtx=undefined` at every call site — **prefer constructor-bound**
    so `teacher/discipline/actions.ts`'s existing 2-arg calls need zero
    changes beyond the `studentMemberId`/`classId` plumb-through of §0.3).
  - Test: `discipline.di.test.ts` (new or extend) — `USE_MOCK=false` →
    `makeGetLeaveRequestsUseCase`/`makeApprove…`/`makeReject…` construct a
    real repo instance; `makeGetViolationsUseCase`/`makeGetConductSummaryUseCase`/etc.
    still construct `MockDisciplineRepository` regardless (inverts the
    US-E18.14 leave-only assertion, per AC).
- `teacher-class.di.ts`: no change (its factories are reused as-is by
  `discipline.di.ts`'s new authCtx assembly — cross-feature composition-root
  wiring, allowed).
- No endpoint file addition beyond §2a.

**Done when**: `bun build` resolves; no `'server-only'` leak.

## 4. Presentation

### 4a. `features/teacher/presentation/class-hub/homeroom-tab/`

**Files**
- `homeroom-tab.i-vm.ts`: plain VM per card —
  `AttendanceTodayCardVm { taken: boolean; present: number; excused: number;
  absent: number; classId: string }`,
  `OpenViolationsCardVm { count: number; items: {...}[]; classId: string }`
  (feeds off the EXISTING (mock) violations use-case result, filtered
  client-side per §0.1),
  `PendingLeaveCardVm { requests: LeaveRequestEntity[] }`.
- `attendance-today-card.tsx` (RSC, no interactivity): badge + 3 `StatCard`
  tiles (reuse verbatim, §0.7) + `Link` "Mở sổ điểm danh" →
  `/teacher/attendance?classId=&date=today`.
- `open-violations-card.tsx` (RSC): count badge (error tone) + row list +
  `Link` "Mở Vi phạm & Hạnh kiểm" → `/teacher/discipline?classId=`. Empty →
  `EmptyState` "Không có vi phạm chờ xử lý." Error (this card's own fetch
  failed in the `Promise.allSettled`) → inline retry (client sub-component,
  smallest possible: a `'use client'` wrapper around a static error card
  with a `refresh()` call, OR a server-side re-fetch link if the architect
  prefers no client boundary here — flag as an open question, §9).
- `pending-leave-card.tsx` (`'use client'` — has the approve/reject
  interactive list, mirrors `leave-tab.tsx`'s existing pattern of local
  `useState` list + optimistic remove-on-success): count badge (warning),
  row per request (tên HS, "Nghỉ dd/MM → dd/MM — lý do"), Duyệt/Từ chối
  buttons. Reuses **promoted** `RejectLeaveDialog` (§0.6). On approve/reject
  success → remove item from local list + `toast`; 403 → `toast` + trigger
  `router.refresh()` (or the passed Server Action's own `revalidatePath`,
  since actions already run server-side) to resync.
- `homeroom-tab.tsx`: composes the 3 cards in the `auto-fit
  minmax(300px,1fr)` grid (per design-spec `homeroomTab.grid`), each fed
  independently (no card blocks another on error — `Promise.allSettled`
  upstream in `page.tsx`).

### 4b. Route wiring (`US-E24.8`'s existing shell)

- `teacher/classes/[classId]/page.tsx` (extend, US-E24.8 already has the
  `"homeroom"` branch as a `TabPlaceholder`): replace that branch with:
  ```
  const [attendance, violations, leaveRequests] = await Promise.allSettled([
    (await makeGetClassAttendanceUseCase()).execute(classId, todayIso()),
    (await makeGetViolationsUseCase()).execute({ classId }),   // existing, still mock
    (await makeGetLeaveRequestsUseCase()).execute({ classId }), // now real-capable
  ]);
  ```
  Each `PromiseSettledResult` maps to its card's VM independently; a
  `rejected` result renders that card's error state, not the whole tab.
  `todayIso()`: **new tiny pure helper** (`domain/today.ts` or reuse an
  existing date util if one exists — grep first) that takes an injectable
  clock for testability (per `tdd.md`'s "inject clock" rule) — default
  `new Date()`.
- **New** `teacher/classes/[classId]/actions.ts` (or extend if US-E24.9/10
  already created one by merge time — check): `approveLeaveHomeroomAction(id,
  studentMemberId, classId)` / `rejectLeaveHomeroomAction(id, studentMemberId,
  classId, reason)` → call `makeApproveLeaveUseCase()`/`makeRejectLeaveUseCase()`
  → `revalidatePath('/teacher/classes/[classId]', 'page')`. Separate from
  `teacher/discipline/actions.ts` (different route, Clean-Arch convention:
  actions colocate with their route) even though they share the same
  underlying use-case factories.

### 4c. Existing-screen touches (mechanical, from §0.3)

- `leave-tab.tsx`: `handleApprove(id)`/`handleReject(id, reason)` → pass
  `request.studentId` (already in scope via the row being acted on) through
  to `approveLeaveAction`/`rejectLeaveAction`.
- `teacher/discipline/actions.ts`: `approveLeaveAction(id, studentMemberId)`
  / `rejectLeaveAction(id, studentMemberId, reason)` — signature widening,
  passes through to the same use-cases (which now also accept `classId` —
  `teacher/discipline` doesn't have one scoped, per §0.2's flagged gap, so
  its calls pass no `authCtx`-checked `classId`, i.e. this page's approve/
  reject stay on the "no `authCtx`" path documented in §1a — **unaffected
  behavior**, matches the AC).

**Test first (integration, page-level)**
- `[classId]/page.test.ts` (extend, US-E24.8's existing file): `?tab=homeroom`
  for a GVCN class → attendance/violations/leave VMs assembled;
  attendance-not-taken variant; one upstream promise rejecting doesn't blank
  the other two cards.
- `[classId]/actions.test.ts` (new): approve/reject happy path +
  authCtx-forbidden path (classId not in caller's homeroom set) → no repo
  call, `errorKey: "forbidden"` returned.

**Test first (Storybook interaction)**
- `homeroom-tab.stories.tsx`: `full`, `attendance-not-taken`,
  `empty-all` (no violations, no leave), `reject-dialog` (open + type reason
  + confirm), `error-card` (one card `Promise.allSettled`-rejected while
  the other two render).

## 5. i18n

Namespace `teacher.classHub.homeroom` (NOT `teacher.classHub.homeroom` typo—
confirm exact casing against US-E24.8's shipped `teacher.classHub.tabs.*`
convention; **NOT** `teacherClasses.*`, the story packet's own
"Shared contract/file" line already says `messages` `teacher.classHub.homeroom`,
matching E24.8's established namespace, not the epic table's stale
`teacher.classHub.homeroom` — no drift here, just confirming):
- `teacher.classHub.homeroom.attendance.{title,taken,notTaken,present,excused,absent,openLink}`
- `teacher.classHub.homeroom.violations.{title,count,empty,openLink,errorRetry}`
- `teacher.classHub.homeroom.leave.{title,count,empty,approve,reject,errorRetry,item}`
  (`item` = "Nghỉ {start} → {end} — {reason}" ICU-style interpolation,
  mirror existing `leave-tab.tsx` copy conventions if any exist for the same
  string, don't invent new phrasing).
- Reuse `discipline.leave.rejectDialog.*` verbatim (promoted component,
  §0.6 — do not duplicate keys under the new namespace; the promoted
  `RejectLeaveDialog` keeps its existing translation namespace since it's
  the same UI text regardless of which screen renders it).
- vi source + en mirror, both at once.

## 6. fe-component-architect / fe-state-engineer — needed?

- **fe-component-architect: recommend spawning.** Three independent composed
  cards (2 are read-only RSC, 1 has real interactivity + a promoted shared
  dialog) plus the `reject-leave-dialog.tsx` promotion (touches an existing
  component's import site) is enough surface to warrant a pass — in
  particular to settle: (a) the open-violations-card error-state client
  boundary question (§4a, §9), (b) exact prop contract for the promoted
  `RejectLeaveDialog` (does it need a `title`/`description` prop now that
  2 screens use it with possibly different copy, or is the copy identical
  enough to hardcode the same i18n keys — check both usages' current copy
  first).
- **fe-state-engineer: recommend a light pass, not a full spawn.**
  `pending-leave-card.tsz` needs local optimistic-remove state (mirrors
  `leave-tab.tsx`'s existing `useState<LeaveRequestEntity[]>` pattern
  exactly — no new pattern, no TanStack Query, no global store) — a
  state-engineer isn't required to invent anything new, but should confirm
  the `Promise.allSettled` → 3-independent-card-failure wiring at the
  `page.tsx` level doesn't need any client-side refetch machinery beyond
  `router.refresh()` server action revalidation (already the existing
  pattern app-wide).

## 7. Test plan summary (maps to Validation table)

| Layer | File(s) | Asserts |
| --- | --- | --- |
| Unit | `approve-leave.use-case.test.ts` / `reject-leave.use-case.test.ts` (extend) | forge-role: authCtx mismatch → forbidden, repo never called |
| Unit | `is-homeroom-scope.test.ts` | pure scope check |
| Unit | `class-attendance.mapper.test.ts` (extend) | `taken` derivation |
| Unit | `leave-request.mapper.test.ts` (new) | DTO→entity all branches |
| Integration | `discipline.repository.test.ts` (extend) | 3 real methods: success mapping, classId-absent failure, error-code passthrough (no new codes), all OTHER methods still permanently blocked |
| Integration | `discipline.di.test.ts` (new/extend) | `USE_MOCK=false` → leave-3 real, all others still mock |
| Integration | `[classId]/actions.test.ts` (new) | approve/reject happy + forbidden path |
| Integration | `[classId]/page.test.ts` (extend) | homeroom tab VM assembly, per-card independent failure |
| Story | `homeroom-tab.stories.tsx` | full / attendance-not-taken / empty-all / reject-dialog / error-card |
| Platform | — | tsc / vitest / build |
| Release | — | design-review + a11y (numbers+labels not color-only, ≥44px buttons, dialog focus trap — already proven by the existing `RejectLeaveDialog`) |

## 8. Harness delta for `fe-lead`

- `harness-cli backlog add` — two follow-ups surfaced by ground-truth, both
  blocking future full real-wiring of `discipline`:
  1. "Redesign `ViolationEntity` status model against ground-truthed BE
     workflow (DRAFT/SUBMITTED/APPROVED/REJECTED)" — prerequisite for
     un-force-mocking `getViolations` anywhere (§0.1).
  2. "`teacher/discipline` page's `getLeaveRequests({})` call has no
     `classId`/`studentMemberId` — incompatible with the real endpoint's
     exactly-one-of constraint; needs to iterate the teacher's homeroom
     `classId`s instead" (§0.2).
- ADR decision: **no new ADR required** per the packet's own "reviewer
  quyết" framing — this is a partial/scoped un-force-mock (3 of ~15 methods
  in one file), same shape as prior "additive DI factory split" precedent
  (not a full supersede of US-E18.14, which stays accurate for every method
  except these 3) — record it in this packet's **Evidence** section +
  `screens.md` per the Harness Delta line, and update
  `discipline.di.ts`'s class-doc comment to say "leave-request methods
  un-forced by US-E24.11; all other methods remain the US-E18.14 blocked
  stub." `fe-tech-lead-reviewer` may still elevate to an ADR if they judge
  the DTO/entity/signature changes public-contract-significant — flagged as
  their call, not pre-empted here.
- `docs/product/screens.md` — homeroom tab row: mark leave-card "real
  (US-E24.11)", violations-card "mock (US-E18.14, pending status-model
  redesign)", attendance-card "real".

## 9. Risks, dependencies, open questions

- **[OPEN QUESTION]** Open-violations-card error state: does the whole tab
  need a client boundary for a single card's retry, or is a plain
  server-rendered "Thử lại" `Link` (re-navigate = re-fetch, RSC-native,
  zero client JS) good enough? Packet says "lỗi từng card độc lập (retry)" —
  the zero-client-JS `Link` approach satisfies "retry" without inventing
  interactivity; flag to `fe-component-architect` to confirm before the
  engineer builds a client wrapper that isn't needed.
- **[OPEN QUESTION]** `today()` clock injection helper — check whether an
  existing "today ISO date" utility already exists somewhere in
  `features/attendance` or `shared/` before adding a new one (grep first;
  this plan assumes none exists based on the files read, but wasn't
  exhaustively grepped for a generic date-util module).
- **Risk**: `authCtx`/`classId` threading into
  `ApproveLeaveUseCase`/`RejectLeaveUseCase` changes their `execute()`
  arity — confirm at implementation time whether making `authCtx` a
  **constructor** argument (bound once per DI factory call) vs. an
  `execute()` argument is cleaner; constructor-bound avoids touching
  `teacher/discipline/actions.ts`'s call-site arity for the authCtx part
  (only the `studentMemberId`/`classId` plumb-through from §0.3 touches that
  file, which is unavoidable either way since the real endpoint needs it).
- **Risk**: resolving `submittedByMemberId`/`approverMemberId` names via
  `resolveNames` doubles the batch-resolve payload size on the leave-list
  call (student + submitter + approver ids) — same code path, negligible
  perf risk given class-scoped row counts, but flag if the engineer sees
  batch-size limits on the member-directory endpoint.
- **Dependency**: US-E24.8 (shell, merged) — this story fills its
  `"homeroom"` `TabPlaceholder` branch. US-E24.9/10 (other tabs) are
  parallel siblings, no shared file contention beyond `messages/*` and
  `[classId]/actions.ts` (serialize per `parallel-workflow.md` if they land
  concurrently — check which US creates `actions.ts` first and extend
  rather than fork).
- **Descope confirmed from packet**: leave-request file attachments
  ("đính kèm ≤3 file — draft US-249") are explicitly draft/unshipped — card
  3 renders with no attachment UI at all (not even a hidden/disabled
  affordance), per the packet's own "ẩn nếu không có field" instruction.
