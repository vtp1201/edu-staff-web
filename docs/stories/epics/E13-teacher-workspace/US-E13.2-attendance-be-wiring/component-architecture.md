# US-E13.2 Attendance BE Wiring — Component Architecture

Owner: `fe-component-architect`. Implements ADR `0058` + the story's AC-1/AC-2/AC-5.
Plan only — no production code below.

## 1. What's removed / added — summary

| Removed | Added / Changed |
| --- | --- |
| `class-period.entity.ts` (`ClassPeriod{subject,period}`) | `class-date.entity.ts` (`ClassDate{classId,className,date}`) |
| Period selector in `attendance-filters.tsx` | Filters grid = class + date only (2 cols) |
| 3-state `AttendanceStatus` (`present\|excused\|absent`) | 4-state (`present\|absent\|late\|excusedAbsent`) |
| `AttendanceRecord.studentCode` / `.avatarUrl` (mock-only, no wire source) | dropped from entity |
| History tab: date/period/subject row table | History tab: per-day status-count summary list |
| `saveAction(periodId, records)` returning `{ message }` | `saveAction(classId, date, records)` returning `errorKey` (i18n boundary fix, see §5) |
| — | `IStudentNameResolver` domain port + DI adapter over `TeacherClassRepository.getClassStudents()` |
| — | `AttendanceHistoryDaySummaryRow` (new small presentational component) |

No new `components/ui`/`components/shared` primitive types beyond the one noted item — everything else reuses `Card`, `Table`, `ToggleGroup`, `Avatar`, `Tabs`, `StatCard` already imported in the current files.

## 2. Domain entities (redesigned)

```ts
// domain/entities/attendance-status.entity.ts
export type AttendanceStatus = "present" | "absent" | "late" | "excusedAbsent";

// domain/entities/class-date.entity.ts  (replaces class-period.entity.ts)
export interface ClassDate {
  classId: string;
  className: string;
  date: string; // YYYY-MM-DD
}

// domain/entities/attendance-record.entity.ts
export interface AttendanceRecord {
  studentId: string;      // studentMemberId on the wire
  studentName: string;    // client-side join result, see §5
  status: AttendanceStatus;
  note?: string;          // kept — no wire source yet, UI-local only until BE adds it
}

// domain/entities/attendance-roster.entity.ts
export interface AttendanceRoster {
  classDate: ClassDate;   // was `period: ClassPeriod`
  records: AttendanceRecord[];
}

// domain/entities/attendance-day-summary.entity.ts (NEW — history aggregate)
export interface AttendanceDaySummary {
  date: string;
  counts: Record<AttendanceStatus, number>;
  total: number;
}
```

`studentCode`/`avatarUrl` are gone — `AttendanceRosterTable`'s `Avatar`/`AvatarFallback` already renders initials from `studentName` (never used `avatarUrl`), so dropping it is a pure type-shrink, no visual change there. The table's `code` column (`t("code")`) is removed.

## 3. Repository interface (AC-1)

```ts
// domain/repositories/i-attendance.repository.ts
export interface ClassSummary { id: string; name: string }

export interface IAttendanceRepository {
  getMyHomeroomClasses(): Promise<ClassSummary[]>;
  getClassAttendance(classId: string, date: string): Promise<AttendanceRoster>;
  saveClassAttendance(
    classId: string,
    date: string,
    records: AttendanceRecord[],
  ): Promise<void>;
  getAttendanceHistory(
    classId: string,
    from: string,
    to: string,
  ): Promise<AttendanceDaySummary[]>;
}
```

- `getMyHomeroomClasses()` — real impl composes `ITeacherClassRepository.listMyClasses()` filtered to `isHomeroom === true` (per ADR §4). This composition happens in the **real `AttendanceRepository`** (infrastructure layer), which is allowed to depend on `TeacherClassRepository` (another feature's infrastructure) since both live under `infrastructure/` — no domain-layer cross-feature import needed for this one (no name-join, just a list+filter).
- `getAttendanceHistory` returns the **already-aggregated** `AttendanceDaySummary[]` — the bounded (≤31 days) fan-out over `GetAttendanceByDate` and the per-day aggregation happen **inside the real repository implementation** (it's HTTP-orchestration, an infra concern), not in the use-case. The mock repository implements the same interface by aggregating its in-memory fixture directly (no fan-out needed, but same output shape — "no lying-green tests" per AC-1).
- The ≤31-day **clamp** is a pure business rule → belongs in the use-case (see §4), not the repository, so it's unit-testable without HTTP.

## 4. Use-cases (renamed to match AC-1)

| Old | New | Change |
| --- | --- | --- |
| `ListMyClassesUseCase` | `ListMyHomeroomClassesUseCase` | delegates to `repo.getMyHomeroomClasses()` |
| `GetRosterUseCase(classId,date,period)` | `GetClassAttendanceUseCase(classId,date)` | drops `period` param; composes name-join (see §5) |
| `SaveAttendanceUseCase(periodId,records)` | `SaveClassAttendanceUseCase(classId,date,records)` | drops `periodId`, threads `classId+date` |
| `ListAttendanceHistoryUseCase(classId,from,to)` | same signature, new return type | **adds** clamp: `to`/`from` window is capped to 31 days *before* calling `repo.getAttendanceHistory` — pure, unit-testable (`clampToBoundedWindow(from, to, 31)` helper co-located in the use-case file) |

## 5. Name-join composition point (client-side, per ADR §3)

The wire has no `studentName` — it must be joined against `TeacherClassRepository.getClassStudents()`. To keep `attendance/domain` pure (no cross-feature domain import) and avoid duplicating the join logic in two places, the join is a **DIP port owned by attendance's domain**, implemented by an **adapter in attendance's infrastructure**, wired in `bootstrap/di/attendance.di.ts`:

```ts
// domain/repositories/i-student-name-resolver.ts (attendance domain — new, small)
export interface IStudentNameResolver {
  resolveNames(classId: string): Promise<Map<string, string>>; // studentMemberId -> displayName
}

// domain/use-cases/get-class-attendance.use-case.ts
export class GetClassAttendanceUseCase {
  constructor(
    private readonly repo: IAttendanceRepository,
    private readonly nameResolver: IStudentNameResolver,
  ) {}

  async execute(classId: string, date: string): Promise<AttendanceRoster> {
    const [roster, names] = await Promise.all([
      this.repo.getClassAttendance(classId, date),
      this.nameResolver.resolveNames(classId),
    ]);
    return {
      ...roster,
      records: roster.records.map((r) => ({
        ...r,
        studentName: names.get(r.studentId)?.trim() || r.studentId, // SAME graceful fallback as teacher-class.mapper.ts
      })),
    };
  }
}
```

```ts
// infrastructure/repositories/teacher-roster-name.resolver.ts (attendance infrastructure — new adapter, 'server-only')
// Implements attendance's IStudentNameResolver by delegating to the teacher
// feature's ALREADY-REAL repository — cross-feature composition happens here
// (infra layer), not inside attendance's domain.
import type { ITeacherClassRepository } from "@/features/teacher/domain/repositories/i-teacher-class.repository";

export class TeacherRosterNameResolver implements IStudentNameResolver {
  constructor(private readonly teacherClassRepo: ITeacherClassRepository) {}

  async resolveNames(classId: string): Promise<Map<string, string>> {
    const result = await this.teacherClassRepo.getClassStudents(classId);
    if (!result.ok) return new Map(); // degrade to raw-id fallback in the use-case, not an error
    return new Map(result.data.map((s) => [s.studentMemberId, s.displayName]));
  }
}
```

`bootstrap/di/attendance.di.ts` wires: `makeGetClassAttendanceUseCase()` = `new GetClassAttendanceUseCase(new AttendanceRepository(http), new TeacherRosterNameResolver(new TeacherClassRepository(http)))` — one HTTP client, two repositories, composed at the composition root exactly as ADR §3 specifies ("composed at the use-case/DI layer — not duplicated"). The **mock** `GetClassAttendanceUseCase` wiring (`NEXT_PUBLIC_USE_MOCK=true`) uses a trivial in-memory `IStudentNameResolver` backed by the same mock fixtures — no HTTP.

This is the exact same graceful-degrade contract as `teacher-class.mapper.ts`'s `dto.displayName?.trim() || dto.studentMemberId` — reused, not reinvented.

## 6. i18n boundary correction (flagged while redesigning the VM)

The current `saveAction` returns `{ ok: false; message: string }` — a free-form string built somewhere below presentation. That's a boundary violation per `.claude/rules/i18n.md` (server-side must return a **stable key**, presentation translates). Since AC-3 is adding 6+ new ground-truthed error codes anyway, fix this in the same pass:

```ts
// attendance-screen.i-vm.ts
saveAction: (
  classId: string,
  date: string,
  records: AttendanceRecord[],
) => Promise<{ ok: true } | { ok: false; errorKey: AttendanceFailure["type"] }>;
```

`AttendanceScreen`'s `onSave` translates via `useTranslations("attendance.errors")` + `t(result.errorKey)`, mirroring the `auth`/`attendance` convention already documented in `.claude/rules/i18n.md`.

## 7. Failure union (AC-3)

```ts
// domain/failures/attendance.failure.ts
export type AttendanceFailure =
  | { type: "forbidden" }
  | { type: "not-found" }
  | { type: "correction-window-expired" }
  | { type: "student-not-enrolled" }
  | { type: "invalid-request"; fields?: { field: string; message: string }[] }
  | { type: "network-error" }
  | { type: "unknown"; message?: string };
```

Old `period-not-found` / `save-failed` / `unauthorized` are removed — ground-truthed equivalents (`not-found`, generic save path now surfaces via the specific codes above, `forbidden`) replace them per AC-3's mapping table. `correction-window-expired` is surfaced through the **existing** save-error toast in `AttendanceScreen.onSave` (`toast.error(t(\`errors.${result.errorKey}\`))`) — no new dialog/UI component, per ADR §6.

## 8. Component tree (presentation)

```
AttendanceScreen  ("use client", root — reducer holds `records` + `dirty`)
├── AttendanceFilters            — class + date ONLY (period selector REMOVED)
├── Tabs
│   ├── "today"
│   │   ├── AttendanceSummaryCard(records)      — extended to 4-state counts
│   │   └── Card
│   │       ├── CardHeader                       — className + date text (subject/period text REMOVED)
│   │       │     + "Set all present" + Save buttons (unchanged)
│   │       └── AttendanceRosterTable(records, onChange)
│   │           └── AttendanceStatusToggle(value, onChange)   — 4-state, icon+label
│   └── "history"
│       └── AttendanceHistoryTab(history: AttendanceDaySummary[])
│           └── AttendanceHistoryDaySummaryRow(summary)  — NEW, one per day
```

### 8a. `AttendanceFilters` (changed)

Drop the `period` `Select` block and the `PERIODS` const entirely. Grid becomes `sm:grid-cols-2` (class, date). `update()`'s special-case `if (key === "class" && !sp.get("period")) sp.set("period", "1")` is deleted. Props: `{ classes: ClassSummary[]; classId?: string; date?: string }` — `period` prop removed. Query-string no longer carries `?period=`.

### 8b. `AttendanceStatusToggle` (4-state redesign)

```ts
const STATUSES: AttendanceStatus[] = ["present", "late", "excusedAbsent", "absent"];

const VARIANT_CLASS: Record<AttendanceStatus, string> = {
  present:       "data-[state=on]:bg-edu-success data-[state=on]:text-edu-success-foreground",
  late:          "data-[state=on]:bg-edu-info data-[state=on]:text-edu-text-primary",
  excusedAbsent: "data-[state=on]:bg-edu-warning data-[state=on]:text-edu-warning-foreground",
  absent:        "data-[state=on]:bg-edu-error data-[state=on]:text-edu-error-foreground",
};

const ICON: Record<AttendanceStatus, LucideIcon> = {
  present: Check,
  late: Clock,
  excusedAbsent: FileCheck2,
  absent: X,
};
```

- **`late` uses `--edu-info` (`bg-edu-info`) with `text-edu-text-primary`, NOT white.** This follows the *exact* precedent already set in `status-badge.tsx`'s `TONE_CLASS.info` (`bg-edu-info/15 text-edu-text-primary`) — vibrant hues fail AA with white text (documented there as A11Y-001/002). On the toggle's **solid** (non-tinted) `bg-edu-info` the contrast margin is different from the `/15` tint case, so `fe-accessibility-auditor` MUST re-verify the exact ratio for `text-edu-text-primary` on solid `--edu-info` (#539BFF) before merge; if it fails AA, fall back to a token already in the palette (e.g. render the label without a filled background, using a ring/border treatment instead) rather than inventing a new token.
- Status is not color-only: each item already renders a text label (`{t(s)}`) — this satisfies the "icon or label" rule on its own. The icon is an additive scan aid, not required for AA, but keep it for consistency with `StatusBadge` (which uses tone+text, not icons) — if the reviewer prefers text-only parity with `StatusBadge`, dropping icons is an acceptable simplification; the icon set above is the recommendation, not a hard requirement, to keep this genuinely a redesign, not gold-plating.
- `t(s)` message keys: `attendance.status.present`, `.late`, `.excusedAbsent`, `.absent` (rename `excused`→`excusedAbsent` in `messages/{vi,en}.json`, both files, same commit — i18n rule).

### 8c. `AttendanceRosterTable` (changed)

Remove the `code` column (`TableHead className="w-24"` + the `studentCode` cell). Table becomes 3 columns: `#`, student (avatar+name), status. `Props` unchanged shape otherwise (`records`, `onChange`).

### 8d. `AttendanceSummaryCard` (changed)

Extend from 3 derived stats to include `late`:

```ts
const present = records.filter((r) => r.status === "present").length;
const late = records.filter((r) => r.status === "late").length;
const excusedAbsent = records.filter((r) => r.status === "excusedAbsent").length;
const absent = records.filter((r) => r.status === "absent").length;
const rate = total > 0 ? Math.round((present / total) * 100) : 0;
```

Card layout: keep `variant="compact"` `StatCard` grid, add one more tile (`late`, `tone="info"` — `StatCard` already supports arbitrary tone props per its existing usage elsewhere, verify at implementation time; if `StatCard`'s tone union doesn't yet include `"info"`, that's a one-line union extension on the EXISTING primitive, not a new component — `components/ui`/`components/shared` rule: extend the canonical home, don't fork).

### 8e. History tab — day-summary redesign

`AttendanceHistoryTab` now receives `AttendanceDaySummary[]` instead of `ClassPeriod[]`. Replace the row-table (date/period/subject columns — period/subject no longer exist) with a **new small presentational component**:

```
AttendanceHistoryDaySummaryRow — one row per day: date + 4 status-count chips (present/late/excusedAbsent/absent) using StatusBadge (reused, not reinvented — tones success/info/warning/error already match §8b)
```

**Canonical home**: this is a composed component (Table row layout + 4× `StatusBadge`) currently used by **exactly one screen** (attendance's history tab). Per `.claude/rules/component-organization.md` decision tree item 3, it stays **feature-local**:
`src/features/attendance/presentation/attendance-screen/attendance-history-day-summary-row.tsx` — promote to `components/shared/` only if a second screen needs a day-summary row (none currently does).

`AttendanceHistoryTab` itself keeps its `Table`/`TableHeader` shell (columns: date, then the 4 counts inline in one cell, OR one `StatusBadge` group per row — either fits inside the existing `Table` primitive) and keeps its existing empty state (`t("empty")`, unchanged).

## 9. ViewModel contract (final)

```ts
// attendance-screen.i-vm.ts
export interface AttendanceFilterValues {
  classId?: string;
  date?: string; // period REMOVED
}

export interface AttendanceScreenVM {
  classes: ClassSummary[];               // homeroom classes only (filtered upstream)
  roster: AttendanceRoster | null;       // { classDate, records } — no more `period`
  history: AttendanceDaySummary[];       // was ClassPeriod[]
  filters: AttendanceFilterValues;
  saveAction: (
    classId: string,
    date: string,
    records: AttendanceRecord[],
  ) => Promise<{ ok: true } | { ok: false; errorKey: AttendanceFailure["type"] }>;
}
```

`AttendanceScreen`'s `onSave` changes from `saveAction(roster.period.id, state.records)` to `saveAction(roster.classDate.classId, roster.classDate.date, state.records)`. The `useReducer` shape (`records`, `dirty`) is unchanged — no state-shape redesign needed here (that's `fe-state-engineer`'s query-key/invalidation call, not this document's scope).

## 10. What does NOT change

- `Tabs`/`TabsList`/`TabsTrigger` shell, `Card` usage, `Button`/`Avatar`/`Table` primitives — all reused as-is.
- `AttendanceScreen`'s reducer actions (`init`, `set-status`, `set-all-present`, `mark-clean`) — same shape, just the payload types shrink (no `period` anywhere).
- `StatCard`, `StatusBadge` — reused, not modified except a possible tone-union check for `StatCard` (§8d).
- No new `tokens.css` entry (ADR §2 / Design Notes) — `late` reuses `--edu-info`/`--edu-info-light`.

## 11. Handoff notes for `fe-state-engineer` / `fe-nextjs-engineer`

- Query keys must drop `period` from their key tuples (e.g. `["attendance","roster",classId,date]`, not `[...,period]`).
- History query key: `["attendance","history",classId,from,to]` — the bounded-window clamp happens before this key is built (use-case owns clamping, not the query hook).
- The `IStudentNameResolver` port + `TeacherRosterNameResolver` adapter (§5) needs its own unit test double (fake resolver) so `GetClassAttendanceUseCase` tests don't depend on HTTP — same pattern as existing `get-roster.use-case.test.ts`.
