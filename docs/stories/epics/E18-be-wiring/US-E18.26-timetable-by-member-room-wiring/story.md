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

## Evidence

(fe-nextjs-engineer / fe-lead fill in at completion: files changed, exact
test counts, error-matrix table, tech-lead + a11y verdicts, design-review
verdict, QA Go/No-Go, and the final documented choice for each "engineer's
call" decision flagged above.)
