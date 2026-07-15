# US-E18.4 Class management wiring — real `core` Classes contract + IAM member-list gap

## Status

implemented

## Lane

normal

## Dependencies

- Depends on: US-E18.0 (gateway smoke, proof-of-pattern), reuses the "BE-wiring
  remap" pattern from US-E18.1/US-E18.2/US-E18.3 (fan-out for derived fields,
  per-code error matrix, `ensureFreshSession` DI wiring, US-E18.19 raw-flag
  placement — already correct in this repo per that sweep).
- Blocks: none.
- Feature module(s) touched: `src/features/admin/class-management/`
  (domain entities/failure union extended by 5 new failure types, infrastructure
  DTOs/mapper/repository rewritten, mock repository unchanged, no
  screen/layout change).
- Shared contract/file: `bootstrap/endpoint/class.endpoint.ts` (path renames +
  new roster-count endpoint), `bootstrap/di/class-management.di.ts` (wire
  `ensureFreshSession`, update the `listTeachers` fallback comment),
  `messages/{vi,en}.json` (`classManagement.errors.*` namespace, 5 new
  additive keys).

## Product Contract

`src/features/admin/class-management/infrastructure/repositories/class-management.repository.ts`
was written mock-first (US-E06.3) against a guessed shape of `core`'s Classes
API. The epic table labeled this cluster "MATCH−" with one known gap
(`/core/api/v1/teachers` doesn't exist → assumed fix: "nguồn teacher list đổi
sang IAM members"). Re-reading `edu-api/services/core/docs/openapi.yaml`
(`Classes` tag, `ClassResponse`/`HomeroomAssignmentResponse`/`EnrollmentResponse`
schemas) and `edu-api/services/iam/docs/openapi.yaml` (`Members` tag) found
real drift — and one finding that changes the assumed fix:

1. **Id/field renames on `ClassResponse`**: wire `classId` (not `id`),
   `academicYearLabel` (not `academicYear`); adds `tenantId`/`createdAt`/
   `updatedAt` the web entity doesn't need.
2. **`ClassResponse` has NO `studentCount` and NO `homeroomTeacherId`/
   `homeroomTeacherName` on the wire at all.** Those three fields must be
   derived per class:
   - `studentCount` — fan-out `GET /classes/{classId}/students` (roster,
     cursor-paginated `EnrollmentResponse[]`), paginate to completion, count
     items. Cost is bounded by the **current list page only** (not the whole
     tenant, unlike US-E18.2/US-E18.3's tenant-wide fan-outs) since
     `listClasses` already returns one page — acceptable.
   - `homeroomTeacherId`/`homeroomTeacherName` — fan-out
     `GET /classes/{classId}/homeroom-teacher` (`HomeroomAssignmentResponse`:
     `classId`/`teacherMemberId`/`assignedAt`/`assignedBy`); `404
     CLASS_ASSIGNMENT_NOT_FOUND` means no homeroom (not a failure) → `null`.
   - **Cross-repo perf/DX ask** (new, logged in EPIC-OVERVIEW.md): BE should
     put `studentCount`/`homeroomTeacherId`/`homeroomTeacherName` directly on
     `ClassResponse` (same shape gap class as US-E18.2's
     `activeAssignmentCount` and US-E18.3's `childCount`) — would remove 2N
     extra HTTP round-trips per list page.
3. **`HomeroomAssignmentResponse` has no display name** — only raw
   `teacherMemberId` (uuid). Same IAM gap logged by US-E18.2 (cross-repo ask
   #6 in EPIC-OVERVIEW.md): there is no way to resolve a member id → a
   person's name from the web. `homeroomTeacherName` falls back to the raw
   `teacherMemberId` in real mode (identical precedent to staffing's
   `memberName`).
4. **`CreateClassRequest` needs `academicYearLabel`** (web entity field:
   `academicYear`) — simple rename in the mapper's request builder, `gradeLevel`
   unchanged (`1..13`, matches web's `GradeLevelRange`-bounded `<select>`).
5. **`UpdateClassRequest` requires BOTH `name` AND `gradeLevel`** (`required:
   [name, gradeLevel]`) — the domain's `RenameClassInput` types both as
   optional. In practice the only caller (`rename-class-sheet.tsx`) always
   submits both together, so this is normally a non-issue; for defensive
   correctness the real repository does a `GET /classes/{classId}` first to
   backfill any missing field before `PATCH` (never sends `undefined` into the
   JSON body, which the real API would 400 on as a missing required field).
6. **`AssignHomeroomRequest` field is `teacherMemberId`** (web currently sends
   `teacherUserId`) — mapper/repository rename only; the domain method
   parameter name (`teacherUserId: string`) is UNCHANGED (still "some member id
   string" at the domain layer — no entity/interface change, per Clean
   Architecture layering: wire-shape drift stays in `infrastructure/`).
7. **`PATCH`/`GET` responses don't carry `studentCount`/homeroom** either — the
   real repository re-runs the same two enrichment fan-outs after a successful
   `renameClass` so the `Class` object handed back to the screen (which merges
   it straight into local state) stays fully populated (matches US-E18.3's
   "`patchParent` recomputes counts" precedent).
8. **`archiveClass` (`POST .../archive`) has no `CLASS_ARCHIVED` conflict** —
   the endpoint is documented idempotent (`ACTIVE → ARCHIVED`), so archiving an
   already-archived class just no-ops 204. No new failure needed there.
9. **[MAJOR FINDING — changes the assumed fix] IAM has NO public member-listing
   endpoint of any kind.** The epic table's assumed remediation ("teacher list
   đổi nguồn sang IAM members") is not achievable with the current IAM
   contract: `edu-api/services/iam/docs/openapi.yaml` defines only `POST
   /api/v1/tenants/{id}/members` (add), `PATCH .../members/{userId}` (change
   roles), `DELETE .../members/{userId}` (remove) — **no `GET` list, and no
   `GET` single-member lookup** on the public API surface. The only
   member-lookup endpoint (`GET /internal/v1/tenants/{tenantId}/members/{userId}`)
   is explicitly internal service-to-service only (bypasses Kong, not reachable
   from web). US-E18.2 (staffing) hit the adjacent half of this same gap
   (`MemberResponse` has no name field) and already logged cross-repo ask #6;
   this US confirms the gap is actually one level worse for a *listing* use
   case — there is no listing surface at all to even attempt a `role=TEACHER`
   filter against. **Decision: `listTeachers` stays mock-first regardless of
   `USE_MOCK`, unchanged from before this US** (the existing DI composition
   already did this, comment/rationale corrected to reflect the confirmed
   finding instead of "contract not finalised"). Cross-repo ask #7 added to
   EPIC-OVERVIEW.md: IAM needs `GET /api/v1/tenants/{id}/members` (list,
   optionally `?role=`) before class-management's homeroom picker (or any
   admin-facing "pick a person" UI) can be wired for real.
10. **[Known limitation, documented not fixed] Assigning a *mock* teacher id to
    a *real* class in real mode will always 404.** Once `listClasses` /
    `createClass` / etc. talk to real `core`, but `listTeachers` still returns
    mock fixture teachers (`u-teacher-1` etc.), calling `PUT
    .../homeroom-teacher` with one of those fake ids against real `core` hits
    `404 CLASS_ASSIGNMENT_TEACHER_NOT_FOUND` (mapped to the new
    `homeroom-teacher-not-found` failure, with a clear toast) every time — real
    `core` correctly rejects a `teacherMemberId` that isn't an actual IAM
    member. This is an unavoidable consequence of #9 (no BE fix available yet)
    and not something this US can work around without inventing fake IAM data;
    logged as a known limitation, not a defect of this wiring.
11. **Error code corrections** (branch on `error.code`, never message) — full
    ~15-code `Class + TeachingAssignment (US-041)` matrix from
    `core/docs/ERROR_CODES.md`:
    - `CLASS_ALREADY_EXISTS` (409) → existing `duplicate-class`.
    - `CLASS_ARCHIVED` (409, "attempt to modify an archived class") → **new**
      `class-archived` failure. Reachable: `rename`/`assign-homeroom` row
      actions are NOT disabled for archived classes in the current UI (only
      `archive` is), so a user can trigger this.
    - `CLASS_GRADE_LEVEL_OUTSIDE_TENANT_RANGE` (422), `CLASS_INVALID_GRADE_LEVEL`
      (400, platform cap), `SCHOOL_GRADE_LEVEL_RANGE_NOT_CONFIGURED` (422) →
      all three map to the existing `grade-level-out-of-range` (same user
      message already references "Thiết lập trường học", which fits the
      range-not-configured case exactly).
    - `CLASS_NOT_FOUND` (404) → existing `not-found`.
    - `CLASS_ASSIGNMENT_TEACHER_NOT_FOUND` (404, "teacherMemberId not a member
      of the tenant") → **new** `homeroom-teacher-not-found` (see #10 — this
      is the practically-most-common real-mode error until the IAM gap
      closes). Kept distinct from `not-found` (which reads "Không tìm thấy
      lớp học" — wrong message for this case).
    - `CLASS_ASSIGNMENT_NOT_FOUND` (404, "no homeroom assignment for this
      class") → NOT a failure; handled inline in `getHomeroomTeacher` as
      `ok(null)`.
    - `CLASS_ASSIGNMENT_NOT_TEACHER_ROLE` (422, assigned member lacks TEACHER
      role) → **new** `assignee-not-teacher`.
    - `CLASS_INVALID_NAME` (400) → **new** `invalid-name`. Reachable: the
      `name` `<Input>` has no `maxLength` (real cap 64 chars), so this is not
      a devtools-only edge case like the unmapped ones below.
    - `CLASS_INVALID_ACADEMIC_YEAR` (400) → **new** `invalid-academic-year`.
      Reachable for the same reason (free-text `<Input>`, real cap 32 chars).
    - `CLASS_FORBIDDEN` (403) → existing `forbidden`.
    - `CLASS_INVALID_TENANT_ID`/`CLASS_INVALID_ID`/`CLASS_INVALID_MEMBER_ID`
      (400, malformed path/claim UUID) → left unmapped → falls to `unknown`.
      Unreachable via the UI (ids always come from prior server-provided
      data), matches the US-E18.3 precedent for devtools-only edge cases.

## Relevant Product Docs

- `docs/stories/epics/E18-be-wiring/EPIC-OVERVIEW.md` (playbook + Wave 1 +
  cross-repo asks — this US adds ask #7).
- `edu-api/services/core/docs/openapi.yaml` (`Classes` tag).
- `edu-api/services/core/docs/ERROR_CODES.md` (`Class + TeachingAssignment
  (US-041)` section).
- `edu-api/services/iam/docs/openapi.yaml` (`Members` tag — audited, confirmed
  no listing endpoint).

## Acceptance Criteria

- `CLASS_EP` paths updated where drifted; new `classStudents(classId)` roster
  endpoint added for the count fan-out.
- `ClassResponseDto` matches the real wire shape (`classId`/`academicYearLabel`,
  no `studentCount`/homeroom fields); new `HomeroomAssignmentResponseDto` +
  minimal `EnrollmentResponseDto`; DTOs camelCase, 1:1 with `openapi.yaml`.
- `ClassManagementMapper.toClass` takes the wire DTO **plus** an injected
  enrichment object (`studentCount`, `homeroomTeacherId`, `homeroomTeacherName`)
  — never reads those off the wire DTO directly.
- `listClasses` derives `studentCount` + homeroom fields for each class in the
  **current page only** via the two fan-outs described above; `createClass`
  returns cheap-accurate defaults (0 students, no homeroom) with zero extra
  calls; `renameClass` re-runs both enrichments after a successful `PATCH`
  (backfilling `name`/`gradeLevel` via a `GET` first if either is missing from
  the partial input) so the returned `Class` stays fully populated.
- `assignHomeroomTeacher` sends `{ teacherMemberId }` (renamed from
  `teacherUserId`); domain method signature UNCHANGED.
- `getHomeroomTeacher` treats `404 CLASS_ASSIGNMENT_NOT_FOUND` as `ok(null)`,
  not a failure; on success it maps `HomeroomAssignmentResponseDto` to a
  `TeacherMember` with `displayName`/`email` falling back to the raw
  `teacherMemberId` / `""` (documented IAM gap, #9 above).
- `listTeachers` is **unchanged** — stays mock-first regardless of `USE_MOCK`
  (the DI composition already did this; only the code comment is corrected to
  cite the confirmed "no public IAM listing endpoint" finding instead of
  "contract not finalised"). Cross-repo ask #7 logged in
  `EPIC-OVERVIEW.md`.
- Full `Class`/`TeachingAssignment` error matrix mapped correctly by
  `error.code` (never message): 5 new failure types added
  (`class-archived`, `homeroom-teacher-not-found`, `assignee-not-teacher`,
  `invalid-name`, `invalid-academic-year`) with vi+en i18n keys; 3 existing
  codes consolidated onto `grade-level-out-of-range`; 3 unreachable 400s left
  unmapped (falls to `unknown`, matches precedent).
- `ensureFreshSession()` wired into the `!USE_MOCK` branch of
  `class-management.di.ts` before `createServerHttpClient()` (playbook step 6).
- Mock repository/fixtures UNCHANGED in behavior (still the `USE_MOCK=true`
  fallback covering every method, including `listTeachers` which mock always
  served anyway).
- Zero UI/ViewModel/behavior change — `class-management-screen`/
  `create-class-sheet`/`rename-class-sheet`/`homeroom-picker-sheet` untouched.
- Zero regression: full `bun vitest run` + `bunx tsc --noEmit` +
  `bun run build` all green (baseline 286 files / 1680 tests).

## Design Notes

- Commands: `createClass`, `renameClass` (backfill-then-patch), `archiveClass`,
  `assignHomeroomTeacher` — thin real-HTTP calls, no new domain behavior.
- Queries: `listClasses` (+ per-row fan-out enrichment), `getHomeroomTeacher`
  (404-as-null), `listTeachers` (mock-first, unchanged).
- API: `/core/api/v1/classes(/{id}(/archive|/homeroom-teacher|/students))` —
  only `academicYearLabel`/`classId` renames vs the current `CLASS_EP`
  constants; `classStudents` is new.
- Domain rules: `Class`/`TeacherMember`/`CreateClassInput`/`RenameClassInput`
  entities UNCHANGED — all drift absorbed in `infrastructure/` per Clean
  Architecture layering. `ClassManagementFailure` union extended (domain layer
  — a typed error union is domain, not wire shape, so this file does change,
  same as every prior E18 wiring US).
- UI surfaces: none changed.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `class-management.mapper.test.ts` (new — id/field renames, enrichment injection, request-body shaping for create/rename/assign) |
| Integration | `class-management.repository.test.ts` (rewritten — full error matrix incl. 5 new failures, fan-out enrichment for listClasses, renameClass backfill-then-patch + re-enrichment, getHomeroomTeacher 404-as-null, real-interceptor raw-flag regression guard already present from US-E18.19 kept green) |
| E2E | n/a (no UI/flow change — lane normal, wiring-only) |
| Platform | `bunx tsc --noEmit`, `bun run build` green |
| Release | full `bun vitest run` zero-regression, pre-push gate green, auto-merge to `main` |

## Harness Delta

- `docs/TEST_MATRIX.md` — add US-E18.4 row on completion (unit/integration
  proof, zero-regression full-suite count, tsc/build status).
- `scripts/bin/harness-cli story update --id US-E18.4 --status implemented
  --unit 1 --integration 1 --e2e 0 --platform 1` once proof exists.
- No ADR needed (no auth/RBAC/token/tenant/data-loss/PII/design-token gate
  tripped — pure infrastructure DTO/error-map remap + a documented BE-gap
  decision, same pattern as US-E18.1/US-E18.2/US-E18.3, no new architectural
  decision beyond what those precedents already cover).
- `EPIC-OVERVIEW.md` cross-repo asks list gets a new #7 (IAM member-listing
  endpoint) — added by `fe-lead` alongside this story's completion.

## Evidence

- **DTOs** rewritten to the real wire shape: `class-response.dto.ts`
  (`classId`/`academicYearLabel`, no derived fields; `CreateClassRequestDto`/
  `UpdateClassRequestDto`); new `homeroom-assignment-response.dto.ts`
  (`HomeroomAssignmentResponseDto`/`AssignHomeroomRequestDto`, replaces the
  deleted `teacher-member-response.dto.ts` — there is no wire endpoint that
  shape ever represented); new `enrollment-response.dto.ts`
  (`EnrollmentResponseDto`, roster-count derivation only).
- **Mapper** (`class-management.mapper.ts`) rewritten: `toClass(dto,
  enrichment)` takes an injected `ClassEnrichment` object (never reads
  `studentCount`/homeroom off the DTO); `toCreateClassBody`/`toUpdateClassBody`
  request builders; `toTeacherMemberFromHomeroom` (raw-id fallback for
  display name, no IAM name source).
- **Repository** rewritten: `countRoster`/`fetchHomeroom`/`enrich` fan-out
  helpers (scoped to the classes on the current list page only);
  `listClasses` applies `gradeLevel` client-side (no server-side filter on the
  wire); `createClass` uses cheap-accurate zero/null defaults (no extra
  round-trips); `renameClass` backfills a missing `name`/`gradeLevel` via a
  `GET` before `PATCH` (real API requires both), then re-runs both
  enrichments; `assignHomeroomTeacher` sends `{ teacherMemberId }`;
  `getHomeroomTeacher` treats `404 CLASS_ASSIGNMENT_NOT_FOUND` as `ok(null)`;
  full ~15-code error matrix in `toFailure` (5 new failure types; 3 codes
  consolidated onto `grade-level-out-of-range`; 3 malformed-UUID 400s left
  unmapped, matching the US-E18.3 devtools-only-edge-case precedent).
- **`listTeachers`**: confirmed via direct read of
  `edu-api/services/iam/docs/openapi.yaml` (`Members` tag) that the public
  IAM API has NO `GET` listing endpoint and NO single-member lookup at all
  (only `POST`/`PATCH`/`DELETE` on `/api/v1/tenants/{id}/members`; the one
  lookup endpoint, `/internal/v1/.../members/{userId}`, is internal-only,
  bypasses Kong). This corrects the epic table's assumed fix. Decision:
  `listTeachers` stays mock-first permanently — the DI composition already
  did this before this US; only the rationale comment is corrected. Cross-repo
  asks #7 (member listing) and #8 (derived fields on `ClassResponse`) logged
  in `EPIC-OVERVIEW.md`.
- **Sibling-feature touch (minimal, documented)**:
  `src/features/principal/infrastructure/teachers/repositories/principal-teachers.repository.ts`
  reuses `ClassManagementMapper.toClass` — its one call site was updated to
  the new `(dto, enrichment)` signature with a zero/null enrichment and an
  inline comment explaining this is a known, out-of-scope gap (that repo's
  real mode was already non-functional before this US — `CLASS_EP.
  principalTeachers` has no BE endpoint per the epic's "KHÔNG thuộc wave này"
  list). One test fixture updated to the new `ClassResponseDto` shape for
  compile/test parity. No behavior change, no regression.
- **DI**: `ensureFreshSession()` wired into the `!USE_MOCK` branch of
  `class-management.di.ts` before `createServerHttpClient()`.
- **i18n**: added 5 new `classManagement.errors.*` keys to vi + en
  (`class-archived`, `homeroom-teacher-not-found`, `assignee-not-teacher`,
  `invalid-name`, `invalid-academic-year`).
- **Proof**: `class-management.mapper.test.ts` (6, new) +
  `class-management.repository.test.ts` (rewritten, ~34 tests — full error
  matrix, fan-out enrichment incl. pagination-to-completion + client-side
  gradeLevel filter, renameClass backfill/re-enrichment, 404-as-null,
  US-E18.19 raw-flag regression guard kept green); full suite **287 files /
  1712 tests pass** (baseline 286/1680 — zero regression); `bunx tsc --noEmit`
  clean; `bun run build` green; `bun lint` clean.
- **Tech-lead review**: APPROVED. Independently re-verified all 7 scrutiny
  points (IAM member-listing gap, `ClassResponse` missing fields, roster
  pagination termination, `renameClass` backfill correctness, full error
  matrix vs `ERROR_CODES.md`, `ensureFreshSession` wiring order,
  `principal-teachers.repository.ts` touch, raw-flag placement) directly
  against `edu-api/services/{iam,core}/docs/` — no findings required a fix.
  Agreed with the `normal` lane call (no hard gate tripped).
- **Design-review gate / a11y audit / QA-Playwright E2E**: n/a — zero UI/
  ViewModel/behavior change (per Epic E18's "Design Source" mandate: the
  design-review gate only applies to US that add new state UI, e.g. E18.10/
  E18.12/E18.13/E18.14; this US is wiring-only), matching the E18.1/E18.2/
  E18.3 precedent.
- **Untouched** (as mandated): domain entities (`Class`/`TeacherMember`/
  `CreateClassInput`/`RenameClassInput`), all presentation
  (`class-management-screen`/`create-class-sheet`/`rename-class-sheet`/
  `homeroom-picker-sheet`), mock repository + fixtures.
