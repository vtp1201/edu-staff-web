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

## Evidence

(fe-nextjs-engineer / fe-lead fill in at completion: files changed, exact
test counts, error-matrix table, tech-lead + a11y verdicts, design-review
verdict, QA Go/No-Go, and the final documented choice for each "engineer's
call" decision flagged above.)
