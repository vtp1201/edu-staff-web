# Component Architecture — US-E09.1 Discipline Screen

**Author:** fe-component-architect
**Date:** 2026-06-17
**Story:** US-E09.1 — Discipline Screen (Teacher / Principal)

---

## 1. Architecture Summary

### Feature scope

3-tab screen at `/teacher/discipline` and `/principal/discipline`. Tabs:
1. **Vi phạm (Violations)** — filterable list + stat row + ViolationFormSheet (bottom-sheet)
2. **Hạnh kiểm (Conduct)** — 4-stat summary row + grade table + inline override
3. **Nghỉ phép (Leave)** — 3-stat summary row + filterable request list + approve/RejectLeaveDialog

RBAC: Teacher sees own class only; Principal sees all. Both use the same screen component;
the VM filters the data at the RSC layer before handing it down.

### New vs reused components

| Component | Status | Home |
|---|---|---|
| `DisciplineScreen` | New — container | `features/discipline/presentation/discipline-screen/` |
| `ViolationsTab` | New — presentational | `features/discipline/presentation/discipline-screen/` |
| `ViolationList` | New — presentational | `features/discipline/presentation/discipline-screen/` |
| `ViolationItem` | New — presentational | `features/discipline/presentation/discipline-screen/` |
| `ViolationFormSheet` | New — client (Sheet-based) | `features/discipline/presentation/discipline-screen/` |
| `ViolationFilters` | New — presentational | `features/discipline/presentation/discipline-screen/` |
| `ConductTab` | New — presentational | `features/discipline/presentation/discipline-screen/` |
| `ConductGradeSummaryRow` | New — presentational (4 mini-stat cards) | `features/discipline/presentation/discipline-screen/` |
| `ConductTable` | New — presentational | `features/discipline/presentation/discipline-screen/` |
| `ConductTableRow` | New — presentational | `features/discipline/presentation/discipline-screen/` |
| `ConductBadge` | New — presentational | `features/discipline/presentation/discipline-screen/` |
| `ConductOverrideInline` | New — client (inline edit) | `features/discipline/presentation/discipline-screen/` |
| `LeaveTab` | New — presentational | `features/discipline/presentation/discipline-screen/` |
| `LeaveRequestList` | New — presentational | `features/discipline/presentation/discipline-screen/` |
| `LeaveRequestItem` | New — presentational | `features/discipline/presentation/discipline-screen/` |
| `RejectLeaveDialog` | New — client (Dialog-based) | `features/discipline/presentation/discipline-screen/` |
| `SeverityBar` | New — presentational (left-accent bar) | `features/discipline/presentation/discipline-screen/` |
| `StatCard` | Reuse | `components/shared/stat-card/` |
| `StatusBadge` | Reuse | `components/shared/status-badge/` |
| `Tabs / TabsList / TabsTrigger / TabsContent` | Reuse | `components/ui/tabs/` |
| `Sheet / SheetContent / SheetHeader` | Reuse | `components/ui/sheet/` |
| `Dialog / DialogContent / DialogHeader` | Reuse | `components/ui/dialog/` |
| `Avatar / AvatarFallback` | Reuse | `components/ui/avatar/` |
| `Progress` | Reuse | `components/ui/progress/` |
| `Button` | Reuse | `components/ui/button/` |
| `Badge` | Reuse (via StatusBadge) | `components/ui/badge/` |
| `Form / FormField / FormItem / FormLabel / FormMessage` | Reuse | `components/ui/form/` |
| `Input` | Reuse | `components/ui/input/` |
| `Textarea` | Reuse | `components/ui/textarea/` |
| `Select / SelectItem` | Reuse | `components/ui/select/` |

### Missing shadcn primitives

All required primitives are confirmed present in `components/ui/`. No `bun ui:add` needed.

### Key decisions

1. `ViolationFormSheet` uses `Sheet` (from ui/sheet) rendered as a bottom-sheet. The `open`/`onOpenChange` state is owned by `DisciplineScreen` and passed down as a controlled prop.
2. `RejectLeaveDialog` uses `Dialog` (from ui/dialog). The `open` state + the targeted `leaveRequestId` are owned by `DisciplineScreen` and passed down.
3. `ConductOverrideInline` is an inline state toggle within `ConductTableRow`: it shows either `ConductBadge` (read mode) or a button group (edit mode). The `editingStudentId` state is owned by `ConductTab` (single "which row is editing" selection), passed down as controlled props.
4. `ConductBadge` is discipline-only for now. It maps `ConductGrade` union to `StatusBadge` tone. If a 2nd screen (e.g. student profile) needs the same badge, promote to `components/shared/`. Single use today → stays in feature presentation.
5. `SeverityBar` is a 4px left-accent bar. Discipline-only; stays in feature.
6. `ConductGradeSummaryRow` wraps 4 `StatCard variant="compact"` cards. No new shared component needed; `StatCard` compact variant covers this.
7. Violation stats row (Tab 1) and Leave stats row (Tab 3) both use `StatCard variant="default"`. This is existing shared component reuse — no new pattern.

---

## 2. Component Tree

```
app/[locale]/(dashboard)/teacher/discipline/page.tsx   [RSC — container]
app/[locale]/(dashboard)/principal/discipline/page.tsx [RSC — container]
  │
  │  passes: DisciplineScreenVM + server action refs
  │
  └─ DisciplineScreen                                  ['use client' — top-level coordinator]
       │  owns: activeTab state (UI-only)
       │  owns: sheetOpen: boolean (controlled Sheet)
       │  owns: rejectDialogState: { open: boolean; requestId: string | null }
       │  owns: useTransition for all server actions
       │
       ├─ [page header: h1 + subtitle]                 [presentational inline]
       │
       ├─ Tabs (ui/tabs)                               [presentational, controlled by activeTab]
       │   ├─ TabsList
       │   │   ├─ TabsTrigger "violations"             [with badge count]
       │   │   ├─ TabsTrigger "conduct"
       │   │   └─ TabsTrigger "leave"                  [with pending count badge]
       │   │
       │   ├─ TabsContent "violations"
       │   │   └─ ViolationsTab                        [presentational — receives data + callbacks]
       │   │       ├─ [stats row: 4x StatCard default] [reuse StatCard]
       │   │       ├─ ViolationFilters                 [presentational — emits filter change via onFilterChange]
       │   │       │   ├─ Select (class filter)
       │   │       │   └─ [severity toggle buttons]
       │   │       └─ ViolationList                    [presentational]
       │   │           ├─ [list header + "Ghi nhận vi phạm" Button]
       │   │           ├─ ViolationItem[]               [presentational]
       │   │           │   ├─ SeverityBar               [presentational — 4px left accent]
       │   │           │   ├─ Avatar / AvatarFallback
       │   │           │   ├─ [student name, class Badge, severity StatusBadge]
       │   │           │   ├─ [violation type + description text]
       │   │           │   ├─ [meta: date, period, recorded-by text]
       │   │           │   ├─ StatusBadge (violation status)
       │   │           │   └─ "Thông báo PH" Button     [emits onNotifyParent callback]
       │   │           └─ [empty state]
       │   │
       │   ├─ TabsContent "conduct"
       │   │   └─ ConductTab                           [light client — owns editingStudentId state]
       │   │       ├─ ConductGradeSummaryRow            [presentational — 4x StatCard compact]
       │   │       │   └─ StatCard variant="compact" x4
       │   │       └─ ConductTable                      [presentational]
       │   │           ├─ [table header + class filter Select + export Button]
       │   │           └─ ConductTableRow[]             [presentational + controlled override]
       │   │               ├─ Avatar / AvatarFallback
       │   │               ├─ [name, class Badge]
       │   │               ├─ [violation count (colored text)]
       │   │               ├─ [unexcused absences (colored text)]
       │   │               ├─ [points + Progress bar]
       │   │               ├─ ConductBadge OR ConductOverrideInline [controlled by editingStudentId]
       │   │               │   └─ ConductBadge → StatusBadge (reuse)
       │   │               │   └─ ConductOverrideInline → grade Button group
       │   │               └─ [Edit/Cancel Button]
       │   │
       │   └─ TabsContent "leave"
       │       └─ LeaveTab                             [presentational — receives data + callbacks]
       │           ├─ [stats row: 3x StatCard default]
       │           └─ LeaveRequestList                 [presentational]
       │               ├─ [list header + status filter buttons]
       │               ├─ LeaveRequestItem[]            [presentational]
       │               │   ├─ SeverityBar (colored by status)
       │               │   ├─ Avatar / AvatarFallback
       │               │   ├─ [student name, class Badge, leave-type Badge]
       │               │   ├─ [reason text]
       │               │   ├─ [date range + submitter meta]
       │               │   ├─ [rejection reason banner — conditional]
       │               │   ├─ StatusBadge (leave status)
       │               │   └─ [Approve Button + Reject Button — pending only]
       │               └─ [empty state]
       │
       ├─ ViolationFormSheet                           ['use client' — Sheet-based form]
       │   ├─ Sheet (ui/sheet) controlled by sheetOpen prop
       │   ├─ SheetContent / SheetHeader / SheetTitle
       │   └─ [Form via react-hook-form + zod]
       │       ├─ FormField: student name (Input)
       │       ├─ FormField: class (Select)
       │       ├─ FormField: date (Input type="date")
       │       ├─ FormField: violation type (Select)
       │       ├─ FormField: severity (Toggle button group)
       │       ├─ FormField: description (Textarea)
       │       ├─ FormField: notifyParent (Switch)
       │       └─ [Cancel Button + Submit Button]
       │
       └─ RejectLeaveDialog                           ['use client' — Dialog-based]
           ├─ Dialog (ui/dialog) controlled by open prop
           ├─ DialogContent / DialogHeader / DialogTitle
           └─ [Textarea for reject reason + Cancel + Confirm Reject Buttons]
```

**Annotation key:**
- `[RSC]` = React Server Component; runs on server, never in client bundle
- `['use client']` = client boundary; may use hooks, event handlers
- `[presentational]` = stateless, props-only; no hooks except `useTranslations`
- `[light client]` = client but only for minimal local UI state (edit mode toggle)

---

## 3. ViewModel + Prop Interfaces

### 3.1 Domain entity types (in `features/discipline/domain/entities/`)

```ts
// violation.entity.ts
export type ViolationSeverity = 'low' | 'medium' | 'high';
export type ViolationStatus = 'recorded' | 'notified' | 'parent_confirmed';
export type ViolationType =
  | 'late' | 'uniform' | 'phone' | 'fight' | 'skip'
  | 'cheat' | 'disrespect' | 'noise' | 'other';

export interface Violation {
  id: string;
  studentId: string;
  studentName: string;
  initials: string;           // pre-computed by mapper: e.g. "TB"
  avatarColor: string;        // semantic token class, e.g. "text-edu-teal"
  classId: string;
  className: string;
  type: ViolationType;
  date: string;               // ISO 8601 "YYYY-MM-DD"
  period: number | null;
  description: string;
  severity: ViolationSeverity;
  handledBy: string;
  status: ViolationStatus;
}

// conduct-student.entity.ts
export type ConductGrade = 'excellent' | 'good' | 'average' | 'poor';

export interface ConductStudent {
  studentId: string;
  studentName: string;
  initials: string;
  avatarColor: string;
  classId: string;
  className: string;
  violationCount: number;
  unexcusedAbsences: number;
  conductPoints: number;      // 0-100 computed server-side
  conductGrade: ConductGrade;
  isOverridden: boolean;
  overrideNote: string | null;
  semester: string;           // e.g. "HK1"
}

// leave-request.entity.ts
export type LeaveStatus = 'pending' | 'approved' | 'rejected';
export type LeaveType = 'medical' | 'personal' | 'event' | 'other';

export interface LeaveRequest {
  id: string;
  studentId: string;
  studentName: string;
  initials: string;
  avatarColor: string;
  classId: string;
  className: string;
  submittedBy: 'student' | 'parent';
  submitterName: string;
  reason: string;
  startDate: string;          // "DD/MM/YYYY" (pre-formatted by mapper)
  endDate: string;
  dayCount: number;
  type: LeaveType;
  status: LeaveStatus;
  submittedAt: string;        // pre-formatted by mapper
  approvedBy: string | null;
  rejectedBy: string | null;
  rejectionReason: string | null;
}
```

### 3.2 `discipline-screen.i-vm.ts`

```ts
// src/features/discipline/presentation/discipline-screen/discipline-screen.i-vm.ts
import type { Violation, ViolationSeverity, ViolationType } from '../../domain/entities/violation.entity';
import type { ConductStudent, ConductGrade } from '../../domain/entities/conduct-student.entity';
import type { LeaveRequest } from '../../domain/entities/leave-request.entity';
import type { DisciplineFailure } from '../../domain/failures/discipline.failure';

export type DisciplineActionResult =
  | { ok: true }
  | { ok: false; errorKey: DisciplineFailure['type'] };

/** Violation stats pre-computed by RSC (avoid client-side array filtering). */
export interface ViolationStatsVM {
  thisWeekCount: number;
  minorCount: number;
  moderateSeriousCount: number;
  pendingNotifyCount: number;
}

/** Conduct summary pre-computed by RSC. */
export interface ConductSummaryVM {
  excellentCount: number;
  goodCount: number;
  averageCount: number;
  poorCount: number;
}

/** Leave stats pre-computed by RSC. */
export interface LeaveStatsVM {
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
}

/** Available classes for filter dropdowns (teacher sees own class only; principal sees all). */
export interface ClassOptionVM {
  id: string;
  name: string;   // e.g. "11B2"
}

export interface DisciplineScreenVM {
  /** RBAC flag: principal sees all; teacher sees own class only (already filtered in violations/conduct/leave). */
  isPrincipal: boolean;

  /** Tab: Vi phạm */
  violations: Violation[];
  violationStats: ViolationStatsVM;
  availableClasses: ClassOptionVM[];

  /** Tab: Hạnh kiểm */
  conductStudents: ConductStudent[];
  conductSummary: ConductSummaryVM;
  currentSemester: string;    // e.g. "HK1 2025–2026"

  /** Tab: Nghỉ phép */
  leaveRequests: LeaveRequest[];
  leaveStats: LeaveStatsVM;

  // ── Server action refs ──────────────────────────────────────
  recordViolationAction: (
    values: ViolationFormValues,
  ) => Promise<DisciplineActionResult>;

  notifyParentAction: (
    violationId: string,
  ) => Promise<DisciplineActionResult>;

  overrideConductAction: (
    studentId: string,
    grade: ConductGrade,
    note: string,
  ) => Promise<DisciplineActionResult>;

  approveLeaveAction: (
    requestId: string,
  ) => Promise<DisciplineActionResult>;

  rejectLeaveAction: (
    requestId: string,
    reason: string,
  ) => Promise<DisciplineActionResult>;
}

/** Zod schema outline (engineer fills in zod.object calls): */
export interface ViolationFormValues {
  studentName: string;            // free text — teacher types name (mock-first; later: studentId lookup)
  classId: string;
  date: string;                   // "YYYY-MM-DD"
  type: ViolationType;
  severity: ViolationSeverity;
  period: number | null;          // optional lesson period
  description: string;
  notifyParent: boolean;
}
```

### 3.3 Sub-component prop interfaces

```ts
// ── ViolationsTab ──────────────────────────────────────────────────────────────
interface ViolationsTabProps {
  violations: Violation[];
  violationStats: ViolationStatsVM;
  availableClasses: ClassOptionVM[];
  isPrincipal: boolean;
  /** Controlled filter state — owner: DisciplineScreen */
  filterSeverity: ViolationSeverity | 'all';
  filterClassId: string | 'all';
  onFilterChange: (patch: { severity?: ViolationSeverity | 'all'; classId?: string | 'all' }) => void;
  onOpenViolationForm: () => void;
  onNotifyParent: (violationId: string) => void;
  labels: ViolationsTabLabels;         // injected by DisciplineScreen via useTranslations
}

// ── ViolationFilters ───────────────────────────────────────────────────────────
interface ViolationFiltersProps {
  availableClasses: ClassOptionVM[];
  filterSeverity: ViolationSeverity | 'all';
  filterClassId: string | 'all';
  onFilterChange: ViolationsTabProps['onFilterChange'];
  labels: ViolationFiltersLabels;
}

// ── ViolationList ──────────────────────────────────────────────────────────────
interface ViolationListProps {
  violations: Violation[];           // already filtered by parent
  isPrincipal: boolean;
  onOpenViolationForm: () => void;
  onNotifyParent: (violationId: string) => void;
  labels: ViolationListLabels;
}

// ── ViolationItem ──────────────────────────────────────────────────────────────
interface ViolationItemProps {
  violation: Violation;
  onNotifyParent: (violationId: string) => void;
  /** Pre-resolved labels for severity/status/type (no t() calls in leaf). */
  severityLabel: string;
  statusLabel: string;
  typeLabel: string;
  notifyParentLabel: string;
  periodLabel: string | null;   // "Tiết 3" or null
}

// ── SeverityBar ────────────────────────────────────────────────────────────────
interface SeverityBarProps {
  /** Maps to Tailwind token class: warning/error/destructive */
  tone: 'warning' | 'error' | 'destructive';
}

// ── ViolationFormSheet ─────────────────────────────────────────────────────────
interface ViolationFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableClasses: ClassOptionVM[];
  /** isPending from useTransition in parent */
  isPending: boolean;
  onSubmit: (values: ViolationFormValues) => void;
  labels: ViolationFormSheetLabels;
}

// ── ConductTab ─────────────────────────────────────────────────────────────────
interface ConductTabProps {
  conductStudents: ConductStudent[];
  conductSummary: ConductSummaryVM;
  availableClasses: ClassOptionVM[];
  currentSemester: string;
  /** Controlled override action */
  onOverride: (studentId: string, grade: ConductGrade, note: string) => void;
  isPending: boolean;
  labels: ConductTabLabels;
}

// ── ConductGradeSummaryRow ─────────────────────────────────────────────────────
interface ConductGradeSummaryRowProps {
  summary: ConductSummaryVM;
  labels: {
    excellent: string;
    good: string;
    average: string;
    poor: string;
  };
}
// Uses StatCard variant="compact" with tone: success/primary/warning/error

// ── ConductTable ───────────────────────────────────────────────────────────────
interface ConductTableProps {
  students: ConductStudent[];        // already filtered by parent ConductTab
  editingStudentId: string | null;   // controlled by ConductTab
  onEditToggle: (studentId: string | null) => void;
  onGradeSelect: (studentId: string, grade: ConductGrade) => void;
  isPending: boolean;
  labels: ConductTableLabels;
}

// ── ConductTableRow ────────────────────────────────────────────────────────────
interface ConductTableRowProps {
  student: ConductStudent;
  isEditing: boolean;
  onEditToggle: () => void;
  onGradeSelect: (grade: ConductGrade) => void;
  isPending: boolean;
  savedLabel: string | null;    // "✓ Đã lưu" — set briefly after save; null otherwise
  labels: ConductTableRowLabels;
}

// ── ConductBadge ──────────────────────────────────────────────────────────────
interface ConductBadgeProps {
  grade: ConductGrade;
  label: string;    // pre-translated label injected by parent
}
// Maps grade → StatusBadge tone: excellent=success, good=primary, average=warning, poor=error

// ── ConductOverrideInline ─────────────────────────────────────────────────────
interface ConductOverrideInlineProps {
  currentGrade: ConductGrade;
  onSelect: (grade: ConductGrade) => void;
  gradeLabels: Record<ConductGrade, string>;
}

// ── LeaveTab ──────────────────────────────────────────────────────────────────
interface LeaveTabProps {
  leaveRequests: LeaveRequest[];
  leaveStats: LeaveStatsVM;
  filterStatus: LeaveStatus | 'all';
  onFilterChange: (status: LeaveStatus | 'all') => void;
  onApprove: (requestId: string) => void;
  onOpenRejectDialog: (requestId: string) => void;
  labels: LeaveTabLabels;
}

// ── LeaveRequestList ──────────────────────────────────────────────────────────
interface LeaveRequestListProps {
  requests: LeaveRequest[];          // already filtered
  onApprove: (requestId: string) => void;
  onOpenRejectDialog: (requestId: string) => void;
  labels: LeaveRequestListLabels;
}

// ── LeaveRequestItem ──────────────────────────────────────────────────────────
interface LeaveRequestItemProps {
  request: LeaveRequest;
  onApprove: () => void;
  onOpenRejectDialog: () => void;
  statusLabel: string;
  leaveTypeLabel: string;
  labels: LeaveRequestItemLabels;
}

// ── RejectLeaveDialog ─────────────────────────────────────────────────────────
interface RejectLeaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onConfirm: (reason: string) => void;
  labels: RejectLeaveDialogLabels;
}
```

---

## 4. State Ownership (contract level)

### Controlled props (owner: `DisciplineScreen`)

| State | Type | Passed to |
|---|---|---|
| `activeTab` | `'violations' \| 'conduct' \| 'leave'` | `Tabs` (controlled) |
| `sheetOpen` | `boolean` | `ViolationFormSheet` |
| `rejectDialogState` | `{ open: boolean; requestId: string \| null }` | `RejectLeaveDialog` |
| `filterSeverity` | `ViolationSeverity \| 'all'` | `ViolationsTab` → `ViolationFilters` |
| `filterClassId` | `string \| 'all'` | `ViolationsTab` → `ViolationFilters` |
| `filterLeaveStatus` | `LeaveStatus \| 'all'` | `LeaveTab` |
| `isPending` | `boolean` (from `useTransition`) | All action-bearing sub-components |

**Note:** Client-side filtering of `violations`, `conductStudents`, and `leaveRequests` is done in `DisciplineScreen` by slicing the already-loaded arrays using the filter state. No additional fetch on filter change (mock-first; arrays are small enough). The `fe-state-engineer` should evaluate whether to move filtering server-side via URL search params when BE ships.

### Internal UI state (owner: component itself)

| Component | State | Reason |
|---|---|---|
| `ConductTab` | `editingStudentId: string \| null` | Single-select "which row is in edit mode" — pure UI concern |
| `ConductTab` | `savedStudentId: string \| null` | Transient "just saved" label shown for 2s |
| `ViolationFormSheet` | `form values` (react-hook-form internal) | Form field state — owned by RHF |

### Hand-off note to `fe-state-engineer`

1. **Initial data load:** `DisciplineScreen` receives all data from the RSC page (`violations`, `conductStudents`, `leaveRequests` all pre-fetched server-side). No TanStack Query needed for initial load.
2. **Mutations via Server Actions:** `recordViolationAction`, `overrideConductAction`, `approveLeaveAction`, `rejectLeaveAction`, `notifyParentAction` are all passed as action refs from the RSC. `useTransition` in `DisciplineScreen` wraps these calls; `router.refresh()` after success will trigger the RSC to re-fetch and pass updated data.
3. **Optimistic updates:** `fe-state-engineer` should decide whether to apply optimistic list updates in `DisciplineScreen` state (local array splice) vs. relying solely on `router.refresh()`. The initial mock-first build can use `router.refresh()` only; optimistic updates can be layered later.
4. **URL search params for tab:** Consider encoding `?tab=violations` in the URL so deep-linking and browser back navigation work. `fe-state-engineer` owns this decision (Next.js `useSearchParams` vs internal state).
5. **Mock-first:** `bootstrap/di/discipline.di.ts` will return mock data until BE `core` service ships. The VM contract is frozen by this document.

---

## 5. Composition and Variant Strategy

### Tabs — shadcn controlled pattern

`DisciplineScreen` passes `value={activeTab}` and `onValueChange={setActiveTab}` to `<Tabs>`. Each `TabsTrigger` includes an inline badge count span — this is a content slot within the trigger, not a separate component (no over-abstraction for a single-use pattern). Badge uses `bg-edu-error` tone for pending counts (matches the design file).

### StatCard reuse

- **Violations tab stats row:** 4x `StatCard variant="default"` with tones `error/warning/error/purple`.
- **Conduct summary row:** 4x `StatCard variant="compact"` with tones `success/primary/warning/error`. `ConductGradeSummaryRow` wraps these four in a `grid grid-cols-4` wrapper — no new shared component; it is a thin layout wrapper + 4 card calls.
- **Leave stats row:** 3x `StatCard variant="default"` with tones `warning/success/error`.

### StatusBadge reuse

All badges in this screen use `StatusBadge` from `components/shared/status-badge/` with the appropriate tone:

| Badge context | Tone |
|---|---|
| Violation severity: Nhẹ | `warning` |
| Violation severity: Vừa | `error` |
| Violation severity: Nặng | `error` (destructive color is not a `StatusTone`; use `error` tone + note in design review that high-severity needs bolder treatment — flag to fe-lead for ADR decision) |
| Violation status: recorded | `primary` |
| Violation status: notified / parent_confirmed | `success` |
| Conduct grade: excellent | `success` |
| Conduct grade: good | `primary` |
| Conduct grade: average | `warning` |
| Conduct grade: poor | `error` |
| Leave status: pending | `warning` |
| Leave status: approved | `success` |
| Leave status: rejected | `error` |
| Class chip (student's class) | `primary` |
| Leave type chip | varies: `primary/purple/warning/muted` |

> **Flag to fe-lead:** Design spec uses `#B91C1C` for `severity=high` ("Nặng"). `StatusBadge` does not have a `destructive` tone. Current `error` tone uses `bg-edu-error/15 text-edu-error-text`. If the design review requires a visually distinct "Nặng" treatment, a new `destructive` tone on `StatusBadge` would require an ADR (new token). For now, `error` tone is the fallback.

### ViolationFormSheet — Sheet primitive pattern

`Sheet` is rendered inside `DisciplineScreen` (not inside `ViolationsTab`) to keep the overlay at the top coordinator level. The `open`/`onOpenChange` is owned by `DisciplineScreen`. `ViolationFormSheet` is passed `open`, `onOpenChange`, and an `onSubmit` callback that wraps the server action. The Sheet closes on successful submit; error is shown inline via a form-level error message (not a toast, per design).

### RejectLeaveDialog — Dialog primitive pattern

`Dialog` is rendered in `DisciplineScreen` alongside `ViolationFormSheet`. `rejectDialogState = { open: boolean; requestId: string | null }` — when `open=true`, the confirm callback calls `rejectLeaveAction(requestId, reason)`. After success, `rejectDialogState` resets to `{ open: false, requestId: null }`.

### ConductOverrideInline — toggle pattern (no extra shadcn primitive)

Within `ConductTableRow`, when `isEditing=true`, replace `ConductBadge` with a row of `Button` elements (one per grade). The active grade button is styled with `variant="default"` (or a `cva` conditional class), others with `variant="outline"`. This is a minimal inline toggle — no `ToggleGroup` primitive needed; the grade buttons emit `onGradeSelect(grade)` to the parent `ConductTable` which calls the action.

### SeverityBar — discipline-internal presentational atom

A `div` with fixed `w-1 self-stretch rounded-sm` and a tone-mapped background class. Tone: `bg-edu-warning`, `bg-edu-error`, or a destructive token (see flag above). Used in both `ViolationItem` and `LeaveRequestItem` (two uses within the same feature — stays in feature presentation; does not qualify for promotion to shared because it is discipline-specific visual language).

### cva usage

No `cva` is proposed for this feature. All variant logic (tone → class) is handled by existing `StatCard` and `StatusBadge` shared components which already use `cva` internally. Discipline-specific conditional styling uses `cn()` with ternary conditionals.

---

## 6. Accessibility Contract

### Tabs

- `Tabs` (Radix via shadcn) provides `role="tablist"`, `role="tab"`, `role="tabpanel"` automatically.
- Each `TabsTrigger` contains visible text label + icon. Badge count is wrapped in `<span aria-label="X pending">` to avoid screen readers reading raw numbers without context.
- Keyboard: arrow keys navigate tabs; `Enter`/`Space` activates — Radix handles this.

### ViolationItem

- "Thông báo PH" button: `aria-label={t("discipline.violations.notifyParentLabel", { student: violation.studentName })}` — because the button appears in a list row with student context visible visually but not programmatically linked.
- Severity is conveyed by `SeverityBar` (color) AND `StatusBadge` (text label) — never color alone (AC-10).

### ViolationFormSheet

- Sheet uses `role="dialog"` and `aria-labelledby` pointing to `SheetTitle` — Radix handles.
- Every `Input`/`Select`/`Textarea`/`Switch` has an associated `FormLabel` (rendered by `react-hook-form` `FormItem` pattern which wraps `htmlFor`/`id` linkage).
- `aria-invalid` + `aria-describedby` on fields with validation errors via `FormMessage` (shadcn form pattern).
- Submit button: `aria-disabled` when `isPending=true` (not just `disabled` to keep it focusable for screen readers to announce "saving").

### ConductTable

- `<table>` with `<thead>` / `<tbody>` semantic HTML. Column headers use `<th scope="col">`.
- "Sửa" / "Huỷ" button: `aria-label={t("discipline.conduct.editLabel", { student: student.studentName })}` — because the button is in a row but its accessible name must include student context.
- `ConductOverrideInline` grade buttons: each has `aria-pressed` indicating current grade selection; `aria-label` includes the grade name.

### RejectLeaveDialog

- `Dialog` with `aria-labelledby={DialogTitle id}` and `aria-describedby={DialogDescription id}` — Radix handles.
- Textarea: `aria-required="true"` + `aria-label` for reject reason.
- Confirm Reject button: `variant="destructive"` (Button primitive) — conveyed by both color and label text, not color alone.

### LeaveRequestItem

- Approve button: `aria-label={t("discipline.leave.approveLabel", { student: request.studentName })}`.
- Reject button: `aria-label={t("discipline.leave.rejectLabel", { student: request.studentName })}`.
- Rejection reason banner: `role="alert"` so screen readers announce it when it appears.

### General

- All interactive elements have touch target ≥ 44×44px (Button primitives default to this via design system).
- Focus ring: never suppressed (`outline: none` is not used in any shadcn primitive or design token).
- Motion: `ViolationFormSheet` slide-in animation (Sheet) respects `prefers-reduced-motion` via the Radix animation tokens — no additional work needed.
- `lang` attribute on `<html>` is set by root layout — no per-screen action needed.

---

## Appendix: i18n namespace keys (outline for `discipline` namespace)

```json
{
  "discipline": {
    "title": "Hành chính & Kỷ luật",
    "subtitle": "Quản lý vi phạm, hạnh kiểm và nghỉ phép học sinh",
    "tabs": {
      "violations": "Vi phạm",
      "conduct": "Hạnh kiểm",
      "leave": "Nghỉ phép"
    },
    "violations": {
      "stats": { "thisWeek": "Vi phạm tuần này", "minor": "Mức nhẹ", "moderateSerious": "Mức vừa/nặng", "pendingNotify": "Chờ thông báo PH" },
      "listTitle": "Danh sách vi phạm",
      "addButton": "Ghi nhận vi phạm mới",
      "filterAllClasses": "Tất cả lớp",
      "filterAll": "Tất cả",
      "notifyParentButton": "Thông báo PH",
      "notifyParentLabel": "Thông báo phụ huynh của {student}",
      "empty": { "title": "Không có vi phạm nào!", "subtitle": "" },
      "severity": { "low": "Nhẹ", "medium": "Vừa", "high": "Nặng" },
      "status": { "recorded": "Đã ghi nhận", "notified": "Đã thông báo PH", "parent_confirmed": "PH đã xác nhận" },
      "type": { "late": "Đi học muộn", "uniform": "Không đúng đồng phục", "phone": "Sử dụng điện thoại", "fight": "Gây gổ đánh nhau", "skip": "Trốn học", "cheat": "Gian lận kiểm tra", "disrespect": "Vô lễ với giáo viên", "noise": "Làm ồn trong lớp", "other": "Khác" }
    },
    "form": {
      "title": "Nhập vi phạm mới",
      "subtitle": "Ghi nhận vi phạm của học sinh vào hệ thống",
      "studentName": "Tên học sinh",
      "class": "Lớp",
      "date": "Ngày",
      "violationType": "Loại vi phạm",
      "severity": "Mức độ",
      "description": "Mô tả vi phạm",
      "notifyParent": "Thông báo phụ huynh",
      "cancel": "Huỷ",
      "submit": "Ghi nhận vi phạm",
      "submitting": "Đang lưu..."
    },
    "conduct": {
      "summaryTitle": "Tổng hợp hạnh kiểm",
      "tableTitle": "Bảng xếp loại hạnh kiểm — {semester}",
      "filterAllClasses": "Tất cả lớp",
      "exportButton": "Xuất Excel",
      "columns": { "student": "Học sinh", "class": "Lớp", "violations": "Vi phạm", "unexcused": "Nghỉ không phép", "points": "Điểm HK", "grade": "Hạnh kiểm" },
      "editLabel": "Sửa hạnh kiểm của {student}",
      "editButton": "Sửa",
      "cancelButton": "Huỷ",
      "savedLabel": "Đã lưu",
      "grade": { "excellent": "Tốt", "good": "Khá", "average": "Trung bình", "poor": "Yếu" }
    },
    "leave": {
      "stats": { "pending": "Chờ duyệt", "approved": "Đã duyệt", "rejected": "Từ chối" },
      "listTitle": "Đơn xin nghỉ phép",
      "filterAll": "Tất cả",
      "reason": "Lý do:",
      "rejectionReason": "Lý do từ chối:",
      "approveButton": "Duyệt",
      "approveLabel": "Duyệt đơn nghỉ của {student}",
      "rejectButton": "Từ chối",
      "rejectLabel": "Từ chối đơn nghỉ của {student}",
      "empty": { "title": "Không có đơn nào!" },
      "type": { "medical": "Nghỉ bệnh / khám", "personal": "Việc cá nhân / gia đình", "event": "Tham gia sự kiện", "other": "Lý do khác" },
      "status": { "pending": "Chờ duyệt", "approved": "Đã duyệt", "rejected": "Từ chối" },
      "days_one": "ngày",
      "days_other": "ngày"
    },
    "rejectDialog": {
      "title": "Từ chối đơn nghỉ phép",
      "description": "Vui lòng nhập lý do từ chối để thông báo phụ huynh/học sinh.",
      "reasonPlaceholder": "Lý do từ chối...",
      "cancel": "Huỷ",
      "confirm": "Xác nhận từ chối"
    },
    "errors": {
      "load_failed": "Không thể tải dữ liệu kỷ luật. Vui lòng thử lại.",
      "record_violation_failed": "Ghi nhận vi phạm thất bại.",
      "approve_leave_failed": "Duyệt đơn thất bại.",
      "reject_leave_failed": "Từ chối đơn thất bại.",
      "override_conduct_failed": "Cập nhật hạnh kiểm thất bại."
    }
  }
}
```

---

## Flags to fe-lead

1. **`destructive` StatusBadge tone:** Design uses `#B91C1C` for `severity=high` Nặng violations. Current `StatusBadge` does not have a `destructive` tone variant. If the design review requires it to be visually distinct from `error`, a new token + ADR is needed (next ≥ 0023). For now, architect recommends using `error` tone and flagging at design-review gate.

2. **Student name free-text in ViolationForm:** Mock-first build has the form accept a free-text student name. When BE `core` ships, this field should become a searchable student picker (autocomplete). That will require a new `Combobox` primitive (`bun ui:add combobox`) or `Command` + `Popover` pattern. Flag for US-E09.x follow-up.

3. **Export Excel button (Conduct tab):** In the design file, the "Xuất Excel" button is present. Its server action is not in scope for US-E09.1 (no AC covers it). Render as a Button with `disabled` or `aria-disabled` initially. Follow-up US needed.
