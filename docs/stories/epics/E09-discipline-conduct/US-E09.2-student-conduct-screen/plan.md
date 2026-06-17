# Plan — US-E09.2 Student Conduct Screen

**Written by:** fe-planner  
**Date:** 2026-06-18  
**Packet:** `docs/stories/epics/E09-discipline-conduct/US-E09.2-student-conduct-screen/`

---

## 1. Summary

**Feature:** Student and parent self-service conduct screen — view own conduct summary, own violations, submit leave requests, view leave history.

**Screens touched:**
- `/student/conduct` (new)
- `/parent/conduct` (new; child context via `?childId=` searchParam, parent sees first child in mock mode)

**Done looks like:**
- Domain: four new use-cases with full unit tests; `invalid-date` and `reason-too-short` failure types added.
- Repository interface extended with four student-scoped methods; mock and real repos implement them.
- `StudentConductScreen` client component renders all AC states (loading / error / empty / success).
- Nav config wired for student + parent; i18n complete under `discipline.studentConduct` sub-namespace and `shell.nav`.
- Storybook stories cover all AC states; `/impeccable audit` passes; design-review gate signed off.
- `bun build` + `tsc` clean; all vitest green.

**Decisions flagged (require ADR or fe-lead confirmation before Phase 4 starts):**

- **ADR-0040 (proposed):** Add `"conduct"` key to `shell.nav` i18n type — touches the typed `NavLabelKey` union; log as decision for traceability.
- **[OPEN QUESTION — CONFIRM BEFORE PHASE 4]** How is `studentId` read server-side from the session? Check if JWT claim `sub` equals studentId or if there is a separate claim. Affects RSC page implementation.
- **[OPEN QUESTION — CONFIRM BEFORE PHASE 4]** Parent route shape: story.md says `/parent/children/:id/conduct` (dynamic segment), plan uses `/parent/conduct?childId=` (searchParam) for nav simplicity. Confirm with fe-lead/ba-lead.
- **[OPEN QUESTION — CONFIRM BEFORE PHASE 3]** Does `components/ui/` have a date-range picker or only single-date `calendar`? Check before implementing `LeaveRequestForm`.

---

## 2. Phased Breakdown

### Phase 1 — Domain extensions (TDD first)

**Goal:** Add two new failure types; extend `IDisciplineRepository` with four student-scoped method signatures; add `SubmitLeaveRequestInput`; implement four use-cases with unit tests written RED first.

**Files (all `src/features/discipline/domain/`):**

| File | Action |
|---|---|
| `domain/failures/discipline.failure.ts` | Add `{ type: "invalid-date" }` and `{ type: "reason-too-short" }` |
| `domain/entities/leave-request.entity.ts` | Export `SubmitLeaveRequestInput` interface |
| `domain/repositories/i-discipline.repository.ts` | Add four student-scoped method signatures |
| `domain/use-cases/submit-leave-request.use-case.test.ts` | **Write RED first** |
| `domain/use-cases/submit-leave-request.use-case.ts` | Implement to make test green |
| `domain/use-cases/get-my-conduct-summary.use-case.test.ts` | **Write RED first** |
| `domain/use-cases/get-my-conduct-summary.use-case.ts` | Implement |
| `domain/use-cases/get-my-violations.use-case.ts` | Implement (delegate only; no dedicated test needed — trivial) |
| `domain/use-cases/get-my-leave-requests.use-case.ts` | Implement (delegate only) |

**`SubmitLeaveRequestInput` shape (add to `leave-request.entity.ts`):**
```ts
export interface SubmitLeaveRequestInput {
  studentId: string;        // own id (student) or child id (parent acting on behalf)
  submittedBy: "student" | "parent";
  startDate: string;        // ISO date "YYYY-MM-DD"
  endDate: string;          // ISO date "YYYY-MM-DD"
  type: LeaveType;
  reason: string;
}
```

**New `IDisciplineRepository` method signatures:**
```ts
getMyConductSummary(studentId: string, semester?: string): Promise<ConductSummaryEntity>;
getMyViolations(studentId: string): Promise<ViolationEntity[]>;
getMyLeaveRequests(studentId: string): Promise<LeaveRequestEntity[]>;
submitLeaveRequest(input: SubmitLeaveRequestInput): Promise<LeaveRequestEntity>;
```

**Test first — `submit-leave-request.use-case.test.ts`:**
- Mock `IDisciplineRepository` via a minimal in-memory stub implementing the interface.
- `it("throws reason-too-short when reason.length < 10")` — assert thrown failure type.
- `it("throws invalid-date when startDate is before today")` — inject fixed clock via `Date` override or pass `today` as injectable param.
- `it("accepts today as a valid startDate")` — should not throw.
- `it("delegates to repo.submitLeaveRequest on valid input and returns entity")`.

**Test first — `get-my-conduct-summary.use-case.test.ts`:**
- `it("calls repo.getMyConductSummary with studentId and semester")`.
- `it("passes undefined semester when omitted")`.

**Validation rule for `SubmitLeaveRequestUseCase`:**
1. `reason.trim().length < 10` → throw `{ type: "reason-too-short" }`.
2. `startDate < todayISO()` → throw `{ type: "invalid-date" }`.
3. Delegate to `repo.submitLeaveRequest(input)`.

Clock injection: accept `today?: string` param in `execute(input, today?)` so tests are deterministic. Default to `new Date().toISOString().slice(0, 10)`.

**Done when:** unit tests red → green → refactor; `tsc --noEmit` clean on domain layer; existing E09.1 tests unchanged and green.

---

### Phase 2 — Infrastructure extension

**Goal:** Extend endpoint constants, real HTTP repository, mock repository, fixtures, and integration test coverage for the four student-scoped methods.

**Files:**

| File | Action |
|---|---|
| `bootstrap/endpoint/discipline.endpoint.ts` | Add four student endpoint constants |
| `infrastructure/repositories/discipline.repository.ts` | Implement four new interface methods; extend `toFailure` |
| `infrastructure/repositories/mocks/discipline.mock.repository.ts` | Implement four new methods |
| `infrastructure/repositories/mocks/fixtures.ts` | Add student-specific fixture records for `stu-001` |
| `infrastructure/repositories/discipline.repository.test.ts` | Extend with three new integration test cases |

**Endpoint additions:**
```ts
myConduct: "/core/api/v1/discipline/my-conduct",
myViolations: "/core/api/v1/discipline/my-violations",
myLeaveRequests: "/core/api/v1/discipline/my-leave-requests",
submitLeaveRequest: "/core/api/v1/discipline/leave-requests",
```
Note: `submitLeaveRequest` reuses the same path as teacher `leaveRequests` but is a POST from the student; the distinction is in the endpoint constant name (student's DI factory calls this, teacher's DI factory calls `leaveRequests` for GET).

**`toFailure` extension:** add branch `code === "INVALID_DATE" || code === "PAST_DATE"` → `{ type: "invalid-date" }`.

**Fixture additions (`fixtures.ts`):** add exports:
- `MOCK_STUDENT_CONDUCT`: one `ConductSummaryEntity` for `studentId: "stu-001"`, `grade: "good"`, `points: 78`.
- Two `ViolationEntity` records for `studentId: "stu-001"` in existing `MOCK_VIOLATIONS` (or separate `MOCK_MY_VIOLATIONS`).
- Two `LeaveRequestEntity` records for `studentId: "stu-001"` in existing `MOCK_LEAVE_REQUESTS` (or separate): one `status: "pending"`, one `status: "rejected"` with `rejectionReason` populated.

**Mock repo implementation pattern:**
```ts
async getMyConductSummary(studentId: string, semester?: string): Promise<ConductSummaryEntity> {
  await mockDelay();
  const found = _conduct.find(c => c.studentId === studentId && (!semester || c.semester === semester));
  if (!found) fail("missing-student");
  return structuredClone(found);
}

async submitLeaveRequest(input: SubmitLeaveRequestInput): Promise<LeaveRequestEntity> {
  await mockDelay();
  const entity: LeaveRequestEntity = {
    id: genId("lr"),
    studentId: input.studentId,
    // ... map from input; status: "pending"; submittedAt: new Date().toISOString()
  };
  _leave = [entity, ..._leave];
  return structuredClone(entity);
}
```

**Test first (extend `discipline.repository.test.ts`):**
- Use `axios-mock-adapter` (already used in E09.1). Wrap response in standard envelope.
- `it("getMyConductSummary fetches from myConduct endpoint and maps to entity")`.
- `it("getMyViolations fetches from myViolations endpoint and filters by studentId in params")`.
- `it("submitLeaveRequest POSTs to submitLeaveRequest endpoint and maps response")`.

**Done when:** integration tests green; `tsc` clean; `USE_MOCK=true` exercises the mock path (confirmed by running `bun vitest run`).

---

### Phase 3 — Bootstrap wiring (DI factories)

**Goal:** Add four DI factories to `discipline.di.ts`; re-export from `bootstrap/di/index.ts`.

**Files:**

| File | Action |
|---|---|
| `bootstrap/di/discipline.di.ts` | Add four factory functions |
| `bootstrap/di/index.ts` | Re-export new factories |

**Factory pattern (consistent with existing):**
```ts
export async function makeGetMyConductSummaryUseCase() {
  return new GetMyConductSummaryUseCase(await makeRepo());
}
export async function makeGetMyViolationsUseCase() {
  return new GetMyViolationsUseCase(await makeRepo());
}
export async function makeGetMyLeaveRequestsUseCase() {
  return new GetMyLeaveRequestsUseCase(await makeRepo());
}
export async function makeSubmitLeaveRequestUseCase() {
  return new SubmitLeaveRequestUseCase(await makeRepo());
}
```

**Done when:** `tsc --noEmit` clean; no test changes needed (DI factories are thin wiring).

---

### Phase 4 — Presentation + i18n + routes

**Goal:** Build `StudentConductScreen` client component, ViewModel, RSC pages for both roles, Server Actions, nav config, and i18n.

**Files:**

| File | Layer | Action |
|---|---|---|
| `features/discipline/presentation/student-conduct-screen/student-conduct-screen.i-vm.ts` | presentation | NEW ViewModel interface |
| `features/discipline/presentation/student-conduct-screen/student-conduct-screen.tsx` | presentation | NEW `'use client'` screen |
| `features/discipline/presentation/student-conduct-screen/conduct-summary-card.tsx` | presentation | NEW sub-component |
| `features/discipline/presentation/student-conduct-screen/my-violations-list.tsx` | presentation | NEW sub-component |
| `features/discipline/presentation/student-conduct-screen/leave-request-form.tsx` | presentation | NEW sub-component (Sheet + form) |
| `features/discipline/presentation/student-conduct-screen/leave-history-list.tsx` | presentation | NEW sub-component |
| `app/[locale]/t/[tenant]/(app)/student/conduct/page.tsx` | app (RSC) | NEW |
| `app/[locale]/t/[tenant]/(app)/student/conduct/actions.ts` | app (server) | NEW |
| `app/[locale]/t/[tenant]/(app)/parent/conduct/page.tsx` | app (RSC) | NEW |
| `app/[locale]/t/[tenant]/(app)/parent/conduct/actions.ts` | app (server) | NEW |
| `components/layout/app-shell/sidebar/nav-config.ts` | layout | Add two nav entries |
| `bootstrap/i18n/messages/vi.json` | i18n | Add keys (see below) |
| `bootstrap/i18n/messages/en.json` | i18n | Mirror keys |

**ViewModel interface:**
```ts
// 'use client' safe — imports domain entities/types only
import type { ConductSummaryEntity } from "../../domain/entities/conduct-summary.entity";
import type { LeaveRequestEntity } from "../../domain/entities/leave-request.entity";
import type { SubmitLeaveRequestInput, ViolationEntity } from "../../domain/entities/violation.entity";
import type { DisciplineFailure } from "../../domain/failures/discipline.failure";

export type StudentDisciplineActionResult = { errorKey?: DisciplineFailure["type"] };

export interface StudentConductScreenVM {
  viewerRole: "student" | "parent";
  childName?: string;   // parent only
  childClass?: string;  // parent only
  conductSummary: ConductSummaryEntity | null;
  violations: ViolationEntity[];
  leaveRequests: LeaveRequestEntity[];
  submitLeaveRequestAction: (input: SubmitLeaveRequestInput) => Promise<StudentDisciplineActionResult>;
  isLoading?: boolean;
  loadErrorKey?: DisciplineFailure["type"];
  onRetry?: () => void;
}
```

**Component UI structure:**
```
StudentConductScreen ('use client')
├── [parent only] ChildInfoHeader — avatar initial, childName (font-semibold), childClass (text-muted text-sm)
├── ConductSummaryCard (white card, shadow-card, rounded-xl, p-5)
│   ├── Points — text-[26px] font-extrabold text-primary (stat-value role)
│   ├── Grade badge — ConductGrade → tone (excellent=success, good=primary, average=warning, poor=error)
│   │     badge: bg-{tone}/15 text-{tone}, px-2.5 py-0.5, rounded-full, text-[11px] font-semibold
│   ├── Violation count — chip with count + icon
│   └── Unexcused absences count — chip
├── MyViolationsList (section, mt-6)
│   ├── Empty state: icon + "Chưa có vi phạm nào" (text-muted, text-sm, text-center, py-8)
│   └── ViolationRow per item: date | type badge | severity badge | description text-sm
├── Separator + LeaveRequest section header + "Gửi đơn xin nghỉ" Button
│   └── Triggers LeaveRequestSheet (Sheet from components/ui/sheet)
│       ├── DateRangePicker: startDate + endDate (disable dates before today)
│       ├── Select: leaveType (medical/personal/event/other)
│       ├── Textarea: reason (min 10 chars; show char count; aria-describedby for error)
│       ├── Error alert when submitErrorKey is set (text, not just color — AC-9)
│       └── Submit Button (loading state "Đang gửi..." when pending)
└── LeaveHistoryList
    ├── Empty state: "Chưa có đơn xin nghỉ nào" (py-8, text-center)
    └── LeaveRequestRow: status badge | date range | type | reason text
        └── [rejected only] rejectionReason in text-sm text-muted with label
```

**Design system token usage:**
- Grade badge: matches `StatusBadge` `/15` bg pattern (US-E07.4 canonical).
  - excellent → `bg-edu-success/15 text-edu-success`
  - good → `bg-primary/15 text-primary`
  - average → `bg-edu-warning/15 text-edu-warning-foreground` (a11y — not white on yellow)
  - poor → `bg-edu-error/15 text-edu-error`
- Leave status badge: pending=warning, approved=success, rejected=error (same tones as existing `leave.status` in E09.1).
- `ConductSummaryCard`: `bg-card rounded-xl shadow-card p-5`.
- Points: `text-[26px] font-extrabold text-primary`.
- All sub-components: feature-local only; single screen → no promotion to `components/shared/` unless second screen needs them.

**RSC page (`student/conduct/page.tsx`):**
```ts
// Parallel fetch; soft-fail to error state
const studentId = /* extract from session — see OPEN QUESTION */;
const semester = (await searchParams).semester ?? "HK1";

let conductSummary: ConductSummaryEntity | null = null;
let violations: ViolationEntity[] = [];
let leaveRequests: LeaveRequestEntity[] = [];
let loadErrorKey: DisciplineFailure["type"] | undefined;

try {
  [conductSummary, violations, leaveRequests] = await Promise.all([
    (await makeGetMyConductSummaryUseCase()).execute(studentId, semester),
    (await makeGetMyViolationsUseCase()).execute(studentId),
    (await makeGetMyLeaveRequestsUseCase()).execute(studentId),
  ]);
} catch (err) {
  loadErrorKey = (err as DisciplineFailure).type ?? "network-error";
}

return (
  <StudentConductScreen
    viewerRole="student"
    conductSummary={conductSummary}
    violations={violations}
    leaveRequests={leaveRequests}
    submitLeaveRequestAction={submitLeaveRequestAction}
    loadErrorKey={loadErrorKey}
  />
);
```

Until session extraction is clarified: use `"stu-001"` hardcoded (mock mode only) to unblock UI development.

**Parent page (`parent/conduct/page.tsx`):**
- Reads `?childId=` searchParam (fallback `"stu-001"` in mock mode).
- Passes `viewerRole: "parent"`, `childName`, `childClass` from fetched `conductSummary`.

**Server Action (`actions.ts`):**
```ts
'use server'
export async function submitLeaveRequestAction(
  input: SubmitLeaveRequestInput,
): Promise<StudentDisciplineActionResult> {
  try {
    await (await makeSubmitLeaveRequestUseCase()).execute(input);
    return {};
  } catch (err) {
    const f = err as DisciplineFailure;
    return { errorKey: f.type ?? "network-error" };
  }
}
```

**Nav additions (`nav-config.ts`):**
```ts
// student array — insert before "messages":
{ href: "/student/conduct", labelKey: "conduct", icon: Scale }

// parent array — insert before "messages":
{ href: "/parent/conduct", labelKey: "conduct", icon: Scale }
```
`Scale` is already imported (used by teacher/principal). `"conduct"` key must be added to `shell.nav` messages before this compiles.

**i18n additions:**

Add to `shell.nav` in both `vi.json` and `en.json`:
```json
"conduct": "Hành kiểm"   // vi
"conduct": "Conduct"      // en
```

Add under `discipline` namespace (both files):
```jsonc
"studentConduct": {
  "title": "Hành kiểm của tôi",
  "subtitle": "Xem điểm hạnh kiểm và gửi đơn xin nghỉ",
  "parentTitle": "Hành kiểm học sinh",
  "parentSubtitle": "Xem hành kiểm và gửi đơn nghỉ thay con",
  "conductCard": {
    "points": "Điểm hành kiểm",
    "grade": "Xếp loại",
    "violations": "Vi phạm",
    "absences": "Nghỉ không phép"
  },
  "myViolations": {
    "title": "Lịch sử vi phạm",
    "empty": "Chưa có vi phạm nào"
  },
  "leaveRequest": {
    "title": "Gửi đơn xin nghỉ",
    "button": "Xin nghỉ phép",
    "startDate": "Ngày bắt đầu *",
    "endDate": "Ngày kết thúc *",
    "type": "Loại nghỉ *",
    "reason": "Lý do *",
    "reasonPlaceholder": "Nhập lý do nghỉ phép (tối thiểu 10 ký tự)...",
    "submit": "Gửi đơn",
    "submitting": "Đang gửi...",
    "success": "Đã gửi đơn thành công!"
  },
  "leaveHistory": {
    "title": "Lịch sử đơn xin nghỉ",
    "empty": "Chưa có đơn xin nghỉ nào",
    "rejectionReason": "Lý do từ chối:"
  }
}
```

Extend `discipline.errors` (already exists for E09.1):
```json
"invalid-date": "Ngày nghỉ phải từ hôm nay trở đi",
"reason-too-short": "Lý do phải có ít nhất 10 ký tự"
```

Note: `discipline.leave.type.*` keys already exist for leave type labels; reuse them in the form select.

**Done when:** pages render in browser (mock mode); nav links appear for student and parent; `tsc --noEmit` clean; `bun build` clean.

---

### Phase 5 — Storybook + design-review gate

**Goal:** Stories for all AC states; `/impeccable audit` pass; design-review gate signed off.

**Files:**

| File | Action |
|---|---|
| `features/discipline/presentation/student-conduct-screen/student-conduct-screen.stories.tsx` | NEW |

**Required stories:**

| Story name | Args / interaction | AC validated |
|---|---|---|
| `Loading` | `isLoading: true`, conductSummary null, violations/leaveRequests empty | AC-1 |
| `StudentWithViolations` | Full student view; violations present; grade "good" | AC-2, AC-3 |
| `StudentEmptyViolations` | violations `[]` | AC-7 |
| `StudentLeaveFormOpen` | Sheet open (manual play fn: click "Xin nghỉ phép" button) | AC-4 |
| `StudentLeaveFormSubmitting` | Play fn: fill form fields + click submit; assert loading state | AC-4 |
| `StudentLeaveHistoryWithRejection` | leaveRequests includes one rejected with rejectionReason set | AC-5 |
| `StudentEmptyLeaveHistory` | leaveRequests `[]` | AC-7 |
| `ParentView` | `viewerRole: "parent"`, childName + childClass set | AC-6 |
| `ErrorState` | `loadErrorKey: "network-error"`, onRetry mock fn | AC-8 |

Use fixture data from `infrastructure/repositories/mocks/fixtures.ts` in story args (import allowed in `*.stories.tsx`).

**A11y checks for design-review:**
- Form inputs have associated `<label>` (via `htmlFor` / Radix label) — AC-9.
- Status not communicated only by color: grade badge and status badge have text label — AC-9.
- `aria-invalid` + `aria-describedby` on reason textarea when error present.
- Touch targets ≥ 44×44px for submit button and sheet trigger.
- `@media (prefers-reduced-motion: reduce)` on Sheet animation (shadcn does this by default via Radix; verify).

**Done when:** all stories render without console errors; `/impeccable audit` returns no contrast or focus blockers; `fe-qa-playwright` can run Storybook interaction tests on LeaveFormSubmitting and StudentWithViolations stories.

---

## 3. Component + State Sketch

### State classification

| State | Type | Owner |
|---|---|---|
| conductSummary, violations, leaveRequests | Server state (RSC fetch, passed as VM props) | RSC page |
| Sheet open/closed | Local UI (`useState`) | `StudentConductScreen` |
| Form fields (startDate, endDate, type, reason) | Local form state (`useState` per field, or `useReducer`) | `LeaveRequestForm` |
| Submit pending + submit errorKey | Local async state (`useState`) | `LeaveRequestForm` |
| semester | URL searchParam (`?semester=`) | RSC page reads; no client state needed |

No TanStack Query — data loaded at RSC level. On successful submit: optimistic-append new entity to local `leaveRequests` state copy, then `router.refresh()` in background to revalidate server state.

### Sub-component placement

All five sub-components are single-screen (student conduct only). Place in `features/discipline/presentation/student-conduct-screen/`. Do not promote to `components/shared/` unless a second screen requires the same component.

`fe-component-architect` not required — no novel design-system primitives beyond existing shadcn `Sheet`, `Select`, `Textarea`, `Button`, `Badge` (already in `components/ui/`). DateRangePicker: if `components/ui/calendar/` exists, compose a thin feature-local `DateRangePicker` wrapper; if not, `bun ui:add calendar` first.

`fe-state-engineer` not required — no TanStack Query, no global store, no complex invalidation chain.

---

## 4. Risks, Dependencies, Open Questions

### Risks

1. **`studentId` session extraction** — no current example in the repo of reading a student/parent identity from the session server-side. Teacher pages use `classId` from their profile, not from the JWT directly. Mitigated: mock mode uses `"stu-001"` hardcoded; UI dev unblocked. Must be resolved before student/parent auth flows are production-ready. Flag to fe-lead.

2. **DateRangePicker component** — E09.1 did not need date range selection. Must verify `components/ui/calendar/` or `date-picker/` exists before Phase 4. If absent: `bun ui:add calendar` + compose `DateRangePicker` wrapper in the feature's presentation folder (single-screen; promote on second use per component-organization rule).

3. **Parent route shape conflict** — story.md specifies `/parent/children/:id/conduct` (dynamic route segment); this plan uses `/parent/conduct?childId=` (searchParam) to keep nav-config simple (nav items cannot have dynamic segments). The searchParam approach means parent must navigate to this screen from the children list or a dashboard link. Confirm with fe-lead/ba-lead before Phase 4.

4. **`shell.nav` "conduct" key TypeScript gate** — `NavLabelKey` is derived from `vi.json["shell"]["nav"]`; adding the nav items to `nav-config.ts` will fail `tsc` until the key is present in both message files. Must be done atomically in the same commit as the nav-config edit.

5. **Fixture student records** — existing `MOCK_VIOLATIONS` and `MOCK_LEAVE_REQUESTS` may not include records for `studentId: "stu-001"`. The mock repo's `getMyViolations`/`getMyLeaveRequests` will return empty arrays unless fixtures are extended. Ensure at least two violations and two leave requests (one rejected) exist for `stu-001` in fixtures before Phase 4 Storybook work.

### Dependencies

| Dependency | Status |
|---|---|
| US-E09.1 | Implemented, merged to main |
| `IDisciplineRepository` base (entities, mapper, mock infra) | Exists — extend only |
| `bootstrap/lib/mock.ts` + `USE_MOCK` flag | Exists |
| `components/ui/sheet/` | Assumed present (shadcn); verify |
| `components/ui/calendar/` | Unknown — check before Phase 4 |
| `components/ui/select/`, `textarea/`, `button/`, `badge/` | Used in E09.1; present |
| BE `core` discipline service | Not shipped → mock-first throughout (decision `0014`) |

### ADR to raise

Flag to fe-lead for ADR-0040: formalise adding `"conduct"` to the `NavLabelKey` union (typed `shell.nav` schema). Small change but crosses the i18n type boundary; consistent with how other nav keys were added.

### Open questions

1. **How is `studentId` read server-side?** If JWT `sub` = studentId, existing `auth_token` cookie + `ensureFreshSession` flow may already expose it. If not, a new session claim or `/users/me` response field is needed. Determine before Phase 4.

2. **Parent route: dynamic segment vs searchParam?** `/parent/children/[childId]/conduct` (cleaner URL, better for direct links) vs `/parent/conduct?childId=` (simpler nav-config). Confirm with fe-lead. If dynamic segment: add `src/app/[locale]/t/[tenant]/(app)/parent/children/[childId]/conduct/` instead.

3. **DateRangePicker presence?** Run `ls src/components/ui/` to confirm before Phase 4.

4. **Multi-child parent UX:** Does parent with multiple children see a child-selector on this screen, or do they navigate from the children list page? In this plan: child context comes from searchParam; no inline selector. Confirm is sufficient.

---

## 5. Dependencies Map (what to touch vs what not to touch)

| Touch | Do NOT touch |
|---|---|
| `domain/failures/discipline.failure.ts` — add 2 types | Teacher/Principal use-cases |
| `domain/entities/leave-request.entity.ts` — add input type | E09.1 entities (read-only) |
| `domain/repositories/i-discipline.repository.ts` — add 4 methods | E09.1 repository methods |
| `domain/use-cases/` — 4 new files | E09.1 use-case files |
| `infrastructure/repositories/discipline.repository.ts` — extend | Real repo existing methods |
| `infrastructure/repositories/mocks/discipline.mock.repository.ts` — extend | Mock repo existing methods |
| `infrastructure/repositories/mocks/fixtures.ts` — add student records | Existing fixture records (read-only) |
| `infrastructure/repositories/discipline.repository.test.ts` — add cases | Existing test cases |
| `bootstrap/endpoint/discipline.endpoint.ts` — add 4 constants | Existing constants |
| `bootstrap/di/discipline.di.ts` — add 4 factories | Existing factories |
| `bootstrap/di/index.ts` — re-export | — |
| `presentation/student-conduct-screen/` — all new | `presentation/discipline-screen/` (E09.1) |
| `app/.../student/conduct/` — new route | Existing teacher/principal routes |
| `app/.../parent/conduct/` — new route | — |
| `nav-config.ts` — add 2 entries to student + parent | Existing nav entries |
| `messages/{vi,en}.json` — extend `discipline` namespace + `shell.nav` | Existing message keys |
