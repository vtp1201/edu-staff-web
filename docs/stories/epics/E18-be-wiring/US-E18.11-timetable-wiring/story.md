# US-E18.11 Timetable wiring (builder + consumer views)

## Status

implemented

## Lane

normal — remap + client-side classId/term resolution + reactive conflict
surfacing on save. No hard-gate flag trips: no auth/RBAC/token/session/tenant-
isolation/data-loss/PII/validation-weakening/new-design-token change. Touches
existing UI (error surfacing on save uses the existing toast/inline-error slot
already in `TimetableScreen`) — design-review gate applies only if the
engineer adds any new visual element (expected: none, reusing existing error
UI); a11y audit runs regardless per team default for BE-wiring stories that
touch a presentation component.

## Dependencies

- Depends on: none (Wave 3, but no ordering dependency on E18.12/13/14 per
  EPIC-OVERVIEW.md — those are grades/academic-records/conduct, disjoint
  feature modules).
- Blocks: none.
- Feature module(s) touched: `src/features/admin/timetable/` (builder),
  `src/features/timetable/` (read-only consumer views: student/teacher/parent),
  `src/bootstrap/endpoint/{timetable,timetable-view}.endpoint.ts`,
  `src/bootstrap/di/{timetable,timetable-view}.di.ts`.
- Shared file: `src/bootstrap/i18n/messages/{vi,en}.json` — new `timetable`/
  `timetableView` error keys only (`teacher-conflict`, `forbidden`, etc.); no
  other in-flight US touches this namespace (solo mode, verified via
  `git branch -r` → only `origin/main`).
- Reuse candidate (do NOT duplicate): if `calendar` feature already exposes a
  real "resolve active term for today" helper/DI (US-E18.1, `implemented`),
  reuse it rather than re-deriving term resolution in this feature — check
  `src/features/calendar` + `src/bootstrap/di/calendar.di.ts` first.

## Product Contract (ground-truthed 2026-07-16 against `edu-api` Go source +
`services/core/docs/{openapi.yaml,ERROR_CODES.md}`, not just prose)

### Real BE contract (`core`, tag `Timetable`)

```
PUT    /api/v1/classes/{classId}/timetable          (ADMIN/SUPER_ADMIN)
  body: { termId: uuid, slots: [{ day: MON|TUE|WED|THU|FRI, period: 1-20,
          subjectId: uuid, teacherMemberId: uuid }] }
  full-replace: slots not in this request are removed. 409
  TIMETABLE_TEACHER_CONFLICT if a teacherMemberId is already assigned to
  ANOTHER class in the tenant for the same (day, period) — checked PER SLOT,
  server-side, at write time. No separate "check conflicts" endpoint exists.

GET    /api/v1/classes/{classId}/timetable?termId=  (ADMIN always; TEACHER if
  assigned to the class; STUDENT if enrolled in the class — ADR 0029; anyone
  else 403 TIMETABLE_FORBIDDEN)
  returns: { classId, termId, slots: [{day,period,subjectId,teacherMemberId}] }
  — NO subjectName/teacherName/room/className on the wire. Display names must
  be joined client-side from already-wired subject-catalogue (US-E18.3) /
  a teacher-name source (same gap as cross-repo ask #6/#7 — IAM has no public
  member-lookup; fall back to raw id like every other US in this epic, or
  render only subjectName if a subject list is available and skip teacherName
  display — engineer's call, document either way).

DELETE /api/v1/classes/{classId}/timetable/slots?termId=&day=&period=  (ADMIN)
  Removes exactly one slot. 404 TIMETABLE_SLOT_NOT_FOUND if absent. Maps
  cleanly onto the current `clearSlot(classId, day, period)` shape (drop
  `yearId`, add `termId`).
```

Error taxonomy (ground-truthed, UPPER_SNAKE — `ERROR_CODES.md` lines 110-120,
consistent with every other `core` cluster this epic, decision `0008`):

| Code | HTTP | Meaning |
| --- | --- | --- |
| `TIMETABLE_INVALID_TENANT_ID` | 400 | bad tenant context |
| `TIMETABLE_INVALID_CLASS_ID` | 400 | bad/nonexistent classId |
| `TIMETABLE_INVALID_TERM_ID` | 400 | bad termId |
| `TIMETABLE_INVALID_MEMBER_ID` | 400 | bad teacher/actor member id |
| `TIMETABLE_INVALID_SUBJECT_ID` | 400 | bad slot subjectId |
| `TIMETABLE_INVALID_SLOT_ID` | 400 | malformed composite slot id |
| `TIMETABLE_INVALID_DAY` | 400 | day not in MON..FRI |
| `TIMETABLE_INVALID_PERIOD` | 400 | period outside 1-20 |
| `TIMETABLE_FORBIDDEN` | 403 | non-ADMIN write, or reader with no access |
| `TIMETABLE_SLOT_NOT_FOUND` | 404 | slot removal target absent |
| `TIMETABLE_TEACHER_CONFLICT` | 409 | teacher double-booked (the "conflict") |

Current web guessed codes (`TIMETABLE_SAVE_FAILED` and the rest falling to
generic `fetch-failed`) never match any real code — rewrite `toFailure`
completely, do not keep the old guesses as dead branches.

### What does NOT exist on the real API (confirmed by reading Go source, not
just openapi prose — same rigor as every other Wave-2/3 US)

1. **No bulk/whole-school conflicts endpoint.** `GET /timetable/conflicts`
   (what the current mock + `ConflictSummary` UI section assume) has no real
   equivalent. Conflicts are only discoverable reactively, one slot at a time,
   as a 409 on `PUT`. **Scope decision**: `getConflicts()` stays mock-first
   permanently (hybrid DI, same pattern as US-E18.5/US-E18.4) — do NOT attempt
   a full-tenant fan-out (fetch every class × timetable and compute conflicts
   client-side) for this US; that is a separate, much larger feature decision
   (flag it as a cross-repo ask, not something to build speculatively here).
   `updateSlot`'s real 409 `TIMETABLE_TEACHER_CONFLICT` becomes a NEW failure
   type (`teacher-conflict`) surfaced through the EXISTING save-error toast/
   inline-error path in `TimetableScreen.handleSave` (already wired — just
   route the new failure type to a translated message). No new UI component.
2. **No `room` field anywhere on the wire** (`SlotRequest`/`SlotResponse`).
   The current `TimetableSlot.room` / `SlotEditorDialog`'s room input has zero
   BE backing. **Scope decision**: keep the field in the domain entity + UI
   (removing a UI field is itself a design change needing the design-review
   gate re-run — out of proportion for this US) but it becomes client-side-
   only / non-persistent past a page reload once real-wired: document this
   plainly in the mapper (same precedent as US-E18.7's non-persistent `count`
   field) and log a cross-repo ask (#15, below) rather than silently losing
   data without a trace.
3. **No `/me`, `/teacher/me`, `/my-children` self-scope endpoints** — confirmed
   by grep across the full `services/core/docs/openapi.yaml` path list (644-
   952 range has every `Timetable`/`Classes`/`ParentStudentLink` path; none of
   these three exist). Resolve classId client-side per role:
   - **Class-scoped read (`getByClass`)** — the class the caller already knows
     (admin builder, or a caller who already resolved a classId) — REAL,
     direct 1:1 GET with the new mandatory `termId` param.
   - **Teacher (`getByTeacher`)** — REAL, resolvable via fan-out: `GET
     /api/v1/classes` is TEACHER-role auto-filtered server-side to "classes
     I'm assigned to" (ground-truthed in
     `services/core/internal/class/core/application/usecase/list_classes.go`
     lines 51-56, `listForTeacher`) — **this exact fan-out is already proven
     in production code**: `src/features/teacher/infrastructure/repositories/
     teacher-class.repository.ts`'s `listMyClasses()` calls `TEACHER_EP.classes`
     (`/core/api/v1/classes`) for precisely this. Reuse the pattern (do not
     duplicate the HTTP call logic — either import/compose or mirror it
     1:1 with a comment pointing at the precedent): for each returned classId,
     `GET .../timetable?termId=<resolved active term>`, then merge every
     (day,period) slot where `slot.teacherMemberId === currentUserId` into one
     composite `WeeklyTimetable`, tagging `className` from the class list
     response. `currentUserId` = `decodeSubClaim(token)` (JWT `sub`, exact
     precedent in `teacher-class.di.ts`) — confirmed to equal `memberId` by
     the existing `homeroomTeacherId === currentUserId` comparison in
     `teacher-dashboard.mapper.ts`.
   - **Student self (`getMyTimetable`)** — **BLOCKED, no wireable path.**
     Ground-truthed: the ONLY way to discover "which class is this student
     enrolled in" would be `GET /classes` (403 `ErrClassForbidden` for any
     non-ADMIN/non-TEACHER actor — confirmed reading
     `list_classes.go` line 59, STUDENT falls through to the forbidden
     return) or iterating every class's roster (`GET /classes/{id}/students`,
     itself ADMIN/assigned-TEACHER-only per `list_students_in_class.go`).
     There is no student-facing "my enrollment" endpoint anywhere in `core`.
     **Force-mock permanently** (same pattern as US-E18.8/US-E18.9's blocked
     stubs) — `getMyTimetable` stays on `MockWeeklyTimetableRepository`
     regardless of `USE_MOCK`, with a code comment citing this finding.
   - **Parent children (`getChildren`) + per-child view** — **BLOCKED for the
     same reason, one layer worse.** `GET /members/{memberId}/linked-students`
     IS real and callable by a PARENT for their own memberId (confirmed —
     `ParentStudentLink` tag, `LinkedStudentsResponse` schema, openapi.yaml
     ~3119-3153) and gives real `studentMemberId`s — but `LinkedStudentsResponse`
     carries ONLY `{linkId, parentMemberId, studentMemberId, createdAt}` (no
     classId, no name) and, as just established, there is no endpoint any
     PARENT (or the linked STUDENT) can call to resolve a `studentMemberId`
     into a classId. Wiring the id-list half without being able to resolve a
     class or a display name for any entry is not a meaningful partial win —
     **force-mock `getChildren` + the per-child `getByClass` call-site
     permanently** as one blocked unit, same reasoning as US-E18.5's roster
     ask #9 (three needed fields, zero available).

## Cross-repo asks to add to `EPIC-OVERVIEW.md` §Cross-repo requests (fe-lead
writes these after the engineer confirms no additional gaps surface)

- **#15**: Timetable has no self-scope discovery for STUDENT/PARENT roles —
  `GET /classes` is 403 for both, and `GET /members/{id}/linked-students`
  (parent→student) returns no classId. Either (a) add a
  `GET /members/{memberId}/enrollment` (or similar) endpoint any
  STUDENT/PARENT-for-their-own-linked-student can call to resolve their
  current classId, or (b) accept `/timetable/me`-family stays mock-first
  indefinitely. This is the same root gap category as ask #7/#9/#13 (no
  reverse/self lookup for non-admin roles), now confirmed for a 4th resource.
- **#16**: No bulk/whole-school timetable-conflicts endpoint — only per-slot
  reactive 409 on `PUT`. If a proactive whole-school conflict dashboard is a
  real product need, BE needs either a bulk scan endpoint or a materialized
  conflicts view; today it's unbuildable without an expensive full-tenant
  fan-out (every class × timetable, cross-referenced client-side).
- **#17**: `SlotRequest`/`SlotResponse` has no `room` field — if room-per-slot
  is a real requirement (currently a decorative-only web field), add it to
  the wire schema (same category as ask #10/#11's non-persistent fields).

## Scope Decision Summary (what gets wired real vs. stays mock)

| Operation | Feature | Real or mock |
| --- | --- | --- |
| `getTimetable(classId, termId)` (admin builder read) | `admin/timetable` | REAL |
| `updateSlot`/`clearSlot` (admin builder write) | `admin/timetable` | REAL (read-modify-write full PUT under a per-cell save UX — BE has no per-slot PUT, only full-replace; `clearSlot` maps 1:1 to the real per-slot DELETE) |
| `getConflicts` (whole-school proactive summary) | `admin/timetable` | MOCK permanently (ask #16) |
| `getByClass(classId, weekStart)` (class-scoped consumer view) | `timetable` (view) | REAL |
| `getByTeacher` (teacher personal schedule) | `timetable` (view) | REAL via `GET /classes` fan-out + merge |
| `getMyTimetable` (student self) | `timetable` (view) | MOCK permanently (ask #15) |
| `getChildren` + child `getByClass` (parent) | `timetable` (view) | MOCK permanently (ask #15) |

Hybrid DI composite pattern (real for some ops, mock for others in the SAME
repository) has precedent in US-E18.4/US-E18.5 — follow that shape, not a
force-mock-everything nor a force-real-everything DI factory.

## Implementation notes for `fe-nextjs-engineer`

1. **Day enum mapping.** Real wire `day` is `MON|TUE|WED|THU|FRI` (string
   enum); web's domain uses 0-indexed `day: number` (0=Mon..5=Sat, though Sat
   has no real BE slot since real enum stops at FRI — confirm and drop the
   Sat column from the real path if the school week is genuinely Mon-Fri only,
   or keep client-side Sat as always-empty if some part of the UI still
   expects 6 columns; check `timetable-view.constants.ts` /
   `timetable-static.ts` for the current day list before deciding). Write a
   pure `dayIndexToEnum`/`dayEnumToIndex` mapper, unit-test both directions
   including the boundary.
2. **Term resolution.** Every real endpoint requires `termId`, which nothing
   in either feature currently threads (`weekStart` date param doesn't map to
   a term at all). Resolve the term from a date (or "today" by default) via
   the already-real `calendar` feature (US-E18.1, `implemented`) — check
   `src/bootstrap/di/calendar.di.ts`/`src/features/calendar` for an existing
   "list terms for the active year, pick the one whose [startDate,endDate]
   contains this date" helper to REUSE, not reinvent. If none exists at the
   right layer, add a small pure helper in this feature's domain (given a
   list of terms + a date, resolve the containing term) and call the calendar
   feature's real DI/use-case to fetch that list — do not duplicate calendar's
   HTTP/repo logic per `.claude/rules/component-organization.md`'s spirit (one
   source of truth per concern) and decision `0017` (one repo per service —
   calendar and timetable are both `core` but distinct bounded concepts, so
   compose via calendar's public use-case, don't reach into its repository).
3. **Admin builder read-modify-write.** `updateSlot`/`clearSlot` currently
   call per-slot HTTP verbs that don't exist for `PUT` (only full-replace
   exists). New real `updateSlot` must: GET current full slot list for
   (classId, termId) → splice in the one changed cell (by day/period,
   replacing or adding) → `PUT` the full `{termId, slots}` body → map the 409
   conflict / other errors → return the entity for the single cell the caller
   asked about (keep the existing `updateSlot(...): Promise<TimetableSlot>`
   return contract so the presentation layer's `handleSave` is untouched).
   `clearSlot` maps to `DELETE .../slots?termId&day&period` directly (no
   read-modify-write needed — 1:1).
4. **`teacher-conflict` failure + i18n.** Add `{ type: "teacher-conflict";
   message: string }` to `TimetableFailure`, map `TIMETABLE_TEACHER_CONFLICT`
   → it, add `timetable.errors.teacher-conflict` vi+en keys with a message
   that names the conflict is a double-booked teacher (not a generic "save
   failed") — this is a genuinely more informative real-BE error than the
   mock ever produced, worth translating distinctly.
5. **Mock repos stay truthful.** Update `MockTimetableRepository` /
   `MockWeeklyTimetableRepository` to simulate the NEW contract shape
   (termId-keyed, day-enum-if-you-change-the-domain-representation,
   `teacher-conflict` on a colliding write) per `.claude/rules/tdd.md` — tests
   must not lie about a contract that no longer matches the domain.
6. **`ensureFreshSession()`** — wire into the `!USE_MOCK` branch of BOTH
   `timetable.di.ts` and `timetable-view.di.ts` before
   `createServerHttpClient()` (playbook step 6 — check whether either DI
   factory already does this before assuming it doesn't).
7. **Zero UI/ViewModel regression for the parts that stay mock.** Force-mock
   branches must NOT silently change today's mock-driven UX for student/
   parent views or the conflict summary — same "hybrid composite, explicit
   force-mock comment" pattern as `staff-leave.di.ts`/`teaching-plan.di.ts`.
8. **`raw: true` placement** (epic-wide recurring bug, US-E18.19 swept the
   known 9 sites) — if this US adds any NEW cursor-paginated fan-out call
   (e.g. the teacher `GET /classes` reuse, if paginated), `raw: true` MUST be
   a top-level axios-config sibling of `params`, never nested inside `params`
   — add a real-interceptor regression guard test per the established pattern
   (`staffing.repository.test.ts` §"real interceptor pipeline").

## Proof required (per `.claude/rules/tdd.md`, before `implemented`)

- Unit: day-enum mapper, term-resolution helper, mapper round-trips (both
  features), full error-code matrix (11 codes) for both repos.
- Integration: `timetable.repository.test.ts` (admin builder — GET/PUT-RMW/
  DELETE + conflict 409 + raw-flag guard if applicable),
  `weekly-timetable.repository.test.ts` (getByClass real, getByTeacher
  fan-out+merge real, getMyTimetable/getChildren stub-never-calls-http
  guards), both mock repositories updated + tested against the new contract.
- Zero regression vs. baseline (confirm exact count at run time — see
  `docs/TEST_MATRIX.md` US-E18.10 row, ~292 files / 1790 tests before this US).
- `bunx tsc --noEmit` clean, `bun run build` green (with `NEXT_PUBLIC_USE_MOCK`
  unset per INFRA.2 build-guard note), `bun lint` clean.
- tech-lead review verdict + a11y audit verdict (parallel) — a11y scope is
  narrow (one new toast/error message, no new interactive element) but still
  run per team default for any presentation-touching BE-wiring story.
- Design-review gate: only if a NEW visual element is introduced (not
  expected — flag to fe-lead if the engineer finds handleSave's existing
  error slot insufficient and needs something new).

## Evidence

**Implementation-time correction to the Scope Decision Summary table**: the
consumer `timetable` feature's `getByClass` has exactly ONE caller inside this
feature — `GetChildTimetableUseCase` (the parent flow), which is itself
permanently blocked (ask #15). There is no separate direct class-scoped view
use-case in `features/timetable` (that capability already exists, wired real,
in the ADMIN BUILDER feature — `features/admin/timetable` — this same US).
Wiring `getByClass` real here would feed the mock roster's fixture classIds
(e.g. `"11A2"`) into a real HTTP call and always fail — so it stays mock in
this feature's `HybridWeeklyTimetableRepository` too. Only `getByTeacher` is
genuinely real in the consumer feature. The `RealWeeklyTimetableRepository
.getByClass` implementation is kept (contract-correct, unit/integration
tested) for the day a direct class-scoped use-case is added here.

Files changed:
- `src/bootstrap/endpoint/timetable.endpoint.ts` (admin builder — real
  class-scoped paths, drops the fictitious per-slot/conflicts paths)
- `src/bootstrap/endpoint/timetable-view.endpoint.ts` (consumer view — real
  class-scoped path + `GET /classes` fan-out source, drops the non-existent
  `/me`/`/teacher/me`/`/my-children` paths)
- `src/bootstrap/di/timetable.di.ts` (admin builder DI — `ensureFreshSession`,
  term-resolver wiring)
- `src/bootstrap/di/timetable-view.di.ts` (consumer DI — hybrid composite,
  `ensureFreshSession`, `currentUserId` via `decodeSubClaim`)
- `src/bootstrap/lib/resolve-current-term.ts` (new — shared term-resolution
  composition reused by both DI factories)
- `src/bootstrap/i18n/messages/{vi,en}.json` — 10 new `timetable.errors.*` keys
  (full 11-code taxonomy minus the 2 already present)
- `src/features/admin/timetable/domain/{day-enum,resolve-term}.ts` (+ tests) —
  new pure helpers
- `src/features/admin/timetable/domain/failures/timetable.failure.ts` —
  rewritten to the real 11-code taxonomy (+ `save-failed`/`fetch-failed`)
- `src/features/admin/timetable/infrastructure/{dtos,mappers,repositories}/
  timetable.*` — rewritten to the real contract (read-modify-write PUT, real
  DELETE, `getConflicts` force-empty) + new test files
- `src/features/timetable/domain/day-enum.ts` (+ test) — mirrors the admin
  feature's day mapper (features stay decoupled, plan decision 3)
- `src/features/timetable/infrastructure/dtos/real-timetable-response.dto.ts`
  (new — real wire shapes, kept separate from the legacy mock-only DTO)
- `src/features/timetable/infrastructure/mappers/real-weekly-timetable
  .mapper.ts` (+ test, new)
- `src/features/timetable/infrastructure/repositories/real-weekly-timetable
  .repository.ts` (+ test, new — `RealWeeklyTimetableRepository` +
  `HybridWeeklyTimetableRepository`)
- Deleted `src/features/timetable/infrastructure/repositories/weekly-timetable
  .repository.ts` (the old guessed contract-first stub — fully superseded)
- No changes to either mock repository — both already modeled a shape that
  independently continues to serve the permanently-mock operations
  (`getMyTimetable`/`getChildren`/`getConflicts`) truthfully; no mock behavior
  needed updating since none of the mock-served operations' contracts changed.
- No presentation/ViewModel/Server-Action file was touched — `TimetableScreen`
  already threaded `TimetableFailure["type"]` generically through `tErrors()`;
  adding the 10 missing i18n keys was sufficient. Zero UI/ViewModel change.

Classid/term resolution: `getByClass` (admin builder + would-be consumer
direct view) resolves `termId` via `resolveCurrentTermId` (composes calendar's
real `ListYearsUseCase`, US-E18.1, with the pure `resolveContainingTermId`
date-in-window matcher). `getByTeacher` resolves classIds via the
TEACHER-role-auto-filtered `GET /classes` fan-out (ground-truthed in
`list_classes.go`'s `listForTeacher`, precedent in
`teacher-class.repository.ts`), then merges only this teacher's slots
(`teacherMemberId === decodeSubClaim(token)`) across all assigned classes.
`getMyTimetable` (student) and `getChildren`+child view (parent) are
permanently mock — ground-truthed 403 `ErrClassForbidden` for non-ADMIN/
non-TEACHER on `GET /classes` (`list_classes.go` line 59), and
`GET /members/{id}/linked-students` carries no classId at all.

Conflict-code mapping: `TIMETABLE_TEACHER_CONFLICT` (409) → new
`{ type: "teacher-conflict" }` failure, surfaced through the EXISTING
`TimetableScreen.handleSave` toast/inline-error path — no new UI component.
Whole-school proactive `getConflicts` stays mock permanently (no bulk BE
endpoint — ask #16); it never touches HTTP in real mode (returns `[]`).

Proof:
- Unit: `day-enum.test.ts` (both features), `resolve-term.test.ts`,
  `timetable.mapper.test.ts`, `real-weekly-timetable.mapper.test.ts` — day-enum
  round-trips, term-window matching, wire↔domain mapping, room
  non-persistence, color-token fallback.
- Integration: `timetable.repository.test.ts` (admin builder — real GET,
  read-modify-write PUT, real DELETE, 409→`teacher-conflict`, Saturday→
  `invalid-day`, force-empty `getConflicts`, full 11-code error matrix),
  `real-weekly-timetable.repository.test.ts` (consumer — real `getByClass`,
  real `getByTeacher` fan-out+merge+className-tagging, raw-flag top-level
  regression guard per US-E18.19, force-blocked `getMyTimetable`/`getChildren`
  never touch HTTP, `HybridWeeklyTimetableRepository` routing matrix).
- Full suite: 299 files / 1837 tests pass (baseline 292/1790 before this US,
  zero regression, +7 files/+47 tests).
- `bunx tsc --noEmit` clean. `bun lint` clean (2 pre-existing unrelated
  warnings in `academic-records-seal.repository.ts` and
  `message-context-menu.tsx`, not touched by this US). `NEXT_PUBLIC_USE_MOCK=
  bun run build` green (117+ routes, no build-guard trip).
- Pre-existing Storybook/Playwright environment gap found (NOT a regression):
  `timetable-screen.stories.tsx`'s 4 interaction stories fail on baseline
  `main` too (`invariant expected app router to be mounted` —
  `useRouter()`/`usePathname()`/`useSearchParams()` need an app-router mock the
  current Storybook/Vitest-browser harness doesn't provide for this story
  file) — confirmed via `git stash` + re-run against unmodified `main`. Not
  caused by or worsened by this US; logged here for whoever picks up the
  Storybook harness gap next, not re-litigated as a cross-repo ask (it's a web
  test-infra issue, not a BE contract issue).
- tech-lead review: **APPROVED** by an independent `fe-tech-lead-reviewer`
  pass (the assigned `fe-nextjs-engineer` agent stalled mid-task on the
  admin-builder half; `fe-lead` completed the remaining consumer-view wiring,
  DI, i18n, and test-suite closure directly, then handed off for independent
  verification). The reviewer re-ground-truthed every contract claim directly
  against `edu-api` Go source/openapi/ERROR_CODES.md (11-code taxonomy, RMW
  PUT body shape, real DELETE params, day-enum Mon–Fri boundary, `GET /classes`
  role-gating in `list_classes.go`, `raw:true` top-level placement, the
  hybrid-routing justification by reading `get-child-timetable.use-case.ts`),
  independently re-ran `tsc`/`vitest`/`lint` (299/1837, zero regression,
  matching), and confirmed via `git diff --name-only` that zero presentation/
  `.i-vm`/`actions.ts`/`page.tsx` files were touched — so the design-review
  gate and a dedicated `fe-accessibility-auditor` pass are correctly skipped.
  Two non-blocking findings, both fixed same-commit before merge:
  - **[SHOULD FIX, fixed]** `getByTeacher`'s per-teacher filter matched on the
    mapped `slot.teacherName` display field (which only happened to hold the
    raw `teacherMemberId`, since no display-name join exists yet) — a latent
    bug that would silently return an empty timetable for every teacher the
    day a real name-join replaces that fallback. Fixed: filter the RAW wire
    slots by `teacherMemberId === currentUserId` BEFORE mapping to display
    slots, decoupling the merge logic from the display-name fallback.
  - **[CONSIDER, fixed]** `getByTeacher` returned an empty timetable rather
    than a typed failure when `currentUserId` was `null` (missing/unreadable
    token). Fixed: throws `{ type: "not-found" }` upfront in that case.
  Re-verified after both fixes: `tsc --noEmit` clean, `bun vitest run`
  299 files / 1837 tests pass (unchanged), `bun lint` clean (same 2
  pre-existing unrelated warnings).

## Cross-repo asks (final — as landed in EPIC-OVERVIEW.md)

Ask #15 (no STUDENT/PARENT self-scope discovery endpoint), #16 (no bulk
whole-school conflicts endpoint), #17 (no `room` field on `SlotRequest`/
`SlotResponse`) — see EPIC-OVERVIEW.md §Cross-repo requests for the full text.
