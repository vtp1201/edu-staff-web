# US-E09.6 — Student Absences (Teacher/GVCN + Principal) — Implementation Plan

Lane: **normal**, but `spec.md` §"High-Risk-Grade Security Enforcement"
(teacher class-ownership re-check on record/edit, principal-tier re-check on
flag, no-optimistic-flip) is release-blocking at the SAME rigor as a
high-risk lane. This plan gives it its own phase (Phase 8), not folded into
general testing — mirrors `US-E09.5`'s plan.md Phase 8.

## Precedent this plan reuses (do not rebuild)

- **Force-mocked DI, permanently, regardless of `NEXT_PUBLIC_USE_MOCK`**:
  `src/bootstrap/di/discipline.di.ts` / `staff-discipline.di.ts`'s `makeRepo()`
  doc-comment is the exact pattern + justification (roster-UUID gap) to
  mirror verbatim for `bootstrap/di/student-absence.di.ts`.
- **Server-derived auth-context resolver (pure function seam)**:
  `src/features/staff-discipline/domain/use-cases/resolve-staff-discipline-auth-context.ts`
  + its `.test.ts` is the EXACT shape to mirror for
  `resolve-student-absence-auth-context.ts` — decode role/memberId from the
  httpOnly access token via `decodeRoleClaim`/`decodeSubClaim`
  (`bootstrap/lib/jwt.ts`), deny-by-default to a non-privileged role when the
  claim is unreadable, `mockRoleHint` used ONLY when `USE_MOCK` is true (real
  mode: token claim always wins). This story's context additionally carries
  `classId` (the teacher's homeroom class) — staff-discipline's didn't need a
  class dimension, student-absences does (FR-008/NFR-008).
- **Dedicated security test file**:
  `src/features/staff-discipline/infrastructure/repositories/mocks/staff-discipline.mock.repository.security.test.ts`
  — pattern for `student-absence.mock.repository.security.test.ts` (forged
  `classId`/role rejected by the mock repo itself, not just UI-hidden).
- **Endpoint constants file, written but never invoked**:
  `src/bootstrap/endpoint/staff-discipline.endpoint.ts` — doc-comment shape
  ("never invoked today... written now so a future real-wiring story has the
  ground-truthed paths ready") to mirror for `student-absence.endpoint.ts`.
- **App routes + actions**: `(app)/principal/staff-discipline/{page.tsx,actions.ts}`,
  `(app)/teacher/staff-discipline/{page.tsx,actions.ts}` — RSC reads role-scoped
  data via DI factories, soft-fail to VM's `initialErrorKey`, each route folder
  owns its OWN thin `actions.ts` (Server Actions are file-scoped, cannot
  literally share) importing the SAME DI factories. Mirror at
  `(app)/teacher/absences/` and `(app)/principal/absences/` per ADR `0062`.
- **One-component-multi-role-route pattern**: `discipline-screen.tsx` /
  `staff-discipline-screen.tsx` serve two routes from one role-conditional
  component via a `role` prop. `StudentAbsencesScreen` does the same for
  `/teacher/absences` / `/principal/absences`.
- **Reference mockup** (structural blueprint, not literal copy — decision
  `0011`): `design_src/edu/student-absences.jsx` —
  `StudentAbsencesScreen`, `SAAbsenceRow`, `SAExcusedBadge`,
  `SAFlaggedIndicator`, `SARecordForm`, `SAFlagConfirmDialog`, `SADateField`,
  mock roster `SA_STUDENT_ROSTER`, mock teacher `SA_CURRENT_TEACHER`
  (`homeroomClassId`).
- **Normative layout/token spec**: `docs/product/design-spec.jsonc` →
  `screens.studentAbsences` (~line 10403) — badge color mapping, layout
  padding, a11y notes, `i18nNew` key list (all keys CONFIRMED already present
  verbatim in `src/bootstrap/i18n/messages/{vi,en}.json` under
  `studentAbsences.*` — reuse, do not regenerate; see §5 below).

## 1. Domain shape decision — genuinely new, independent of `staff-discipline`/`discipline`

Per fe-lead's explicit instruction: this is a 2-state, one-way domain
(`RECORDED → FLAGGED_UNEXCUSED`), NOT the shared `ApprovalTransition`
(DRAFT/SUBMITTED/APPROVED/REJECTED) shape. No import of
`ApprovalTransition`/`DisciplineFailure`/`StaffDisciplineFailure` anywhere in
this feature. One repository interface (4 methods, no `unflag`), one failure
union (8 members, zero code overlap with the two siblings — confirmed by
`integration.md` §1's grep of `DisciplineFailure`).

## 2. Domain layer (`src/features/student-absences/domain/`)

### Entities (`domain/entities/`)

- `student-absence.entity.ts` — `StudentAbsenceEntity` (`classId,
  studentMemberId, date, reason?, excused, state:
  "RECORDED"|"FLAGGED_UNEXCUSED", recordedByMemberId, flaggedByMemberId?,
  createdAt, updatedAt` — exact wire shape per `integration.md`/`spec.md` §6)
  + input types `RecordStudentAbsenceInput` (classId, studentMemberId, date,
  excused, reason?) + `EditStudentAbsenceInput` (classId, studentMemberId,
  date — natural key, NOT sent as edit body; reason?, excused? — independently
  optional PATCH fields).
- `student-roster-entry.entity.ts` — `StudentRosterEntry` (`studentMemberId,
  fullName, className`) — client-only, never on the wire (FR-010).
- `student-absence-auth-context.entity.ts` — `StudentAbsenceAuthContext`
  (`role: "teacher"|"principal"|<other>`, `memberId: string`, `classId:
  string` — the teacher's own homeroom class; empty/unused for principal).

### Failure (`domain/failures/student-absence.failure.ts`)

Genuinely new union, zero reuse (per `integration.md`/`spec.md` §6 verbatim):

```ts
type StudentAbsenceFailure =
  | { type: "forbidden" }       // ABSENCE_FORBIDDEN (403)
  | { type: "not-found" }       // ABSENCE_NOT_FOUND (404)
  | { type: "duplicate-date" }  // ABSENCE_DUPLICATE_DATE (409)
  | { type: "invalid-date" }    // ABSENCE_INVALID_DATE (422) — FUTURE date;
                                  //   i18n key is `invalid-date-future`, NOT
                                  //   `invalid-date` (avoid collision with
                                  //   discipline's opposite-direction key)
  | { type: "invalid-state" }   // ABSENCE_INVALID_STATE (400, backstop)
  | { type: "invalid-id" }      // ABSENCE_INVALID_ID (400, backstop)
  | { type: "invalid-input" }   // ABSENCE_INVALID_INPUT (422, backstop)
  | { type: "network-error" };
```

`type` values map to `studentAbsences.errors.<type>` EXCEPT `"invalid-date"`
which maps to `studentAbsences.errors.invalid-date-future` (already-authored
key per `design-spec.jsonc`'s `i18nNew` list — the mapper from failure-type
to i18n key needs this one explicit override, everywhere else `type` ===
i18n leaf name).

### Repository interface (`domain/repositories/i-student-absence.repository.ts`)

4 methods, `Promise<T>`-returning, throws typed `StudentAbsenceFailure`
(matches `IDisciplineRepository`/`IStaffDisciplineRepository` convention —
not `Result<T,E>`, epic-internal consistency). **No `unflag` method
signature exists** (FR-006/FR-013 — architecturally absent, not
permission-gated):

```ts
interface IStudentAbsenceRepository {
  listAbsences(params: {
    classId?: string; // required server-side for teacher, optional filter for principal
    from?: string;
    to?: string;
  }): Promise<StudentAbsenceEntity[]>;
  recordAbsence(input: RecordStudentAbsenceInput): Promise<StudentAbsenceEntity>;
  editAbsence(input: EditStudentAbsenceInput): Promise<StudentAbsenceEntity>;
  flagAbsence(params: {
    classId: string;
    studentMemberId: string;
    date: string;
  }): Promise<StudentAbsenceEntity>;
}
```

Every method takes/derives its authorization context from
`StudentAbsenceAuthContext` (constructor-injected into the mock repository,
see §3) — NOT from a param a caller could forge client-side; the forgeable
surface for the security tests is the `classId`/`date` args to
record/edit/flag, checked against the injected context's `role`/`classId`.

### Use-cases (`domain/use-cases/`, TDD, test-first)

Thin orchestration classes (mirrors `RecordViolationUseCase` shape —
constructor-injected repo, `execute()`, one `.use-case.test.ts` per use-case
with a `vi.fn()`-mocked repo):

1. `list-student-absences.use-case.ts` — passthrough delegate (server/mock-repo
   is the enforcement boundary, not re-validated here).
2. `record-student-absence.use-case.ts` — client-side guards (defense in
   depth, mirrors server's `ABSENCE_INVALID_DATE`/`ABSENCE_INVALID_INPUT`):
   - `date` must be a bare `YYYY-MM-DD` and ≤ today (inject a clock, never
     real `Date.now()` in tests per `.claude/rules/tdd.md`) — export a pure
     function `isFutureDate(date: string, today: string): boolean`
     (independently unit-tested, no repo mock needed).
   - `reason` ≤ 5000 chars if present.
   - Does NOT do the duplicate-date pre-check here (that's a PRESENTATION
     concern reading the currently-loaded list — see §4) — the use-case's
     job is field validation + delegating; duplicate rejection ultimately
     comes from the repo/server (E4 in `use-cases.md`).
3. `edit-student-absence.use-case.ts` — client-side guard: `reason` ≤ 5000
   chars if present; PATCH body only includes changed field(s) (caller
   passes only what changed — use-case does NOT re-send an unchanged echo,
   AC-004.2).
4. `flag-student-absence.use-case.ts` — passthrough delegate; the confirm
   gate + no-optimistic-update rule are PRESENTATION concerns (§4), the
   use-case's only job is the single round-trip call.

**Pure, independently-testable seams** (colocate in `domain/use-cases/` per
`.claude/rules/tdd.md` — unit-testable without a repo mock):
- `is-future-date.ts` — `isFutureDate(date, today): boolean` (bare-date
  string compare, no `Date.now()`).
- `is-duplicate-absence.ts` — `isDuplicateAbsence(candidate: {classId,
  studentMemberId, date}, existing: StudentAbsenceEntity[]): boolean` — the
  client-side pre-check logic (FR-003/AC-003.5), called from presentation
  before submit, unit-tested here independent of any UI.

## 3. Infrastructure (`src/features/student-absences/infrastructure/`)

### DTOs (`infrastructure/dtos/student-absence-response.dto.ts`)

camelCase wire shape, identical field set to the entity (no
`studentName`/`className` — those never travel the wire, per
`integration.md` §2's explicit note).

### Mapper (`infrastructure/mappers/student-absence.mapper.ts`)

`toStudentAbsenceEntity(dto)` — pure DTO→entity (1:1 field copy, no roster
resolution needed on the entity itself — display-name resolution happens at
the PRESENTATION layer by joining `studentMemberId` against the VM's static
`roster: StudentRosterEntry[]`, mirroring how `staff-discipline`'s mapper
resolves at the boundary instead: **decision for this story — resolve
display name in presentation, not in the mapper**, because unlike
`staff-discipline`'s single fixed roster the display join here is trivially
a `find()` over a small array already passed to the client component; adding
a mapper-level join would require threading the roster into every mapper
call for no benefit). Pure function, unit-tested independent of any repo.

### Mock repository (`infrastructure/repositories/mocks/student-absence.mock.repository.ts` + `fixtures.ts`)

`server-only`, in-memory array + module-scoped mutable state, mirrors
`MockStaffDisciplineRepository`'s exact pattern. Constructor takes the
`StudentAbsenceAuthContext` (role/memberId/classId) so every mutating method
enforces scope BEFORE touching state — this is the load-bearing security
boundary until real `core` wiring (per `spec.md`'s security section).

**Required fixtures** (verbatim from `integration.md` §4 / `spec.md` §6):

- `SA_STUDENT_ROSTER` — fixed roster, one mock teacher's own homeroom class
  only (`studentMemberId → fullName, className`), mirrors
  `design_src/edu/student-absences.jsx`'s `SA_STUDENT_ROSTER` /
  `SA_CURRENT_TEACHER.homeroomClassId`.
- Seeded records: `RECORDED`+`excused:true`, `RECORDED`+`excused:false`,
  `FLAGGED_UNEXCUSED` (≥1 each) — full orthogonal-combination coverage for
  FR-007/AC-007.4 (including one record that is BOTH `excused:true` AND
  `FLAGGED_UNEXCUSED`, proving the signals are independent).
- **Duplicate-date simulation**: recording for an already-seeded
  `classId+studentMemberId+date` → throws `{ type: "duplicate-date" }`
  (409).
- **Future-date simulation**: recording/editing with a date after a mock
  injectable "today" (constructor/param clock, never real `Date.now()`) →
  throws `{ type: "invalid-date" }` (422).
- **Forbidden-class simulation**: `recordAbsence`/`editAbsence` called with a
  `classId` that does not equal the injected auth context's `classId` →
  throws `{ type: "forbidden" }` (403) — BEFORE any state mutation.
- **Re-flag simulation**: `flagAbsence` called against a seeded record whose
  state is already `FLAGGED_UNEXCUSED` → throws `{ type: "invalid-state" }`
  (400, backstop).
- **Non-principal-flag simulation**: `flagAbsence` called when the injected
  auth context's `role !== "principal"` → throws `{ type: "forbidden" }`
  (403) — BEFORE any state mutation.
- No `unflag`-shaped method anywhere in the class (FR-006/FR-013).

### Dedicated security test file (`student-absence.mock.repository.security.test.ts`)

Mirrors `staff-discipline.mock.repository.security.test.ts` — direct
invocation of the mock repo (constructed with a forged/altered
`StudentAbsenceAuthContext`) for:
1. Teacher forging a `classId` outside their own homeroom on
   `recordAbsence`/`editAbsence` → `{ type: "forbidden" }`, no mutation.
2. Non-`principal` role invoking `flagAbsence` → `{ type: "forbidden" }`, no
   state transition.
3. Re-flag attempt on an already-`FLAGGED_UNEXCUSED` seed → `{ type:
   "invalid-state" }`.

These MUST NOT be satisfiable by a UI-hidden-affordance test alone — see
Phase 8.

### Endpoint constants (`bootstrap/endpoint/student-absence.endpoint.ts`)

Document-only (never invoked while `makeRepo()` force-mocks), same
doc-comment style as `staff-discipline.endpoint.ts`, 4 paths per
`integration.md` §2:

```ts
export const STUDENT_ABSENCE_EP = {
  record: "/core/api/v1/conduct/student-absences",
  list: "/core/api/v1/conduct/student-absences",
  edit: (date: string) => `/core/api/v1/conduct/student-absences/${date}`, // + ?classId=&studentMemberId=
  flag: (date: string) => `/core/api/v1/conduct/student-absences/${date}/flag`, // + ?classId=&studentMemberId=
} as const;
```

### DI factory (`bootstrap/di/student-absence.di.ts`)

`server-only`; `makeRepo()` returns `new MockStudentAbsenceRepository(authContext)`
UNCONDITIONALLY (copy `discipline.di.ts`/`staff-discipline.di.ts`'s doc-comment
justification, adapted to the roster-UUID gap cited in `spec.md` §8). Exposes:

- `makeStudentAbsenceAuthContext(mockRoleHint: "teacher" | "principal"):
  Promise<StudentAbsenceAuthContext>` — decodes role/memberId from the
  httpOnly access token (`getAccessToken()` + `decodeRoleClaim`/
  `decodeSubClaim`), deny-by-default when unreadable, `mockRoleHint` used
  ONLY in mock mode. Mirrors
  `makeStaffDisciplineAuthContext` verbatim, plus resolves a mock `classId`
  constant (`SA_TEACHER_CLASS_ID`) for the teacher hint.
- `makeListStudentAbsencesUseCase()`, `makeRecordStudentAbsenceUseCase()`,
  `makeEditStudentAbsenceUseCase()`, `makeFlagStudentAbsenceUseCase()` — each
  `async () => new XxxUseCase(await makeRepo(await makeStudentAbsenceAuthContext(...)))`
  — actual role hint threaded from the calling route's `actions.ts` (teacher
  routes always hint `"teacher"`, principal routes always hint
  `"principal"`), consistent with `staff-discipline`'s per-route hint
  pattern.
- `makeStudentAbsenceRepository(mockRoleHint)` exported directly for the RSC
  page's list call if the use-case wrapper adds no value for the pure-read
  path (matches `US-E19.2`/`US-E09.5`'s precedent of skipping a use-case for
  pure passthrough reads — not a hard requirement).

## 4. Presentation (`src/features/student-absences/presentation/student-absences-screen/`)

### Component tree

```
StudentAbsencesScreen (role-conditional container, 'use client')
├── summary stats row — 3-up StatCard (total/unexcused/flagged), client-derived
├── filter bar — date-range (both roles) + class dropdown (principal only)
├── EduSkeleton (loading, rows, count=4) / EduEmpty (2 role variants) / EduError+retry
├── SAAbsenceRow (×N)
│   ├── student (resolved via roster.find), date, reason
│   ├── SAExcusedBadge (always)
│   ├── SAFlaggedIndicator (only if state===FLAGGED_UNEXCUSED)
│   ├── edit action (teacher only, own-class rows)
│   └── "Gắn cờ" action (principal only, state===RECORDED rows only)
├── "Ghi nhận nghỉ học" CTA (teacher only, header + empty-state variant) → SARecordForm dialog
├── SARecordForm (dialog) — SADateField (max=today) + student select
│   (SA_STUDENT_ROSTER, own class) + excused segmented toggle + reason textarea
├── edit dialog (teacher only) — same shape as SARecordForm but date/class/
│   student rendered as STATIC TEXT, only excused/reason editable
└── SAFlagConfirmDialog (principal only, role="dialog", aria-modal, focus-trapped)
```

Shared leaves: `SAExcusedBadge`, `SAFlaggedIndicator` — genuinely two
distinct elements, never merged (FR-007). `SADateField` reused by both
record and edit forms (edit form renders it as static text instead when
disabled — confirm with `fe-component-architect` whether `SADateField`
itself grows a `readOnly`/static-render mode, or the edit form simply
doesn't render `SADateField` at all and renders plain text instead — **lean
toward the latter** (AC-004.3 requires the field is NEVER an input/select of
ANY kind including disabled, so `SADateField` with a "disabled" prop would
risk failing that AC; a wholly separate static-text render is safer and
simpler — flag this explicitly to `fe-component-architect`).

### ViewModel contract (`student-absences-screen.i-vm.ts`)

- `role: "teacher" | "principal"`.
- `classId?: string` (teacher's own homeroom — used to scope record/edit;
  undefined/unused for principal).
- `initialAbsences: StudentAbsenceEntity[]`, `initialErrorKey?:
  StudentAbsenceFailure["type"]` (soft-fail RSC pattern — preserve the key,
  do not silently render empty on error).
- `roster: StudentRosterEntry[]` (static, teacher's own class only — for
  teacher role; principal role does not need it since it never records).
- `classOptions?: { classId: string; className: string }[]` (principal's
  class-filter dropdown — small static list, not paginated).
- Server Action refs: `listAbsencesAction`, `recordAbsenceAction`,
  `editAbsenceAction`, `flagAbsenceAction`.

### State classification (flag for `fe-state-engineer` — lighter-weight than US-E09.5)

- **Server state (TanStack Query)**: ONE query family
  `studentAbsenceKeys.list({ classId?, from?, to? })` — simpler than
  `staff-discipline`'s 2 independent families since this feature has only
  one list, not a tabbed pair. Loading/empty/error per the single query.
- **URL/local state**: date-range filter, principal's class-filter dropdown
  (client-side param feeding the query key, not a route navigation).
- **Mutations**: `recordAbsence`, `editAbsence`, `flagAbsence` — each
  invalidates `studentAbsenceKeys.list(*)` on success. `flagAbsence`
  explicitly has **NO optimistic update** (AC-005.3/NFR-008 pt 3 — the
  hardest state-design constraint in this story: the row must NOT show
  `FLAGGED_UNEXCUSED`/the flagged indicator until the mutation's `onSuccess`
  updates the cache from the server response, not from an
  `onMutate`-optimistic patch).
- **Local-form state**: record dialog fields, edit dialog fields — plain
  form state, no query lib.
- **Client-side duplicate-date pre-check** (`isDuplicateAbsence`, §2) reads
  from the already-loaded list query's cached data, not a separate fetch.

This is simpler than `US-E09.5` (1 query family vs 2, 3 mutations vs 8) but
still warrants a `fe-state-engineer` pass specifically for the
no-optimistic-flag-update rule and the query-key filter shape (`classId`
required-vs-optional depending on role).

## 5. i18n — reuse-only, CONFIRMED present (no new keys needed)

Verified directly in `src/bootstrap/i18n/messages/vi.json` (`studentAbsences`
namespace, lines ~3846–3897) — every key `design-spec.jsonc`'s `i18nNew` list
references already exists: `columns.*`, `empty`, `error`, `errors.*`
(including `invalid-date-future`, NOT `invalid-date`), `excused`/`unexcused`,
`filters.*`, `flagAction`, `flagConfirm.*`, `flagged`, `form.*`
(`recordTitle`/`editTitle`/`dateFutureHelper`/etc.), `loading`, `retry`,
`subtitle`, `title`. `en.json` mirror not independently re-verified in this
pass but is expected structurally identical per the repo's i18n convention —
**`fe-nextjs-engineer` should spot-check `en.json` has the same key set
before Phase 5** (cheap grep, not re-authoring).

The two role-scoped empty-state variants (teacher: CTA, principal: static,
no CTA) do NOT need two separate i18n keys — both reuse `studentAbsences.empty`
for the copy; the CTA button itself reuses `studentAbsences.form.recordTitle`
("Ghi nhận nghỉ học") as its label, rendered conditionally by role, not by a
second i18n string.

## 6. Routes (`(app)/teacher/absences/`, `(app)/principal/absences/`)

- `(app)/teacher/absences/page.tsx` (RSC) — calls
  `makeStudentAbsenceRepository("teacher")` (or the list use-case) for the
  initial list + reads the static roster/class-id, passes VM to
  `StudentAbsencesScreen role="teacher"`. Default date-range: `[OPEN
  QUESTION carried]` — pick a reasonable default (e.g. current month) in
  Phase 6, not blocking, per spec.md §8 OQ2.
- `(app)/principal/absences/page.tsx` (RSC) — calls
  `makeStudentAbsenceRepository("principal")` for schoolwide list (no
  `classId`), passes VM to `StudentAbsencesScreen role="principal"`.
- Each route folder gets its OWN thin `actions.ts` importing the SAME
  `bootstrap/di/student-absence.di.ts` factories (Server Actions are
  file-scoped, cannot literally share — same pattern as
  `staff-discipline`'s two `actions.ts` files). No new route-level guard —
  reuse the existing per-role-group RSC guard at
  `(app)/teacher/**`/`(app)/principal/**`.
- **No `(app)/admin/absences` route** — explicitly dropped per ADR `0062`,
  do not create it, do not add a redirect/alias for it.

## 7. Component-architect / state-engineer — recommend both, lighter scope than US-E09.5

- `fe-component-architect`: confirm/refine the `StudentAbsencesScreen` →
  `SAAbsenceRow` → `SAExcusedBadge`/`SAFlaggedIndicator` tree above; resolve
  the "is `SADateField` reusable in edit mode or does edit need a wholly
  separate static-text render" question from §4 BEFORE `fe-nextjs-engineer`
  starts (this affects `SADateField`'s prop contract); finalize
  `SARecordForm`/edit-dialog/`SAFlagConfirmDialog` prop contracts.
- `fe-state-engineer`: confirm the single `studentAbsenceKeys.list(filter)`
  family + 3-mutation invalidation graph is sufficient (vs needing separate
  keys per role) and specifically design the no-optimistic-update mechanics
  for `flagAbsence` (this is the story's single hardest state-design
  constraint — get it wrong and AC-005.3 fails).

## 8. TDD phase breakdown (red → green → refactor per layer)

### Phase 1 — Domain
- Files: `domain/entities/{student-absence,student-roster-entry,
  student-absence-auth-context}.entity.ts`,
  `domain/failures/student-absence.failure.ts`,
  `domain/repositories/i-student-absence.repository.ts`,
  `domain/use-cases/{list,record,edit,flag}-student-absence.use-case.ts`,
  `domain/use-cases/{is-future-date,is-duplicate-absence}.ts`,
  `domain/use-cases/resolve-student-absence-auth-context.ts`.
- Test first: one `.use-case.test.ts` per use-case (`vi.fn()`-mocked repo) —
  happy path + client-side validation branches; standalone tests for
  `isFutureDate`, `isDuplicateAbsence`, and
  `resolveStudentAbsenceAuthContext` (deny-by-default on unreadable claim,
  mock-hint ignored in real mode — mirrors
  `resolve-staff-discipline-auth-context.test.ts`).
- Done when: all 4 use-case tests + 3 pure-function tests green.

### Phase 2 — Infrastructure
- Files: `infrastructure/dtos/student-absence-response.dto.ts`,
  `infrastructure/mappers/student-absence.mapper.ts`,
  `infrastructure/repositories/mocks/{student-absence.mock.repository.ts,
  fixtures.ts,student-absence.mock.repository.security.test.ts}`.
- Test first: mapper unit test (DTO→entity, pure field copy); mock
  repository tests covering all 4 methods' happy paths + ALL error
  simulations (duplicate-date, future-date, forbidden-class, re-flag,
  non-principal-flag) — write the dedicated security test file HERE, not
  deferred to Phase 8 (Phase 8 re-confirms it's present and sufficient, it
  doesn't defer writing it).
- Done when: mapper + mock-repo tests green, including all 5 error
  simulations independently asserted.

### Phase 3 — Bootstrap wiring
- Files: `bootstrap/endpoint/student-absence.endpoint.ts`,
  `bootstrap/di/student-absence.di.ts`.
- Test first: none required (thin wiring) — confirm `bunx tsc --noEmit`
  clean and the DI factory only importable from `server-only` contexts.
- Done when: factories compile and are consumed by Phase 6 actions.

### Phase 4 — Component architecture + state design (gate before Phase 5)
- `fe-component-architect` + `fe-state-engineer` deliverables per §7, added
  to this packet.
- Done when: both specialists sign off (component tree + `SADateField`
  edit-mode decision + query-key/no-optimistic-flag design confirmed) to
  `fe-lead`.

### Phase 5 — Presentation
- Files: `presentation/student-absences-screen/{student-absences-screen.i-vm.ts,
  student-absences-screen.tsx,student-absences-screen.query-keys.ts}` +
  sub-components (`sa-excused-badge.tsx`, `sa-flagged-indicator.tsx`,
  `sa-date-field.tsx`, `sa-absence-row.tsx`, `sa-record-form.tsx` (or
  `sa-absence-form.tsx` shared by record+edit if the component-architect
  confirms one form with mode prop), `sa-flag-confirm-dialog.tsx`,
  `sa-stats-row.tsx`) + `.stories.tsx`.
- i18n: reuse `studentAbsences.*` verbatim (§5) — zero new keys, zero
  hardcoded strings.
- Test first: Storybook interaction stories per `story.md`'s Validation
  table (TeacherList_Loading/Empty/Error/Success,
  PrincipalList_Loading/Empty/Error/Success,
  RecordDialog_FutureDate/DuplicateDate/Success,
  EditDialog_ImmutableFields/Success,
  FlagConfirmDialog_NoOptimisticUpdate/Success/Forbidden,
  TwoBadges_AllCombinations, Responsive 320/375/768/1280).
- Done when: all listed stories pass interaction assertions; design-review
  gate checklist ready (tokens/a11y/states).

### Phase 6 — Routes
- Files: `(app)/teacher/absences/{page.tsx,actions.ts}`,
  `(app)/principal/absences/{page.tsx,actions.ts}`.
- Test first: n/a at RSC layer (thin glue) — covered by Phase 5's Storybook
  + Phase 8's direct-invocation security tests; confirm `bun run build`
  succeeds with both new routes present (Platform proof row) and that NO
  `(app)/admin/absences` route exists.
- Done when: both routes render locally against mock data; existing
  per-role-group guards redirect wrong roles.

### Phase 8 — Security-grade proof sweep (NFR-008/NFR-009 — MANDATORY, release-blocking)

Per `spec.md`'s "High-Risk-Grade Security Enforcement" section — own phase,
explicitly checked off:

- [ ] **Direct-invocation forbidden-class test**: calls the mock repository
      directly with a forged `classId` (not the injected context's own
      class) for BOTH `recordAbsence` and `editAbsence` → asserts
      `{ type: "forbidden" }`, no mutation. A UI-hidden-CTA test alone does
      NOT satisfy this (AC-006.2, AC-006.4).
- [ ] **Direct-invocation non-principal-flag test**: calls
      `flagAbsence` directly with a non-`principal` auth context → asserts
      `{ type: "forbidden" }`, no state transition (AC-006.1, AC-006.4).
- [ ] **Re-flag backstop test**: `flagAbsence` against the seeded
      `FLAGGED_UNEXCUSED` fixture → asserts `{ type: "invalid-state" }`
      even though the UI already hides the action on that row (AC-005.8).
- [ ] **No-optimistic-update test**: a Storybook/interaction assertion (or
      TanStack Query test) that the row's rendered `state`/badges do NOT
      change between clicking confirm and the mutation settling — i.e. no
      `onMutate` optimistic patch exists on the flag mutation (AC-005.3).
- [ ] **Principal-zero-affordance test**: a rendering assertion that no
      record-CTA/edit-control exists anywhere in the principal's rendered
      view, for any row (AC-006.5).
- [ ] `fe-tech-lead-reviewer` + a dedicated security-focused pass confirm all
      5 items above with concrete test file references before design-review
      gate — this is `story.md`'s Validation table's release-blocking row,
      distinct from the general design-review gate.

### Phase 9 — Full TDD sweep + TEST_MATRIX flip
- Confirm every row in `story.md`'s Validation table has a corresponding
  test/story; flip `docs/TEST_MATRIX.md` US-E09.6 proof columns via
  `scripts/bin/harness-cli story update --id US-E09.6 --unit 1 --integration 1 --e2e 1 --platform 1`
  only once all layers are green.
- `bunx tsc --noEmit` clean, `bun run build` succeeds with both routes
  present and NO `(app)/admin/absences` route.
- Design-review gate (`docs/DESIGN_REVIEW.md` + `/impeccable`) AND the
  dedicated Phase 8 security confirmation are BOTH release-blocking per
  `spec.md` §10.

## Risks, dependencies, open questions

Carried forward from `spec.md` §8 (not resolved here, per fe-lead's brief —
listed for completeness):

1. INT-002 list pagination shape unconfirmed — plan treats it as a bounded,
   unpaginated array (`useQuery`, not `useInfiniteQuery`).
2. Default `from`/`to` date range on first load is a fe/uiux call, not fixed
   by the contract — Phase 6 picks a reasonable default (current month),
   not blocking.
3. Long reason/note truncation in row display is unspecified — plan assumes
   wrap-not-clip (matches the edit/record form's 5000-char hard cap, just no
   row-level truncation).
4. `core`'s exact HTTP status codes (403/404/409/422/400) are
   Go-source-derived, not `ERROR_CODES.md`-confirmed — low risk, consistent
   with sibling conventions.
5. No ADR required (confirmed across requirements/integration/use-cases/spec
   — no new auth/RBAC rule beyond ADR `0062`, no new token, no new token/CSS
   need, no new data-contract decision).

**New risk surfaced during this planning pass (beyond spec.md §8):**

6. **`SADateField` edit-mode ambiguity (component-tree risk, not a spec
   gap)**: AC-004.3 requires `date`/`classId`/`studentMemberId` render as
   STATIC TEXT in the edit form, "even a disabled [input]" fails the AC. If
   `fe-component-architect` reuses `SADateField` with a `disabled` prop for
   the edit view, that risks literally failing AC-004.3's stated bar (a
   `disabled` `<input type="date">` is still an input element). Flagging
   explicitly so Phase 4's component-architecture pass makes an intentional
   choice (separate static-text render, not a disabled-prop reuse) rather
   than discovering this failure during design-review.
7. **`en.json` mirror not independently spot-checked in this planning pass**
   (§5) — low risk (repo convention is vi/en always added together), but
   `fe-nextjs-engineer` should grep-confirm before Phase 5 rather than
   assume.
8. **Auth-context `classId` dimension is new relative to `staff-discipline`'s
   precedent** (which only carried `memberId`/`staffMemberId`, no class
   dimension) — `resolve-student-absence-auth-context.ts` is structurally
   similar but not a literal copy; Phase 1's pure-function test must cover
   the `classId` deny-by-default case explicitly (unreadable claim → empty
   `classId`, which then fails every teacher-scope check by construction,
   which is the correct deny-by-default behavior).
