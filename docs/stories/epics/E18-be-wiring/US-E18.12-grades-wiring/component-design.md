# US-E18.12 — Component / ViewModel Design: per-cell grade workflow UI

Companion to `story.md` + ADR `0054`. Scope: presentation-layer design only —
`fe-nextjs-engineer` implements against this once `fe-state-engineer`'s domain
entity/use-case redesign lands. No code in this doc.

Assumed cell shape (per ADR 0054 / story Design Notes, owned by
`fe-state-engineer`):

```ts
type GradeEntryStatus = "DRAFT" | "PENDING_APPROVAL" | "PUBLISHED" | "LOCKED";
// SUBMITTED is dead on the wire — never rendered; if ever seen, alias to
// PENDING_APPROVAL's badge (documented fallback, not a 5th visual state).

type ScoreCell = { value: number | null; status: GradeEntryStatus };
// StudentScoreRow.scores: Record<columnId, ScoreCell>  (was Record<columnId, number|null>)
```

---

## 1. Per-cell status badge

### Existing precedent found (reuse, don't fork)

Two components already implement the exact "tone + icon + i18n label" pattern
for a grade-workflow status enum:

- `src/features/grades/presentation/grade-approval-screen/components/batch-status-badge.tsx`
  — `BatchStatus` (`PENDING_APPROVAL`/`PUBLISHED`/`LOCKED`) → hand-rolled
  span with `bg-edu-warning/15`, `bg-edu-success/15`, `bg-muted`, paired with
  `Clock`/`CheckCircle2`/`Lock` (lucide). **This screen is out of scope
  (ADR 0054, stays mock) — do not edit it, but its tone/icon choices are the
  established convention for this exact status vocabulary and should be
  matched, not reinvented.**
- `src/features/academic-records/presentation/academic-record-screen/seal-status-badge.tsx`
  — wraps the shared `StatusBadge` (`src/components/shared/status-badge/status-badge.tsx`)
  with `Lock`/`LockOpen` icons — the canonical way to pair an icon with the
  shared badge primitive.

`StatusBadge` (`src/components/shared/status-badge/status-badge.tsx`) is the
canonical primitive (tones: `primary|success|warning|error|info|purple|teal|muted`,
all pre-verified AA-contrast per decision `0027`). It accepts arbitrary
`children`, so `<Icon/>` + label composes directly — no change needed to the
primitive itself.

### New component: `GradeEntryStatusBadge`

Because the per-cell badge is used in **both** `grade-entry-table.tsx` (teacher
entry, editable cells) **and** `grade-book-table.tsx` (read-only multi-role
view) — 2 screens — per `component-organization.md` decision tree this is a
composed component reused ≥2 screens → home is `src/components/shared/grade-entry-status-badge/`
(folder + `index.ts` + `.stories.tsx`), **not** duplicated per-screen and
**not** placed in `features/grades/presentation/`.

```tsx
// src/components/shared/grade-entry-status-badge/grade-entry-status-badge.tsx
export interface GradeEntryStatusBadgeProps {
  status: GradeEntryStatus; // DRAFT | PENDING_APPROVAL | PUBLISHED | LOCKED
  className?: string;
}
```

### Tone + icon mapping (concrete decision)

| Status | `StatusTone` | Icon (lucide) | Rationale |
| --- | --- | --- | --- |
| `DRAFT` | `muted` | `Circle` (outline) | Neutral / not-yet-submitted, editable. Matches design-system's existing "muted = low-emphasis, not yet actioned" convention (cf. Schedule `done → muted` is the closest existing precedent for a neutral non-alarming state; here it's the inverse temporally but the same *visual weight*). |
| `PENDING_APPROVAL` | `warning` | `Clock` | **Exact match** to `BatchStatusBadge`'s existing `PENDING_APPROVAL → warning + Clock` — zero drift from the established convention for this literal status value. |
| `PUBLISHED` | `success` | `CheckCircle2` | **Exact match** to `BatchStatusBadge`'s `PUBLISHED → success + CheckCircle2`. |
| `LOCKED` | `muted` | `Lock` | **Exact match** to `BatchStatusBadge`'s `LOCKED → muted + Lock` (also consistent with `SealStatusBadge`'s use of `Lock` for a terminal/immutable state, though that component uses `success` for its own "sealed" semantics — not reused here since "sealed" ≠ "locked-cell", different entities). |

All four tones/every hue already exist in `tokens.css` / `StatusBadge` — **no
new token needed.**

**Flag to lead:** `DRAFT` and `LOCKED` share the same `muted` tone (bg tint),
distinguished only by icon (`Circle` vs `Lock`) + label text. This is
accessibility-compliant (never color-only — icon+label always present per
`accessibility.md`) but is a *deliberate* reuse of the one existing "neutral"
tone for two semantically opposite states (not-yet-started vs. permanently-done).
If `fe-tech-lead-reviewer`/`uiux` want stronger visual separation, the
lightest-touch fix is swapping `DRAFT` to `info` tone instead of `muted`
(also AA-safe, per `StatusBadge`'s existing `info: bg-edu-info/15
text-edu-text-primary`) — flagging as an option rather than deciding
unilaterally, since it's a genuine judgment call, not a missing token.

Dead `SUBMITTED` value: if it is ever received from the wire (should not
happen per ADR 0054), `GradeEntryStatusBadge` treats it as an alias of
`PENDING_APPROVAL` (same tone/icon) — documented in a code comment, not a 5th
visual case.

### i18n keys

Both `grade-entry-table.tsx` and `grade-book-table.tsx` need the same 4 labels.
Rather than duplicating the same copy under both `gradeEntry.*` and
`gradeBook.*` namespaces (drift risk), add one shared namespace consumed by
both screens' badge usages — mirrors `Common`'s role as a cross-namespace
share:

```jsonc
// messages/{vi,en}.json
"gradeCellStatus": {
  "draft": "Nháp",
  "pendingApproval": "Chờ duyệt",
  "published": "Đã công bố",
  "locked": "Đã khóa"
}
```

(`gradeApproval.statusDraft/statusPendingApproval/statusPublished/statusLocked`
already exist with equivalent copy for the mocked approval screen — **do not
delete/rename those**, they belong to a screen out of this story's scope;
`gradeCellStatus.*` is a new, intentionally separate set for the two real
screens, per i18n rule "add only genuinely new keys" — these ARE new since no
per-cell namespace currently exists.)

---

## 2. Row-level derived status display

Row-level status is **never stored** — pure derived function over the row's
cell statuses, computed in presentation (or a `domain/` pure helper the
state-engineer owns, e.g. `deriveRowStatus(cells): RowDisplayStatus`):

```ts
type RowDisplayStatus =
  | "all-draft"        // every cell DRAFT (or no cells entered)
  | "all-locked"       // every cell LOCKED
  | "all-published"    // every cell PUBLISHED (no LOCKED, no DRAFT, no PENDING)
  | "all-pending"       // every cell PENDING_APPROVAL
  | "mixed";           // cells span ≥2 different statuses
```

### Visual treatment

- **Single clean state** (`all-draft`/`all-pending`/`all-published`/`all-locked`):
  render one `GradeEntryStatusBadge` in the row header (leftmost sticky
  column, next to student name) using the same status → tone/icon map above.
  This is the "at a glance, this whole row is in one place" signal.
- **`mixed`**: do **not** invent a 5th color. Render a distinct compound
  affordance instead — a small icon-only indicator (e.g. `Layers` or
  a split-tone dot) plus the text label `t("gradeCellStatus.mixed")`
  ("Nhiều trạng thái" / "Mixed status"), tone `info` (distinct from any single
  cell tone so it never gets confused with an actual cell state), with a
  tooltip/`aria-describedby` breakdown, e.g. "2 nháp · 1 chờ duyệt · 3 đã khóa"
  built from counting cells per status. This keeps the "mixed" signal legible
  without conflating it with a real per-cell status color.
- Both cases keep every individual cell's own badge visible in the row body —
  the row-header badge is a *summary*, not a replacement for per-cell detail
  (a teacher scanning "did I finish student X" still needs to see which
  columns are the outliers).
- Applies to **both** `grade-entry-table.tsx` (teacher, editable) and
  `grade-book-table.tsx` (read-only) row headers — same derivation, same
  badge component, no new component needed beyond passing the array of the
  row's cell statuses into `deriveRowStatus`.

---

## 3. Submit action UI (replaces the single "Publish" button)

Decision: **(a) per-row submit as primary UX + (c) a bulk "submit all draft
cells in view" convenience button**, both client-side fan-outs over the
per-cell `POST .../submit` endpoint (no bulk endpoint exists). **(b) per-cell
submit affordance is also included** but as a low-emphasis secondary control,
not a separate button per cell (avoids button-per-cell visual noise across a
30-column × 40-row sheet).

### Concrete design

- **Per-cell**: no dedicated button. Each `DRAFT`-status cell's badge itself
  becomes the affordance — clicking/pressing Enter on a focused `DRAFT` badge
  fires a single-cell submit (mirrors the existing inline-edit-on-blur pattern
  already used for score entry in `ScoreCell`). This keeps per-cell control
  available for the "just fix this one" case without a second visible button
  per cell. Non-`DRAFT` cells' badges are pure display (no submit affordity —
  they're already past DRAFT).
- **Per-row (primary, recommended)**: a small "Nộp dòng này" (Submit this row)
  text-button in the row, enabled only when the row has ≥1 `DRAFT` cell.
  Fans out `submit` over every `DRAFT` cell in that row only. This matches the
  natural workflow (a teacher finishes one student, moves to the next).
- **Bulk convenience (secondary, header-level)**: the current single "Publish"
  header button is renamed to "Nộp tất cả nháp" (Submit all drafts) and fans
  out `submit` over every `DRAFT` cell across the whole visible sheet — a
  clearly-labeled *convenience* action, not a real bulk endpoint. Disabled
  when there are zero `DRAFT` cells in view.
- Both row and bulk submit are **not** wrapped in `DestructiveConfirmDialog`
  (submit is forward but not irreversible-destructive the way term-lock is —
  it can still be corrected via re-entry before approval in self-publish mode,
  and is a routine, frequent action; adding a confirm dialog to every row
  submit would be workflow friction the epic's UX conventions avoid for
  non-destructive routine actions).

### Partial-failure handling (mandatory, per story Design Notes)

A fan-out submit (row or bulk) issues N independent `POST .../submit` calls.
Given 2 succeed / 3 fail (e.g., raced into non-DRAFT by another session):

- Each cell's own status re-renders immediately per its **own** result — a
  cell whose submit succeeded flips its badge to `PENDING_APPROVAL`/`PUBLISHED`
  (per `sheet.publishMode`); a cell whose submit failed **stays `DRAFT`** and
  gets a small inline error indicator directly on that cell (reuse the
  existing `ScoreCell` error-slot pattern — `aria-invalid` + `aria-describedby`
  + `text-edu-error-text` message already used for out-of-range scores).
- A single summary banner (reusing the existing `role="status"` banner already
  in `grade-entry-screen.tsx`) reports the aggregate outcome, e.g. "Đã nộp
  2/5 ô. 3 ô không nộp được (đã bị thay đổi bởi người khác)." — **never**
  silently swallowing the 3 failures. The banner's error copy is derived from
  the failure type distribution (mostly `not-draft` 409 in the race case;
  falls back to `errorUnknown` copy for anything else).
- No optimistic "all succeeded" flash — cells only flip status once their own
  request resolves (mirrors the existing per-cell optimistic-then-reconcile
  pattern already used for score saves in `grade-entry-screen.tsx`'s
  `saveMutation.onMutate`/`onSuccess`/`onError`).
- Retry surface: failed cells remain visibly `DRAFT` with their error
  indicator, so the existing per-cell submit affordance (click the DRAFT
  badge) IS the retry mechanism — no separate "retry all failed" button
  needed, keeping the UI minimal per the story's ask.

---

## 4. Term lock action UI

Reuse **`DestructiveConfirmDialog`**
(`src/components/shared/destructive-confirm-dialog/destructive-confirm-dialog.tsx`)
verbatim — same component already used for grade-approval's existing bulk-lock
dialog (`grade-approval-screen.tsx`, out of scope but proves the dialog is
already the house convention for grade-locking specifically) and 10+ other
screens (`class-management-screen.tsx`, `student-roster-screen.tsx`,
`discipline-screen`, etc.). Do **not** build a new confirm dialog.

### Placement

Lives in **`grade-book-screen.tsx`**, admin/principal role branch only
(`vm.role === "admin" || vm.role === "principal"` — teacher never sees it;
matches the story's rationale that grade-book already has the
`(classId, subjectId, termId)` context selected via the existing
class-subject + term `Select`s). Concretely: a new "Khóa điểm học kỳ" (Lock
term grades) button in the screen header, next to (not replacing) the
existing teacher-only `enterGradesCta` button — mutually exclusive by role so
they never render together.

- Button enabled only when a class-subject-term is selected **and** the
  gradebook has ≥1 `PUBLISHED` cell (locking with zero published cells is a
  no-op the BE would presumably reject anyway — gate client-side too, cheap
  and matches the epic's existing pattern of pre-gating destructive actions).
- Confirm dialog body states the scope explicitly and the irreversibility,
  e.g.: title "Khóa điểm học kỳ?", body "Thao tác này sẽ khóa vĩnh viễn toàn
  bộ điểm ĐÃ CÔNG BỐ của lớp {className} — môn {subjectName} — {term}. Không
  thể hoàn tác." — reusing the exact `DestructiveConfirmDialog` prop contract
  (`title`/`body`/`confirmLabel`/`isLoading`/`errorSlot`/`onConfirm`/`onCancel`).
- On success: invalidate the grade-book query for that `(classId, subjectId,
  termId)` (and the grade-entry query, since the same cells are shared data)
  so every `PUBLISHED` cell flips to `LOCKED` on next read; banner confirms
  the count locked.
- On failure: use the dialog's existing `errorSlot` prop (`forbidden` tone
  for a 403/role-gate failure with no retry, `transient` tone with retry for
  network/5xx) — no new error-surface pattern needed, it's already built into
  the shared component.

---

## 5. Class-subject-term picker replacement

Confirmed: reuse the `Select`-based picker pattern, concretely closest to
`src/features/teaching-plan/presentation/teaching-plan-screen/components/subject-class-term-selector.tsx`
(`SubjectClassTermSelector`) — same 3-field composed picker (subject / class /
term), same `Select`+`Label`+`useId` shadcn primitives already used verbatim
in both `grade-entry-screen.tsx` and `grade-book-screen.tsx` today (inline,
not yet extracted into a shared component). **This is a good moment to
extract**, since after this US there will be 3 near-identical inline
copies (teaching-plan's extracted one + grade-entry's inline one + grade-book's
inline one) — but that extraction is a `component-organization.md`
"promote on 2nd/3rd use" call for `fe-component-architect`/the engineer to
make, not mandated by this doc; at minimum, do not add a 4th divergent
implementation.

### Updated picker VM shape

Old `ClassSubjectOption` (flat, opaque `csId`):

```ts
export interface ClassSubjectOption {
  id: string; // csId
  label: string; // e.g. "10A1 — Toán"
}
```

New (composed real tuple, per ADR 0054 §1 — `classId`/`subjectId` independent
real ids, no more invented `csId`):

```ts
export interface ClassSubjectOption {
  classId: string;
  subjectId: string;
  subjectName: string;
  className: string;
}
```

The picker's `Select` still renders one flat list (`"{className} — {subjectName}"`
as the visible label, same UX as today) but the `value` becomes a composite
key (`` `${classId}:${subjectId}` ``) since shadcn `Select` needs a single
string value — the container/screen splits it back into `{classId, subjectId}`
before calling any action. This mirrors `SubjectClassTermSelector`'s existing
3-independent-`Select`s pattern conceptually, but grades keeps ONE combined
class-subject dropdown (not two separate ones) since that's the existing UX
(`vm.classSubjects` as one list) — no need to split into 2 selects just
because the id changed shape.

---

## 6. Updated ViewModel contracts (deltas only)

### `grade-entry-screen.i-vm.ts`

```ts
// ClassSubjectOption — see §5 above (breaking shape change, same name)

export type ActionResult =
  | { ok: true }
  | { ok: false; errorKey: GradesFailure["type"] };

/** NEW — per-cell submit result, distinguishes "this cell failed" from a
 *  total request failure so fan-out callers can attribute outcomes. */
export interface CellSubmitResult {
  studentId: string;
  columnId: string;
  ok: boolean;
  errorKey?: GradesFailure["type"];
}

export interface GradeEntryScreenVM {
  classSubjects: ClassSubjectOption[];
  selectedClassId: string | null;   // was selectedCsId
  selectedSubjectId: string | null; // NEW — classId/subjectId now independent
  selectedTerm: string | null;
  sheet: GradeSheet | null; // sheet.rows[].scores becomes Record<columnId, ScoreCell> — owned by fe-state-engineer
  error: GradesFailure["type"] | null;

  saveScoreAction: (
    classId: string,
    subjectId: string,
    studentId: string,
    columnId: string,
    value: number,
  ) => Promise<ActionResult>;

  /** RENAMED from publishAction — submits ONE cell. Primary building block
   *  for both the per-row and bulk fan-outs (screen-level orchestration, not
   *  a new use-case per fan-out level). */
  submitCellAction: (
    classId: string,
    subjectId: string,
    studentId: string,
    columnId: string,
  ) => Promise<ActionResult>;

  /** NEW — admin/manager only; not used by grade-entry-screen's own UI but
   *  co-located here since it operates on the same sheet identity tuple.
   *  (Grade-book-screen is where the button actually renders — see §4 — but
   *  the container wiring for both screens shares this DI factory shape.) */
  lockTermAction?: (
    classId: string,
    subjectId: string,
    termId: string,
  ) => Promise<ActionResult>;
}
```

Removed: `publishAction(csId, term, rows)` (row-bulk shape) — no longer
meaningful once status is per-cell; replaced by `submitCellAction` fanned out
client-side by the screen component (§3), not by the VM/DI layer.

### `grade-book-screen.i-vm.ts`

```ts
export interface GradeBookScreenVM {
  role: GradeBookRole;
  classSubjects: ClassSubjectOption[]; // see §5 shape change
  selectedClassId: string | null;   // was selectedCsId
  selectedSubjectId: string | null; // NEW
  selectedTerm: string | null;
  gradeBook: GradeBook | null; // rows[].scores becomes Record<columnId, ScoreCell>
  isPublished: boolean;
  error: GradesFailure["type"] | null;
  gradeEntryPath?: string;
  childrenList?: ChildSummary[];
  activeChildId?: string;

  /** NEW — admin/manager only (§4). Undefined for teacher/student/parent —
   *  screen gates the lock button's render on this being present, not just
   *  on `vm.role`, so the container/DI layer is the single source of truth
   *  for whether the actor is actually authorized (belt-and-suspenders with
   *  the BE's own 403 GRADE_ENTRY_FORBIDDEN gate). */
  lockTermAction?: (
    classId: string,
    subjectId: string,
    termId: string,
  ) => Promise<ActionResult>;
}
```

`GradeBookTable` (shared component, `src/components/shared/grade-book-table/`)
prop delta: `GradeBookRow.scores` type changes from `Record<string, number |
null>` to `Record<string, ScoreCell>` (cell reads `.value` where it currently
reads the raw number, and renders `GradeEntryStatusBadge` per §1/§2 next to
each score) — `fe-component-architect`/`fe-state-engineer` own the exact
entity-level type, this doc only specifies the *presentation* consumption.

---

## Summary of new/changed files (presentation layer only)

| File | Change |
| --- | --- |
| `src/components/shared/grade-entry-status-badge/` | **NEW** — folder + `index.ts` + `.stories.tsx` (draft/pending/published/locked + mixed-row states) |
| `src/features/grades/presentation/grade-entry-screen/grade-entry-table.tsx` | Renders `GradeEntryStatusBadge` per cell + row header; per-cell/per-row submit affordance |
| `src/features/grades/presentation/grade-entry-screen/grade-entry-screen.tsx` | Replace single Publish button+dialog with row/bulk submit actions (§3); partial-failure banner |
| `src/features/grades/presentation/grade-entry-screen/grade-entry-screen.i-vm.ts` | §6 delta |
| `src/components/shared/grade-book-table/grade-book-table.tsx` | Renders `GradeEntryStatusBadge` per cell + row header (§1/§2) |
| `src/features/grades/presentation/grade-book-screen/grade-book-screen.tsx` | NEW admin/principal "Lock term" button + `DestructiveConfirmDialog` (§4) |
| `src/features/grades/presentation/grade-book-screen/grade-book-screen.i-vm.ts` | §6 delta |
| `messages/{vi,en}.json` | new `gradeCellStatus.*` namespace + lock-term/row-submit/bulk-submit/partial-failure copy keys |
| `grade-approval-screen/**`, `child-switcher/**` | **untouched** (ADR 0054 scope) |
