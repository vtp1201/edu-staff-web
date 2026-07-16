# US-E18.9 Teaching-plan wiring

## Status

implemented

## Lane

normal (upgraded in depth from the epic table's "path" label — nesting the
`/lms/` prefix is real, but the DTO-shape + capability audit found drift far
deeper than a path fix: a composite-key granularity mismatch, a missing grid
axis, and zero HTTP surface for editing an existing plan. No hard-gate flag
trips: no auth/RBAC/token/session/tenant-isolation/data-loss/PII/
validation-weakening/new-design-token change — the change stays server-
boundary internal, screen UI/behavior is unchanged.)

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) chạm: `src/features/teaching-plan/`,
  `src/bootstrap/{endpoint,di}/teaching-plan.*`
- Shared contract/file: none (no other US touches `teaching-plan`)

## Product Contract

Ground-truth the real `core`/`lms` contract for teaching plans
(`edu-api/services/core/docs/openapi.yaml`'s `TeachingPlan (LMS)` tag +
Go source `internal/lms/teachingplan/{adapter/http,core/domain,core/application}`)
and remap the web repository/endpoint/error-taxonomy to match. Per the epic's
zero-regression AC, the teacher weekly-grid screen (subject × class × term
selector, week × period cell grid, inline cell autosave, draft/submit/approve/
reject workflow) keeps its exact current behavior — **the real answer here is
that it cannot be wired at all, and must stay mock-first permanently**, same
conclusion as US-E18.8 (staff-leave) but for different reasons.

### Real contract (ground-truthed, not just the openapi prose)

Routes (`internal/lms/teachingplan/adapter/http/routes.go` — all mounted at
`/api/v1/lms/teaching-plans`, confirming the epic's foundational finding #2
that `lms` lives inside `core`):

- `POST /api/v1/lms/teaching-plans` — create. Body:
  `{ classSubjectId, academicYear, weeklyEntries: [{ weekNumber, topic, notes? }] }`
  (`weeklyEntries` `minItems: 1`, no fill-ratio/threshold concept). Creates a
  `DRAFT` plan for the calling TEACHER. `404 TEACHING_PLAN_CLASS_SUBJECT_NOT_FOUND`,
  `403 TEACHING_PLAN_TEACHER_NOT_ASSIGNED`.
- `GET /api/v1/lms/teaching-plans?classSubjectId=&academicYear=` — list.
  TEACHER sees only their own plans; MANAGER/ADMIN see all for that
  class-subject.
- `GET /api/v1/lms/teaching-plans/{planId}?classSubjectId=&academicYear=` —
  get one. TEACHER: only their own plan (`403 TEACHING_PLAN_FORBIDDEN`
  otherwise).
- `PUT /api/v1/lms/teaching-plans/{planId}/submit?classSubjectId=&academicYear=` —
  DRAFT → SUBMITTED (owning TEACHER only, `403 TEACHING_PLAN_NOT_OWNER`).
- `PUT /api/v1/lms/teaching-plans/{planId}/approve?classSubjectId=&academicYear=` —
  SUBMITTED → APPROVED, terminal (MANAGER/ADMIN).
- `PUT /api/v1/lms/teaching-plans/{planId}/reject?classSubjectId=&academicYear=`,
  body `{ rejectReason }` — SUBMITTED → **DRAFT** with `rejectReason` set
  (MANAGER/ADMIN). **There is no `REJECTED` status on the wire.**
- **No other route exists.** No `PUT`/`PATCH` to edit an existing plan's
  entries, no `/cells` endpoint of any shape.

`TeachingPlanResponse`: `planId`, `tenantId`, `classSubjectId`,
`teacherMemberId`, `academicYear`, `status` (`DRAFT|SUBMITTED|APPROVED`),
`weeklyEntries: WeeklyEntryResponse[]`, `rejectReason?`, `createdAt`,
`updatedAt`. `WeeklyEntryResponse` = `{ weekNumber, topic, notes }` — **no
`period` field at all.**

Error taxonomy (ground-truthed from
`internal/lms/teachingplan/core/domain/domainerror/errors.go` +
`pkg/kit/response/error.go`'s `codeFromKey` — confirms decision `0008`
UPPER_SNAKE holds for `core`, same as US-E18.1/.2/.6/.7/.8):
`TEACHING_PLAN_NOT_FOUND` (404), `TEACHING_PLAN_INVALID_STATUS_TRANSITION`
(409 — submit needs DRAFT, approve/reject need SUBMITTED),
`TEACHING_PLAN_NOT_OWNER` (403, non-owning teacher submits),
`TEACHING_PLAN_CLASS_SUBJECT_NOT_FOUND` (404, create-time),
`TEACHING_PLAN_TEACHER_NOT_ASSIGNED` (403, create-time — teacher not assigned
to the classSubject), `TEACHING_PLAN_FORBIDDEN` (403, wrong role / reading
another teacher's plan). The pre-US-E18.9 guessed taxonomy
(`TEACHING_PLAN_NOT_DRAFT`/`TEACHING_PLAN_NOT_SUBMITTED`/
`TEACHING_PLAN_INSUFFICIENT_CELLS`/`TEACHING_PLAN_INVALID_REJECTION_REASON`)
matched **none** of the real codes.

### Why the whole feature stays mock-first (not a partial/hybrid wiring) — and the `/cells` decision

Unlike US-E18.4/US-E18.5 (some operations real, some mock), teaching-plan has
no operation that can go real for this screen, for three independent reasons:

1. **Composite-key granularity mismatch.** The web domain keys a plan by
   `(subjectId, classId, term)` — one plan per term (HKI/HKII), matching the
   screen's subject/class/term selector. The real key is `(classSubjectId,
   academicYear, planId)` — **one plan spans the full academic year**, there
   is no term dimension on the wire at all. `classSubjectId` itself IS
   resolvable without a new BE endpoint (`CLASS_EP.classSubjects(classId)`,
   the same fan-out `principal-teachers.repository.ts` already uses to list a
   class's subjects+ids), but collapsing/expanding term↔academicYear (does
   HKI map to weeks 1–18 of one BE plan? two separate BE plans per class-
   subject-year, one per term, using the same `academicYear` value twice? a
   screen redesign to be year-scoped instead of term-scoped?) is a genuine
   product/semantic decision, not a lossless infra remap — same class of
   decision the epic reserves for Wave 3 (grades/academic-records/conduct),
   out of scope for a `normal`-lane wiring US.
2. **No period axis on the wire.** `WeeklyEntryResponse` is
   `{ weekNumber, topic, notes }` — one entry per week. The web grid is
   `weeks × periodsPerWeek` (e.g. 35 weeks × 3 periods/week = 105 cells); the
   real model cannot address an individual `(week, period)` cell, only a
   whole week.
3. **THE `/cells` DECISION: no endpoint exists to edit an existing plan's
   entries at all — not a missing path segment, a missing HTTP surface.**
   `create` accepts the full `weeklyEntries` array exactly once; there is no
   `PUT`/`PATCH ` afterward. Confirmed twice: (a) `routes.go` mounts only
   `POST /`, `GET /`, `GET /:id`, `PUT /:id/{submit,approve,reject}` — no
   update route of any name; (b) the domain aggregate
   `TeachingPlan.UpdateEntries()` (`core/domain/entity/teaching_plan.go`)
   **exists and is unit-tested** (`TestTeachingPlan_UpdateEntries_ReplacesEntries`)
   but is **dead code** — grepping the whole `teachingplan` module confirms
   no use-case or handler ever calls it. The BE built the domain capability
   and never exposed it. Web's per-cell autosave (`savePlanCell`, the screen's
   core teacher-facing interaction) therefore has zero wire equivalent, full
   stop — gluing it onto `PUT .../submit` (as the epic table's "gộp vào PUT
   plan" suggested) is not viable either: `submit` only transitions status,
   it does not accept a body of entries in the real contract.

Additional gaps compounding (1)–(3), documented for completeness: no
`REJECTED` status (real reject → `DRAFT` + `rejectReason`, web renders
`REJECTED` as a distinct first-class status with its own badge/banner); no
fill-ratio/`insufficient-cells` validation concept on the wire (`create` only
requires `minItems: 1`); and the web screen has no "create a new plan" flow
at all today (plans are assumed pre-existing) while the real contract requires
an explicit `POST` with a non-empty entry array to bring one into existence —
a workflow gap in the web screen that predates this US and is out of scope
here (would need `ba`/`uiux` design work, not a wiring change).

Decision: `TeachingPlanRepository` (real class) implements the corrected
error taxonomy (kept accurate + tested, ready for the day BE unblocks this)
but all six interface methods are permanent blocked stubs (mirrors
`StaffLeaveRepository`, US-E18.8) — never invoked because
`teaching-plan.di.ts` now **force-mocks regardless of `USE_MOCK`** (second
fully-blocked factory in the epic after `staff-leave.di.ts`).
`TEACHING_PLAN_EP` is updated to the real nested paths for documentation
accuracy (kept for the day this unblocks) even though the real repository no
longer calls them.

No new failure types were needed — the existing `TeachingPlanFailure` union
(`not-found`/`not-draft`/`not-submitted`/`unauthorized`/`network-error`/
`unknown`) covers the real taxonomy once correctly branched (`not-draft` now
also serves `TEACHING_PLAN_INVALID_STATUS_TRANSITION`'s approve/reject-side
meaning, matching the existing i18n copy which is transition-generic, not
DRAFT-specific wording).

## Relevant Product Docs

- `docs/product/screens.md` (Teaching Plan, teacher + principal review) —
  unchanged, no UI change.
- `docs/DESIGN_REVIEW.md` — gate not triggered (no UI/token change).

## Acceptance Criteria

- `TEACHING_PLAN_EP` reflects the real `/lms/teaching-plans` nested paths
  (`create`, `list`, `get`, `submit`, `approve`, `reject`) for documentation,
  even though the real repository no longer calls them; `cells` removed (no
  wire equivalent — see decision above).
- `toFailure` in `teaching-plan.repository.ts` maps the full ground-truthed
  6-code error matrix; unit-tested independent of the (unreachable) real
  HTTP calls.
- `TeachingPlanRepository` (real): all six `ITeachingPlanRepository` methods
  are documented permanent stubs that never call `http.*`.
- `teaching-plan.di.ts`: force-mocks regardless of `USE_MOCK`, documented why.
- Zero UI/ViewModel/screen-behavior change (mock repo + fixtures unchanged,
  screen still reads exactly the same mock data as before this US).
- Zero regression on the existing suite; `tsc --noEmit` clean; `bun build`
  green.

## Design Notes

- Commands: none (no Server Action signature change — `savePlanCellAction`/
  `submitTeachingPlanAction`/etc. still call the same use-case interface; only
  the DI wiring under them force-mocks now instead of conditionally mocking).
- Queries: unchanged signatures (`getTeachingPlan(subjectId, classId, term)`,
  `listPendingPlans(filter)`).
- API: see "Real contract" above — recorded, not consumed (blocked).
- Tables: n/a (web has no direct DB access).
- Domain rules: no domain/use-case/entity change — only
  `infrastructure/repositories/teaching-plan.repository.ts`,
  `bootstrap/endpoint/teaching-plan.endpoint.ts`,
  `bootstrap/di/teaching-plan.di.ts`. `TeachingPlanFailure` union unchanged
  (existing types sufficed).
- UI surfaces: none touched.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `teaching-plan.repository.test.ts` — added `toFailure` full ground-truthed matrix (6 codes + network-error + unknown fallback) and 6 stub-never-calls-http guards (one per interface method), alongside the pre-existing `MockTeachingPlanRepository` behavior tests (unchanged, still passing). |
| Integration | n/a — no real HTTP path is reachable by design (force-mocked DI); existing use-case tests against `ITeachingPlanRepository` mock continue to pass unchanged. |
| E2E | n/a — no UI/behavior change, existing Storybook stories for the screen continue to pass unchanged. |
| Platform | `bunx tsc --noEmit` clean; `bun run build` green; full vitest suite zero-regression vs baseline (290 files / 1763 tests → 290 files / 1777 tests, +14 new, 0 removed/broken). |

## Harness Delta

- `docs/TEST_MATRIX.md` — new row for US-E18.9.
- `docs/stories/epics/E18-be-wiring/EPIC-OVERVIEW.md` — Wave-2 table note
  updated to reflect the real finding (not just "nest `/lms/` + decide
  `/cells`"); cross-repo ask #14 logged (wire `TeachingPlan.UpdateEntries()`
  to a `PUT`/`PATCH` endpoint while `DRAFT` — the domain method already
  exists and is unit-tested, this is the cheapest possible BE unblock; also
  flag the term-vs-academicYear/period-axis modeling gap for a future product
  decision, not a BE-only fix).
- `scripts/bin/harness-cli story update --id US-E18.9 --status implemented --unit 1 --integration 0 --e2e 0 --platform 1`.

## Evidence

See merge commit
`chore(teaching-plan): merge feat/us-e18.9-teaching-plan-wiring (US-E18.9)`
for the full test run output referenced below.

- `bun vitest run`: 290 files / 1777 tests pass (baseline 290/1763, +14 new,
  zero regression).
- `bunx tsc --noEmit`: clean.
- `bun run build`: green.
- Tech-lead review: **APPROVED**. Independently re-verified all ground-truth
  claims against `edu-api`'s Go source (6 error codes + statuses, UPPER_SNAKE
  casing via `pkg/kit/response/error.go`'s `codeFromKey`, the absence of any
  update-after-create route in `routes.go`, `UpdateEntries()` dead-code status
  via a targeted grep, no `REJECTED` status, no period axis) and independently
  re-ran `bunx tsc --noEmit` / `bun vitest run` (290/1777, zero regression) /
  `bun run build` (all green). One non-blocking CONSIDER: `reject`'s 422
  `VALIDATION_FAILED` (empty `rejectReason`) isn't part of the 6-code domain
  taxonomy and falls through to `unknown` — addressed same-commit with a
  clarifying comment in `toFailure`.
- A11y / design-review gate: n/a — no UI/token change.
