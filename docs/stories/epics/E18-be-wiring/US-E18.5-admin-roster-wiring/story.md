# US-E18.5 Admin roster wiring — real `core` Enrollment contract + roster-display gap

## Status

in-progress

## Lane

normal

## Dependencies

- Depends on: US-E18.0 (gateway smoke, proof-of-pattern), reuses the "BE-wiring
  remap" pattern from US-E18.1–US-E18.4 (hybrid DI composite delegating
  specific methods to the mock repo, per-code error matrix, `ensureFreshSession`
  wiring, US-E18.19 raw-flag placement).
- Blocks: none.
- Feature module(s) touched: `src/features/admin-roster/` (infrastructure
  DTOs/mapper/repository rewritten; domain failure union corrected — 2 wrong
  codes removed, no new failure types; mock repository unchanged; no
  screen/layout change).
- Shared contract/file: `bootstrap/endpoint/admin-roster.endpoint.ts` (path
  confirmed, comments corrected), `bootstrap/di/admin-roster.di.ts` (hybrid
  composite + `ensureFreshSession`), `docs/stories/epics/E18-be-wiring/EPIC-OVERVIEW.md`
  (cross-repo ask #9 added).

## Product Contract

`src/features/admin-roster/infrastructure/repositories/roster.repository.ts`
was written mock-first (US-E06.7) against a guessed shape of `core`'s
Classes/Enrollment API and already made real HTTP calls for every method
(unlike class-management/subject-catalogue's prior mock/real split, this repo
was never gated by `USE_MOCK` per-method — the whole repo swaps in DI). The
epic table labeled this cluster "MATCH−" with one known gap ("students/unassigned
search pool WEB-ONLY → decision: derive từ IAM members − enrolled, hoặc chờ
BE"). Re-reading `edu-api/services/core/docs/openapi.yaml` (`Classes` tag,
`ClassResponse`/`EnrollmentResponse` schemas), `core/docs/ERROR_CODES.md`
("Class — Student roster / Enrollment (US-043)" + "Class + TeachingAssignment
(US-041)" sections), and `edu-api/services/iam/docs/openapi.yaml` (`Members`
tag, re-confirming US-E18.4's finding) found real drift — and a decision that
is bigger than the epic table assumed:

1. **`ClassResponse` drift — same as US-E18.4**: wire `classId` (not `id`),
   `academicYearLabel` (not `year`); no `homeroomTeacher` field at all. The
   admin-roster `ClassSummary` entity only needs a display **name**, not a
   full `TeacherMember`, so the fan-out is a single
   `GET /classes/{classId}/homeroom-teacher` call per class (US-E18.4's
   `fetchHomeroom` pattern reused; no `studentCount` needed here since
   `ClassSummary` doesn't display one) — `404 CLASS_ASSIGNMENT_NOT_FOUND` →
   `null` homeroom (not a failure). `homeroomTeacher` display falls back to
   the raw `teacherMemberId` (same documented IAM gap as E18.4, cross-repo
   ask #6/#7 — one raw UUID shown in a single class-info-card field is a
   tolerable degradation, unlike the finding below).
2. **[MAJOR FINDING — the real blocker, bigger than the epic table assumed]
   `EnrollmentResponse` (`GET /classes/{classId}/students`, the class roster
   listing) carries ONLY `enrollmentId`/`classId`/`studentMemberId`/
   `academicYearLabel`/`enrolledAt`.** No `name`, no `dob`, no `gender`, no
   `status`. This is not a single-field gap like homeroom-teacher's display
   name (US-E18.4) — it is the **entire row's display data**. Cross-checked
   IAM (`edu-api/services/iam/docs/openapi.yaml`): `UserProfileResponse` DOES
   carry `fullName`/`dob` (no `gender` field exists anywhere in IAM either),
   but it is returned **only by `GET /users/me` (self)** — there is no
   `GET`-by-id/list endpoint for another user's profile on the public API
   (confirmed by US-E18.4's cross-repo ask #7: IAM's `Members` tag exposes
   only `POST`/`PATCH`/`DELETE`, and the one lookup endpoint,
   `GET /internal/v1/.../members/{userId}`, is internal-only, bypasses Kong).
   **A single-value UUID fallback (homeroom-teacher precedent) is tolerable;
   a multi-row table rendering raw UUIDs for every student's name/DOB/gender
   is not a shippable "real" screen** — it degrades the entire roster table
   into an unreadable list of identifiers, not a UX approximation.
3. **Decision: `getClassRoster` and `getSearchPool` stay mock-first
   PERMANENTLY, regardless of `USE_MOCK`** — same pattern as US-E18.4's
   `listTeachers`. This is a strictly bigger scope than the epic table's
   "search pool WEB-ONLY" note: the epic table assumed the roster *listing*
   itself (`getClassRoster`) was already correctly wired (only the *search
   pool* for unassigned students was the gap) — that assumption doesn't
   survive contact with `EnrollmentResponse`'s actual shape. Only `getClasses`
   (class picker) and the write operations (`enrollStudent`/`unenrollStudent`/
   `unenrollStudents`/`transferStudent`) go real; `getClassRoster` +
   `getSearchPool` are delegated to the mock repo in the DI factory's hybrid
   composite (US-E18.4 precedent), never invoking the wrong-shape wire calls
   the old code guessed. **New cross-repo ask #9** logged in
   `EPIC-OVERVIEW.md`: `EnrollmentResponse` needs `studentName`/`dob`/`gender`
   (or IAM needs a batch/lookup endpoint car­rying these — `gender` doesn't
   exist ANYWHERE in IAM's schemas today, so this is a net-new field request,
   not just "expose what already exists" like ask #6).
4. **`AddStudentRequest`/enroll**: wire field is `studentMemberId` — already
   correct in the existing code (`POST /classes/{classId}/students {
   studentMemberId }`). No change needed to the request shape.
5. **`transferStudent`**: no dedicated transfer endpoint (confirmed, matches
   existing TR-032 comment) — two-step DELETE-then-POST pattern is correct
   and unchanged. `ROSTER_STUDENT_ALREADY_ENROLLED` (409) from the enroll step
   signals transfer-warning UX — unchanged.
6. **Error code corrections** (branch on `error.code`, never message) — full
   matrix cross-checked against `core/docs/ERROR_CODES.md` "Class — Student
   roster / Enrollment (US-043)" + reused "Class + TeachingAssignment (US-041)"
   codes (for `getClasses`):
   - `ROSTER_ACCESS_FORBIDDEN` (403) → existing `forbidden`. Correct, unchanged.
   - `CLASS_FORBIDDEN` (403, applies to `getClasses` list/read per US-041) →
     **added** to the `forbidden` branch (was missing — `getClasses` real
     calls could 403 with this code and previously fell to `unknown`).
   - `CLASS_NOT_FOUND` (404) → existing `not-found`. Correct, unchanged.
   - `ROSTER_STUDENT_NOT_ENROLLED` (404) → existing `not-found` (used for the
     idempotent-unenroll-404 special case). Correct, unchanged.
   - `CLASS_ARCHIVED` (409) → existing `class-archived`. Correct, unchanged.
   - `ROSTER_STUDENT_ALREADY_ENROLLED` (409) → existing `already-enrolled`.
     Correct, unchanged.
   - `ROSTER_MEMBER_NOT_STUDENT_ROLE` (422) → existing `member-not-student`.
     Correct, unchanged.
   - **`STUDENT_NOT_FOUND` — REMOVED.** This code does not exist anywhere in
     `core/docs/ERROR_CODES.md` or `openapi.yaml` — a guessed code from
     mock-first authoring (US-E06.7). Left unmapped (falls to `unknown`; the
     real 404 case is already covered by `CLASS_NOT_FOUND`/
     `ROSTER_STUDENT_NOT_ENROLLED` + the generic `status === 404` fallback).
   - **`CLASS_ACCESS_FORBIDDEN` — REMOVED, replaced by `CLASS_FORBIDDEN`.**
     Another guessed code that doesn't exist on the real API; `CLASS_FORBIDDEN`
     is the real one (see above).
   - `ROSTER_INVALID_ENROLLMENT_ID` / `CLASS_INVALID_ID` / `CLASS_INVALID_MEMBER_ID`
     (400, malformed UUID) → left unmapped → falls to `unknown`. Unreachable
     via the UI (ids always come from prior server-provided data), matches the
     US-E18.3/US-E18.4 precedent for devtools-only edge cases.
   - No new `RosterFailure` types needed — i18n (`adminRoster.errors.*`)
     UNCHANGED (all failure keys the mapper now produces already have vi+en
     entries).
7. **Zero UI/ViewModel/behavior change** — `student-roster-screen` and all its
   sub-components (`add-student-panel`, `class-info-card`, `roster-table`,
   `transfer-confirm-dialog`, etc.) untouched; they consume `RosterStudent`/
   `SearchStudent`/`ClassSummary` entities which are UNCHANGED (all wire drift
   absorbed in `infrastructure/`).

## Relevant Product Docs

- `docs/stories/epics/E18-be-wiring/EPIC-OVERVIEW.md` (playbook + Wave 1 +
  cross-repo asks — this US adds ask #9).
- `docs/stories/epics/E18-be-wiring/US-E18.4-class-management-wiring/story.md`
  (the enrichment-fan-out + hybrid-DI-composite pattern this US reuses).
- `edu-api/services/core/docs/openapi.yaml` (`Classes` tag —
  `ClassResponse`/`EnrollmentResponse`/`AddStudentRequest` schemas).
- `edu-api/services/core/docs/ERROR_CODES.md` ("Class — Student roster /
  Enrollment (US-043)" + "Class + TeachingAssignment (US-041)" sections).
- `edu-api/services/iam/docs/openapi.yaml` (`UserProfileResponse`/`Members`
  tag — confirmed self-only profile read, no gender field, no listing).

## Acceptance Criteria

- `ROSTER_EP` paths confirmed correct (`/core/api/v1/classes`,
  `.../students`, `.../students/:studentMemberId`); comment corrected to cite
  the confirmed `EnrollmentResponse` display-field gap instead of "contract
  not finalised".
- `ClassDto`/`ClassesResponseDto` rewritten to the real wire shape
  (`classId`/`academicYearLabel`, no `homeroomTeacher` on the wire); `RosterMapper.toClassSummary`
  takes the wire DTO **plus** an injected homeroom-name enrichment (never
  reads `homeroomTeacher` off the DTO directly) — mirrors US-E18.4's
  `ClassEnrichment` pattern but scoped to just the one field this entity needs.
- `getClasses` (real) fans out one `GET .../homeroom-teacher` per class on the
  current page (`404 CLASS_ASSIGNMENT_NOT_FOUND` → `null`/no fallback text);
  applies zero client-side filtering (admin-roster doesn't filter by
  gradeLevel, unlike class-management).
- `getClassRoster`/`getSearchPool` in the real `RosterRepository` class are
  simplified to a documented dead-code stub (`fail({ type: "unknown" })`,
  matching class-management's `listTeachers` precedent) — they are never
  invoked because the DI factory's hybrid composite always delegates these
  two methods to the mock repo, even in real mode. The old wrong-shape
  `RosterStudentDto`/`SearchStudentDto` real-HTTP code paths are deleted (not
  left as latent, silently-broken calls).
- `enrollStudent`/`unenrollStudent`/`unenrollStudents`/`transferStudent`
  (real) unchanged in shape (already correct pre-existing code) but
  error-mapping corrected per the matrix above.
- `admin-roster.di.ts` composes a hybrid repository exactly like
  `class-management.di.ts`: `getClasses`/`enrollStudent`/`unenrollStudent`/
  `unenrollStudents`/`transferStudent` bound to the real repo;
  `getClassRoster`/`getSearchPool` delegated to a `MockRosterRepository`
  instance — in BOTH `USE_MOCK` branches (i.e. when `USE_MOCK=true` the whole
  repo is the mock as before; when `USE_MOCK=false` the composite applies).
  `ensureFreshSession()` wired before `createServerHttpClient()` in the
  `!USE_MOCK` branch (playbook step 6 — was NOT wired before this US, this
  repo predates the playbook).
- `RosterFailure` union UNCHANGED (no new types) — mapper fixed to remove
  `STUDENT_NOT_FOUND`/`CLASS_ACCESS_FORBIDDEN` (don't exist on the real API)
  and add `CLASS_FORBIDDEN` → `forbidden`.
- Mock repository/fixtures UNCHANGED in behavior (still the permanent source
  for `getClassRoster`/`getSearchPool`, and the full `USE_MOCK=true` fallback
  for every method).
- Zero UI/ViewModel/behavior change.
- Zero regression: full `bun vitest run` + `bunx tsc --noEmit` + `bun run
  build` all green (baseline 287 files / 1712 tests, per US-E18.4 at HEAD
  `5988510`).

## Design Notes

- Commands: `enrollStudent`, `unenrollStudent`, `unenrollStudents`,
  `transferStudent` — thin real-HTTP calls, no new domain behavior, only
  error-map corrections.
- Queries: `getClasses` (+ per-row homeroom-name fan-out, real), `getClassRoster`
  (mock, permanent), `getSearchPool` (mock, permanent).
- API: `/core/api/v1/classes(/{id}(/students(/{studentMemberId})|/homeroom-teacher))`
  — only `classId`/`academicYearLabel` renames + missing `homeroomTeacher`
  field vs the current `ROSTER_EP`/DTOs; no path changes.
- Domain rules: `ClassSummary`/`RosterStudent`/`SearchStudent` entities
  UNCHANGED — all drift absorbed in `infrastructure/`. `RosterFailure` union
  itself unchanged (only the mapper's code-branch logic changes, no new
  variants).
- UI surfaces: none changed.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `roster.mapper.test.ts` (rewritten — `toClassSummary` id/field renames + injected homeroom enrichment, `toRosterStudent`/`toSearchStudent` kept for the mock's continued use) |
| Integration | `roster.repository.test.ts` (rewritten — real error matrix for `getClasses`/enroll/unenroll/transfer incl. `CLASS_FORBIDDEN`, `STUDENT_NOT_FOUND`/`CLASS_ACCESS_FORBIDDEN` removed, `getClassRoster`/`getSearchPool` reduced to a stub test confirming they never hit HTTP, raw-flag real-interceptor regression guard kept for `getClasses` only, homeroom fan-out incl. 404-as-null) |
| E2E | n/a (no UI/flow change — lane normal, wiring-only, per Epic E18's "Design Source" mandate) |
| Platform | `bunx tsc --noEmit`, `bun run build` green |
| Release | full `bun vitest run` zero-regression, pre-push gate green, auto-merge to `main` |

## Harness Delta

- `docs/TEST_MATRIX.md` — add US-E18.5 row on completion (unit/integration
  proof, zero-regression full-suite count, tsc/build status).
- `scripts/bin/harness-cli story update --id US-E18.5 --status implemented
  --unit 1 --integration 1 --e2e 0 --platform 1` once proof exists.
- No ADR needed (no auth/RBAC/token/tenant/data-loss/PII/design-token gate
  tripped — pure infrastructure DTO/error-map remap + a documented BE-gap
  decision, same pattern as US-E18.1–US-E18.4).
- `EPIC-OVERVIEW.md` cross-repo asks list gets a new #9 (roster display
  fields on `EnrollmentResponse`, or an IAM batch-lookup with `gender`
  support) — added by `fe-lead` alongside this story's completion.

## Evidence

(filled in by `fe-nextjs-engineer` / `fe-tech-lead-reviewer` on completion)
