# US-E18.12 — State Architecture (Grades contract remap)

Author: fe-state-engineer. No global store (TanStack Query + URL state + local
form state only), per `.claude/CLAUDE.md`. Scope per ADR `0054`/story packet:
`IGradesRepository` (teacher entry) + `IGradeBookRepository` (multi-role read,
incl. student self + parent-linked) wired real; `IGradeApprovalRepository`
(`grade-approval-screen`) untouched, stays permanently mock.

## 1. Domain entity redesign

### 1.1 `GradeEntryStatus` (new, replaces per-row `GradePublishStatus`)

```ts
// grades/domain/entities/grade-entry-status.entity.ts
export type GradeEntryStatus =
  | "DRAFT"
  | "SUBMITTED" // real enum value, but UNREACHABLE via any wired transition —
  // Submit() on the BE always jumps straight to PUBLISHED (self-publish mode)
  // or PENDING_APPROVAL (admin-approval mode). Keep the literal for type
  // completeness/exhaustive switches only; do NOT build a dedicated UI
  // affordance or test path for it — treat it as a defensive alias of
  // PENDING_APPROVAL if it is ever observed (dead code on the BE, not on web).
  | "PENDING_APPROVAL"
  | "PUBLISHED"
  | "LOCKED";
```

Forward-only state machine (ground-truthed): `DRAFT → (PUBLISHED |
PENDING_APPROVAL) → PUBLISHED → LOCKED`. No reject/reverse transition exists
for `GradeEntry` — do not model one.

### 1.2 `StudentScoreRow` / `GradeBookRow` — cell map redesign

`scores: Record<string, number | null>` → `scores: Record<string,
GradeCell>`:

```ts
// grade-sheet.entity.ts
export interface GradeCell {
  value: number | null; // null = not yet entered
  status: GradeEntryStatus; // per-cell, not per-row
}

export interface StudentScoreRow {
  studentId: string;
  studentName: string;
  studentCode: string;
  /** key = AssessmentColumn.id */
  scores: Record<string, GradeCell>;
  /** computed weighted average; null if any column value is missing */
  average: number | null;
  // publishStatus: GradePublishStatus  ← REMOVED (see §1.3 derivation)
}
```

Same shape change applies 1:1 to `GradeBookRow` (`grade-book.entity.ts`),
which keeps its extra `conductGrade` field untouched — that column is
unrelated to `GradeEntry` status and stays as-is.

`GradeSheet.classSubjectId: string` / `GradeBook.classSubjectId: string` are
**removed** — see §3 identity remap. `GradeSheet`/`GradeBook` gain `classId`,
`subjectId`, `termId`, `academicYearLabel` instead (or a nested
`ClassSubjectTermKey`, see below).

`GradePublishStatus` type is **deleted entirely** (not aliased) — nothing
should keep constructing a row-level status by hand. Anything that currently
imports it (e.g. `grade-book.entity.ts`'s `import type { GradePublishStatus }
from "./grade-sheet.entity"`) must switch to deriving a display status via
§1.3's pure function.

### 1.3 Row-level derived status (pure function, no second server-side status)

The UI still wants one glance-scannable badge per roster row. Derive it —
never invent/store it:

```ts
// grades/domain/entities/derive-row-status.ts
export type RowGradeStatus =
  | "empty" // no cell has a value yet (every entered-or-not cell is DRAFT + null)
  | "draft" // at least one entered cell is still DRAFT (in progress)
  | "pending-approval" // no DRAFT cells remain, at least one PENDING_APPROVAL
  | "published" // no DRAFT/PENDING_APPROVAL cells remain, at least one PUBLISHED (not all LOCKED)
  | "locked"; // every cell that has a value is LOCKED (fully locked row)

export function deriveRowStatus(
  scores: Record<string, GradeCell>,
): RowGradeStatus {
  const cells = Object.values(scores);
  const entered = cells.filter((c) => c.value !== null);
  if (entered.length === 0) return "empty";
  if (entered.some((c) => c.status === "DRAFT")) return "draft";
  if (entered.some((c) => c.status === "PENDING_APPROVAL" || c.status === "SUBMITTED"))
    return "pending-approval";
  if (entered.every((c) => c.status === "LOCKED")) return "locked";
  return "published"; // mix of PUBLISHED/LOCKED, or all PUBLISHED
}
```

Rationale for precedence (worst-progress-wins, matches how a teacher scans a
roster — "what still needs my attention" outranks "what's already done"):
DRAFT (needs action) > PENDING_APPROVAL (blocked on someone else) >
PUBLISHED/LOCKED (done). "Locked" only fires when **every entered cell** is
LOCKED — a row with 4/5 columns locked and 1 still PUBLISHED is not
"locked" (misleading — one column can still theoretically be re-approached
by an admin term-relock of a different scope; more importantly it avoids
implying the whole row is frozen when it isn't). Empty columns (`value ===
null`) never gate the status — an ungraded column doesn't block "submit" or
"lock" semantics, only entered cells do.

This function lives in `domain/entities/` (pure, no framework deps) and is
imported directly by presentation for row badges — no new server field, no
use-case needed (matches the packet's explicit instruction: "do NOT invent a
second server-side status").

## 2. Use-case redesign

### 2.1 `save-score` — stays ~1:1

Signature changes only for the identity remap (§3): `execute(classId,
subjectId, termId, studentId, columnId, value, maxScore)`. Still one PUT per
cell, still returns the updated row (or, more precisely now, the single
updated `GradeCell` — see below) or `GradesFailure`. Consider narrowing the
return type from `StudentScoreRow` to `{ studentId: string; columnId: string;
cell: GradeCell }` since the wire's `PUT .../grades/{studentId}/columns/
{columnId}` naturally returns one cell's new state, not a whole row — the
container merges it into the cached `GradeSheet` (§4, no client-fabricated
status).

### 2.2 `publish-grades` → renamed `submit-column-scores` (recommend option **(c)**: row-level convenience wrapper, fanning out per-cell submit)

No bulk submit exists on the wire — only `POST .../grades/{studentId}/
columns/{columnId}/submit`. Recommendation: **(c)**, a single use-case that
accepts a **set of (studentId, columnId) targets** (not the whole sheet) and
fans out `submit` over each, because:

- (a) "fan out over every DRAFT cell in the current view" alone is too broad
  a default action for a teacher who only finished entering ONE column across
  30 students — that's the realistic unit of work ("I finished entering Kiểm
  tra miệng for the whole class, submit that column").
- (b) "per-cell submit only" is correct as a affordance but too tedious as the
  *sole* action for a 30-row roster.
- **(c)** picks the target set from the caller: the teacher-entry UI offers
  both "submit this cell" (single target) and "submit this column" (all DRAFT
  cells in that column, across the visible roster) as the SAME use-case
  called with a 1-element vs N-element target list — no separate use-case
  needed for each granularity.

```ts
export interface SubmitTarget {
  studentId: string;
  columnId: string;
}

export interface SubmitScoresResult {
  submitted: SubmitTarget[]; // succeeded
  failed: Array<{ target: SubmitTarget; failure: GradesFailure }>; // did NOT succeed
}

export class SubmitColumnScoresUseCase {
  constructor(private readonly repo: IGradesRepository) {}

  async execute(
    key: ClassSubjectTermKey,
    targets: SubmitTarget[],
  ): Promise<SubmitScoresResult> {
    const submitted: SubmitTarget[] = [];
    const failed: SubmitScoresResult["failed"] = [];
    // Sequential, not Promise.all — a 409 on one cell must not race/interleave
    // with cells that depend on the same row's cache entry; sequential also
    // keeps failure aggregation deterministic in the order shown in the UI.
    for (const target of targets) {
      try {
        await this.repo.submitScore(key, target.studentId, target.columnId);
        submitted.push(target);
      } catch (err) {
        failed.push({ target, failure: toFailure(err) });
      }
    }
    return { submitted, failed };
  }
}
```

**Failure-aggregation contract (must NOT silently swallow):**
- The use-case NEVER short-circuits on first failure — every target is
  attempted, both arrays always fully populated.
- Server Action returns `{ ok: true; result: SubmitScoresResult }` even when
  `failed.length > 0` — "ok" means "the operation ran", not "everything
  succeeded". The container/screen inspects `result.failed`:
  - `failed.length === 0` → success toast ("Đã nộp N điểm").
  - `failed.length > 0 && submitted.length > 0` → partial-failure toast,
    non-dismissible-by-accident, listing which students/columns 409'd and why
    (map `failure.type` → i18n key per cell, e.g. "3/12 học sinh: điểm đã
    không còn ở trạng thái nháp — có thể đã được nộp ở tab khác").
  - `failed.length === targets.length` → full-failure toast, same shape.
  - After partial/full failure, **re-fetch the sheet** (invalidate the query,
    §4) rather than trust any client-side guess about which targets actually
    landed — a 409 mid-fan-out can itself indicate another actor mutated the
    row concurrently, so the safest source of truth is a fresh GET.
- Rename the old `publishAction` VM prop → `submitAction` (row-level convenience
  calls this with all DRAFT cells in one row/column; no separate "submit row"
  use-case).

### 2.3 `bulk-lock-batches` / `approve-grade-batch` / `request-grade-revision` — confirm: NO code changes, stay pure mock

These three use-cases live in `grades/domain/use-cases/` but are wired
exclusively through `IGradeApprovalRepository` (`grade-approval.di` factory,
force-mocked per ADR 0054 — same category as `staff-leave.di.ts`/
`teaching-plan.di.ts`). They reference `GradeApprovalBatch.id`, which has
**no wire equivalent** (no batchId resolution path exists — confirmed in the
ADR). Recommendation: **leave entirely untouched**. Do not:
- rename them to align with `GradeEntryStatus` (they operate on a
  `GradeApprovalBatch` abstraction that is intentionally a different,
  mock-only shape — conflating it with the real per-cell model would
  suggest a false wireability),
- change their signatures for the `(classId, subjectId, termId,
  academicYearLabel)` identity remap (§3) — `GradeApprovalBatch` is keyed by
  its own invented `batchId`, unrelated to the real class-subject-term keys.

This is a pure "no-op, confirmed out of scope" item for `fe-nextjs-engineer` —
flag it in the story packet's evidence so nobody "helpfully" touches
`grade-approval-screen` files under this US.

### 2.4 Reads (`get-grade-sheet`, `get-grade-book`, `get-my-grades`,
`get-child-grades`) — signature remap only

All four change their first param(s) from `(csId: string, term: string)` to
the composed key (§3); bodies stay ~1:1 (fetch → map failure). `get-child-list`
is untouched (permanently mock per ADR — parent child-switcher has no
wireable display-field source).

## 3. Identity remap

`classSubjectId` ("csId") → `(classId, subjectId, termId, academicYearLabel)`.
Recommend bundling as one value object rather than 4 loose params threaded
everywhere:

```ts
// grades/domain/entities/class-subject-term-key.entity.ts
export interface ClassSubjectTermKey {
  classId: string;
  subjectId: string;
  termId: string;
  academicYearLabel: string;
}
```

### 3.1 Repository interface changes

```ts
export interface IGradesRepository {
  getGradeSheet(key: ClassSubjectTermKey): Promise<GradeSheet>;
  saveScore(
    key: ClassSubjectTermKey,
    studentId: string,
    columnId: string,
    value: number,
  ): Promise<{ studentId: string; columnId: string; cell: GradeCell }>;
  submitScore(
    key: ClassSubjectTermKey,
    studentId: string,
    columnId: string,
  ): Promise<{ studentId: string; columnId: string; cell: GradeCell }>;
  // publishGrades(csId, term): Promise<void>  ← REMOVED, no bulk endpoint
}

export interface IGradeBookRepository {
  getGradeBook(key: ClassSubjectTermKey): Promise<GradeBook>;
  /** student self — keyed by studentMemberId + year, NOT class/subject/term */
  getMyGrades(studentMemberId: string, academicYearLabel: string): Promise<GradeBook[]>;
  getChildGrades(childId: string, academicYearLabel: string): Promise<GradeBook[]>;
  getChildList(): Promise<ChildSummary[]>; // unchanged, permanently mock
}
```

Note on `getMyGrades`/`getChildGrades`: `GET /members/{memberId}/grades?year=`
returns the student's **entire year across every subject** (that's the whole
point of the self-view — one call, not one per class-subject-term), so it
naturally returns an array of per-subject `GradeBook`s, not a single one keyed
by class/subject/term the caller doesn't have for a student viewer. This is a
genuine shape divergence from the teacher/admin `getGradeBook` (which IS keyed
by a specific class-subject-term) — keep them as two distinct methods on the
same interface rather than forcing one generic signature. `term` (`HK1`)
narrowing, if the UI still wants a single-term view, is a **client-side
filter** over the returned array, not a repository param (the wire doesn't
support fetching one term in isolation for a student).

### 3.2 New term/lock operation

```ts
export interface IGradesTermRepository {
  // or fold into IGradesRepository — recommend a separate interface since
  // it's an ADMIN/MANAGER action orthogonal to the teacher-entry flow and
  // has no per-cell target:
  lockTerm(key: ClassSubjectTermKey): Promise<void>;
}
```

New use-case `LockTermUseCase` — irreversible, single confirm action (reuse
`DestructiveConfirmDialog` per component-organization.md). No fan-out: this
IS the one genuinely bulk operation on the wire (`POST .../lock` locks every
PUBLISHED entry for the whole class+subject+term at once).

### 3.3 Call-site list (grep results, 7 route files under
`src/app/[locale]/t/[tenant]/(app)/{teacher,admin,principal,student,parent}/
grade*/`, `admin/grades/approval/**` excluded per scope):

| File | Current shape | New shape |
| --- | --- | --- |
| `teacher/grades/page.tsx` | `sp.csId`, `sp.term` searchParams; `MOCK_CLASS_SUBJECTS` → `ClassSubjectOption[]` (`{id, label}`); passes `selectedCsId` to `makeGetGradeSheetUseCase().execute(selectedCsId, selectedTerm)` | `sp.classId`, `sp.subjectId`, `sp.term` (termId) searchParams (`academicYearLabel` resolved server-side, not user-selected — see §5); real class-subject picker replacing `MOCK_CLASS_SUBJECTS`; execute with `ClassSubjectTermKey` |
| `teacher/grades/actions.ts` | `saveScoreAction(csId, studentId, columnId, value)`, `publishGradesAction(csId, term, rows)` | `saveScoreAction(key: ClassSubjectTermKey, studentId, columnId, value)`; `submitScoresAction(key, targets: SubmitTarget[])` |
| `teacher/grade-book/page.tsx` | same `sp.csId`/`sp.term` + `MOCK_CLASS_SUBJECTS` pattern, `makeGetGradeBookUseCase().execute(selectedCsId, selectedTerm)` | same remap as teacher/grades |
| `admin/grade-book/page.tsx` | identical csId/term pattern, no `gradeEntryPath` | same remap |
| `principal/grade-book/page.tsx` | identical csId/term pattern | same remap |
| `student/grades/page.tsx` | `sp.term` only; `makeGetMyGradesUseCase().execute(selectedTerm)`; `selectedCsId: gradeBook?.classSubjectId ?? null` | no `classId`/`subjectId` params at all (self-view is year-scoped, not class-subject-scoped); `makeGetMyGradesUseCase().execute(studentMemberId, academicYearLabel)` → returns `GradeBook[]`, client-filters by `sp.term` for display; `selectedCsId` VM field removed (see §3.4 VM note) |
| `parent/grades/page.tsx` | `MOCK_CHILD_ID` fallback, `sp.term`/`sp.childId`; `makeGetChildGradesUseCase().execute(childId, selectedTerm)`; `selectedCsId: gradeBook?.classSubjectId ?? null` | same shape change as student — `execute(childId, academicYearLabel)` → `GradeBook[]`, client-filter by term. `childId` sourcing (mock `getChildList`) unchanged — still mock per ADR |

`GradeBookScreenVM.selectedCsId: string | null` (currently populated from
`gradeBook?.classSubjectId`, now-removed) should be dropped from the VM for
student/parent roles, or repurposed to identify which per-subject `GradeBook`
in the returned array is currently displayed (e.g. `selectedSubjectId`) — flag
this exact contract to `fe-component-architect` since it touches the shared
`GradeBookScreenVM`.

### 3.4 Class-subject picker — composed data source

Confirms the story packet's `resolve-my-grade-subjects.ts` shape, refined:

```ts
// bootstrap/lib/resolve-my-grade-subjects.ts — 'server-only'
export interface GradeSubjectOption {
  classId: string;
  subjectId: string;
  className: string; // display
  subjectName: string; // display
}

export async function resolveMyGradeSubjects(): Promise<GradeSubjectOption[]> {
  // 1. GET /classes (role-filtered server-side — TEACHER sees own classes,
  //    ADMIN/PRINCIPAL see all — mirrors teacher-class.repository.ts's
  //    fetchAllPages cursor-drain precedent)
  // 2. per-class GET /classes/{classId}/subjects (fan-out, bounded by class
  //    count — same shape as US-E18.4's homeroom-teacher fan-out, US-E18.11's
  //    per-class timetable fan-out)
  // 3. flatten to (classId, subjectId, className, subjectName) tuples
}
```

Over-inclusive by design (may list subjects in a class the teacher isn't
individually assigned to, since no per-teacher subject-assignment endpoint
exists) — the entry endpoint's own `403
GRADE_ENTRY_TEACHER_NOT_ASSIGNED` is the real authority; the picker is just a
convenience list, not an access-control boundary. `ClassSubjectOption` (the
existing presentation type, `{id, label}`) is superseded by
`GradeSubjectOption` unless the picker UI is refactored to a 2-level
class→subject cascading select — recommend the latter (cleaner UX for a
teacher with many classes) but that's `fe-component-architect`'s call; either
way, the *data source* is `resolveMyGradeSubjects()`, called from the RSC page
(same place `MOCK_CLASS_SUBJECTS` is imported today) and passed as a prop —
no client-side fetch of the picker list.

## 4. TanStack Query key hierarchy + invalidation

This feature currently has **zero** existing TanStack Query usage in
`grade-entry-screen`/`grade-book-screen` (both are pure RSC + Server Action,
confirmed by `grade-keys.ts`/`grade-book-keys.ts` already existing but unused
by any `useQuery` call in the container files read). If the engineer keeps the
RSC-first pattern (recommended — see §5), these keys matter only for
**client-side refetch after a mutation** (the container calls
`router.refresh()` today via `revalidatePath`; introduce TanStack Query only
if `fe-component-architect`'s design needs client-driven optimistic-free
refetch without a full page reload, e.g. inline cell edit + refetch just the
sheet).

```ts
// grade-keys.ts
export const gradeKeys = {
  all: ["grades"] as const,
  sheet: (key: ClassSubjectTermKey | null) =>
    key
      ? ["grades", "sheet", key.classId, key.subjectId, key.termId, key.academicYearLabel] as const
      : ["grades", "sheet", null] as const,
};

// grade-book-keys.ts
export const gradeBookKeys = {
  all: ["grade-book"] as const,
  book: (key: ClassSubjectTermKey | null) =>
    key
      ? ["grade-book", key.classId, key.subjectId, key.termId, key.academicYearLabel] as const
      : ["grade-book", null] as const,
  mine: (studentMemberId: string | null, year: string | null) =>
    ["grade-book", "me", studentMemberId, year] as const,
  child: (childId: string | null, year: string | null) =>
    ["grade-book", "child", childId, year] as const,
};
```

| Mutation | Invalidates |
| --- | --- |
| `saveScoreAction` | `gradeKeys.sheet(key)` (the cell's value+status changed) |
| `submitScoresAction` | `gradeKeys.sheet(key)` — status changed server-side, re-fetch is the ONLY source for the new per-cell status (no client-fabricated status patch, per US-E18.10's established convention) |
| `lockTermAction` | `gradeKeys.sheet(key)` AND `gradeBookKeys.book(key)` — same `(classId,subjectId,termId,year)` scope, both teacher-entry and multi-role-read views must reflect LOCKED |
| (approve/reject — mock only, `IGradeApprovalRepository`) | unrelated key namespace (`grade-approval-*`, unchanged) — no cross-invalidation needed since no wire relationship exists between a mock batch and a real cell |

No optimistic updates: every state transition (`save`, `submit`, `lock`) is
server-authoritative. `saveScore`'s response already returns the updated
`GradeCell` (§2.1) — use that server response to patch the cache entry
directly (`queryClient.setQueryData`) rather than re-fetching the whole sheet
on every keystroke-adjacent save (performance: a 30-row roster shouldn't
re-GET on every blur), but this is patching with the **server's own response
value**, not a client guess — consistent with "server-authoritative, no
client-fabricated status" (the cell's `status` in the patched cache entry is
exactly what the PUT response said, e.g. still `DRAFT`). `submitScoresAction`
target cells DO need a full sheet invalidation/re-fetch (not per-cell cache
patch) because of the partial-failure aggregation in §2.2 — a fan-out
response doesn't map 1:1 to "here's every cell's new value," only
succeeded/failed target lists.

## 5. RSC ↔ client boundary

- **Class-subject picker** (`resolveMyGradeSubjects()`) — called from the RSC
  page (`teacher/grades/page.tsx`, `teacher/grade-book/page.tsx`,
  `admin/grade-book/page.tsx`, `principal/grade-book/page.tsx`), same
  placement as today's `MOCK_CLASS_SUBJECTS` import — passed as a prop into
  the VM, no client fetch.
- **`academicYearLabel`** — resolved server-side (RSC), NOT a URL param the
  user picks. Mirrors US-E18.11's `resolveCurrentTermId` precedent
  (`bootstrap/lib/resolve-current-term.ts`): compose the already-real
  `calendar` feature's active-year lookup. Recommend a sibling
  `resolveCurrentAcademicYear()` (or reuse the existing `resolveCurrentTermId`
  call's `activeYear.label` directly — check `calendar`'s `AcademicYear`
  entity for the field name) so `termId` selection in the UI stays scoped to
  terms within the current year, consistent with US-E18.7's assessment-scheme
  wiring (which already requires `termId` and resolved it via a minimal
  `["HK1","HK2"]` selector reusing the existing `Select` pattern — grades
  should reuse that SAME selector component, not invent a second one).
- **`classId`/`subjectId`/`termId`** — stay URL `searchParams` (`?classId=&
  subjectId=&term=`), shareable deep link, same pattern as today's `?csId=&
  term=`. The RSC page reads them, resolves the year server-side, composes
  `ClassSubjectTermKey`, and calls the use-case — all still server-side, no
  client refetch needed for the initial read (matches the "zero TanStack Query
  usage today" baseline — do not introduce it purely for the initial load).
- **`studentMemberId`** (student self-view) — resolved server-side via
  `decodeSubClaim(accessToken)` (same helper family as US-E14.6's
  `currentAdminId` resolution, `bootstrap/lib/jwt.ts`) — never a URL param,
  never client-supplied (security: a student must not be able to pass another
  student's id).
- **Mutations** (`saveScoreAction`, `submitScoresAction`, `lockTermAction`) —
  stay Server Actions (`'use server'`), calling the DI factory per-request,
  same as today. `revalidatePath` after action success (existing pattern) is
  sufficient if the container stays RSC-driven; add TanStack Query only if
  `fe-component-architect` designs an inline-edit grid needing sub-second
  per-cell refetch without a full RSC round trip (a legitimate but NOT
  required upgrade — flag as an option, not a requirement, for this US).

## 6. Failure/error propagation

Final recommended `GradesFailure` union (replaces the current one):

```ts
export type GradesFailure =
  | { type: "not-found" } // GRADE_ENTRY_NOT_FOUND, 404
  | { type: "forbidden" } // GRADE_ENTRY_FORBIDDEN, 403
  | { type: "teacher-not-assigned" } // GRADE_ENTRY_TEACHER_NOT_ASSIGNED, 403 — new, distinct from generic forbidden (UI copy differs: "not your class" vs "no permission")
  | { type: "invalid-value"; columnId: string; maxScore: number } // GRADE_ENTRY_INVALID_VALUE, 400 — renamed from score-out-of-range, same shape
  | { type: "not-draft" } // GRADE_ENTRY_NOT_DRAFT, 409 — submit attempted on a cell no longer DRAFT (raced)
  | { type: "not-pending-approval" } // GRADE_ENTRY_NOT_PENDING_APPROVAL, 409 — kept (existing name matches wire)
  | { type: "not-published" } // GRADE_ENTRY_NOT_PUBLISHED, 409 — kept (existing name matches wire; was previously used for the old approval pipeline, semantics now precise: lock attempted on a non-PUBLISHED entry)
  | { type: "locked" } // GRADE_ENTRY_LOCKED, 409 — new, cell/term already locked
  | { type: "scale-not-configured" } // GRADE_SCALE_NOT_CONFIGURED, 422 — new
  | { type: "scheme-not-configured" } // ASSESSMENT_SCHEME_NOT_CONFIGURED, 422 — new
  | { type: "column-not-in-scheme"; columnId: string } // GRADE_ENTRY_COLUMN_NOT_IN_SCHEME, 400 — new
  | { type: "student-not-enrolled" } // GRADE_ENTRY_STUDENT_NOT_ENROLLED, 400 — new
  | { type: "network-error" }
  | { type: "unknown" };
```

Retired (no wire equivalent, remove — bulk "whole sheet" publish concept is
gone):
- `already-published` — was the old bulk-publish precheck's failure; the new
  per-cell `submit` naturally 409s as `not-draft` if raced, no separate
  precheck failure needed.
- `incomplete-scores` — was `publish-grades.use-case.ts`'s
  "cannot publish while any student has unfilled columns" precheck. That
  precheck doesn't map to per-cell submit (a column being submitted is
  self-contained; you can submit column A while column B is still empty) —
  remove the precheck AND the failure type. If product still wants a
  "warn before submitting a column with ungraded students" UX, that's a
  **client-side confirmation**, not a repository-level failure (no server
  round-trip needed to know a row's `value` is null already in the fetched
  sheet).

Approval-pipeline-only failures (`invalid-revision-note`, `batch-locked`) stay
**unchanged**, still used exclusively by the untouched
`IGradeApprovalRepository`/mock use-cases (§2.3) — do not fold them into or
remove them from this union; they're a different repository's vocabulary that
happens to share the file today (acceptable, matches existing organization).

`GRADE_ENTRY_NOT_SUBMITTED` (409, documented on the wire but unreachable —
no path drives an entry through `SUBMITTED`): map defensively in the mapper to
`not-draft` (closest semantic fallback — "the entry isn't in the state this
operation expects"), with a code comment noting it's dead in practice. Do NOT
give it its own failure-union member (that would create a UI copy string for
a state that can never occur, wasted i18n key per `i18n.md`'s "no dead
strings" spirit).

## 7. Summary of deliverables for `fe-nextjs-engineer`

1. `GradeEntryStatus`, `ClassSubjectTermKey`, `GradeCell`, `deriveRowStatus`
   new domain files.
2. `StudentScoreRow`/`GradeBookRow`.`scores` → `Record<string, GradeCell>`;
   drop `GradePublishStatus`/`publishStatus` everywhere.
3. `IGradesRepository`/`IGradeBookRepository` signatures remapped to
   `ClassSubjectTermKey` (+ new `submitScore`, new `IGradesTermRepository.
   lockTerm`, removed `publishGrades`).
4. `PublishGradesUseCase` → `SubmitColumnScoresUseCase` (fan-out + failure
   aggregation per §2.2); new `LockTermUseCase`.
5. `GradesFailure` union per §6 (9 additions, 2 retirements, existing approval-
   pipeline members untouched).
6. New `bootstrap/lib/resolve-my-grade-subjects.ts` (+ possibly a sibling
   `resolveCurrentAcademicYear` in `bootstrap/lib/`, reusing/extending
   `resolve-current-term.ts`'s composition pattern).
7. `bootstrap/endpoint/grades.endpoint.ts` full remap to
   `/core/api/v1/classes/{classId}/subjects/{subjectId}/terms/{termId}/
   grades[...]` + `/core/api/v1/members/{memberId}/grades`.
8. `bootstrap/di/grades.di.ts` — `ensureFreshSession()` wired into the real
   branch (per epic playbook step 6, not yet done for this cluster);
   `IGradeApprovalRepository` factory untouched.
9. 7 route pages + 1 actions file remapped per §3.3 table; `GradeBookScreenVM`
   contract change (`selectedCsId` → `selectedSubjectId` or removed for self-
   view roles) flagged to `fe-component-architect` for reconciliation.
10. `grade-approval-screen/**` — confirmed zero changes.
