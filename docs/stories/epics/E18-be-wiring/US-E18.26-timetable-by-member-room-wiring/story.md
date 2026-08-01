# US-E18.26 Timetable by-member views + slot `room` field wiring

## Status

planned

## Lane

normal — read-mostly un-mocking (student self-view, teacher personal
schedule, parent child-view) + one additive write field (`room`) on an
already-real write path (admin builder `PUT`). No auth/RBAC model change (the
web only CONSUMES the BE's existing self/linked-parent/ADMIN authorization —
it does not introduce a new gate), no token/session change, no tenant-
isolation change, no data-loss risk (room is additive, optional), no PII
newly exposed (student memberIds were already visible via `linked-students`
in US-E18.11's mock; this US only adds `classId`/`className` to that same
list — still no student display name). Two user-visible changes: (1) the
builder's room input now persists (previously silently discarded — bug fix,
not new UI); (2) parent child-picker gains a real `className` badge and must
decide an honest fallback for the still-missing student display name
(residual ask #20) — **this is the one change that needs the design-review
gate**, everything else is transparent DI/mapper/entity rewiring with zero
ViewModel/presentation diff (same "zero UI regression" precedent as
US-E18.11).

## Dependencies

- Depends on: US-E18.11 (`implemented` — this US extends its `timetable` +
  `admin/timetable` feature modules, does not redo them) — no BLOCKING
  ordering dependency on anything else in-flight.
- Blocks: none.
- Feature module(s) touched: `src/features/timetable/` (consumer views:
  student/teacher/parent), `src/features/admin/timetable/` (builder — `room`
  field only), `src/bootstrap/endpoint/{timetable,timetable-view}.endpoint.ts`,
  `src/bootstrap/di/{timetable,timetable-view}.di.ts`.
- Shared file: `src/bootstrap/i18n/messages/{vi,en}.json` — no new namespace,
  possibly new keys under existing `timetableView`/`timetable` namespaces
  (e.g. a child-picker fallback label) — additive only.
- Claim check (2026-08-01): `git branch -r` shows only `origin/main` — solo,
  no worktree needed, work on a normal branch.

## Ground-truthed BE contract (edu-api origin/main, verified 2026-08-01 —
`services/core/docs/{openapi.yaml,INTEGRATION.md,ERROR_CODES.md}` +
`docs/stories/epics/E04-core-school-operations/US-153-*.md` /
`US-148-member-self-scope-enrollment.md`)

### 1. `GET /api/v1/members/{memberId}/timetable?termId=` (BE US-153) — NEW

```
200 → MemberTimetableResponse { memberId, termId, slots: SlotResponse[] }
SlotResponse now (additive vs US-E18.11's TimetableResponse.slots shape):
  { classId (ALWAYS present — slots may span several classes),
    day, period, subjectId, subjectName? (server-resolved, omitted if
    unresolvable — client no longer needs a subject-catalogue join),
    teacherMemberId, room? (omitted when unset) }
```

Subject resolution (server-side, data-driven, NOT from the caller's claimed
role):
1. if the member holds teaching slots in the term (from the
   `teacher_schedule` clone) → those slots (may span multiple classes, hence
   per-slot `classId`);
2. else the member's CURRENT enrollment (US-148) → that class's timetable;
3. a PARENT reading their OWN `memberId` gets the linked child's schedule
   **only when exactly one child is linked**; with several children → 422
   `TIMETABLE_CHILD_AMBIGUOUS` (client must address the child's `memberId`
   directly, from `linked-students`).

Authorization: the member themself, a verified linked PARENT, or
ADMIN/SUPER_ADMIN. Every other actor gets the SAME 403 `TIMETABLE_FORBIDDEN`
whether the target exists or not (cannot enumerate members). A TEACHER has NO
tenant-wide breadth here — another member's week is not "teaching a class".

Error codes (new, add to `TimetableViewFailure`):
- `404 TIMETABLE_MEMBER_NOT_RESOLVABLE` — authorized caller, target has
  neither teaching slots nor a current enrollment. (An enrolled member with
  an empty class schedule is a normal `200` + `slots: []` — NOT this code.)
- `422 TIMETABLE_CHILD_AMBIGUOUS` — PARENT read their own memberId while
  linked to >1 student. **Web decision**: since `getChildren` already always
  resolves to a specific child's `memberId` (never the parent's own), this US
  should ALWAYS call the by-member endpoint with the CHILD's `memberId`
  directly (never the parent's own memberId) — so this code should never be
  hit in practice from this client, but map it defensively anyway (same
  taxonomy discipline as every other US in this epic; do not leave it
  unmapped just because it's "supposed to" be unreachable).
- Reuses existing `403 TIMETABLE_FORBIDDEN` / `400` family from US-E18.11.

### 2. `room` on `SlotRequest`/`SlotResponse` (BE US-153) — RESOLVES ASK #17

```
SlotRequest.room?: string (maxLength 32) — optional; omit or send "" when
  unknown. Trimmed + length-capped server-side; NOT sanitized (echoed
  verbatim) — client MUST HTML-escape when rendering (React does this by
  default via JSX text interpolation; do NOT use dangerouslySetInnerHTML).
SlotResponse.room?: string — omitted when unset (not null, not "").
```

Purely additive — pre-US-153 slots read back without it. Every slot in EVERY
timetable response (class-scoped `TimetableResponse` AND by-member
`MemberTimetableResponse`) now also carries `subjectName?` — the admin
builder's real repository can drop any subject-catalogue-join workaround it
had (check `timetable.mapper.ts` for one; US-E18.11 evidence log doesn't
mention needing one, so likely N/A — confirm, don't assume).

**BE operational note (informational only, no FE action)**: BE US-153's
review flagged a MUST-FIX deploy-order hazard (migration `045` must run
before the new server version, since reads now reference the `room` column
unconditionally) — this is a BE rollout concern already resolved on BE's
side before merge; the web client has nothing to sequence around it.

### 3. `GET /api/v1/members/{memberId}/enrollment?yearLabel=` (BE US-148) — NEW,
RESOLVES ASKS #15/#22's classId-discovery gap

```
200 → MemberEnrollmentResponse { classId, className, gradeLevel,
  academicYearLabel, enrolledAt } — deliberately does NOT include
  enrollmentId/studentMemberId (scoped to what self-scope views need).
```

Authorization (evaluated BEFORE any enrollment/member-existence read — D2
oracle closure, same posture as `TIMETABLE_FORBIDDEN`):
- STUDENT: `memberId` must equal the actor's own memberId (JWT claim).
- PARENT: `memberId` must be linked to the actor via an existing
  parent-student link.
- ADMIN/SUPER_ADMIN/TEACHER (tenant-wide): any member.
- Anyone else — including a caller probing a nonexistent `memberId` —
  `403 ROSTER_ACCESS_FORBIDDEN` (identical response regardless of existence).
- `404 ROSTER_STUDENT_NOT_ENROLLED` — authorized caller, target has no
  enrollment for the resolved/given year.

`yearLabel` optional — omit to resolve the student's LATEST enrolled
academic-year label (lexicographic max on `academic_year_label`, not the
tenant's calendar-active year — a non-conventional label could shift this;
document the caveat, do not silently assume "latest = current").

**Where this is actually consumed in THIS US**: the by-member timetable
response has NO `className` (only `classId` per slot). For the
single-class STUDENT self-view, call `GET .../enrollment` (no `yearLabel`)
ONCE alongside the timetable call to get a real `className`/`gradeLevel` for
the screen header — this is the concrete win from wiring US-148 here (do not
over-scope into conduct/other features' self-view — that is out of bounds
for this US per fe-lead's explicit instruction; flag as a follow-up
recommendation instead of building it).

### 4. `GET /members/{memberId}/linked-students` — ENRICHED (BE US-148)

```
LinkedStudentItemResponse now: { linkId, parentMemberId, studentMemberId,
  createdAt, classId? (nullable — string|null, OMITTED when the student has
  no current enrollment OR the enrichment read failed transiently; the two
  cases are INDISTINGUISHABLE on the wire by design — treat absent and null
  as equivalent), className? (same omission rule, omitted together with
  classId) }
```

Still NO student display name (ask #20's residual half — PARENT/STUDENT
cannot resolve a name from any endpoint the web can call; directory RBAC
403s PARENT, confirmed in US-E18.23). Do not attempt a workaround join —
document the gap plainly and decide an honest fallback label (see
"Un-mock plan" §4 below) — this is a UI-visible decision, route it through
`fe-component-architect` + the design-review gate, do not have the engineer
freelance a copy string.

## Un-mock plan (per operation)

| Operation | Feature | Today (US-E18.11) | This US |
| --- | --- | --- | --- |
| `getMyTimetable` (student self) | `timetable` | MOCK permanent (ask #15) | **REAL** — `GET /members/{selfId}/timetable?termId=` (`selfId` = `decodeSubClaim(token)`, same precedent as `getByTeacher`'s `currentUserId`) + `GET /members/{selfId}/enrollment` (no `yearLabel`) composed for `className`/`gradeLevel` display metadata. `TIMETABLE_MEMBER_NOT_RESOLVABLE` → `not-found`; `ROSTER_STUDENT_NOT_ENROLLED` on the enrollment call → treat as "no class metadata yet" (degrade className display, do NOT fail the whole screen — the timetable slots may still resolve via the teaching-slots branch in edge cases, though a STUDENT actor won't hit that branch in practice; still, don't couple failure of one call to the other). |
| `getByTeacher` (teacher personal schedule) | `timetable` | REAL via `GET /classes` fan-out (N+1: 1 list call + 1 per-class timetable call) + client-side merge/filter | **REAL, simplified** — switch to `GET /members/{teacherId}/timetable?termId=` directly (1 call, server already resolves + spans multiple classes via per-slot `classId`). Still need `classId → className` for display (SlotResponse has no className) — keep ONE `GET /classes` call (the same TEACHER-auto-filtered list, already proven) purely as a classId→className lookup map, not as a fan-out source anymore. Net: 2 calls total regardless of class count (was 1+N). **Document this simplification explicitly** in the repository/mapper file + this packet's Evidence section — this is the "document the choice" the engineer must make per fe-lead's brief. |
| `getChildren` (parent roster) | `timetable` | MOCK permanent (ask #15) | **REAL** — `GET /members/{selfId}/linked-students` (self = parent). Map `classId`/`className` (nullable) into `TimetableChild`. Student display `name` stays UNAVAILABLE — see UX decision below (ask #20 residual, do not silently invent a fake name). |
| child timetable (per selected child) | `timetable` | MOCK permanent (ask #15) | **REAL** — `GET /members/{childId}/timetable?termId=` (PARENT-linked authorization; `childId` = the selected `TimetableChild.childId`, i.e. `studentMemberId` from `linked-students`). |
| `getByClass` (class-scoped, this feature's copy) | `timetable` | MOCK (implementation-time correction, US-E18.11 — its only caller was the blocked parent flow) | **Now genuinely unused** once the parent flow calls the by-member endpoint directly with a resolved `childId` — confirm no other call-site needs classId-scoped read in this feature; if truly dead, either delete it or leave it as a documented unused-but-contract-correct fallback (engineer's call, same precedent as US-E18.11 kept `RealWeeklyTimetableRepository.getByClass`) — do NOT silently keep calling it with a stale mock classId. |
| `getConflicts` (admin builder, whole-school) | `admin/timetable` | MOCK permanent (ask #16) | **UNCHANGED — do not touch** (ask #16 still open, out of scope). |
| Builder room field (`SlotEditorDialog` room input → `updateSlot`) | `admin/timetable` | Client-side-only, silently discarded (ask #17) | **REAL** — thread `room` through `SlotRequest`/`SlotResponse` in `timetable.mapper.ts` + `timetable.repository.ts`'s read-modify-write PUT. Remove the "non-persistent" caveat comment from the mapper/entity/mock repo — the mock repo must ALSO start round-tripping `room` (TDD: mock and real must agree on the contract shape, per `.claude/rules/tdd.md`). |

## UX decision needed for the parent child-picker (route through
`fe-component-architect`, then design-review gate — do not let the engineer
freelance this)

`TimetableChild.name` is currently a REQUIRED field driving the child-picker
card + avatar initials (`avatar: string` = 2-char initials of `name`). Real
mode has no name at all (ask #20 residual). Options to weigh (precedent:
check how US-E18.20/US-E18.23/member-directory handled a similarly
degraded-identity gap before inventing something new):
- Make `name` optional on the entity; presentation falls back to a stable
  ordinal label ("Con thứ 1", "Con thứ 2" — ordinal by array position or by
  `linkId` sort, must be STABLE across re-renders/refetches, not random) +
  show the real `className` badge when present (`"Lớp 10A1"`) or a "chưa có
  lớp" fallback when `classId`/`className` are both omitted.
- Avatar initials must also degrade gracefully (no name → generic
  person-icon or the ordinal number, not `"??"` or empty).
- This is the one part of this US that changes rendered UI for an existing
  screen (`timetable-view`'s child-picker) — a11y audit + design-review gate
  MUST run on it specifically (contrast/label semantics for the fallback,
  `aria-label` in Vietnamese per `.claude/rules/accessibility.md`).
- Do not scope-creep into "fix ask #20 for real" (that needs a directory/IAM
  BE change) — this is a client-side degrade-gracefully fix only.

## Explicit out-of-scope (do not touch)

- `getConflicts` (admin builder whole-school proactive conflicts) — ask #16
  still open, untouched.
- Conduct/discipline self-view (also blocked on enrollment-style discovery,
  US-E18.14/ask #22) — belongs to a separate US if pursued; flag as a
  recommendation in this US's Evidence section, do not build it here.
- US-E18.28/29 — unrelated, not touched.
- Any change to `admin/timetable`'s write RBAC, conflict-detection algorithm,
  term-resolution helper (`resolve-current-term.ts`, reused as-is), or
  day-enum mapper (reused as-is).

## Error taxonomy additions (UPPER_SNAKE, decision `0008`)

Add to `TimetableViewFailure` (features/timetable) — do NOT touch
`TimetableFailure` (admin builder) except to route the new `room` field
through, no new admin-builder failure codes:

| Code | HTTP | New failure type |
| --- | --- | --- |
| `TIMETABLE_MEMBER_NOT_RESOLVABLE` | 404 | `not-found` (reuse existing type — matches "no timetable" semantics) |
| `TIMETABLE_CHILD_AMBIGUOUS` | 422 | `network-error` or a new `ambiguous-child` type (engineer's call — should be unreachable per the "always call with resolved childId" design above; document whichever choice with a one-line rationale) |
| `ROSTER_ACCESS_FORBIDDEN` | 403 | `not-found` (enrollment call, self/linked/staff-only — same "don't reveal existence" posture as `TIMETABLE_FORBIDDEN`; degrade to missing className, do not fail the whole screen per the composed-call independence rule above) |
| `ROSTER_STUDENT_NOT_ENROLLED` | 404 | degrade to missing className (see above) — do not introduce a new UI error state for this, it's a secondary metadata call |

Reuse `errorCodeOf`/`parseEnvelope` from `bootstrap/lib/api-envelope.ts`
(existing pattern, no changes needed there).

## Implementation notes

1. **`decodeSubClaim(token)` = current user's memberId** — already the
   precedent from `getByTeacher` (US-E18.11) and multiple other DI factories
   this epic. Reuse identically for the student self-view's `selfId`.
2. **`ensureFreshSession()`** — already wired into `timetable-view.di.ts`
   (confirm it's still there, don't duplicate).
3. **`raw: true` placement** — if `linked-students` or any new call is
   cursor-paginated, `raw: true` MUST be a top-level axios-config sibling of
   `params` (epic-wide recurring bug, US-E18.19 swept 9 sites) — add the
   regression-guard test pattern from `real-weekly-timetable.repository.test.ts`
   ("real interceptor pipeline" describe block) for any NEW paginated call.
   Check whether `linked-students` is even paginated (may be a flat array —
   confirm against the DTO/openapi schema before assuming `fetchAllPages` is
   needed).
4. **New DTOs** — add `MemberTimetableResponseDto` (mirrors
   `RealTimetableResponseDto` but keyed by `memberId` not `classId`, with
   per-slot `classId`) and `MemberEnrollmentResponseDto` in
   `src/features/timetable/infrastructure/dtos/`. Do not overload the
   existing `RealTimetableResponseDto` — the by-member and class-scoped
   shapes differ (per-slot `classId` vs a single top-level `classId`).
5. **Mapper reuse** — `mapRealWeeklyTimetable` currently takes `(dto,
   classId)` to tag a single className onto every slot; the teacher/student
   by-member case now has per-slot `classId` potentially spanning multiple
   classes, so the mapper needs a variant (or an extended signature) that
   resolves `className` per-slot from a `classId → className` lookup map
   (built from the one `GET /classes` call for teacher; for a single-class
   student there's exactly one classId, resolvable from the enrollment
   call's `className`). Keep the existing `mapRealWeeklyTimetable(dto,
   classId)` signature for the (still-real) class-scoped admin-builder path
   — add a new function rather than breaking that contract.
6. **Room round-trip in the admin builder** — `timetable.mapper.ts` +
   `timetable.repository.ts`'s read-modify-write `updateSlot` must carry
   `room` through both directions; `MockTimetableRepository` must also start
   persisting/returning it (currently presumably drops it — verify and fix).
   Remove any "decorative-only"/"non-persistent" code comments now stale.
7. **HTML-escaping note for `room`** — BE echoes it verbatim, unsanitized.
   Plain JSX text interpolation (`{slot.room}`) already HTML-escapes by
   default in React — confirm no `dangerouslySetInnerHTML` is used anywhere
   `room` is rendered (`SlotEditorDialog`, `TimetableGrid`/read-only views)
   and note this in the mapper/component as a deliberate "no work needed,
   confirmed safe" line, per `.claude/rules/api-integration.md` security
   posture.
8. **Zero regression for what stays mock** — `getConflicts`,
   `getByClass`(admin builder path, unaffected) must not change behavior.

## Phased Implementation Plan (fe-planner, 2026-08-01)

Grounded in the current code (read directly, not just the US-E18.11 packet
prose): `i-weekly-timetable.repository.ts`, `real-weekly-timetable
.repository.ts`, `weekly-timetable.mock.repository.ts`,
`timetable-child.entity.ts`, `timetable-view.di.ts`,
`timetable-view.endpoint.ts`, `timetable.mapper.ts` (admin builder),
`timetable.repository.ts` (admin builder), `child-picker.tsx`, plus
`timetable.mock.repository.ts` (admin builder), `timetable-slot-response.dto.ts`
(admin builder), `timetable-grid.tsx`, `timetable-view.i-vm.ts`.

### Corrections to the story's own assumptions (verified against code, not
re-derived from prose)

1. **Admin-builder mock does NOT drop `room` today.** `MockTimetableRepository
   .updateSlot` already stores `data.room` in the in-memory slot and
   `getTimetable` returns it unchanged (`timetable.mock.repository.ts:46-66`).
   The actual drop happens ONE layer up, in
   `TimetableSlotMapper.toEntity`/`toRequest` (`timetable.mapper.ts:26-46`),
   which maps room IN as `""` and never puts it on `toRequest`'s output. So
   **no mock-repo fix is needed** — only `SlotResponseDto`/`SlotRequestDto`
   (add `room?: string`, `subjectName?: string`) and the two
   `TimetableSlotMapper` functions need to carry `room` through both
   directions. Correct the story's implementation note 6 accordingly in the
   Evidence section at completion.
2. **Teacher-schedule simplification is correct and buildable as described.**
   Current `RealWeeklyTimetableRepository.getByTeacher` (lines 88-135) does
   exactly the N+1 fan-out the story describes: 1 `GET /classes` (paginated,
   `fetchAllPages`) + 1 `GET .../timetable?termId=` **per class**, merging
   slots where `teacherMemberId === currentUserId`. This US replaces the
   per-class loop with a single `GET /members/{teacherId}/timetable?termId=`
   call (per-slot `classId` already spans classes server-side) — the `GET
   /classes` call is KEPT, but repurposed as a `classId → className` lookup
   map only (no longer a fan-out source). Net: 2 HTTP calls total regardless
   of class count (was 1+N).
3. **`getChildren`'s wire item has no `color` field.** BE's enriched
   `LinkedStudentItemResponse` (`linkId, parentMemberId, studentMemberId,
   createdAt, classId?, className?`) carries no `color` — the real mapper
   must assign it deterministically (cycle `CHILD_COLORS` by stable index),
   same pattern the mock currently gets for free from its fixture.
4. **`GetChildTimetableUseCase` currently calls `repo.getByClass(child
   .classId, ...)`** (classId-keyed) — this US's by-member endpoint is keyed
   by `memberId`, not `classId`. A NEW repository method is required (see
   Phase 1) rather than reusing `getByClass`; `getByClass` itself is kept
   untouched (still contract-correct, still zero callers in this feature,
   same "kept for the day a direct class-scoped use-case is added" precedent
   as US-E18.11).
5. **Adding a new `TimetableViewFailure` member would NOT be zero-diff.**
   `TimetableErrorKey = TimetableViewFailure["type"] | "forbidden"`
   (`timetable-view.i-vm.ts:9`) is consumed by an exhaustive `Record<
   TimetableErrorKey, ...>` in BOTH `timetable-view.tsx` and
   `teacher-schedule.tsx` — adding a member forces a (mechanical, one-line)
   edit to both, contradicting the packet's "zero ViewModel/presentation
   diff" framing for everything except the child-picker. **Planner's call on
   the flagged "engineer's call" for `TIMETABLE_CHILD_AMBIGUOUS`**: map it to
   the EXISTING `network-error` type, not a new `ambiguous-child` type. It is
   defensively unreachable by design (this client never calls the by-member
   endpoint with the parent's own memberId) — not worth a permanent type-
   surface/presentation touch for a code that should never fire. Document
   this one-line rationale in the failure-mapping function's doc comment.

### Domain design (Phase 1)

**Entities**

- `timetable-child.entity.ts` — `name` becomes optional (`name?: string`,
  unavailable in real mode — ask #20 residual); add `ordinal: number`
  (1-based, assigned from a STABLE sort by `linkId` ascending — never raw
  array position, which the wire doesn't guarantee stable). `classId`/
  `className` become optional (`classId?: string; className?: string` —
  omitted together per BE's indistinguishable-by-design note). `avatar`
  stays a required `string` (mapper always computes something — initials
  when `name` present, else the ordinal digit as a string, e.g. `"1"` — this
  keeps the presentation's existing `{child.avatar}` render untouched in
  type, only the mapper's fallback logic changes).
- `WeeklyTimetable` — **no change**. Confirmed by reading every consumer
  (`timetable-view.tsx:61-62`, `timetable-grid.tsx:58`,
  `teacher-schedule.tsx`): only the top-level `className` is ever rendered
  (as the header/caption), never `gradeLevel` anywhere in this feature today.
  The enrollment call's `className` is composed into this same field inside
  the repository (student self-view); `gradeLevel` is fetched but currently
  has nowhere to go — note it as an unused-but-available field in the
  repository's inline doc, do not invent a UI slot for it (out of scope,
  flag as a follow-up recommendation if product wants it later).
- `TimetableSlot` — no shape change; `subjectName`/`room` already optional-
  safe fields, now populated from the wire instead of an id-fallback/`""`.

**Repository interface** (`i-weekly-timetable.repository.ts`) — add ONE new
method, keep the other four signatures unchanged:

```ts
/** By-member fetch (US-E18.26) — backs the student self-view (self id) and
 *  the parent's per-child view (the child's memberId, never the parent's
 *  own — BE US-153's ambiguous-child 422 is defensive-only from this
 *  client). Distinct from `getByClass` (classId-keyed, kept for the admin/
 *  direct-class-view precedent, still not called in this feature). */
getByMember(memberId: string, weekStart?: string): Promise<WeeklyTimetable>;
```

`GetChildTimetableUseCase.execute` changes its one line from
`this.repo.getByClass(child.classId, weekStart)` to
`this.repo.getByMember(child.childId, weekStart)`. `getMyTimetable()` and
`getByTeacher()` keep their existing zero-arg-plus-weekStart signatures;
internally the real repo now composes `getByMember(this.currentUserId, …)`
(+ the enrollment call for `getMyTimetable`, + the classId→className lookup
for `getByTeacher`).

**Failures** (`timetable-view.failure.ts`) — no new member added (see
correction #5). `toTimetableFailure`/the repository's own catch blocks map:
`TIMETABLE_MEMBER_NOT_RESOLVABLE` → reuse `not-found`;
`TIMETABLE_CHILD_AMBIGUOUS` → reuse `network-error` (documented rationale);
`TIMETABLE_FORBIDDEN` → reuse existing `not-found` mapping (unchanged).
`ROSTER_ACCESS_FORBIDDEN`/`ROSTER_STUDENT_NOT_ENROLLED` on the SECONDARY
enrollment call never reach `toTimetableFailure` at all — the repository
catches them locally and degrades to `className: ""` (falsy → presentation's
existing `displayClassName ?? ""` / conditional badge render already handles
an empty string gracefully, confirmed by reading `timetable-view.tsx:61-62`
and `timetable-grid.tsx:58`).

### Infrastructure (Phase 2)

**New DTOs** — `src/features/timetable/infrastructure/dtos/`:
- `member-timetable-response.dto.ts` — `MemberSlotResponseDto { classId, day,
  period, subjectId, subjectName?, teacherMemberId, room? }` +
  `MemberTimetableResponseDto { memberId, termId, slots:
  MemberSlotResponseDto[] }`. Separate file from the existing
  `real-timetable-response.dto.ts` (per-slot `classId` vs top-level — do not
  overload, per the packet's own instruction).
- `member-enrollment-response.dto.ts` — `MemberEnrollmentResponseDto {
  classId, className, gradeLevel, academicYearLabel, enrolledAt }`.
- `linked-student-item.dto.ts` — `LinkedStudentItemDto { linkId,
  parentMemberId, studentMemberId, createdAt, classId?: string | null,
  className?: string | null }`. **Do not** reuse `parent-links` feature's
  `LinkedStudentResponseDto` (`fullName`/`avatarUrl`/`studentId` shape) — that
  is a DIFFERENT, contract-first/speculative INT-001 shape for a DIFFERENT
  feature (US-E20.2, un-ground-truthed against the real BE, `core` not built
  there per that feature's own doc comments) and is not the same wire schema
  as this US's ground-truthed US-148 enrichment. Flag this cross-feature
  naming/shape collision risk to `fe-lead` as a note (not a blocker — the two
  features stay decoupled per decision `0017`, but a future reader could
  confuse the two `linked-students` DTOs).
- Additive optional fields on the EXISTING `RealSlotResponseDto` (class-
  scoped, `real-timetable-response.dto.ts`): add `subjectName?: string`,
  `room?: string` for contract completeness on the kept-but-inactive
  `getByClass` path (every slot response now carries them per the ground-
  truthed contract) — no behavior change since nothing calls it.
- Admin builder (`timetable-slot-response.dto.ts`): add `room?: string` +
  `subjectName?: string` to `SlotResponseDto`/`SlotRequestDto`.

**Mappers**:
- `real-weekly-timetable.mapper.ts` — KEEP `mapRealWeeklyTimetable(dto,
  className)` untouched (still backs the kept `getByClass`). ADD
  `mapMemberWeeklyTimetable(dto: MemberTimetableResponseDto, classNameOf:
  (classId: string) => string | undefined): WeeklyTimetable` — per-slot
  `subjectName: slot.subjectName ?? slot.subjectId` (keep the id-fallback for
  defense, ask #6/#7 precedent), `room: slot.room`, `className:
  classNameOf(slot.classId)`. Top-level `classId`/`className` of the
  returned `WeeklyTimetable` supplied by the caller (student: enrollment's
  `classId`/`className`; teacher: `currentUserId`/`currentUserId` — same
  pre-existing quirk as today, out of scope to "fix" here since nothing
  renders it for the teacher screen).
- NEW `member-enrollment.mapper.ts` — trivial DTO→ `{classId, className,
  gradeLevel}` passthrough (or fold directly into the repository if a
  standalone mapper is one function too many — engineer's call, both are
  fine, no test-count difference).
- NEW `linked-student.mapper.ts` — `toTimetableChildren(dtos:
  LinkedStudentItemDto[]): TimetableChild[]`: sort by `linkId` ascending →
  map with index → `{ childId: studentMemberId, name: undefined, ordinal:
  index+1, classId: classId ?? undefined, className: className ?? undefined,
  avatar: String(index+1), color: CHILD_COLORS[index %
  CHILD_COLORS.length] }`.
- `timetable.mapper.ts` (admin builder) — `TimetableSlotMapper.toEntity`
  reads `dto.room` (not hardcoded `""`) and `dto.subjectName` (fallback
  `dto.subjectId`, dropping the "no wire display name" comment for
  subjectName only — teacherName still has no wire name, ask #6/#7 stands);
  `toRequest` includes `room: slot.room || undefined` (omit empty string per
  the BE contract's "omit or send empty" note — sending `undefined` is
  cleaner than `""`).

**Repository** (`real-weekly-timetable.repository.ts`):
- `getByMember(memberId, weekStart?)` — new primitive: `GET
  /members/{memberId}/timetable?termId=` → `mapMemberWeeklyTimetable(dto,
  () => undefined)` for the plain case (no classId→className resolution
  needed by this primitive alone — callers that need it pass their own
  lookup via composition, see below). Catches `TIMETABLE_MEMBER_NOT_RESOLVABLE`
  → `not-found`, `TIMETABLE_FORBIDDEN` → `not-found` (existing pattern),
  `TIMETABLE_CHILD_AMBIGUOUS` → `network-error` (defensive, documented).
- `getMyTimetable(weekStart?)` — no longer throws. Composes: `getByMember
  (this.currentUserId, weekStart)` + `GET /members/{selfId}/enrollment` (no
  `yearLabel`). The enrollment call is wrapped in its OWN try/catch —
  `ROSTER_ACCESS_FORBIDDEN`/`ROSTER_STUDENT_NOT_ENROLLED` degrade to
  `className: ""` (do not fail the whole screen); any other enrollment error
  also degrades the same way (only the timetable call's failure propagates
  to the use-case). Re-tag every slot's `className` via
  `mapMemberWeeklyTimetable`'s `classNameOf` with the resolved single
  className (or use a one-classId map `{[enrollment.classId]: enrollment
  .className}` — simplest is to re-derive with `classNameOf: (id) => id ===
  enrollment?.classId ? enrollment.className : undefined`). Return
  `WeeklyTimetable` with top-level `classId`/`className` from the enrollment
  call (fallback to `this.currentUserId`/`""` if enrollment degraded).
- `getByTeacher(weekStart?)` — simplified per correction #2: one `GET
  /members/{teacherId}/timetable?termId=` call + the KEPT `GET /classes`
  fan-out repurposed as a lookup map (`Map<classId, className>` from the
  paginated `fetchAllPages<ClassSummaryDto>`). No more per-class timetable
  GET. `mapMemberWeeklyTimetable(dto, (id) => map.get(id))`. Same `!
  currentUserId → not-found` upfront guard as today.
- `getChildren()` — `GET /members/{selfId}/linked-students` (confirm NOT
  paginated by reading the actual `openapi.yaml` schema for
  `LinkedStudentsResponse` before assuming `fetchAllPages` — the sibling
  `parent-links` feature's real repo calls it as a flat array with no
  pagination handling, `parent-consent.repository.ts:42-44` — strong
  signal it's flat, but re-verify against this US's own ground-truthed
  contract doc before committing to that in code). Map via
  `toTimetableChildren`.
- `GetChildTimetableUseCase` — one-line change: `getByMember(child.childId,
  weekStart)` instead of `getByClass(child.classId, weekStart)`.

**Endpoints** (`timetable-view.endpoint.ts`) — add:
```ts
memberTimetable: (memberId: string) =>
  `/core/api/v1/members/${encodeURIComponent(memberId)}/timetable`,
memberEnrollment: (memberId: string) =>
  `/core/api/v1/members/${encodeURIComponent(memberId)}/enrollment`,
linkedStudents: (memberId: string) =>
  `/core/api/v1/members/${encodeURIComponent(memberId)}/linked-students`,
```
Keep `classTimetable`/`myClasses` (still used — `getByClass` kept,
`myClasses` repurposed not removed).

**Mock repository** (`weekly-timetable.mock.repository.ts`) — add `ordinal`
to `mapTimetableChild` call site (`TIMETABLE_CHILDREN.map((dto, i) =>
mapTimetableChild(dto, i + 1))`); mock `name`/`classId`/`className` stay
always-present (mock fixture data, unaffected by the real-mode optionality).
`getMyTimetable`/`getByTeacher`/`getByClass` mock bodies unchanged (contract
shape they simulate — `WeeklyTimetable` — didn't change). No `getByMember`
needed on the mock class itself UNLESS `HybridWeeklyTimetableRepository`
needs to route it when USE_MOCK — since `USE_MOCK` picks
`MockWeeklyTimetableRepository` wholesale (not the hybrid) per
`timetable-view.di.ts:27`, the mock class must still implement the full
interface including the new `getByMember` (delegate to `getByClass` using
`memberId` as a fixture classId lookup — mirrors how `getMyTimetable`
already delegates to `getByClass(MY_CLASS_ID)`).

**DI** (`timetable-view.di.ts`) — no `USE_MOCK` branch structure change;
`RealWeeklyTimetableRepository`'s constructor signature is unchanged
(`http`, `resolveTermId`, `currentUserId`) — the new composition lives
inside the repository's methods, not the DI factory. Confirm
`ensureFreshSession()` stays exactly where it is (already present,
unaffected).

### Admin builder room field (Phase 2b, independent of Phase 1/2 above —
touches a different feature module, can land in the same commit or split,
engineer's call)

- `timetable-slot-response.dto.ts`: add `room?`/`subjectName?` to
  `SlotRequestDto`/`SlotResponseDto`.
- `timetable.mapper.ts`: `TimetableSlotMapper.toEntity` reads `dto.room`
  (default `""` only if wire omits it — same optional-to-empty-string
  domain convention the entity already uses) and `dto.subjectName ??
  dto.subjectId`; `toRequest` includes `room: slot.room || undefined`.
  Remove the stale "non-persistent" doc comment (correction #1 — the mock
  never actually dropped it; only this mapper did).
- `timetable.repository.ts`: no structural change — it already forwards
  whatever `TimetableSlotMapper` produces through the RMW GET/PUT; once the
  mapper carries `room`, the real repo persists it for free.
- `MockTimetableRepository`: no change needed (correction #1) — add a
  regression test instead (see Proof plan) proving it round-trips today,
  so nobody "fixes" a already-working mock later.

### Presentation (Phase 3 — the ONLY design-review-gated diff)

- `child-picker.tsx`: render `child.name ?? t("childOrdinalLabel", {ordinal:
  child.ordinal})` for the name line; render `child.className ? t
  ("classLabel", {className: child.className}) : t("classPending")` for the
  class line; avatar span keeps rendering `{child.avatar}` unchanged (mapper
  already resolves it to initials-or-digit, no component logic change
  needed there beyond the two conditional labels above).
- i18n (`timetableView` namespace, additive): `childOrdinalLabel` (vi:
  `"Con thứ {ordinal}"`, en: `"Child {ordinal}"`), `classPending` (vi:
  `"Chưa có lớp"`, en: `"No class yet"`).
- `TimetableChild.name`/`classId`/`className` optionality is a TYPE change
  the mock's fixture-backed path is unaffected by (mock always supplies all
  three) — no mock-mode UI change, confirmed same "zero regression for the
  mock path" posture as every other US in this epic.
- This is the ONE part of this US routed through `fe-component-architect`
  (see recommendation below) + the design-review gate + a targeted a11y
  pass (contrast/label semantics for the two new fallback strings, confirm
  the `<button>`'s accessible name — already derived from its visible text
  content, no extra `aria-label` needed — still reads sensibly with the
  ordinal fallback, e.g. "Con thứ 1, Chưa có lớp").

### TDD test file plan (exact files)

**Unit — domain/mappers**
- `src/features/timetable/domain/use-cases/get-child-timetable.use-case.test.ts`
  — MODIFY: assert `getByMember(child.childId, ...)` is called, not
  `getByClass`.
- `src/features/timetable/infrastructure/mappers/real-weekly-timetable.mapper.test.ts`
  — MODIFY (existing file, per US-E18.11): add cases for
  `mapMemberWeeklyTimetable` (subjectName present/omitted-falls-back-to-id,
  room present/omitted, classNameOf resolution/unresolved).
- `src/features/timetable/infrastructure/mappers/linked-student.mapper.test.ts`
  — NEW: stable ordinal assignment (sort by `linkId`, not array order),
  `name` always undefined, `classId`/`className` omitted-together degrade,
  color cycling deterministic across re-runs.
- `src/features/timetable/infrastructure/mappers/member-enrollment.mapper.test.ts`
  — NEW (if a standalone mapper function is used; fold into repository test
  otherwise).
- `src/features/admin/timetable/infrastructure/mappers/timetable.mapper.test.ts`
  — MODIFY (existing, per US-E18.11): add `room`/`subjectName` round-trip
  cases (present, omitted, empty-string-becomes-undefined-on-toRequest).
- New failure-mapping unit case (wherever `getByMember`'s catch block lives,
  likely inline in the repository test): `TIMETABLE_MEMBER_NOT_RESOLVABLE`
  → `not-found`, `TIMETABLE_CHILD_AMBIGUOUS` → `network-error` (with the
  one-line rationale comment nearby), `ROSTER_ACCESS_FORBIDDEN`/
  `ROSTER_STUDENT_NOT_ENROLLED` → degrade-not-fail (assert `className: ""`,
  NOT a thrown/propagated failure).

**Integration — repository ↔ HTTP**
- `src/features/timetable/infrastructure/repositories/real-weekly-timetable.repository.test.ts`
  — MODIFY (existing, per US-E18.11): replace the `getByTeacher` fan-out
  assertions with the simplified 2-call assertion (1 by-member + 1 classes-
  list, NOT 1+N); add `getByMember` cases (student self, parent-child
  variants); add `getMyTimetable` composed-call cases (enrollment success,
  enrollment degrade-not-fail, timetable failure still propagates); add
  `getChildren` real-HTTP case + a **raw-flag top-level regression guard**
  ONLY if `linked-students` turns out paginated (confirm first, per the
  note above) — if flat, add a "no `raw`/pagination params sent" assertion
  instead, documenting the confirmation.
- `src/features/admin/timetable/infrastructure/repositories/timetable.repository.test.ts`
  — MODIFY (existing, per US-E18.11): add a room-persists-through-RMW-PUT
  case (send room on `updateSlot`, assert the PUT body carries it, assert
  the returned/subsequently-read slot carries it back).
- `src/features/admin/timetable/infrastructure/repositories/mocks/timetable.mock.repository.test.ts`
  (or wherever its existing tests live) — ADD one regression-guard case
  proving room already round-trips (correction #1 — protects against a
  future "fix" reintroducing the drop).

### Component architect / state engineer need (my call, overriding/confirming
the framing given)

- **`fe-component-architect`: YES, narrow scope.** Confirmed — the
  child-picker fallback (name→ordinal, avatar→digit, className→"chưa có
  lớp") is the one genuinely new user-visible contract in this US and
  deserves a proper VM/prop contract + a11y sign-off before the engineer
  free-styles copy/markup, per `.claude/rules/component-organization.md`'s
  spirit (no ad-hoc fallback invented at implementation time). Scope: ONLY
  `child-picker.tsx` + the two new i18n keys + `TimetableChild`'s new
  optional fields — do not let scope creep into `TimetableGrid` (its `room`
  rendering is already correct, confirmed above, no architect input needed
  there).
- **`fe-state-engineer`: NO, confirmed not needed.** This US changes zero
  TanStack Query key shapes, adds no new client-side cache/invalidation
  (every new call is a plain server-side `await` inside a Server Component's
  data-loading path via existing use-cases, same RSC-fetch-once pattern as
  every other operation in this feature — there is no mutation, no
  optimistic update, no new query key). The only "state" nuance (composing
  2 server-side HTTP calls with independent failure handling in
  `getMyTimetable`) is a repository-internal composition concern, not a
  client cache-shape concern — squarely `fe-nextjs-engineer` territory.

## Proof required (per `.claude/rules/tdd.md`, before `implemented`)

- Unit: new DTO↔entity mappers (by-member timetable, enrollment, enriched
  linked-students), `room` round-trip in both the admin-builder mapper and
  the (if applicable) by-member mapper, ambiguous-child code mapping,
  ROSTER_ACCESS_FORBIDDEN/ROSTER_STUDENT_NOT_ENROLLED degrade-not-fail
  behavior.
- Integration: real-repository tests for the by-member timetable call
  (student self + teacher + parent-child variants), the enrollment call, the
  enriched `linked-students` call (raw-flag guard if paginated), admin
  builder's room persistence through the RMW PUT, mock repositories updated
  to the same contract (no lying-green).
- Zero regression vs baseline: **436 files / 3041 tests pass before this US**
  (confirmed 2026-08-01 — cite exact numbers in the Evidence section at
  completion, do not just say "no regression").
- `bunx tsc --noEmit` clean, `NEXT_PUBLIC_USE_MOCK= bun run build` green,
  `bun lint` clean.
- tech-lead review + a11y audit (parallel) — a11y scope: the child-picker
  fallback UX (new) + confirm the room-in-cell display (existing) still
  passes contrast/label semantics with a value now genuinely present.
- Design-review gate: REQUIRED for the child-picker fallback UX (the one
  new-visible-element decision in this US). Everything else is zero-diff
  presentation (same DI/mapper/entity-only pattern as US-E18.11) — N/A with
  diff proof (`git diff --name-only` showing no other presentation/`.i-vm`/
  `actions.ts`/`page.tsx` files touched).
- QA (`fe-qa-playwright`): re-verify AC coverage for student self-view,
  teacher schedule, parent child-view + picker fallback, and the admin
  builder's room field actually surviving a save+reload round trip.

## Cross-repo asks status update (fe-lead updates EPIC-OVERVIEW.md)

- **#15**: RESOLVED by BE US-153 (by-member timetable) + US-148 (enrollment).
- **#17**: RESOLVED by BE US-153 (`room` field).
- **#20**: PARTIALLY resolved — `classId`/`className` now available via
  enriched `linked-students`; student display NAME resolution is still
  OPEN (residual half — no directory/IAM endpoint any PARENT/STUDENT can
  call to resolve a name; directory RBAC 403s PARENT per US-E18.23).
- **#22**: RESOLVED by BE US-148 (enrollment endpoint) for the classId-
  discovery half; the discipline/conduct SELF-VIEW UI itself remains
  unbuilt (product/design gap, not a BE gap — out of scope here, flag as a
  recommendation for a future US).

## Component Contract: Child-Picker Fallback (fe-component-architect, 2026-08-01)

Scope confirmed narrow per fe-lead/fe-planner's brief: `child-picker.tsx` +
`timetable-child.entity.ts` + two new i18n keys only. `TimetableGrid`,
`timetable-view.tsx`, `.i-vm.ts` are NOT touched by this contract (their
`room`/`className` rendering was already correct per the planner's read).

### 1. Read of current code (baseline, before this contract)

- `child-picker.tsx` is a `'use client'`-implicit (no directive shown but
  it's under `presentation/`) **presentational, fully-controlled** component:
  `childList` / `selectedChildId` / `onSelect` / `disabled` are all props, no
  internal state. It renders a `<fieldset>` of real `<button type="button">`
  cards (not `role="radio"` fake buttons) — keyboard-focusable natively,
  `aria-pressed={active}` communicates toggle state, visible
  `focus-visible:ring-3`, `min-h-11 min-w-[240px]` touch target (≥44px).
  Correctly homed as feature-local under
  `src/features/timetable/presentation/timetable-view/` per
  `.claude/rules/component-organization.md`'s decision tree (composed,
  currently single-screen use, explicitly documented in its own docstring as
  distinct from the grades feature's tab-based `ChildSwitcher` — **no
  relocation needed, confirmed**).
- Today's accessible-name derivation for each `<button>`: the avatar `<span
  aria-hidden="true">` is excluded from the accessible-name computation; the
  two remaining `<span>` text nodes (`child.name`, then `t("classLabel",
  {className})`) ARE included, concatenated by the browser's accname
  algorithm (whitespace-separated, no implicit punctuation) — so a screen
  reader today announces roughly `"<name> Lớp <className>, button, pressed"`
  (order = DOM order, `aria-pressed` read by AT as state, not text). No
  explicit `aria-label` exists or is needed — the visible text already IS the
  correct accessible name; this pattern is confirmed to still work with the
  new fallback text (see §4).
- `t("classLabel", { className })` already exists (`vi:"Lớp {className}"`,
  `en:"Class {className}"`, `timetableView` namespace) — the planner's
  "render className badge via `classLabel`" reuses this existing key
  unchanged; only `childOrdinalLabel` and `classPending` are net-new.
- `t("childPickerLabel")` (fieldset `<legend class="sr-only">`) is unaffected
  by this contract.

### 2. Entity contract — `timetable-child.entity.ts` (confirmed, one small
addition to the planner's direction: doc-comment the "why" inline so a future
reader doesn't "fix" the optionality back)

```ts
/**
 * A child in the parent's roster, used by the parent timetable child-picker.
 * Feature-local (no cross-feature import of grades' ChildSummary, per plan
 * decision 6 — the two features resolve "my children" independently until BE
 * `core`/`iam` expose a shared endpoint).
 */
export interface TimetableChild {
  childId: string;
  /**
   * Display name — UNAVAILABLE in real mode (ask #20 residual gap: no
   * directory/IAM endpoint any PARENT can call resolves a student's name;
   * ground-truthed against US-E18.23, not a client-side bug). Mock fixtures
   * always supply this (no mock-mode UI change). Presentation MUST fall back
   * to an ordinal label when absent — never render `undefined`/blank.
   */
  name?: string;
  /**
   * 1-based position in the parent's roster, assigned by a STABLE sort (wire
   * `linkId` ascending) — NEVER raw array/response order, which the wire
   * does not guarantee stable across refetches. Always present (mock and
   * real). Drives the "Con thứ N" / "Child N" fallback label AND (via the
   * mapper, not this component) the avatar-digit fallback.
   */
  ordinal: number;
  /** Stable class identifier used to fetch the timetable. Omitted together
   * with `className` — BE cannot distinguish "no current enrollment" from a
   * transient enrichment-read failure, so both are treated as equivalent
   * "no class yet" states. */
  classId?: string;
  className?: string;
  /** Required — mapper ALWAYS computes a value: 2-char initials of `name`
   * when present, else the ordinal digit as a string (e.g. `"1"`). Keeps
   * this component's avatar render (`{child.avatar}`) unchanged in shape. */
  avatar: string;
  /** Semantic color-identity key → presentation maps to a design token. */
  color: TimetableChildColor;
}

export type TimetableChildColor =
  | "primary"
  | "success"
  | "warning"
  | "error"
  | "purple"
  | "teal";
```

Diff from today: `name: string` → `name?: string`; `classId: string` →
`classId?: string`; `className: string` → `className?: string`; add
`ordinal: number` (required, no `?`). `avatar`/`color`/`childId` unchanged.

### 3. `child-picker.tsx` — exact render diff (name/class lines only; avatar
span, `<fieldset>`/`<legend>`, `aria-pressed`/`disabled`/focus-ring markup all
UNCHANGED)

```tsx
<span className="whitespace-nowrap">
  <span className="block font-bold text-edu-text-primary text-sm">
    {child.name ?? t("childOrdinalLabel", { ordinal: child.ordinal })}
  </span>
  <span className="block text-[11px] text-edu-text-secondary">
    {child.className
      ? t("classLabel", { className: child.className })
      : t("classPending")}
  </span>
</span>
```

No new props on `ChildPickerProps` — the interface is unchanged (`childList:
TimetableChild[]; selectedChildId: string; onSelect: (childId: string) =>
void; disabled?: boolean`); the fallback logic reads only fields already on
`TimetableChild`, so the ViewModel boundary at `timetable-view.i-vm.ts` needs
**zero change** (confirms the packet's "zero ViewModel diff" framing).

### 4. i18n — `timetableView` namespace, additive (confirmed good Vietnamese,
no changes to the planner's proposed copy)

Add to BOTH `src/bootstrap/i18n/messages/vi.json` and `.../en.json`, same
path, alongside the existing `childPickerLabel`/`classLabel` keys:

| Key | vi | en |
| --- | --- | --- |
| `childOrdinalLabel` | `"Con thứ {ordinal}"` | `"Child {ordinal}"` |
| `classPending` | `"Chưa có lớp"` | `"No class yet"` |

Rationale: `"Con thứ {ordinal}"` is the natural Vietnamese ordinal
construction (matches "con thứ nhất/thứ hai" register, reads correctly for
any `ordinal` value without needing separate 1st/2nd/3rd word forms — Vietnamese
ordinals don't inflect irregularly past "thứ nhất", but a numeral after "thứ"
is completely natural and commonly used, e.g. "thứ 3", so `{ordinal}` as a
plain number is fine, no special-casing needed for ordinal=1). `"Chưa có
lớp"` matches the terse, lowercase-after-first-word tone of existing sibling
copy (`"Chưa xếp lịch"`-style patterns elsewhere in the design system) and is
shorter/more natural than a literal "không có lớp học" — keep as proposed.
Both keys use the same `{param}` interpolation convention already
established by `classLabel`/`classConflictCount` in this same namespace — no
new i18n mechanism introduced.

### 5. Accessibility verification (explicit answer to the audit question)

- **No explicit `aria-label` needed on the `<button>`.** The accessible name
  is still correctly derived from visible text content with the fallback
  strings in place: `"Con thứ 1"` + (space, from accname algorithm's
  inter-element join) + `"Chưa có lớp"` → announced as **"Con thứ 1 Chưa có
  lớp"** (no comma is actually inserted by the accname algorithm — the
  story's own example `"Con thứ 1, Chưa có lớp"` was illustrative shorthand
  for readability in prose, not a literal DOM string; correcting that here
  for the engineer). This run-on is still comprehensible as a name — "child
  N, no class yet" — and is not materially different in structure from
  today's real-name case (`"Nguyễn An Lớp 10A1"` already has no comma
  either), so no new separator is required to meet WCAG 2.1 AA (name is
  present, distinguishing, and programmatically determinable — SC 4.1.2).
  **Optional polish** (not a blocking a11y requirement): if
  `fe-nextjs-engineer`/`fe-accessibility-auditor` want a clearer pause, add a
  visually-hidden `<span className="sr-only">{", "}</span>` between the two
  spans — purely cosmetic for AT users, does not change visible layout. Not
  mandating it here to avoid scope creep into a markup change beyond the two
  conditional label expressions.
- **Avatar span stays `aria-hidden="true"`** — unchanged, correct: it's
  decorative/redundant once the name (real or fallback) is already the
  accessible name; the ordinal-digit avatar fallback (`"1"`) does not need
  its own label since it duplicates information already in the visible name
  line.
- **Contrast**: fallback strings render in the SAME two spans/classes as
  today's real values (`text-edu-text-primary text-sm font-bold` for the name
  line, `text-edu-text-secondary text-[11px]` for the class line) — no new
  color/token introduced, so no new contrast check needed beyond what's
  already verified for this component's existing text.
- **Keyboard/focus**: unaffected — the fallback is a text-content change
  inside an already keyboard-operable `<button>`; no new interactive element
  added.
- **Motion**: unaffected — no new animation.

### 6. Component placement re-confirmation

Per `.claude/rules/component-organization.md`'s decision tree: `child-picker
.tsx` is a composed component (button + avatar span + two text spans) used by
exactly ONE screen (`timetable-view`'s parent role branch) today — correctly
placed at `src/features/timetable/presentation/timetable-view/child-picker.tsx`
(tier 3: "composed, single-screen (tmp)"). This US does not change its
usage count, so **no promotion to `components/shared/` is warranted** by this
US. If a second screen ever needs an identical roster-picker pattern,
promote then (move, never copy) — not a decision to pre-empt now.

### Summary of decisions vs the planner's initial direction

- **Confirmed as proposed, no changes**: `name?`/`classId?`/`className?`
  optionality; `ordinal: number` (required, `linkId`-ascending stable sort,
  owned by the mapper not this component); `avatar` stays required string,
  mapper-computed; reuse of the existing `classLabel` key; the two new key
  names/values (`childOrdinalLabel`, `classPending`); no relocation of
  `child-picker.tsx`; no `ChildPickerProps` change; no `aria-label` needed.
- **One correction**: the packet's a11y example string used a comma
  (`"Con thứ 1, Chưa có lớp"`) that the accname algorithm does not actually
  produce — documented in §5 as illustrative-only, with an optional (not
  required) `sr-only` separator noted for polish.
- **One addition**: inline doc-comments on the entity fields explaining WHY
  each is optional (ask #20 residual, BE's indistinguishable-omission design)
  so a future reader doesn't "fix" the optionality back without re-reading
  this packet.

## Design-Review Gate (fe-lead, 2026-08-01)

Scope per `docs/DESIGN_REVIEW.md`: the ONLY presentation diff in this US is
`src/features/timetable/presentation/timetable-view/child-picker.tsx` (+ its
`subject-color-tokens.ts` sibling, touched only by the a11y auditor's
contrast fix). Everything else in this US is domain/infrastructure/bootstrap
— explicitly out of gate scope per `docs/DESIGN_REVIEW.md` §"Khi nào áp
dụng" ("bỏ qua thay đổi thuần domain/infrastructure/bootstrap"). Confirmed
via `git diff --name-only fbe83bb..HEAD -- src/features/*/presentation
src/app` → only `child-picker.tsx` + `subject-color-tokens.ts`.

1. **Design system conformance** — PASS. Every class is a semantic
   `edu-*`/shadcn token (`text-edu-text-primary`, `text-edu-text-secondary`,
   `border-edu-border`, `bg-edu-card`) or an existing `CHILD_COLOR_CLASSES`
   entry (now including the a11y-fixed `avatarText`); no raw color. No new
   component invented — reuses the existing card-picker pattern (plan
   decision 5, `fieldset`/`legend sr-only`/real `<button>` cards) unchanged;
   only the two text lines gained a conditional fallback. Typography
   unchanged from the existing pattern (name = bold 14px `text-sm`, caption
   = 11px `text-[11px]` — matches this screen's pre-existing caption scale,
   not a new size). Role-color-only-via-accent convention (decision `0013`)
   untouched — still cycles the same six `CHILD_COLOR_CLASSES` keys.
2. **Accessibility** — PASS (post-fix, per `fe-accessibility-auditor`'s
   audit above: A11Y-001 avatar contrast fixed; accessible name confirmed
   unambiguous via unique `ordinal`; keyboard/focus/`aria-pressed` semantics
   unchanged; "no class yet" conveyed by text, not color).
3. **impeccable critique** — applied directly (no separate CLI invocation
   needed for a 2-line conditional-text change already vetted by both
   `fe-component-architect` and `fe-accessibility-auditor`): no anti-pattern
   found — hierarchy (bold name / muted caption) matches the existing
   pattern, no generic-AI-look drift, no layout/palette change (impeccable's
   forbidden territory per `.claude/rules/impeccable.md` — N/A, nothing to
   flag here).
4. **States & responsive** — PASS. The fallback IS the "degraded identity"
   state (was previously unreachable in mock-only mode; now the empty/
   partial state is friendly text, never blank) — exercised by the new
   `ParentView_RealMode_NoNameFallback` Storybook interaction story
   (confirmed by the a11y auditor). Card picker already wraps
   (`flex flex-wrap`) at narrow widths — no new responsive risk introduced
   by a text-length change (Vietnamese fallback strings are short).

**Design review: PASS.**
- design-system: conform (token/typography/component OK, no new
  component/token)
- a11y: WCAG AA OK post-fix (A11Y-001 contrast, fixed same-session);
  keyboard OK; reduced-motion OK (no new animation)
- impeccable audit: 0 findings (narrow, already-vetted 2-line conditional
  text change)
- states: fallback/empty state OK (exercised by
  `ParentView_RealMode_NoNameFallback`); responsive OK (no layout change)

## Evidence

### Implementation (fe-nextjs-engineer, 2026-08-01)

Branch `feat/us-e18.26-timetable-by-member-room-wiring`, commit `466f3d1`
(single commit — all phases landed together because the admin-builder `room`
change shares the same "BE US-153 shipped" contract event; each phase was
nonetheless developed red→green in the packet's order).

#### Proof (exact numbers, all run locally)

| Gate | Before | After |
| --- | --- | --- |
| `bun vitest run` | **436 files / 3041 tests passed** | **437 files / 3079 tests passed** (+1 file, +38 tests, 0 failures) |
| `bun run vitest:storybook run` | — | **151 files / 1095 tests passed** (incl. the new `ParentView_RealMode_NoNameFallback` interaction story; the `timetable-view.stories.tsx` file alone: 8/8) |
| `bunx tsc --noEmit` | clean | **clean** (no output) |
| `env -u NEXT_PUBLIC_USE_MOCK bun run build` | — | **green** (full route manifest emitted; the env var was UNSET, not empty-string-set) |
| `bun lint` | 3 errors, all in `src/features/messaging/presentation/message-context-menu/message-context-menu.tsx` | **same 3 pre-existing messaging errors, zero in any file this US touched** (verified: that file is not in `git status`) |
| lefthook pre-commit (biome + tsc + `vitest related`) | — | green (14 files / 110 tests) |

#### Files changed, by Clean-Architecture layer

**domain/** (pure TS, no directive)
- `features/timetable/domain/entities/timetable-child.entity.ts` — `name`,
  `classId`, `className` → optional; new required `ordinal: number`; per-field
  doc comments explaining WHY each is optional (per the component contract).
- `features/timetable/domain/repositories/i-weekly-timetable.repository.ts` —
  added `getByMember(memberId, weekStart?)`; other four signatures untouched.
- `features/timetable/domain/use-cases/get-child-timetable.use-case.ts` —
  one-line switch to `getByMember(child.childId, weekStart)`.
- `features/timetable/domain/failures/timetable-view.failure.ts` — **unchanged**
  (no new union member; see engineer's-call #2 below).

**infrastructure/** (`import 'server-only'`)
- NEW `dtos/member-timetable-response.dto.ts`, `dtos/member-enrollment-response.dto.ts`,
  `dtos/linked-student-item.dto.ts`.
- `dtos/real-timetable-response.dto.ts` — additive `subjectName?`, `room?`.
- `dtos/weekly-timetable-response.dto.ts` — doc-comment only (stale "force-mock
  permanently" prose removed).
- NEW `mappers/linked-student.mapper.ts` (`toTimetableChildren`).
- `mappers/real-weekly-timetable.mapper.ts` — new `mapMemberWeeklyTimetable`;
  `mapRealWeeklyTimetable` signature unchanged.
- `mappers/timetable-child.mapper.ts` — `mapTimetableChild(dto, ordinal)`.
- `repositories/real-weekly-timetable.repository.ts` — `getByMember`,
  re-implemented `getMyTimetable`/`getByTeacher`/`getChildren`, shared
  `fetchMemberTimetable`/`tryFetchEnrollment`/`termFor` helpers; `Hybrid…`
  now delegates everything except `getByClass` to real.
- `repositories/mocks/weekly-timetable.mock.repository.ts` — implements
  `getByMember` (childId → fixture class, else `MY_CLASS_ID`); passes ordinals.
- Admin builder: `dtos/timetable-slot-response.dto.ts` (+`room?`,
  +`subjectName?` on both request/response), `mappers/timetable.mapper.ts`
  (room in BOTH directions), `repositories/timetable.repository.ts` (RMW PUT
  carries room for the edited cell AND preserves every untouched cell's room).

**bootstrap/**
- `endpoint/timetable-view.endpoint.ts` — `memberTimetable`,
  `memberEnrollment`, `linkedStudents` (all `encodeURIComponent`d).
- `di/timetable-view.di.ts` — **no structural change**; `ensureFreshSession()`
  confirmed still wired in the `!USE_MOCK` branch (verified by reading, not
  assumed). Doc comment refreshed.
- `i18n/messages/{vi,en}.json` — `timetableView.childOrdinalLabel`,
  `timetableView.classPending` (both files, same commit; `classLabel` REUSED,
  not duplicated).

**presentation/** (the only design-review-gated diff)
- `presentation/timetable-view/child-picker.tsx` — exactly the two conditional
  label expressions from the component contract; no prop/markup/ARIA change.
- `presentation/timetable-view/timetable-view.stories.tsx` — fixtures gain
  `ordinal`; NEW story `ParentView_RealMode_NoNameFallback` asserting the
  accessible names `"Con thứ 1 Lớp 10A1"` / `"Con thứ 2 Chưa có lớp"` and that
  the fallback card is still operable (`aria-pressed` flips, action fires).

**Test files** (new/modified): NEW
`mappers/linked-student.mapper.test.ts`; MODIFIED
`use-cases/get-child-timetable.use-case.test.ts` (asserts `getByMember` called
and `getByClass` NOT called), `mappers/real-weekly-timetable.mapper.test.ts`,
`repositories/real-weekly-timetable.repository.test.ts` (rewritten around the
2-call teacher path + by-member + composed student path + linked-students),
admin `mappers/timetable.mapper.test.ts`, admin
`repositories/timetable.repository.test.ts`, admin
`repositories/timetable.repository.integration.test.ts` (mock room
round-trip guard), plus `getByMember` stubs added to the three sibling
use-case test doubles.

#### Error-code mapping implemented

| Wire code | HTTP | Where caught | Mapped to |
| --- | --- | --- | --- |
| `TIMETABLE_MEMBER_NOT_RESOLVABLE` | 404 | `getByMember` / `getMyTimetable` / `getByTeacher` | `not-found` |
| `TIMETABLE_FORBIDDEN` | 403 | same | `not-found` (BE's identical-403 no-enumeration posture) |
| `TIMETABLE_SLOT_NOT_FOUND` | 404 | same (pre-existing) | `not-found` |
| `TIMETABLE_CHILD_AMBIGUOUS` | 422 | same | `network-error` (defensive — see call #2) |
| any other timetable code (`TIMETABLE_INVALID_*`, transport) | 400/5xx | same | `network-error` |
| `ROSTER_ACCESS_FORBIDDEN` | 403 | `tryFetchEnrollment` **only** | swallowed → `className: ""`, screen still renders |
| `ROSTER_STUDENT_NOT_ENROLLED` | 404 | `tryFetchEnrollment` **only** | swallowed → `className: ""` |
| any other enrollment failure | * | `tryFetchEnrollment` | swallowed → `className: ""` |
| `PARENTLINK_FORBIDDEN` | 403 | `getChildren` | `no-child` (collapses to the empty state) |
| any other linked-students failure | * | `getChildren` | `network-error` |

Note the packet's error table said the enrollment 403 is `ROSTER_ACCESS_FORBIDDEN`
— confirmed correct against `ERROR_CODES.md:99`. But `linked-students`'s 403 is
`PARENTLINK_FORBIDDEN` (`ERROR_CODES.md:319`), **not** `ROSTER_*`; the packet
did not name it. Both are covered.

#### Every flagged "engineer's call", decided

1. **`getByClass` — delete or keep?** → **KEPT**, contract-correct, still routed
   to mock by the hybrid, with an updated doc comment saying plainly that it has
   zero callers. Followed the packet's stated precedent (US-E18.11). Nothing
   calls it with a stale mock classId any more — the parent flow moved to
   `getByMember`, which was the actual risk the packet warned about.
2. **`TIMETABLE_CHILD_AMBIGUOUS` → new type or reuse?** → **reused
   `network-error`**, exactly as the planner recommended, with the one-line
   rationale in `toTimetableViewFailure`'s doc comment: this client never calls
   the endpoint with a parent's own memberId, and a new union member would
   ripple into two exhaustive `Record<TimetableErrorKey, …>`s plus i18n for a
   state that cannot render.
3. **Standalone `member-enrollment.mapper.ts` or fold into the repository?** →
   **folded into the repository** (`tryFetchEnrollment` returns the DTO; the
   three fields are consumed inline). A passthrough mapper producing no entity
   would be a file for its own sake. Consequently there is **no**
   `member-enrollment.mapper.test.ts`; the behaviour is covered by four
   repository tests (success, two degrade codes, generic degrade).
4. **Admin `room` — same commit or split?** → **same commit** (see above).
5. **Is `linked-students` paginated?** → **CONFIRMED NOT.** Read the actual
   schema: `LinkedStudentsResponse` is `{ links: LinkedStudentItemResponse[] }`
   (`services/core/docs/openapi.yaml`), the operation declares no `cursor`/
   `limit` parameters, and the sibling `parent-consent.repository.ts:42-44`
   precedent agrees. So **no `raw: true`, no `fetchAllPages`** — and a test
   asserts the call is made with **no axios config object at all**, documenting
   the confirmation. The pre-existing `raw`-flag guard on the (unchanged)
   `GET /classes` `fetchAllPages` path was kept and strengthened.
6. **`room` HTML-escaping** → **no work needed, confirmed safe.**
   `grep -rn "dangerouslySetInnerHTML" src/features/timetable
   src/features/admin/timetable src/components` returns **only the three new
   doc comments** that mention the term. Every render site is plain JSX text
   interpolation (`timetable-grid.tsx:228`, `timetable-screen.tsx:423`) and the
   editor input is a controlled `value` (`slot-editor-dialog.tsx:83`). Noted
   inline in both mappers.

#### Corrections to the packet found while reading the real code

- **Planner correction #1 confirmed**: `MockTimetableRepository` already
  round-tripped `room`; only `TimetableSlotMapper` dropped it. No mock fix was
  made — a regression-guard test was added instead so nobody "fixes" it later.
- **The admin RMW dropped OTHER cells' rooms too.** The packet only asked for
  the edited cell. The repository re-maps the whole slot list on every
  single-cell edit, so without `room: s.room || undefined` in that `.map()`,
  saving one cell would have wiped every other cell's newly-persisted room. A
  test pins this.
- **`toEntity` cannot read `subjectName` in the admin builder** — the plan said
  it should, but the admin `TimetableSlot` entity has no `subjectName` field
  (the builder resolves names from its own catalogue picker). The DTO declares
  `subjectName?` for contract fidelity and the mapper documents that it is
  deliberately not consumed. No entity change was made (out of scope).
- **`mapRealWeeklyTimetable` now reads `subjectName`/`room`** (small, deliberate
  extension beyond "keep untouched"): its DTO gained the fields, and leaving the
  mapper hardcoding `room: undefined` would be a latent bug the day `getByClass`
  gets a caller. Signature and all existing assertions unchanged.
- **`getByTeacher` no longer 404s on an empty class list.** Previously an empty
  `GET /classes` meant "no schedule"; now the by-member call is authoritative
  (it 404s `TIMETABLE_MEMBER_NOT_RESOLVABLE` itself), and the class list is only
  a name lookup. The two calls are issued **concurrently** (`Promise.all`), so
  the test asserts the call SET, not the order.
- **Enrollment `gradeLevel`** is fetched but has nowhere to render (no
  timetable screen shows it). Documented inline as available-but-unused rather
  than inventing a UI slot.

#### Scope boundaries honoured

`getConflicts` untouched (ask #16 still open). No discipline/conduct self-view.
`resolve-current-term.ts`, both day-enum mappers, and the admin write RBAC all
reused as-is. No `.i-vm.ts`, `actions.ts` or `page.tsx` file was touched —
`git show --stat 466f3d1` shows the only presentation files in the diff are
`child-picker.tsx` and its stories.

#### Notes for fe-lead

- **Cross-repo asks**: #15 and #17 can be marked RESOLVED; #20 stays PARTIAL
  (class context now real, student display NAME still unavailable to any
  PARENT-callable endpoint — this is what the ordinal fallback exists for);
  #22's classId-discovery half is resolved by the enrollment endpoint, the
  conduct self-view UI itself is still unbuilt.
- **New ask candidate (product/design, not BE)**: the enrollment endpoint hands
  us `gradeLevel` and `academicYearLabel` for free; the timetable header shows
  neither. Worth a small follow-up US if product wants them.
- **Cross-feature naming collision (informational, not a blocker)**: there are
  now two different `linked-students` DTOs in the codebase — this feature's
  ground-truthed `LinkedStudentItemDto` (`{linkId, parentMemberId,
  studentMemberId, createdAt, classId?, className?}`) and `parent-links`'
  speculative `LinkedStudentResponseDto` (`{fullName, avatarUrl, studentId}`,
  un-ground-truthed INT-001 shape from US-E20.2). The features stay decoupled
  per decision `0017`, but `parent-links` will need a contract re-check when it
  is wired — its shape does not match the real BE.
- **Follow-up recommendation (out of scope here, as instructed)**: the
  conduct/discipline self-view is now unblocked on the data side by
  `GET /members/{memberId}/enrollment`; it needs its own US (product/design gap,
  not a BE gap).

## Accessibility Audit (fe-accessibility-auditor, 2026-08-01)

### 1. Audit Summary

Scope: the ONE user-visible change in this US — `child-picker.tsx`'s
degraded-identity fallback (name → ordinal label, className → "chưa có lớp",
avatar → ordinal digit) rendered when real-mode `linked-students` omits a
student's display name (ask #20 residual). Checked: accessible-name
composition, contrast (resolved against actual `src/app/tokens.css` hex
values, not eyeballed), keyboard/focus, color-only-status, motion,
Vietnamese microcopy, and the new Storybook interaction story
(`ParentView_RealMode_NoNameFallback`).

**Findings**: 1 Blocking (contrast), 0 Major, 0 Minor. **The Blocking finding
was fixed in this same session** (small, mechanical token-class swap,
`<30min`, per this team's established audit-fix pattern) — see A11Y-001.
Everything else in the component-architect's contract (accessible name,
keyboard operability, color-not-sole-signal, motion, microcopy, story
coverage) verified **PASS**.

**Overall verdict: PASS** (post-fix). Re-ran `bunx tsc --noEmit` (clean) and
the full `timetable-view.stories.tsx` Storybook interaction suite (8/8
passed, including the new fallback story) after the fix — no regression.

### 2. WCAG 2.1 AA Coverage

| Criterion | Description | PASS/FAIL | Finding ID |
| --- | --- | --- | --- |
| 1.4.3 Contrast (Minimum) | Fallback name/class text (`text-edu-text-primary`, `text-edu-text-secondary`) on card/tint bg | PASS | — |
| 1.4.3 Contrast (Minimum) | Avatar digit fallback (`font-bold text-sm`, large-text floor ≥3:1 per this repo's rule) on solid `avatarBg` | **FAIL → FIXED** | A11Y-001 |
| 1.4.1 Use of Color | "Chưa có lớp" state conveyed by text, not color alone | PASS | — |
| 2.1.1 Keyboard | Picker `<button>` operable, no trap, existing Radix-free native semantics preserved | PASS | — |
| 2.4.7 Focus Visible | `focus-visible:ring-3 ring-ring/50` unchanged by this diff | PASS | — |
| 4.1.2 Name, Role, Value | Accessible name derived from visible text incl. fallback strings; `aria-pressed` state | PASS | — |
| 2.5.5 Target Size (AAA, tracked as house floor) | `min-h-11 min-w-[240px]` ≥44px, unchanged | PASS | — |
| 3.1.2 Language of Parts | Vietnamese fallback copy natural, unambiguous | PASS | — |
| 2.3.3 / motion-safe house rule | No new animation introduced | PASS | — |

### 3. Findings Catalogue

```
A11Y-001
Severity: Blocking (WCAG 1.4.3 Contrast Minimum)
Component: src/features/timetable/presentation/timetable-view/child-picker.tsx
           (avatarBg/avatarText pairing sourced from subject-color-tokens.ts)
Issue: The avatar span rendered white text (`text-white`, unconditional) on
  every `CHILD_COLOR_CLASSES[color].avatarBg` solid background. Before this
  US the avatar always showed 2-char name initials; this US adds the
  ordinal-digit fallback ("1", "2", …) as the avatar's real-mode content for
  EVERY child once a name is unavailable — since `linked-student.mapper.ts`
  cycles `color` deterministically by roster position
  (primary→success→warning→error→purple→teal), any parent with 3+ linked
  children now deterministically hits `warning` (and 4+ hits `error`, 6+
  cycles through all six), making this failure certain to render in real
  mode, not a hypothetical edge case.
Evidence: Resolved against actual `src/app/tokens.css` hex values (not
  guessed) — white (#FFFFFF, L=1.0) vs each solid `avatarBg`:
    --edu-success #13DEB9 → contrast 1.72:1 (FAIL, needs ≥3:1 large-text floor)
    --edu-warning #FFAE1F → contrast 1.85:1 (FAIL) — this is exactly the
      "white text on --edu-warning" pattern `.claude/rules/accessibility.md`
      calls out by name, just reached via the avatar path, not a badge.
    --edu-error   #FA896B → contrast 2.37:1 (FAIL)
    --edu-teal    #00B8A9 → contrast 2.49:1 (FAIL)
    --edu-primary #5D87FF → contrast 3.29:1 (marginal PASS)
    --edu-purple  #7B5EA7 → contrast 5.25:1 (PASS)
  4 of 6 palette colors failed even the 3:1 "large text" floor (project rule:
  ≥14px bold = large text; avatar span is `font-bold text-sm` = 14px bold).
Fix (APPLIED, same session): added `avatarText: string` to the
  `ChildColorClasses` interface in `subject-color-tokens.ts`, set uniformly to
  `"text-edu-text-primary"` (#2A3547) for all six colors — measured to pass
  ≥3:1 against every solid `avatarBg` (min 3.64:1 on primary) and ≥4.5:1
  against success/warning/error/teal. `child-picker.tsx`'s avatar span now
  reads `cn("flex size-9 items-center justify-center rounded-full font-bold
  text-sm", c.avatarBg, c.avatarText)` instead of a hardcoded `text-white`.
  Verified: `bunx tsc --noEmit` clean, full `timetable-view.stories.tsx`
  Storybook interaction suite 8/8 passed post-fix (no visual regression to
  the existing named-child stories, whose avatar text simply darkened).
Reference: WCAG 2.1 SC 1.4.3 (https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html);
  `.claude/rules/accessibility.md` §Contrast ("Không đặt text trắng trên
  --edu-warning (vàng)").
```

No further findings — everything else in the component-architect's contract
verified clean (see §4/§5 below for detail).

### 4. Keyboard Navigation Map

- Tab order (unchanged by this US): fieldset legend (sr-only, not focusable)
  → each child `<button type="button">` in DOM/reading order → (rest of
  `timetable-view` screen: week navigator, grid).
- Per button: `Tab`/`Shift+Tab` moves focus in/out; `Enter`/`Space` activates
  `onClick` → `onSelect(child.childId)` (native `<button>` semantics, no
  custom key handler needed or present — correct, no `role="radio"` fake
  widget requiring arrow-key support was introduced).
- Focus ring: `outline-none focus-visible:ring-3 focus-visible:ring-ring/50`
  — `--ring` resolves to `--edu-primary-dark` (#4570EA) per
  `src/app/globals.css:146` — visible on both the default `bg-edu-card`
  (white) and the active-state tint (`bg-edu-primary/10` etc., still
  high-contrast against the ring color). No `outline: none` without a
  replacement (rule compliant).
- `disabled` prop correctly sets native `disabled` (removes from tab order,
  `disabled:pointer-events-none disabled:opacity-60` — not color-only, the
  element becomes genuinely inert) — unaffected by this diff.
- Verified by reading the actual DOM structure in `child-picker.tsx`
  (fieldset → button → aria-hidden avatar span → two text spans), matching
  the component-architect's §1 read exactly.

### 5. Screen Reader Script

**Before this US** (name always present, real mode never omitted it because
it never existed as a field):
> "Nguyễn An Lớp 10A1, button, pressed" (or "not pressed")

**After this US, name present** (unchanged case):
> "Nguyễn An Lớp 10A1, button, pressed"

**After this US, name absent, className present** (new fallback #1):
> "Con thứ 1 Lớp 10A1, button, not pressed"

**After this US, name absent, className absent** (new fallback #2, the
"double-degraded" case):
> "Con thứ 2 Chưa có lớp, button, not pressed"

Confirmed no comma is literally inserted by the browser's accname algorithm
(the two sibling `<span>` text nodes are joined with a single space) — the
component-architect's §5 correction is accurate; verified directly via the
new Storybook interaction assertions
(`canvas.getByRole("button", { name: /Con thứ 1 Lớp 10A1/ })` /
`/Con thứ 2 Chưa có lớp/`), which exercise the exact regex a screen reader
transcript would need to match. Multiple children with different ordinal +
class combinations remain unambiguously distinguishable (ordinal always
differs; class line differs whenever class state differs) — confirmed no two
children in the `DEGRADED_CHILDREN` fixture (or any plausible roster) could
produce identical accessible names, since `ordinal` is always unique per
child.

Avatar span (`aria-hidden="true"`) is correctly excluded from this
announcement in all cases — the ordinal-digit fallback avatar content is
never read twice.

### 6. Quick Wins

1. **[Blocking, fixed]** A11Y-001 — avatar white-on-solid-color contrast
   (see above). Done.
2. **[Optional polish, not required, not applied]** The component-architect's
   §5 noted an optional `<span className="sr-only">{", "}</span>` separator
   between the name and class lines for a clearer AT pause. Confirmed this
   is genuinely optional per WCAG 4.1.2 (name is present, distinguishing,
   programmatically determinable without it) — left unimplemented per the
   architect's own "not mandating it, avoid scope creep" call; flagging here
   only so it stays visible as a nice-to-have, not lost.

### Other checks explicitly verified (no separate finding, all PASS)

- **Motion**: `motion-safe:transition-colors` on the button (pre-existing,
  color transition only, no new animation) — no `prefers-reduced-motion` gap
  introduced by this diff.
- **Vietnamese microcopy**: `"Con thứ {ordinal}"` and `"Chưa có lớp"` read
  naturally to a Vietnamese parent — "Con thứ 1/2/3" is the standard ordinal
  construction for enumerating one's children in this register, and "Chưa có
  lớp" ("no class yet") is terse and unambiguous, consistent with sibling
  copy tone elsewhere in the design system. No abbreviation, no ambiguity.
- **i18n mechanism**: both new keys (`childOrdinalLabel`, `classPending`)
  confirmed present in BOTH `messages/vi.json` and `messages/en.json` under
  the existing `timetableView` namespace, using the same `{param}`
  interpolation convention as the reused `classLabel` key — no hardcoded
  strings introduced.
- **Storybook interaction coverage**: `ParentView_RealMode_NoNameFallback`
  genuinely exercises both degraded states (child 1: no name + real
  className; child 2: no name + no className) in the SAME story, asserts
  both accessible names via `getByRole`, asserts `aria-pressed` toggling, and
  asserts the fallback card remains a fully operable control (`userEvent
  .click` → `fetchChildTimetable` called with the correct `childId`) — not a
  happy-path-only test. Confirmed by reading
  `timetable-view.stories.tsx:191-229` and by re-running the file locally
  (8/8 passed, post-fix).

## Tech-Lead Review (fe-tech-lead-reviewer, 2026-08-01)

### 1. Review Summary

This US un-mocks the timetable feature's three consumer views against BE US-153's
by-member endpoint and US-148's enrollment/`linked-students` enrichment, collapses
the teacher schedule from a 1+N fan-out to a 2-call concurrent composition, and
threads `room` through the admin builder's real RMW write path. Quality is high:
every BE claim in the Evidence section was independently re-ground-truthed against
`edu-api@e2da90b5` and **all eleven self-reported claims hold**. Layering, tokens,
i18n parity and the failure taxonomy are clean. One real (real-mode-only) defect was
found and fixed in-review, plus two pre-close doc items remain for `fe-lead`.

### 2. Architecture Compliance — **PASS**

- `import "server-only"` present on all three touched repositories
  (`real-weekly-timetable.repository.ts:1`,
  `mocks/weekly-timetable.mock.repository.ts:1`,
  `admin/.../timetable.repository.ts:1`). The new mappers/DTOs correctly carry none —
  matches the confirmed repo-wide convention (pure infra helpers are framework-free).
- `grep` over `features/timetable/presentation` + `features/admin/timetable/presentation`
  for `infrastructure/` / `bootstrap/di` → **zero hits**. No boundary violation
  introduced by the new `getByMember`/`getMyTimetable`/`getByTeacher`/`getChildren`
  compositions — they all live inside the repository, which is exactly right.
- `bootstrap/di/timetable-view.di.ts`: **doc-comment-only diff**, confirmed by
  `git diff main...HEAD`. `RealWeeklyTimetableRepository`'s constructor signature is
  unchanged (`http`, `resolveTermId`, `currentUserId`), and `ensureFreshSession()` is
  still wired in the `!USE_MOCK` branch. Claim #8 verified.
- Naming conventions honoured (`linked-student-item.dto.ts`,
  `member-enrollment-response.dto.ts`, `member-timetable-response.dto.ts`,
  `linked-student.mapper.ts`). All three new endpoints are constants with
  `encodeURIComponent` — no magic strings.
- `child-picker.tsx` stays feature-local at
  `features/timetable/presentation/timetable-view/` — correct under
  `component-organization.md` tier 3 (composed, single screen). No promotion warranted;
  no duplication introduced.

### 3. Code Quality — **Excellent**

- No `any`, no unexplained non-null `!`. The `?? "primary"` on the colour cycle
  (`linked-student.mapper.ts:41`) is a `noUncheckedIndexedAccess` accommodation, not a
  silent default.
- `toTimetableViewFailure` branches on `error.code`, never on message. The
  `TIMETABLE_CHILD_AMBIGUOUS → network-error` rationale comment **does exist**, at
  `real-weekly-timetable.repository.ts:41-48`, and correctly explains both the
  unreachability and the type-surface-ripple cost. Claim #3 verified. The residual
  risk is acceptable: were it ever to fire, the user sees the generic error banner
  rather than a misleading one — no wrong-state render.
- `getByTeacher` issuing the two calls via `Promise.all` (a genuine improvement over
  the plan's sequential sketch) and asserting the call SET rather than order in tests
  is good judgement.
- `mapRealWeeklyTimetable`'s signature is genuinely unchanged (`dto, className`) —
  verified by diff; it only reads the two newly-declared optional DTO fields, so the
  kept-but-uncalled `getByClass` path stays contract-correct. Claim #10 (second half)
  verified.

### 4. Data & Contract Review — **PASS** (one composition gap, fixed in-review)

Re-ground-truthed against `edu-api@e2da90b5`:

| Claim | Verdict | Evidence |
| --- | --- | --- |
| #1 `linked-students` not paginated | **CONFIRMED** | `openapi.yaml:9590` `LinkedStudentsResponse` = `{ links: LinkedStudentItemResponse[] }`, `required:[links]`; the path at `:3218` declares only `MemberId` — no `cursor`/`limit`. No `raw:true`/`fetchAllPages` is correct, and the "sends no pagination params" test documents it. |
| #2 403 is `PARENTLINK_FORBIDDEN` | **CONFIRMED** | `ERROR_CODES.md:319`. The packet's error table was wrong to assume `ROSTER_ACCESS_FORBIDDEN` here (that code is real but belongs to the *enrollment* call — `ERROR_CODES.md:99`, also confirmed). `→ no-child` is the right mapping: the openapi authz note shows the same 403 for "not this parent" as for a probe, so a distinguishable permission error would leak. |
| #4 RMW preserves `room` on untouched slots | **CONFIRMED** | `timetable.repository.ts:408` adds `room: s.room \|\| undefined` inside the *preserve* `.map()`, not just the spliced cell. Pinned by `timetable.repository.test.ts` "persists room through the RMW PUT" which asserts BOTH the edited cell and the untouched `TUE/2` cell keep their rooms. This was a genuine catch the plan did not anticipate — good work. |
| #5 no `dangerouslySetInnerHTML` | **CONFIRMED** | Grepped `src/features/timetable src/features/admin/timetable src/components` myself: the only three hits are the new doc comments that mention the term. Every `room` render is plain JSX interpolation. |
| Wire shapes | **CONFIRMED** | `MemberTimetableResponse` (`:7786`), `SlotResponse` with required `classId` + optional `subjectName`/`room` (`:7801`), `MemberEnrollmentResponse` (`:7696`), `LinkedStudentItemResponse` nullable-or-omitted `classId`/`className` (`:9558`). The DTOs mirror these exactly, camelCase throughout. |

Failure mapping, degrade-not-fail independence, and the `raw:true` top-level guard on
the surviving `GET /classes` `fetchAllPages` are all correctly implemented and tested
(`real-weekly-timetable.repository.test.ts:287`).

**Finding fixed in-review (was SHOULD FIX):** the by-member response has no top-level
class identity, so `getByMember` returns `className: ""`. For the STUDENT view the
repository composes the enrollment call's name back on — correct. For the **PARENT**
view nothing did, so in real mode `timetable-view.tsx:59-62` (which uses
`state.timetable.className` on success) got `""`, hiding the header class badge and
rendering the grid's `sr-only` caption as *"Thời khoá biểu lớp , chế độ chỉ xem."* —
even though `linked-students` had just fetched that very `className`, which is the
headline win this US claims for ask #20. Fixed in `get-child-timetable.use-case.ts` by
composing the roster item's `className` onto the returned week (`child.className ??
week.className`, so the mock path is byte-identical and a child with no enrollment
still degrades to `""`). This is symmetric with how the student self-view composes its
enrollment inside the repository, and needs **no presentation diff** — the
design-review gate scope is unchanged. Two tests added to
`get-child-timetable.use-case.test.ts` pinning both directions. `classId` deliberately
left as the repository returned it (nothing in this feature renders it, and the
engineer's by-member-key assertions stay intact).

### 5. Design System & i18n — **PASS**

- i18n: `timetableView.childOrdinalLabel` + `timetableView.classPending` are present
  in **both** `vi.json` and `en.json` at the same path (claim #9 verified by diff);
  `classLabel` is **reused, not duplicated**. Both keys are typed and consumed only at
  presentation. No hardcoded Vietnamese/English in `child-picker.tsx` or in any touched
  repository/mapper (the Vietnamese in mapper doc *comments* and in mock fixtures is
  correctly exempt). The repositories return stable failure keys, never copy.
- Tokens: `child-picker.tsx` introduces no colour at all — the two changed expressions
  reuse the existing `text-edu-text-primary` / `text-edu-text-secondary` spans. No raw
  colour anywhere in the diff.

### 6. Security Review — **PASS**

- `room` is BE-echoed unsanitized and is rendered exclusively through JSX text
  interpolation; the editor input is a controlled `value`. Verified by grep, not by
  claim. The deliberate "confirmed safe" note exists in both mappers.
- No secrets/PII client-side; `memberId`s stay server-side. Token handling untouched —
  `ensureFreshSession()` still guards the real branch. Both parent Server Actions
  (`getChildListAction`, `getChildTimetableAction`) call `requireRole(["parent"])`
  **before** any DI call.
- The `no-child` / `not-found` collapses correctly mirror the BE's deliberate
  no-enumeration posture rather than leaking a distinguishable "forbidden" state.

### 7. Test Coverage — **PASS**

Every file in the packet's exact TDD plan is present and the tests are non-vacuous
(`it.each` failure matrices, a stable-ordinal test that reshuffles the response, a
"sends no axios config" test that documents the pagination confirmation, a two-call
assertion that pins the removal of the 1+N fan-out, and a mock-room regression guard).
Claim #10's deviation is fine: folding the enrollment passthrough into
`tryFetchEnrollment` is the right call, and it *is* adequately covered — four repository
tests (`:177` compose, `:191` the two ROSTER_* degrade codes via `it.each`, `:207`
generic degrade, `:217` primary-failure-still-propagates).

Gates I re-ran myself on this branch:

| Gate | Result |
| --- | --- |
| `bun vitest run` (as delivered) | **437 files / 3079 tests passed** — exactly the claimed numbers. Claim #6 verified. |
| `bun vitest run` (after my fix) | 437 files / **3081** tests passed |
| `bunx tsc --noEmit` | clean, no output |
| `bun lint` | exit 0 — the only findings are 1 warning + 1 info in `message-context-menu.tsx`, pre-existing and untouched (the Evidence table says "3 errors"; the substance — pre-existing, unrelated, not in this diff — holds) |
| `env -u NEXT_PUBLIC_USE_MOCK bun run build` | **green**, full route manifest emitted |

### 8. Required Changes

- **[FIXED IN REVIEW]** `get-child-timetable.use-case.ts` — parent real-mode class
  caption/badge was blank. See §4. Fix + 2 tests committed with this review.
- **[MUST FIX — fe-lead, pre-close]** `docs/TEST_MATRIX.md` has **no row for
  US-E18.26**. Every one of US-E18.0 … US-E18.25 has one; `tdd.md` requires the row at
  `planned` *before* code and forbids `implemented` without proof in it. Also this
  packet's own `## Status` is still `planned`. Cheap, but blocking under the epic's own
  convention.
- **[SHOULD FIX — follow-up US, not this one]** `src/features/parent-links` drift is
  **real and confirmed**, per claim #11. `parent-consent.repository.ts:42-44` GETs the
  *same* URL (`parent-links.endpoint.ts:23`, also missing `encodeURIComponent`) and
  casts the payload to `LinkedStudentResponseDto[]` — a bare array of
  `{studentId, fullName, avatarUrl, linkId}`. The real wire is
  `{ links: [{linkId, parentMemberId, studentMemberId, createdAt, classId?, className?}] }`.
  So `getLinkedStudents` would return `[]`/garbage the moment that feature flips real,
  and its doc comment's claim that "flipping USE_MOCK=false needs no rework" is now
  false. Worth logging as a follow-up so the next engineer doesn't trust that comment.
- **[CONSIDER — a11y auditor owns]** `child-picker.tsx:50` renders `text-white`
  initials on an avatar whose background cycles the child colour set, which **includes
  `warning`** (`linked-student.mapper.ts:31`). White on `--edu-warning` (#FFAE1F) is
  ~1.7:1 — the named hard rule in `accessibility.md`. Pre-existing (line untouched by
  this diff), and mitigated because the span is `aria-hidden` with the ordinal repeated
  as adjacent real text — but this US *increases* exposure: mock had 2 children so the
  warning slot was never reached, whereas a real parent with 3 linked students now hits
  it. Same class of finding as US-E13.7's `ChildSwitcher`.
- **[CONSIDER]** Enrollment `gradeLevel`/`academicYearLabel` are fetched and discarded.
  Correctly documented as deliberate rather than silently dropped — no action here, but
  it is a live follow-up candidate as the Evidence section notes.

### 9. Final Decision — **APPROVED**

No security, data-loss or layering issue. All eleven self-reported claims were
independently re-verified against `edu-api` source and every one held — notably the
two the packet itself got wrong (`PARENTLINK_FORBIDDEN` vs `ROSTER_ACCESS_FORBIDDEN`,
and the RMW dropping *other* cells' rooms) were caught and corrected by the engineer,
which is exactly the standard this gate wants. The one real defect found (parent
real-mode blank class name) was small and is fixed in-review with tests. Approval is
conditional only on `fe-lead` landing the `docs/TEST_MATRIX.md` row + `## Status` flip
before the story closes, and logging the `parent-links` contract drift as a follow-up.
