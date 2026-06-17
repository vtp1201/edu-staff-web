# Implementation Plan — US-E09.1 Discipline Screen (Teacher / Principal)

## 1. Summary

**Feature:** Màn hình kỷ luật học sinh — 3 tab: Vi phạm, Hạnh kiểm, Nghỉ phép.  
**Lane:** normal  
**Screens touched:** `/teacher/discipline`, `/principal/discipline`  
**Design source:** `design_src/edu/discipline.jsx` — `DisciplineScreen`, `ViolationsTab`, `ConductTab`, `LeaveManagementTab`  
**Done when:** AC-1→AC-11 pass; design-review gate green; bun build + tsc clean.

**Key decisions (flag to fe-lead for ADR):**

- **D-1 (ADR needed — ≥0040):** `high` severity màu `#B91C1C` không có trong `tokens.css`. Cần thêm token `--edu-destructive-conduct` hoặc map sang `--destructive`. Không dùng raw hex trực tiếp.
- **D-2 (ADR needed — ≥0041):** Nav label key `discipline` chưa có trong `shell.nav`. Cần thêm vào `vi.json`/`en.json` + `nav-config.ts` trước Phase 4. Xác nhận với fe-lead xem có cần ADR riêng hay gộp vào implementation decision.
- **D-3:** `noti` service mock-first (notification to parent khi record violation). Gọi qua use-case riêng; không leak infra noti vào discipline domain.
- **D-4:** ViolationForm dùng **inline expanded panel** (như trong design) thay vì Sheet — design không dùng bottom-sheet mặc dù story mô tả "bottom-sheet". Giữ đúng design file. Nếu fe-lead muốn Sheet, cần confirm trước Phase 3.

---

## 2. Phased Breakdown

### Phase 1 — Domain (TDD red-first)

**Goal:** Pure TypeScript domain; tất cả rule business viết thành unit test xanh trước khi có infra.

**Files:**

```
src/features/discipline/domain/
  entities/
    violation.entity.ts         # ViolationEntity
    conduct-summary.entity.ts   # ConductSummaryEntity
    leave-request.entity.ts     # LeaveRequestEntity
    violation-type.entity.ts    # ViolationTypeEnum + SeverityEnum (low/medium/high)
  failures/
    discipline.failure.ts       # DisciplineFailure union
  repositories/
    i-discipline.repository.ts  # IDisciplineRepository interface
  use-cases/
    calculate-conduct-points.use-case.ts        + .test.ts
    record-violation.use-case.ts                + .test.ts
    approve-leave.use-case.ts                   + .test.ts
    reject-leave.use-case.ts                    + .test.ts
    override-conduct-grade.use-case.ts          + .test.ts
    get-violations.use-case.ts                  (no complex logic, no test needed)
    get-conduct-summary.use-case.ts             (no complex logic, no test needed)
    get-leave-requests.use-case.ts              (no complex logic, no test needed)
```

**Entities shape:**

```ts
// violation.entity.ts
export type ViolationSeverity = "low" | "medium" | "high";
export type ViolationStatus = "recorded" | "notified" | "parent_notified";
export type ViolationTypeId =
  | "late" | "uniform" | "phone" | "fight"
  | "skip" | "cheat" | "disrespect" | "noise" | "other";

export interface ViolationEntity {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  typeId: ViolationTypeId;
  severity: ViolationSeverity;
  date: string;        // ISO yyyy-MM-dd
  period: number | null;
  description: string;
  handledBy: string;
  status: ViolationStatus;
  notifyParent: boolean;
}

// conduct-summary.entity.ts
export type ConductGrade = "excellent" | "good" | "average" | "poor";
export interface ConductSummaryEntity {
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  semester: "HK1" | "HK2";
  violationCount: number;
  unexcusedAbsences: number;
  computedPoints: number;     // 100 - sum(severity points)
  conductGrade: ConductGrade; // derived or overridden
  isOverridden: boolean;
  overrideNote: string | null;
}

// leave-request.entity.ts
export type LeaveStatus = "pending" | "approved" | "rejected";
export type LeaveType = "medical" | "personal" | "event" | "other";
export type SubmittedBy = "student" | "parent";
export interface LeaveRequestEntity {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  submittedBy: SubmittedBy;
  submitterName: string;
  reason: string;
  startDate: string;  // ISO
  endDate: string;    // ISO
  days: number;
  type: LeaveType;
  status: LeaveStatus;
  approvedBy: string | null;
  rejectedBy: string | null;
  rejectReason: string | null;
  submittedAt: string; // ISO
}
```

**DisciplineFailure:**

```ts
export type DisciplineFailure =
  | { type: "student-not-found" }
  | { type: "violation-not-found" }
  | { type: "leave-request-not-found" }
  | { type: "reject-reason-required" }
  | { type: "unauthorized" }
  | { type: "network-error" }
  | { type: "unknown"; message?: string };
```

**Domain rules (baked into use-cases):**

```
SEVERITY_POINTS = { low: -1, medium: -3, high: -5 }
CONDUCT_BANDS: excellent >= 90, good >= 70, average >= 50, poor < 50
conductGrade(points) = thresholds above
computedPoints = max(0, 100 + sum(violations.map(v => SEVERITY_POINTS[v.severity])))
```

**Test first (red before green):**

```ts
// calculate-conduct-points.use-case.test.ts
describe("CalculateConductPointsUseCase", () => {
  it("baseline 100 with no violations → excellent 100")
  it("1 low violation → 99 (good? no, still excellent)")
  it("2 medium + 1 high violations → 100-3-3-5 = 89 → good")
  it("5 high violations → 100-25 = 75 → good")
  it("mixed → poor < 50")
  it("never goes below 0")
  it("derives conductGrade from computed points correctly for all bands")
})

// record-violation.use-case.test.ts
describe("RecordViolationUseCase", () => {
  it("delegates to repo with correct entity")
  it("throws student-not-found when studentId empty")
  it("maps severity low→-1, medium→-3, high→-5 in entity")
  it("sets notifyParent flag from input")
})

// approve-leave.use-case.test.ts
describe("ApproveLeaveUseCase", () => {
  it("delegates to repo with correct leaveRequestId")
  it("throws leave-request-not-found when id empty")
})

// reject-leave.use-case.test.ts
describe("RejectLeaveUseCase", () => {
  it("delegates to repo with leaveRequestId + reason")
  it("throws reject-reason-required when reason empty or whitespace-only")
  it("throws leave-request-not-found when id empty")
})

// override-conduct-grade.use-case.test.ts
describe("OverrideConductGradeUseCase", () => {
  it("delegates to repo with studentId + newGrade + note")
  it("throws student-not-found when studentId empty")
  it("sets isOverridden = true in call")
})
```

**Done when:** All use-case unit tests (`.test.ts`) green via `bun vitest run`.

---

### Phase 2 — Infrastructure (mock-first)

**Goal:** DTO + mapper + mock repository + real repository stub + endpoint constants + DI factory. `NEXT_PUBLIC_USE_MOCK=true` path fully functional.

**Files:**

```
src/bootstrap/endpoint/
  discipline.endpoint.ts        # DISCIPLINE_EP constants

src/features/discipline/infrastructure/
  dtos/
    violation-response.dto.ts
    conduct-response.dto.ts
    leave-request-response.dto.ts
  mappers/
    discipline.mapper.ts        # DTO → Entity for all three types
  repositories/
    discipline.repository.ts    # implements IDisciplineRepository — 'server-only'
    mocks/
      discipline.mock.repository.ts   # mock data from design fixture
      fixtures.ts                     # VIOLATIONS, CONDUCT_STUDENTS, LEAVE_REQUESTS from design file

src/bootstrap/di/
  discipline.di.ts              # 'server-only'; makeXxxUseCase() factories
```

**Endpoint constants:**

```ts
// bootstrap/endpoint/discipline.endpoint.ts
export const DISCIPLINE_EP = {
  violations: "/core/api/v1/discipline/violations",
  conduct:    "/core/api/v1/discipline/conduct",
  conductOverride: (studentId: string) =>
    `/core/api/v1/discipline/conduct/${studentId}/override`,
  leaveRequests: "/core/api/v1/discipline/leave-requests",
  leaveApprove: (id: string) =>
    `/core/api/v1/discipline/leave-requests/${id}/approve`,
  leaveReject: (id: string) =>
    `/core/api/v1/discipline/leave-requests/${id}/reject`,
} as const;
```

**DTO shapes (camelCase per api-integration rule):**

```ts
// violation-response.dto.ts
export interface ViolationResponseDto {
  id: string; studentId: string; studentName: string;
  classId: string; className: string; typeId: string;
  severity: "low" | "medium" | "high"; date: string; period: number | null;
  description: string; handledBy: string;
  status: "recorded" | "notified" | "parent_notified"; notifyParent: boolean;
}

// conduct-response.dto.ts
export interface ConductResponseDto {
  studentId: string; studentName: string; classId: string; className: string;
  semester: string; violationCount: number; unexcusedAbsences: number;
  computedPoints: number; conductGrade: string;
  isOverridden: boolean; overrideNote: string | null;
}

// leave-request-response.dto.ts
export interface LeaveRequestResponseDto {
  id: string; studentId: string; studentName: string;
  classId: string; className: string; submittedBy: string; submitterName: string;
  reason: string; startDate: string; endDate: string; days: number; type: string;
  status: string; approvedBy: string | null; rejectedBy: string | null;
  rejectReason: string | null; submittedAt: string;
}
```

**DI factory (pattern matches attendance.di.ts):**

```ts
// bootstrap/di/discipline.di.ts — 'server-only'
async function makeRepo(): Promise<IDisciplineRepository> {
  if (USE_MOCK) return new MockDisciplineRepository();
  return new DisciplineRepository(await createServerHttpClient());
}
export async function makeGetViolationsUseCase() { ... }
export async function makeRecordViolationUseCase() { ... }
export async function makeGetConductSummaryUseCase() { ... }
export async function makeOverrideConductGradeUseCase() { ... }
export async function makeGetLeaveRequestsUseCase() { ... }
export async function makeApproveLeaveUseCase() { ... }
export async function makeRejectLeaveUseCase() { ... }
```

**Test first:**

```ts
// discipline.repository.test.ts (integration test against mock)
describe("MockDisciplineRepository", () => {
  it("getViolations returns fixture data filtered by classId")
  it("recordViolation adds entry and returns it")
  it("approveLeave changes status to approved")
  it("rejectLeave requires reason; sets status to rejected + rejectReason")
  it("overrideConductGrade sets isOverridden + overrideNote")
})
```

**Done when:** mock repo integration tests green; `USE_MOCK=true bun dev` renders data without runtime errors.

---

### Phase 3 — Presentation + Storybook

**Goal:** Client components + ViewModel contract. No HTTP calls, no DI imports. Storybook interaction tests cover all required states.

**Files:**

```
src/features/discipline/presentation/
  discipline-screen/
    discipline-screen.i-vm.ts       # ViewModel interface
    discipline-screen.tsx           # 'use client'; 3-tab container
    discipline-screen.stories.tsx
  violations-tab/
    violations-tab.tsx              # tab component; receives vm slice + actions
    violations-tab.stories.tsx
  violation-form/
    violation-form.tsx              # inline expanded panel (react-hook-form + zod); no Sheet
    violation-form.stories.tsx
  conduct-tab/
    conduct-tab.tsx                 # table + override inline edit
    conduct-tab.stories.tsx
  leave-tab/
    leave-tab.tsx                   # list + approve/reject buttons
    leave-tab.stories.tsx
  reject-leave-dialog/
    reject-leave-dialog.tsx         # Dialog (shadcn) — reason textarea, zod min-1-char
    reject-leave-dialog.stories.tsx
  override-confirm-dialog/
    override-confirm-dialog.tsx     # Dialog — confirm grade override
    override-confirm-dialog.stories.tsx
```

**ViewModel interface:**

```ts
// discipline-screen.i-vm.ts
export interface DisciplineScreenVM {
  role: "teacher" | "principal";
  // Violations tab
  violations: ViolationEntity[];
  violationsLoading: boolean;
  violationsError: string | null;
  recordViolationAction: (input: RecordViolationInput) =>
    Promise<{ ok: true } | { ok: false; errorKey: DisciplineFailure["type"] }>;
  // Conduct tab
  conductSummaries: ConductSummaryEntity[];
  conductLoading: boolean;
  conductError: string | null;
  selectedSemester: "HK1" | "HK2";
  overrideConductAction: (studentId: string, grade: ConductGrade, note: string) =>
    Promise<{ ok: true } | { ok: false; errorKey: DisciplineFailure["type"] }>;
  // Leave tab
  leaveRequests: LeaveRequestEntity[];
  leaveLoading: boolean;
  leaveError: string | null;
  approveLeaveAction: (id: string) =>
    Promise<{ ok: true } | { ok: false; errorKey: DisciplineFailure["type"] }>;
  rejectLeaveAction: (id: string, reason: string) =>
    Promise<{ ok: true } | { ok: false; errorKey: DisciplineFailure["type"] }>;
}
```

**Component notes:**

- `DisciplineScreen`: renders Tabs (shadcn primitive) — tab header shows badge counts (pending violations, pending leave). Default tab = `violations`. Receives full VM + passes slices to each tab.
- `ViolationsTab`: 4 StatCards (week count, low count, medium+high count, pending notify). Filter row (class select + severity toggle buttons). Violation list with severity left-bar + avatar + badges. Inline `ViolationForm` panel below filter row (shown/hidden via local state). "Notify Parent" button per row (calls action inline, no server round-trip in mock mode — optimistic).
- `ViolationForm` (inline panel, not Sheet): react-hook-form + zod schema. Fields: studentName (text, required), classId (select from available classes), date (date input), typeId (select auto-sets severity), severity (segmented button override), period (number optional), description (textarea required), notifyParent (checkbox/toggle). Submit disabled while submitting or validation invalid.
- `ConductTab`: 4 summary mini-cards (count per grade). Table: rank / student+avatar / class / violations / unexcused / points+progressbar / conductGrade badge / edit button. Edit mode = inline grade selector (4 buttons). Confirm via `OverrideConfirmDialog`.
- `LeaveTab`: 3 stat cards (pending/approved/rejected counts). Filter tabs (all/pending/approved/rejected). List with status bar, avatar, student+class+type badges, reason, dates+submitter, reject-reason box (red) when rejected. Approve/Reject buttons only on pending rows. Reject triggers `RejectLeaveDialog`.
- **Severity badge token:** low=`warning`, medium=`error`, high=`destructive` (pending ADR D-1 for `high` color — use `destructive` token until ADR resolves).
- **ConductBadge:** excellent=`success`, good=`primary`, average=`warning`, poor=`error`. Reuse `StatusBadge` from `components/shared/status-badge/` — add new variant keys if not yet there; do NOT create a parallel ConductBadge component (per component-organization rule; search first).

**ViolationForm zod schema:**

```ts
const schema = z.object({
  studentName: z.string().min(1, "required"),
  classId: z.string().min(1, "required"),
  date: z.string().min(1, "required"),
  typeId: z.enum(VIOLATION_TYPE_IDS),
  severity: z.enum(["low", "medium", "high"]),
  period: z.number().int().min(1).max(10).nullable(),
  description: z.string().min(1, "required"),
  notifyParent: z.boolean(),
});
```

**Storybook stories (interaction test per story):**

| Story | State |
|---|---|
| `DisciplineScreen/Loading` | All three tabs loading skeleton |
| `DisciplineScreen/ViolationsTab_Populated` | 5 violations, filters, form expand/submit |
| `DisciplineScreen/ViolationsTab_EmptyState` | 0 violations after filter |
| `DisciplineScreen/ConductTab` | 8 students, edit flow |
| `DisciplineScreen/LeaveTab_Mixed` | pending/approved/rejected mix; approve + reject flow |
| `DisciplineScreen/ErrorState` | violations load fails → error banner + retry |

**Test first:** Storybook interaction tests (`play` function) — written in `.stories.tsx` before implementation wires data. Tests: tab switch, form expand, submit button disabled without required fields, dialog open/close, badge variant correctness.

**Done when:** `bun storybook` runs; all story interaction tests pass (no red); design-review gate `/impeccable audit` runs without a11y/contrast blocks.

---

### Phase 4 — Pages + Server Actions + i18n + Nav

**Goal:** Route pages wiring presentation to DI; server actions for mutations; i18n namespace; nav entries for both roles.

**Files:**

```
src/app/[locale]/t/[tenant]/(app)/teacher/discipline/
  page.tsx        # RSC — fetches all 3 data slices, passes VM to DisciplineScreen
  actions.ts      # 'use server' — recordViolation, approveLeave, rejectLeave, overrideConductGrade

src/app/[locale]/t/[tenant]/(app)/principal/discipline/
  page.tsx        # same structure, role="principal"
  actions.ts      # same actions (shared or re-export)

src/bootstrap/i18n/messages/vi.json   # add namespace `discipline`
src/bootstrap/i18n/messages/en.json   # mirror

src/components/layout/app-shell/sidebar/nav-config.ts
  # add { href: "/teacher/discipline", labelKey: "discipline", icon: Scale }
  # add { href: "/principal/discipline", labelKey: "discipline", icon: Scale }
```

**i18n namespace `discipline` — key structure:**

```jsonc
"discipline": {
  "pageTitle": "Hành chính & Kỷ luật",
  "pageSubtitle": "Quản lý vi phạm, hạnh kiểm và nghỉ phép học sinh",
  "tabs": {
    "violations": "Vi phạm",
    "conduct": "Hạnh kiểm",
    "leave": "Nghỉ phép"
  },
  "violations": {
    "stats": { "thisWeek": "Vi phạm tuần này", "minor": "Mức nhẹ", "moderateSerious": "Mức vừa/nặng", "pendingNotify": "Chờ thông báo PH" },
    "list": { "title": "Danh sách vi phạm", "empty": "Không có vi phạm nào!", "notifyParent": "Thông báo PH" },
    "filters": { "allClasses": "Tất cả lớp", "all": "Tất cả", "minor": "Nhẹ", "moderate": "Vừa", "serious": "Nặng" },
    "form": { "title": "Nhập vi phạm mới", "subtitle": "...", "studentName": "Tên học sinh", "class": "Lớp", "date": "Ngày", "type": "Loại vi phạm", "severity": "Mức độ", "description": "Mô tả vi phạm", "notifyParent": "Thông báo phụ huynh", "submit": "Ghi nhận vi phạm", "saving": "Đang lưu...", "cancel": "Huỷ", "success": "Đã ghi nhận vi phạm thành công!" },
    "status": { "recorded": "Đã ghi nhận", "notified": "Đã thông báo PH", "parent_notified": "PH đã xác nhận" }
  },
  "severity": { "low": "Nhẹ", "medium": "Vừa", "high": "Nặng" },
  "violationTypes": { "late": "Đi học muộn", "uniform": "Không đúng đồng phục", "phone": "Sử dụng điện thoại", "fight": "Gây gổ đánh nhau", "skip": "Trốn học", "cheat": "Gian lận kiểm tra", "disrespect": "Vô lễ với giáo viên", "noise": "Làm ồn trong lớp", "other": "Khác" },
  "conduct": {
    "tableTitle": "Bảng xếp loại hạnh kiểm",
    "cols": { "student": "Học sinh", "class": "Lớp", "violations": "Vi phạm", "unexcused": "Nghỉ không phép", "points": "Điểm HK", "grade": "Hạnh kiểm" },
    "grades": { "excellent": "Tốt", "good": "Khá", "average": "Trung bình", "poor": "Yếu" },
    "override": { "edit": "Sửa", "cancel": "Huỷ", "saved": "Đã lưu", "confirmTitle": "Xác nhận thay đổi hạnh kiểm", "noteLabel": "Ghi chú lý do override" },
    "export": "Xuất Excel"
  },
  "leave": {
    "stats": { "pending": "Chờ duyệt", "approved": "Đã duyệt", "rejected": "Từ chối" },
    "listTitle": "Đơn xin nghỉ phép",
    "empty": "Không có đơn nào!",
    "reason": "Lý do:",
    "rejectReason": "Lý do từ chối:",
    "approve": "Duyệt",
    "reject": "Từ chối",
    "rejectDialog": { "title": "Từ chối đơn nghỉ phép", "subtitle": "Vui lòng nhập lý do từ chối.", "placeholder": "Lý do từ chối...", "confirm": "Xác nhận từ chối", "cancel": "Huỷ" },
    "types": { "medical": "Nghỉ bệnh / khám", "personal": "Việc cá nhân / gia đình", "event": "Tham gia sự kiện", "other": "Lý do khác" }
  },
  "errors": {
    "student-not-found": "Không tìm thấy học sinh.",
    "leave-request-not-found": "Không tìm thấy đơn nghỉ phép.",
    "reject-reason-required": "Vui lòng nhập lý do từ chối.",
    "unauthorized": "Bạn không có quyền thực hiện thao tác này.",
    "network-error": "Lỗi kết nối. Vui lòng thử lại.",
    "unknown": "Đã xảy ra lỗi. Vui lòng thử lại."
  }
}
```

Also add `"discipline": "Kỷ luật"` to `shell.nav` namespace (vi + en).

**Page pattern (matches `teacher/attendance/page.tsx`):**

```ts
// teacher/discipline/page.tsx — RSC
export default async function DisciplinePage() {
  const [violations, conductSummaries, leaveRequests] = await Promise.all([
    (await makeGetViolationsUseCase()).execute({ classId: undefined, semester: "HK1" }),
    (await makeGetConductSummaryUseCase()).execute({ classId: undefined, semester: "HK1" }),
    (await makeGetLeaveRequestsUseCase()).execute({ classId: undefined }),
  ]);

  return (
    <DisciplineScreen
      role="teacher"
      violations={violations}
      conductSummaries={conductSummaries}
      leaveRequests={leaveRequests}
      recordViolationAction={recordViolationAction}
      approveLeaveAction={approveLeaveAction}
      rejectLeaveAction={rejectLeaveAction}
      overrideConductAction={overrideConductAction}
    />
  );
}
```

**Server actions pattern:**

```ts
// teacher/discipline/actions.ts — 'use server'
export async function recordViolationAction(input: RecordViolationInput) {
  try {
    await (await makeRecordViolationUseCase()).execute(input);
    revalidatePath(".../teacher/discipline", "page");
    return { ok: true };
  } catch (err) {
    return { ok: false, errorKey: (err as DisciplineFailure).type ?? "unknown" };
  }
}
// approveLeaveAction, rejectLeaveAction, overrideConductAction — same pattern
```

**Nav entries** (in `nav-config.ts`):
- `Scale` icon from lucide-react
- teacher: `{ href: "/teacher/discipline", labelKey: "discipline", icon: Scale }`
- principal: `{ href: "/principal/discipline", labelKey: "discipline", icon: Scale }`

**Done when:** `bun dev` — both routes render with mock data; all i18n keys typed (tsc clean); nav shows Discipline entry for teacher + principal roles.

---

### Phase 5 — Review + QA Gate

**Goal:** All gates pass before marking `implemented`.

**Checklist:**

- [ ] `fe-tech-lead-reviewer`: layers correct (no infra import in presentation; no DI in page beyond actions; server-only in infra + di); types strict; tokens-only (no raw color); i18n coverage; RBAC not breaking (teacher sees own class only via use-case filter, principal sees all — enforced at mock repo level).
- [ ] `fe-accessibility-auditor`: severity badge uses icon + label (not just color — AC-10); focus ring on all interactive elements; dialog trap; keyboard nav on tabs; contrast check on `destructive` severity color (pending ADR D-1).
- [ ] `/impeccable audit` — contrast/spacing/typography pass.
- [ ] `fe-qa-playwright` Go/No-Go: Storybook interaction tests all pass; Playwright smoke for teacher route (`/teacher/discipline` loads, tab switches, form submit, dialog open/confirm).
- [ ] `docs/TEST_MATRIX.md` row US-E09.1 → `implemented`.
- [ ] `bun vitest run` + `bun build` green.

---

## 3. Component + State Sketch

**State classification (no Zustand):**

| State | Type | Owner |
|---|---|---|
| violations / conductSummaries / leaveRequests | Server state (fetched in RSC, passed as props) | page.tsx |
| active tab | Local UI | DisciplineScreen |
| showViolationForm | Local UI | ViolationsTab |
| filterSeverity / filterClass | URL or local | ViolationsTab (local OK for mock-first; upgrade to URL param in follow-up) |
| editConductStudentId | Local UI | ConductTab |
| rejectModalLeaveId | Local UI | LeaveTab |
| form state | Local form (react-hook-form) | ViolationForm |
| optimistic updates after actions | revalidatePath (server) + React pending state | actions.ts + useTransition in components |

**Tag needed specialists:**

- `fe-state-engineer` NOT needed — state is straightforward RSC-first + local form.
- `fe-component-architect` light pass on `ViolationsTab` → confirm `ViolationForm` as feature-local (not shared) is correct (only discipline uses it). Confirm StatusBadge variant extension plan for conduct grades.

**Component tree:**

```
DisciplineScreen (client, 'use client')
  PageHeader
  Tabs (shadcn)
    TabsList
      TabsTrigger × 3 (badge on violations + leave)
    TabsContent[violations] → ViolationsTab
      StatCard × 4 (shared)
      ViolationForm (feature-local, collapsible inline)
      ViolationList
        ViolationRow × N
          StatusBadge (shared — severity + status)
    TabsContent[conduct] → ConductTab
      ConductSummaryCard × 4
      ConductTable
        ConductRow × N
          StatusBadge (shared — conduct grade)
          OverrideConfirmDialog (feature-local)
    TabsContent[leave] → LeaveTab
      LeaveStatCard × 3
      LeaveList
        LeaveRow × N
          StatusBadge (shared — leave status)
          RejectLeaveDialog (feature-local)
```

---

## 4. Risks, Dependencies, Open Questions

**Risks:**

- `high` severity color `#B91C1C` from design is not in `tokens.css` → **[OPEN — ADR D-1]** must resolve before Phase 3 completes. Interim: use `destructive` token. If `destructive` contrast fails WCAG AA on white bg, need new token.
- `shell.nav.discipline` key missing → **[OPEN — ADR D-2 or implementation decision]** add to `vi.json`/`en.json` + `nav-config.ts` in Phase 4; tsc will fail until added.
- RBAC filter (teacher sees own class only) is enforced at mock repo level by `classId` filter param. For real BE, must be enforced server-side; web sends `classId` from session — session context is not yet wired in discipline feature. Use teacher's `classId` from IAM session (same as attendance feature pattern).
- Noti service call (notify parent after violation) — **mock-first only**: log + return success in mock; do not block violation recording on noti failure. Implement as best-effort fire-and-forget in real repo.

**Dependencies per story.md:**
- Depends on US-E12.10 (class list) and US-E12.4 (student roster) for real student/class data. Mock fixtures use hardcoded data from design file — not blocked in mock-first mode.

**[OPEN QUESTIONS]:**
1. ViolationForm: design shows inline expanded panel inside the violations list card. Story.md says "bottom-sheet". Which is canonical? Plan follows design file (inline panel). Flag to fe-lead for confirmation.
2. Does teacher discipline page inherit `classId` from session (same as attendance) or from URL param? Attendance uses no URL-based class filtering for the initial load — it uses the teacher's assigned classes. Discipline should do the same; confirm with fe-lead.
3. `overrideConductGrade` — does the override persist only HK grade or also affect `computedPoints`? Design shows override replaces displayed grade but the points bar stays. Confirm: override = `conductGrade` only, `computedPoints` unchanged, `isOverridden = true`.
4. Semester filter in ConductTab (HK1/HK2) — is this a URL param or local state? Plan uses local state for mock-first; upgrade to URL param in follow-up if needed.
