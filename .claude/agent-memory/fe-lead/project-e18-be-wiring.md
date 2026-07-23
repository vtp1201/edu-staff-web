---
name: project-e18-be-wiring
description: E18 BE-wiring epic (mock→real edu-api) — Waves 0-3 done + Wave 4 US-E18.17/E18.18 done; epic's actionable scope now COMPLETE (US-E18.16 descoped zero-code, remaining items are cross-repo asks only)
metadata:
  type: project
---

Epic E18 (`docs/stories/epics/E18-be-wiring/EPIC-OVERVIEW.md`) swaps mock-first
features to real edu-api via Kong (`:8000`, routes only `/iam` + `/core/api/v1`).
US-E18.0 (Wave 0, tiny, 2026-07-11) = proof-of-pattern gateway smoke — DONE.

**Why:** contract-drift audit found real repos ~100% ready (`USE_MOCK ? Mock :
Real(http)` pattern already in 30/32 DI factories) — effort is remap
path/DTO/error-code, not new repos. US-E18.0 proved the pattern works against a
REAL running BE, not just mocks.

**How to apply for every Wave 1-4 US in this epic:**
1. `cd edu-api && make stack-up` boots real `iam`+`core`+`notification`+Kong
   locally (`docker`, healthy in ~20s). `make stack-down` after.
2. To smoke-test the WEB app's own code (not just curl): write an ephemeral
   `bun run`-able `.ts` script inside the repo root (bun resolves `@/*` via
   `tsconfig.json` paths automatically when run from repo root; does NOT work
   from outside the repo dir) importing `@/bootstrap/lib/http`
   (`createHttpClient`) + `@/bootstrap/lib/api-envelope` — this validates the
   REAL interceptor/error-map code against a REAL BE. Delete the scratch file
   before committing (never commit it).
3. **MANDATORY playbook step 6 (added by US-E18.0):** every real (`!USE_MOCK`)
   DI factory branch must call `await ensureFreshSession()` (from
   `bootstrap/di/auth.di.ts`) BEFORE `createServerHttpClient()`. Decision 0018's
   proactive refresh was documented since day one but literally never wired
   into any protected feature's DI factory except `auth.di.ts` itself —
   verify with `grep -rl ensureFreshSession src/bootstrap/di` before assuming
   it's already there for a cluster.
4. **Local dev stack has no SUPER_ADMIN seed** — can't create the first tenant
   (`POST /iam/api/v1/tenants` requires SUPER_ADMIN Bearer) to get a real
   tenant-scoped 200 happy path. Do NOT attempt to promote a user's `role`
   column directly via `docker exec edu-scylla cqlsh` — the permission system
   blocks this as privilege escalation (correctly). Cross-repo ask filed for
   edu-api to add a dev-only seed/CLI.
5. **Cross-repo finding**: `POST /api/v1/auth/refresh` does NOT enforce
   refresh-token reuse-detection (`user_token_reused` documented in
   `services/iam/docs/ERROR_CODES.md` but not enforced) — replaying an
   already-rotated-away refresh token still returns 200 + a new pair. Filed as
   BE gap, not fixed in web.
6. school-config (`core`) cluster confirmed 100% path/DTO match with
   `core/docs/openapi.yaml` — zero drift, safe reference for "how correct
   wiring should look" when reviewing Wave 1 US's.

**US-E18.1 (calendar, 2026-07-11) — the epic's "MATCH 100%" audit label is
path-level only, NOT DTO-shape.** Re-reading the real
`AcademicYearResponse`/`TermResponse` schemas found the existing "real"
`CalendarRepository` (written mock-first in US-E06.5) was never actually
validated: BE returns FLAT `academicYearId`/`termId`/`status`(enum) responses,
NOT the web's nested `AcademicYear.terms[]` + boolean `isActive` + `hasGrades`
shape. Fix stayed at the repository layer (no domain/UI change): per-year
`listTerms` fan-out (`Promise.all`) to reassemble the nested shape,
`isActive = status==="ACTIVE"`, `hasGrades` always `false` from the wire (BE
has no such field — real guard is the `409 CALENDAR_TERM_IN_USE` on archive).
Also found: BE's `createYear` only accepts `label` (no atomic create-as-active
— must POST then separately `activate`, which 409s if another year is already
ACTIVE, no auto-swap like the mock did) and one existing wrong error mapping
(`CALENDAR_FORBIDDEN` → `network-error`, fixed to a new `forbidden` type).
**Apply to every remaining Wave 1 US**: don't trust the epic audit's "MATCH"
label past the path level — always diff the actual response schema field-by-
field against the entity/DTO the web already assumes before calling a cluster
"just a transport swap." fe-nextjs-engineer wrote this up as a reusable
pattern in its own memory (`pattern-be-wiring-remap.md`) — worth reading when
briefing US-E18.2 onward.

**US-E18.2 (staffing, 2026-07-11) — even bigger drift than calendar; two new
cross-cutting findings for every remaining Wave 1-3 US:**
1. **The epic audit's "MATCH" label undersold this cluster more than calendar.**
   Beyond the expected id-renames (`departmentId`/`positionTitleId`/
   `positionAssignmentId`), found: department `conceptLabel` (1 field) split
   into wire's `conceptLabelSuggested`+`conceptLabelCustom` (2 fields);
   `Permission` enum was a **completely wrong 4-value taxonomy** vs the real
   6-value BE enum (only 1 value overlapped) — a genuine domain-type change,
   not just a repo fix; `PositionAssignment.status` wire `ARCHIVED` → domain
   `REVOKED` rename; 3 fields (`activeAssignmentCount`, `memberName`,
   `positionTitleName`) don't exist on the wire at all and needed real
   derivation logic (paginated count fan-out, cross-entity name joins) in the
   repository. **Lesson**: for any cluster with "computed/joined" fields in
   the mock-first entity, check whether the join source is even reachable
   from the BE contract before assuming a repo-only fix — sometimes (like
   `memberName` here) there is NO BE source at all (checked IAM's
   `MemberResponse`: no name field anywhere except self-only `/users/me`).
2. **[CRITICAL, check on every remaining US]** `fe-tech-lead-reviewer` found
   a real, shipped bug in this cluster: `raw: true` was nested inside the
   axios `params` object instead of as a top-level config key. `isRawCall`
   (`bootstrap/lib/api-envelope.ts`) only reads `config.raw` at the TOP
   level — with `raw` nested, the interceptor unwraps the envelope before
   `parseEnvelope` runs, so every real-mode LIST call silently degrades to
   `network-error`. **Mocked-`http.get` unit tests cannot catch this** (they
   never exercise the real interceptor) — it slipped through TDD green and
   was only caught by the reviewer's independent re-verification. The
   reviewer flagged that **this same misplacement may exist pre-existing in
   `principal-teachers`/`class-log`/`subject-catalogue` repos** — worth a
   dedicated grep sweep (`grep -rn "params: {.*raw: true" src/features`)
   across the codebase, not just as each epic US touches those files.
   Fix pattern: `{ params: {...filter}, raw: true }` (raw as sibling), NOT
   `{ params: {...filter, raw: true} }`. Correct precedent:
   `calendar.repository.ts` (US-E18.1). A regression test that runs the REAL
   `unwrapResponse` against the repo's actual config (not a mocked
   `http.get`) is the only way to guard against this recurring.
3. Confirmed a second async-agent working-tree race this session (see
   `feedback` memory or note here): the engineer agent, once resumed via
   SendMessage for a revision, made its own follow-up commit in the SAME
   checkout concurrently with fe-lead's own commit of the same fix — no code
   was lost, but a duplicated Evidence paragraph in the story landed in two
   separate commits and had to be manually de-duplicated. When resuming an
   agent for revision fixes in a solo/non-worktree branch, expect it may
   commit on its own schedule — check `git log` for surprise commits before
   assuming only your own commits landed.

**US-E18.19 (raw-flag sweep, tiny, 2026-07-11) — the dedicated sweep flagged in
US-E18.2 finding #2 above, DONE.** Grep `raw: true` across all of `src/features`
(excl. test/mock) found 9 more nested-`raw` sites in 7 repos:
`principal-teachers` (2), `class-log` (1), `subject-catalogue` (2),
`class-management` (1), `admin-roster/roster` (2 — BOTH `getClasses` and
`getClassRoster`; the initial task brief wrongly assumed `getClasses` was
already correct, engineer/reviewer verified via actual code read that it
wasn't), `teacher-class`/`teacher-dashboard` `fetchAllPages` (1 each). Fixed all
9 by hoisting `raw: true` to a config-level sibling of `params`; added the
real-`unwrapResponse`-piped regression guard (pattern from US-E18.2) to all 9
repos' test files, plus 2 guard-only additions to `notification`/`audit-log`
(already correct, no source change). Fresh post-fix grep confirmed the sweep
is complete — no repo under `src/features` still nests `raw` in `params`.
246 files/1357 tests, tsc clean, build green, tech-lead APPROVED first pass (no
revision round this time — the established guard pattern + explicit "verify
every fixed repo hoists correctly + fresh grep for misses" review brief caught
everything). **Lesson for future bug-class sweeps**: when the task brief
asserts a specific site is "already correct," still independently verify via
Read — don't propagate an unverified assumption into the story packet.

**US-E18.4 (class-management, 2026-07-16) — the epic table's assumed fix can
itself be wrong; verify BE has the endpoint before committing to a remediation
plan.** The table said "teacher list đổi nguồn sang IAM members" — reading
`edu-api/services/iam/docs/openapi.yaml` directly (`Members` tag) found IAM's
PUBLIC API has NO `GET` listing endpoint and NO single-member lookup at all
(only `POST` add / `PATCH` roles / `DELETE` remove on
`/api/v1/tenants/{id}/members`; the one lookup path,
`/internal/v1/.../members/{userId}`, is internal-only, bypasses Kong). This is
a level worse than US-E18.2's finding (staffing found IAM has no *name* field;
this found IAM has no *listing* at all). **Lesson**: don't assume the epic
table's stated remediation is achievable — grep the actual target service's
`openapi.yaml` for the specific HTTP method before writing the story's AC
around it. Decision made: `listTeachers` stays mock-first permanently
(unchanged from before — it already was mock-only); logged cross-repo ask #7
(IAM listing endpoint) + #8 (put `studentCount`/homeroom fields directly on
`ClassResponse`, same ask-class as `activeAssignmentCount`/`childCount`).
Also: `ClassResponse` carries neither `studentCount` nor homeroom fields —
derived per-row via 2 fan-out calls (roster count paginated-to-completion +
homeroom-assignment with `404 CLASS_ASSIGNMENT_NOT_FOUND`→`null`), but scoped
to the CURRENT LIST PAGE only (not a tenant-wide fan-out like E18.2/E18.3) —
cheaper, worth calling out explicitly as a distinct pattern when a "counts"
gap appears on a paginated list endpoint vs a "list everything" endpoint.
**Cross-feature coupling discovered**: `features/principal/.../
principal-teachers.repository.ts` (a separate, not-yet-wired feature) directly
imports class-management's DTO/mapper — changing the shared mapper's `toClass`
signature broke that file's compile. Fixed with a minimal, clearly-commented
neutral-enrichment call site (that repo's real mode was already non-functional
before this US — its own `/core/api/v1/teachers` endpoint doesn't exist per
the epic's "KHÔNG thuộc wave này" list), plus one test-fixture update for
compile/test parity — NOT a full wiring of that sibling feature (out of scope
for this US's card). **Lesson**: before rewriting a shared mapper/DTO
signature, grep for cross-feature importers (`grep -rl <MapperName>
src/features`) — Clean Architecture per-feature intent doesn't stop another
feature from reusing types in practice in this codebase, and a compile break
there is your responsibility to resolve within the same US, scoped minimally.
287 files/1712 tests (baseline 286/1680), tech-lead APPROVED first pass (no
revision round — independently re-verified all 7 scrutiny points against the
edu-api specs itself, confirmed the IAM/ClassResponse claims).

**US-E18.5 (admin-roster, 2026-07-16) — the epic table's own remediation note
can be too narrow; the real gap can be strictly bigger than what it names.**
Epic table said only "search pool WEB-ONLY, decision needed" (implying roster
*listing* itself was fine). Reading `EnrollmentResponse` directly
(`core/docs/openapi.yaml`) found it carries ONLY `enrollmentId`/`classId`/
`studentMemberId`/`academicYearLabel`/`enrolledAt` — zero display fields at
all (no name/dob/gender/status). This is qualitatively worse than a missing
single display-name field (US-E18.4's homeroom precedent, tolerable raw-uuid
fallback): a multi-row table can't render 30+ raw UUIDs as a shippable
screen. **Lesson**: when a US's epic-table note only flags "search pool" or
similar as the gap, still independently re-read the *listing* endpoint's own
response schema — don't assume the epic audit already validated the read
path just because it didn't call it out. Decision: both `getClassRoster` AND
`getSearchPool` stay mock-first permanently (hybrid DI composite, same
pattern as `listTeachers`); only `getClasses` (class picker, single-field
homeroom-name fan-out reusing `class-management`'s `CLASS_EP.
classHomeroomTeacher` + `HomeroomAssignmentResponseDto` directly — no
duplicate DTO/endpoint) + enroll/unenroll/transfer wired real. Cross-repo ask
#9 logged: `EnrollmentResponse` needs `studentName`/`dob`/`gender`, or IAM
needs a batch lookup that ALSO adds a net-new `gender` field (confirmed:
`gender` doesn't exist ANYWHERE in IAM's schemas, not even for self via
`/users/me` — a genuinely new field ask, not just "expose what already
exists" like ask #6). Error-map cleanup: two guessed codes from the original
mock-first authoring (`STUDENT_NOT_FOUND`, `CLASS_ACCESS_FORBIDDEN`) turned
out not to exist on the real API at all — grepping `ERROR_CODES.md` directly
is the only reliable way to catch a guessed-but-plausible-sounding code that
was never validated. 287 files/1714 tests (baseline 287/1712), tsc/build
clean, tech-lead APPROVED first pass (1 non-blocking CONSIDER: add an
explicit test for a non-404 homeroom-fetch error propagating through
`getClasses` — logged as a follow-up, not required for merge).

**US-E18.6 (iam-member+tenant, 2026-07-16) — the ONLY Wave 1 cluster with
zero path drift, but `ERROR_CODES.md` prose alone is NOT enough to trust an
error-code mapping; ground-truth against the Go source.** Paths in
`bootstrap/endpoint/{iam-member,tenant}.endpoint.ts` matched
`iam/docs/openapi.yaml` 100% (already flipped real in an earlier US). The
epic table itself flagged the real risk: "iam ERROR_CODES.md gần rỗng — xác
nhận taxonomy với BE." Reading `ERROR_CODES.md` confirmed the *values*
looked right (lowercase snake_case), but the *existing* `mapIamFailure`
switch was hard-coded to **UPPER_SNAKE guessed codes** (`FORBIDDEN_ACTION`,
`USER_EMAIL_ALREADY_EXISTS`, `INVITATION_NOT_FOUND`,
`LAST_ADMIN_INVARIANT_VIOLATION`) that don't exist anywhere on the wire —
grepped the actual Go source (`services/iam/internal/membership/core/domain/
error/member.go` + `.../tenant/core/domain/error/tenant.go` +
every `membership/core/application/usecase/*.go`) to confirm the literal
`apperror.Conflict("member_already_exists")`-style calls, which is the only
way to be sure (ERROR_CODES.md documents i18n keys, and is generated FROM the
same source, but reading the doc alone doesn't prove the repo's switch
statement matches it — you have to diff the repo against the doc/source, not
just read the doc). Every real IAM member/invitation error was silently
falling through to `unknown` before this fix. Also found 4 wire codes
(`member_tenant_inactive`, `member_invalid_transition`, `invitation_expired`,
`invitation_email_mismatch`) that were completely unmapped (not even wrong —
just absent), and 2 failure-type names that were actively misleading given
the real semantics (`email-exists`→ renamed `member-exists`: the real 409 is
a duplicate `userId` membership, not an email collision; `invitation-not-
found`→renamed `invitation-invalid`: real status is 410 Gone, covers
unknown/used/revoked tokens, not literally "not found"). **Lesson for any
future error-taxonomy US**: don't stop at "the ERROR_CODES.md values look
plausible" — actually diff the existing repository's switch statement
against them line-by-line; a plausible-looking table doesn't prove the code
that consumes it is correct. Also found (not fixed, just flagged):
`IamMemberRepository.listMyTenants/switchTenant` duplicate `tenant` feature's
`TenantRepository` (same 2 endpoints) and are currently 100% dead code — no
Server Action calls `makeInviteMemberAction()` anywhere in `src/`; left as a
note for whoever eventually builds a member-invite admin screen. `ensureFreshSession()`
wired into `iam-member.di.ts` + `tenant.di.ts` (first time in either — same
playbook-step-6 gap recurring per new DI factory, now check `grep -rl
ensureFreshSession src/bootstrap/di` before assuming any given factory has
it). 288 files/1725 tests (baseline 287/1714), tsc/build clean, tech-lead
APPROVED first pass (independently re-verified the error-code claims against
edu-api's Go source itself, not just the story prose).

**US-E18.7 (assessment-scheme + grade-scale, 2026-07-16, Wave 2) — a "path
fix" label can hide the deepest drift yet: separate Request/Response
schemas AND several domain concepts with zero wire representation.** Beyond
the epic table's stated path fix (drop `/config/`, add trailing
`/terms/{termId}`), ground-truthing found: (1) BE's `GradeScaleResponse` has
no banding concept at all for numeric scales (`HE_10`/`HE_4_GPA`) — only
`LETTER_ABCD` gets `letterGrades`; the web's band-threshold/color editor for
numeric scales is decorative-only under the real contract (falls back to the
existing local `GRADE_SCALE_PRESETS`, never persisted); (2) BE's assessment
column model (`coefficient` ≤10.0, no sum constraint) and the web's
percentage-`weight` model (1-100, must sum to 100) are mathematically
equivalent under a constant scale factor — solved with a **lossless
`coefficient = weight/10` / `weight = coefficient*10` unit conversion**
rather than either redesigning the domain or weakening the sum-to-100
validation (validation stayed byte-for-byte unchanged, keeping the lane
`normal` not `high-risk`); (3) `count` (assessments folded into one column)
has ZERO wire representation anywhere (confirmed via `GradeEntryResponse`'s
composite key implying one value per column per student) — became a fixed
non-persistent default, same class of finding as E18.3's `restore`/E18.5's
roster fields. **Key design principle applied**: kept the domain entities
(`GradeScale`/`AssessmentScheme`/`AssessmentColumn`) **100% unchanged** and
put ALL translation in the infra mapper layer — this fully insulated the
already-shipped `grades` feature (687+ tests, reuses these same domain types
for its weighted-average calc) from any ripple; only compile-only `termId`/
`effectiveFrom` literal additions were needed there. Also: `termId` was a
genuinely new required concept the screen never modeled (no term selector
existed) — added a minimal hardcoded `["HK1","HK2"]` Select, reusing the
`teaching-plan` feature's existing `subject-class-term-selector.tsx` pattern,
rather than inventing calendar-service integration out of scope. Registered
ADR `0053` for these wire-mapping conventions (this is the kind of judgment
call — unit-scaling a validated business rule instead of redesigning it —
that's genuinely ADR-worthy, not just a repo fix). Ground-truthed error
codes from `services/core/internal/assessment/core/domain/error/config.go`
+ `pkg/kit/response/error.go`'s `codeFromKey()` (`strings.ToUpper`) —
confirms **decision 0008 (UPPER_SNAKE) DOES hold for `core`**, unlike `iam`
(US-E18.6's divergence) — worth checking per-service each time, don't
generalize one service's convention to another. `listSubjectsForGrade`
correctly left mock (real `GET /subjects` has no `gradeLevel` filter,
belongs to a future US-E18.3) rather than over-scoping this US. 289
files/1751 tests (baseline 288/1725, +26/+1 file), tsc/build/lint clean,
tech-lead APPROVED first pass (one non-blocking CONSIDER: `effectiveFrom`'s
first-save value used a deterministic preset constant instead of the story
prose's stated `new Date().toISOString()` — corrected the doc to match
reality rather than the code, since deterministic is strictly better for
tests), a11y PASS on the new term-selector (0 blocking; flagged the shared
`Select` primitive's pre-existing missing `motion-safe:` prefix as a
batchable follow-up alongside the known `Dialog` gap). **Process note**: the
a11y auditor's `bun vitest:storybook run -t "<name>"` invocation matched 0
tests (wrong flag — `-t` filters by test name, not file path) and it
misread the resulting all-skipped run as "tooling broken"; fe-lead
independently re-ran with a file-path arg (`bun vitest:storybook run
src/features/assessment-scheme`) and got a clean 10/10 pass — always
verify a claimed tooling failure with a differently-scoped invocation
before accepting it into the record.

**US-E18.8 (staff-leave, 2026-07-16, Wave 2) — a "tiny/path fix" label can hide
a "this cannot be wired at all" finding, not just deeper DTO drift.** Beyond
the epic table's stated `/conduct/` segment fix, ground-truthing (openapi.yaml
+ Go source, not just prose) found: (1) the real `GET` requires a **mandatory**
`staffMemberId` query param with **no tenant-wide oversight list** at all
(table partitions on `(tenantId, staffMemberId)`) — the admin screen lists
every staff member's requests in one view, which the real API structurally
cannot serve in one call; (2) even a single-member list would be useless:
`StaffLeaveRequestResponse` has **zero display fields** (no `staffName`/
`department`, and the whole leave-*type* concept — annual/sick/personal/family
— doesn't exist on the wire, only free-text `reason`) — 4th time this exact
"IAM has no name/lookup source" gap (asks #6/#7) has blocked a screen, now
compounded by a brand-new resource-specific gap (no leave-type modeling at
all). Decision: **the entire feature stays mock-first, not just the read
path** — `approve`/`reject` are equally unreachable since their only id source
is that blocked (mock) list. First-of-its-kind DI factory: previous
"permanently mock" cases (`admin-roster.di.ts`, `class-management.di.ts`) were
**hybrid** (some ops real, most methods delegate per-method); this one
force-mocks the WHOLE factory regardless of `USE_MOCK` since literally zero
operations survive. The real repository class still exists (all 3 methods as
documented permanent blocked stubs, mirroring `ClassManagementRepository.
listTeachers()`) so the shape is ready for the day BE ships a tenant-wide list
+ display fields. **Reviewer catch worth repeating**: independently verifying
error-code claims against the Go source (not just my own read) caught a real
mismap — I had `LEAVE_REQUEST_FORBIDDEN` for the `forbidden` failure, but
`list`/`approve`/`reject` actually emit `VIOLATION_FORBIDDEN` (the shared
`ApprovalTransition` domain service's `ErrViolationForbidden()`);
`LEAVE_REQUEST_FORBIDDEN` is submit-only, a path this repo never calls. Fixed
same-commit (map both codes) after the reviewer's independent re-verification
— even "this code is provably unreachable" dead code deserves the same
ground-truth rigor, because the whole point of keeping it was "correct for
the day this unblocks." 290 files/1763 tests (baseline 289/1751, +1 file/+12
tests), tsc/build/lint clean, tech-lead APPROVED after the 1 fix (no revision
round needed — reviewer verdict was Approved-with-a-should-fix, applied
immediately rather than looping back). Cross-repo ask #13 logged.

**US-E18.9 (teaching-plan, 2026-07-16, Wave 2) — a "path fix + `/cells`
decision" label undersold BOTH halves: nesting `/lms/` was real but trivial;
`/cells` turned out to be "no HTTP surface exists, not a missing segment,"
plus TWO more independent blockers the table never mentioned.** Ground-truthing
`edu-api/services/core/internal/lms/teachingplan` (routes.go, handler,
domain entity, domainerror) found: (1) composite-key granularity mismatch —
web keys a plan by `(subjectId, classId, term)`; the real key is
`(classSubjectId, academicYear, planId)` with no term dimension at all (one
BE plan spans a full academic year, not a term) — `classSubjectId` itself IS
resolvable via an already-used fan-out (`CLASS_EP.classSubjects(classId)`,
same as `principal-teachers.repository.ts`), but the term-to-academicYear
collapse is a genuine product/semantic decision, same class of out-of-scope
decision the epic reserves for Wave 3; (2) the grid's period axis has zero
wire representation (`WeeklyEntryResponse` = `{weekNumber, topic, notes}`,
week-only); (3) the `/cells` answer: grepping the whole module for
`UpdateEntries` found exactly 3 hits — the domain method definition, its own
unit test, and nothing else. The BE built and unit-tested the capability to
replace a plan's entries and never wired it to any use-case or HTTP route
(`routes.go` mounts only `POST /`, `GET /`, `GET /:id`,
`PUT /:id/{submit,approve,reject}`). This is a stronger and more useful
finding than "the endpoint doesn't exist" — the cheapest possible BE unblock
is a thin handler wrapping already-tested domain logic, not new business
logic. Lesson reinforced from US-E18.8: when a screen's core interaction
(here, per-cell autosave) has zero wire equivalent AND additional independent
blockers stack on top (key mismatch + missing axis), don't try to partially
wire the "easy" ops (list/get/submit) — partial wiring would still require
resolving the term-vs-academicYear question to even construct correct
request params, so the whole repository became the epic's second fully-
blocked DI factory (after `staff-leave.di.ts`), not a hybrid like
US-E18.4/US-E18.5. No new `TeachingPlanFailure` types were needed (unlike
E18.8's 2 new types) — the existing union's `not-draft` already covered the
real `TEACHING_PLAN_INVALID_STATUS_TRANSITION` semantics once correctly
branched. 290 files/1777 tests (baseline 290/1763, +14 new), tsc/build clean,
tech-lead APPROVED first pass (independently re-verified every ground-truth
claim against the Go source, including re-running the `UpdateEntries`
dead-code grep itself rather than trusting the story prose — 1 non-blocking
CONSIDER: `reject`'s 422 `VALIDATION_FAILED` isn't in the 6-code domain
taxonomy and falls to `unknown`, addressed same-commit with a clarifying
comment). Cross-repo ask #14 logged (wire `UpdateEntries()` to a `PUT`
endpoint — flagged as likely the cheapest unblock in the whole epic).

**US-E18.10 (class-log, 2026-07-16, Wave 2) — the ONLY zero-DTO-drift cluster
in the whole epic; the real bug was a workflow-state gap, not a repo remap.**
`class-log`'s path prefix AND `HomeroomEntryResponseDto` already matched
`internal/school/adapter/http/dto/homeroom.go` field-for-field — first time in
this epic zero mapper/entity/DTO change was needed. The real gaps were (1) a
missing `revise` transition: BE state machine is `DRAFT→SUBMITTED→APPROVED`/
`→REJECTED→SUBMITTED` via a SEPARATE `revise` endpoint (`HomeroomEntry.Revise()`
guards `IsRejected`, distinct from `Submit()`'s `IsDraft` guard) — the shipped
UI (US-E13.3) routed BOTH DRAFT and REJECTED through the same `submitEntryAction`,
which would 409 for real once wired; (2) the guessed error taxonomy
(`already-submitted`/`not-submitted`/`duplicate-date`) never matched any real
code — ground-truthed against `internal/school/core/domain/error/homeroom.go`
+ `codeFromKey`'s uppercase confirms the real 5 codes are `HOMEROOM_ENTRY_
NOT_FOUND`/`HOMEROOM_ENTRY_ALREADY_EXISTS`/`HOMEROOM_INVALID_TRANSITION`
(ONE code for every illegal transition, not two)/`HOMEROOM_SUMMARY_REQUIRED`/
`HOMEROOM_FORBIDDEN`. **Lesson**: "zero DTO drift" doesn't mean "nothing to
fix" — always independently trace the actual domain entity's transition
methods (not just the response shape) against what the UI's action buttons
call, since a state-machine gap can hide behind a perfectly correct DTO.
Also fixed a parity bug found while touching the same surface: `approve`/
`rejectEntryAction` discarded the repository's already-correctly-mapped
returned entity and had the client fabricate `{ ...entry, status: "..." }`
instead — unlike `create`/`submitEntryAction` which already returned the real
entity. Made all three transition actions consistent
(`{ ok: true; entry }`). QA (`fe-qa-playwright`) found 2 real Storybook
interaction-coverage gaps missed by the engineer's self-report (a story
named for an AC that only asserted an unrelated button; zero test for the
principal-can't-revise role+status combination) and closed both with
test-only additions — same recurring pattern as US-E19.2: budget for QA to
rewrite/extend interaction tests, not just review existing ones. 292
files/1790 tests (baseline 290/1777, +2 files/+13 tests), tsc/build/lint
clean, tech-lead APPROVED first pass (independently re-opened the Go source
for both the error taxonomy and the transition guards, not just the story
prose), a11y PASS (0 blocking; 1 optional non-blocking pre-existing-pattern
note on toast-only pending-state announcement, deferred as a cross-cutting
follow-up not scoped to this US).

**US-E18.11 (timetable, 2026-07-16, Wave 3, first "cao"-drift US) — a spawned
`fe-nextjs-engineer` agent stalling mid-task (session-limit) is recoverable
without losing work; re-verify state, don't assume.** The engineer finished
only the admin-builder half (GET/RMW-PUT/DELETE, day-enum, error taxonomy)
before stalling with uncommitted changes and zero commits on the branch.
Resumed directly as `fe-lead`: `git status`/`bun vitest run`/`tsc` first to see
real state (296/1824, not "nothing done") before continuing — the coordinator
resume-prompt's own "current observed state" summary was accurate and saved
re-discovery time. Completed the consumer-view half (`getByTeacher` fan-out)
myself. **Two scope corrections found only by actually tracing call sites,
not by trusting the pre-written packet**: (1) `GET /classes` (teacher-scope
fan-out for `getByTeacher`) is real and ground-truthed against
`list_classes.go` — TEACHER auto-filtered, STUDENT/PARENT hit
`ErrClassForbidden()` (line 59) — confirms the "no self-scope discovery
endpoint for STUDENT/PARENT" gap-class (asks #6/#7/#9/#13) recurs a 5th time,
now for timetable; (2) the packet ASSUMED the consumer feature's `getByClass`
would be real too ("class-scoped consumer view", direct analog to the admin
builder's) — grepping actual call sites found its ONLY caller in
`features/timetable` is `GetChildTimetableUseCase` (the parent flow), which is
itself permanently mock (blocked on ask #15) — wiring `getByClass` real would
feed real HTTP a mock-fixture classId (`"11A2"`) and always 404. Corrected to
mock-in-this-feature (the admin builder's OWN `getByClass`/`getTimetable` is
still real — same operation name, two different features, two different
wireability verdicts, because the CALLER differs). **Lesson**: when a packet
states "operation X is real" for a consumer feature, verify by grepping who
actually calls it in THIS feature before wiring — don't assume symmetry with a
sibling feature that happens to expose the same-named method. Also: BE has
literally no bulk/whole-school timetable-conflicts endpoint (only reactive
409 `TIMETABLE_TEACHER_CONFLICT` on write) — the admin screen's proactive
"conflict summary across all classes" card stays permanently mock (ask #16,
no attempt at a full-tenant fan-out reconstruction — flagged as a genuine
product-scope question, not silently built). `room` has zero wire field on
`SlotRequest`/`SlotResponse` (ask #17, same non-persistent-field class as
E18.7's `count`/`bands`). Reviewer's 2 non-blocking findings both worth
fixing same-commit even though non-blocking: a merge filter that matched on
a MAPPED display field (`slot.teacherName`) which only worked because the
mapper's id-as-name fallback happened to equal the compared id — decouple by
filtering the RAW wire slots (`teacherMemberId`) before mapping, so a future
real name-join doesn't silently break the filter; and a null-`currentUserId`
guard that silently returned an empty result instead of a typed failure.
299 files/1837 tests (baseline 292/1790, +7/+47), tsc/build/lint clean,
tech-lead APPROVED first pass after ground-truthing the full contract
independently against edu-api Go source (not just re-reading story prose).

**US-E18.12 (grades, 2026-07-16, Wave 3, high-risk lane) — the epic's biggest
model-granularity mismatch: real BE tracks workflow status PER CELL
(student×column), web's mock model tracked it PER ROW; no batch/reject
concept exists on the wire at all for the admin approval screen.** Ground-
truthing `core`'s `GradeEntry`/`GradeReport` tags + Go source
(`grade_entry.go`, `grade.go`) found the state machine is
`DRAFT→(PUBLISHED|PENDING_APPROVAL)→PUBLISHED→LOCKED`, strictly forward, keyed
per `(classId,subjectId,termId,studentMemberId,columnId)` — not per class-
subject-row like the invented `classSubjectId`/`GradeApprovalBatch` mock
model. No bulk-submit endpoint exists (only per-cell `POST .../submit`); no
reject/request-revision transition exists for `GradeEntry` at all (unlike
`StudentConductGrade`, which has one); no tenant-wide "pending approval"
rollup exists (same `GET .../grades` needs an already-known triple). Decision
(ADR `0054`): wire teacher entry (`IGradesRepository`) + multi-role read
(`IGradeBookRepository`, incl. student-self/parent-linked via
`GET /members/{id}/grades` — genuinely wireable, unlike timetable's blocked
self-scope, because it needs only a memberId not a classId) + term `lock`
real; force-mock `IGradeApprovalRepository` (admin batch dashboard) and the
parent child-switcher (`get-child-list`) PERMANENTLY — third fully-blocked DI
factory after staff-leave/teaching-plan, confirming the "no display-name/
rollup source" gap-class (asks #6/7/9/13/15) a 6th time. **Key design
decisions that generalize:**
1. Row-level status is NEVER stored — a pure `deriveRowStatus()` function
   (worst-progress-wins: draft > pending-approval > locked-only-if-all >
   published) derives an "at a glance" roster badge from the row's per-cell
   statuses. When a real per-cell/per-entity granularity replaces an invented
   per-row one, don't invent a parallel row-level server field — derive it.
2. "Publish" (bulk, whole-sheet) → "submit" (per-cell) with NO bulk endpoint
   → solved with ONE use-case taking a caller-supplied target LIST (1 cell,
   one row's DRAFT cells, or the whole visible sheet's DRAFT cells — same
   use-case, different call-site granularity), sequential `for` loop (never
   `Promise.all`, never short-circuits), returning `{submitted, failed}` —
   reusable pattern for any future "no bulk endpoint but the UI wants bulk-ish
   convenience" gap in this codebase.
3. **First-implementation self-contradiction caught by tech-lead review**:
   the engineer's own commit updated the ADR/story to claim
   `IGradeApprovalRepository` is "force-mocked permanently" while leaving the
   actual `makeApprovalRepo()` DI factory with a live `if (USE_MOCK) {...}
   else {...real...}` branch — the docs and the code disagreed within the
   SAME commit. Lesson: when a story claims "force-mock, matching
   `staff-leave.di.ts`'s pattern," a reviewer must diff the ACTUAL function
   body against that cited precedent's shape (zero-branch), not just check
   the doc's prose matches the ADR's prose — self-consistent-sounding docs
   can still describe code that doesn't exist.
4. **A11y found what static-code review missed**: a11y auditor's A11Y-101
   (blocking, WCAG 3.3.1) caught that a partial fan-out submit failure
   (2/5 succeed, 3/5 fail) only surfaced an AGGREGATE banner count — no way
   to tell WHICH 3 cells to retry. Required threading the use-case's
   `failed: Array<{target, failure}>` result all the way down to per-cell
   `aria-invalid`/`aria-describedby`, not just a top-level toast. Generalizes:
   any fan-out/partial-failure operation needs a per-item retry surface, not
   just an aggregate count, or it fails WCAG 3.3.1 regardless of whether the
   aggregate message is itself `role="status"`-correct.
5. A design doc explicitly flagging "your call, this is a judgment call, not
   deciding unilaterally" (component-design.md's `DRAFT` tone choice between
   `muted`/`info`) is a real signal the fe-lead should resolve BEFORE
   briefing the engineer, not leave for the engineer to guess — resolved it
   as `info` (clearer visual separation from `LOCKED`'s `muted` on a dense
   grid) directly in the engineer's brief.
6. **A dead-but-implemented branch is worse than no branch**: the engineer's
   first pass built a "mixed" row-status case per the ORIGINAL component
   design doc's suggestion, but `deriveRowStatus`'s own (correct, deliberate)
   worst-progress-wins precedence makes "mixed" mathematically unreachable —
   AND the dead branch used `aria-label` instead of the spec'd
   `aria-describedby` (silently overriding the accessible name rather than
   supplementing it). A11y found both problems at once (A11Y-103). Fix was
   to REMOVE the dead branch with a comment explaining why "mixed" is
   impossible by design, rather than retrofit a real mixed-state that would
   have meant deliberately undoing the precedence rule the same story
   designed on purpose two files over — always check whether a "kept for
   forward-compat" branch is reachable before shipping it.
7. **Two background `fe-nextjs-engineer` async-agent resume cycles both made
   real, substantive progress concurrently with fe-lead's own manual fixes on
   the SAME files** (not just the "surprise commit" race noted in US-E18.2) —
   `Read`-before-`Edit` failures ("file has been modified since read") were
   the correct signal to re-read and reconcile rather than force-overwrite;
   in one case the engineer had ALREADY implemented ~80% of a11y fix
   (A11Y-101's `failedCells`/`getFailureMessage` threading) that fe-lead was
   independently starting to write from scratch — re-reading before editing
   caught the duplicate-work early and let fe-lead finish just the missing
   wire-up (the `<ScoreCell>` call site's 2 missing props) instead of
   clobbering good work. **Lesson**: when resuming a background agent for a
   fix round and then ALSO fixing things yourself in the same worktree (no
   dedicated worktree isolation was used here, solo mode), re-`Read` every
   file immediately before each `Edit` — don't trust your last-known content,
   the background agent may have kept working after its last notification.
301 files/1852 tests (baseline 299/1837, +2/+15 from the domain rewrite,
+13 Storybook interaction tests from QA in a separate config), tsc/build/lint
clean. tech-lead: Revision Required (the makeApprovalRepo contradiction) →
fixed → Approved. A11y: 1 blocking (A11Y-101) + 2 should-fix (A11Y-102/103)
+ 2 minor (A11Y-104/105) → all fixed same-branch → re-verified PASS by a
fresh audit pass (not just self-report). QA: GO, full Storybook interaction
suite diffed byte-identical (71/71 pre-existing failures) against a clean
`main` worktree to prove the ADR's scope boundary (`grade-approval-screen`/
`child-switcher` untouched) held end-to-end, not just at review time.

**US-E18.14 (discipline→conduct, 2026-07-17, Wave 3, high-risk lane) — a gap
documented for one role can turn out to also block a different role once
ground-truthed line-by-line; when EVERY operation in a feature is blocked
(not a subset), skip a11y/design-review/QA gates entirely.** Epic table's
"tách student/staff + full submit/approve/reject" label was directionally
right about what real BE has (genuine staff/student split — `staff-
violations`/`staff-conduct-notes`/`student-absences` — and a real
DRAFT→SUBMIT→APPROVE/REJECT workflow replacing web's single-action
`overrideConductGrade`) but wrong that any of it is wireable: (1) every real
endpoint keys on a real `studentMemberId` UUID the mock-first roster can't
supply (extends ask #9's roster-lookup gap); (2) **new finding**: ask #15
(US-E18.11) documented that PARENT has no `classId`-discovery endpoint for a
linked child — reading `list_student_violations.go`/
`list_student_conduct_grades.go` line-by-line found the identical gap ALSO
blocks the STUDENT's own self-view (`classId` is parsed as mandatory BEFORE
the role switch; the student-self `ownOnly` branch only post-filters an
already-classId-scoped page, it never drops the requirement) — meaning even
a student querying strictly their own records can't do so for real. This is
the first blocked cluster in the epic where the gap hits self-service, not
just oversight/admin screens (US-E18.8/09/11/13 were all "someone looking at
someone else's data" gaps). **Lesson**: a cross-repo ask scoped to one role
("PARENT can't discover X") is worth re-checking against every OTHER role
branch in the same use-case before assuming it's role-specific — don't take
the original ask's stated scope as the full extent of the gap. Third fully-
blocked DI factory (after staff-leave/teaching-plan) — force-mocked
`discipline.di.ts` regardless of `USE_MOCK`, real `DisciplineRepository`'s
every method a permanent stub. Confirmed the shared-domain-service pattern
from US-E18.8 generalizes further: `ApprovalTransition` (ADR 0073) is reused
verbatim by violations/conduct-grades/leave alike, so `VIOLATION_SAME_ACTOR`/
`VIOLATION_INVALID_TRANSITION`/`VIOLATION_REJECTION_REASON_REQUIRED` appear
as the literal error code for conduct-grade and leave-request 409s/422s too
— reviewer should expect this cross-resource code reuse, not flag it as a
mapping bug. `staff-violations`/`staff-conduct-notes`/`student-absences` have
literally no web screen anywhere (grepped `src/features`+`src/app`, confirmed
by both engineer and reviewer independently) — correctly descoped as a
product/design gap (flag for `/uiux`+`/ba`), not a BE gap, per the epic's "no
new screens" Design Source directive. **Process win**: since literally every
operation was blocked (a stronger claim than US-E18.8/09's "every operation
for THIS screen"), skipped `fe-accessibility-auditor` + the design-review
gate + `fe-qa-playwright` entirely (zero UI surface, mirrors US-E18.8/09) —
kept the pipeline to just engineer→tech-lead-review, which is the right
scope for a repository/DTO/error-taxonomy/DI-only US; don't over-invoke the
full pipeline when there's no UI to gate. 303 files/1902 tests (baseline
303/1866, +36 tests same file count), tsc/build/lint clean, tech-lead
APPROVED first pass (independently re-ground-truthed the force-mock premise
against edu-api Go source, specifically checking for the US-E18.12-class
failure mode — a live real-branch contradicting a force-mock claim — found
none; 2 non-blocking CONSIDER notes, one comment-accuracy fix applied
same-branch).

**US-E18.15 (exam-bank, 2026-07-17, Wave 3) — `openapi.yaml` itself can be
drifted from the Go source it's supposed to document, not just path-vs-DTO
naming drift; a mid-flight scope correction (Option A/B/C escalation from the
engineer) is a legitimate outcome of ground-truthing, not a planning
failure.** The ADR I wrote pre-implementation (0056) trusted `openapi.yaml`'s
`ExamBank` write-path docs (`CreateExamPaperRequest.questions`, a
`SetExamQuestionsRequest` full-replace endpoint) — both fictional. The real
Go source (`internal/lms/exambank/adapter/http/{routes.go,dto/request.go}`)
has: metadata-only create, one-question-per-call DRAFT-only append (no
replace, no options-text array field), and literally no update/delete
endpoint. `fe-nextjs-engineer` caught this mid-implementation (independent-
option-only work first, per its own briefing to not block on the
ambiguous parts) and escalated 3 options rather than guessing or silently
descoping. **Lesson**: even this epic's own playbook step 1 ("ground-truth
the Go source, don't trust openapi.yaml") can still be violated by the LEAD
during pre-implementation ADR-writing if the lead reads `openapi.yaml`
first and the Go source only for the parts that "felt risky" (I did read
Go source for errors/entities but trusted openapi.yaml's request/response
shape tables verbatim) — the fix going forward: for every write-path
operation, open the actual handler+request-DTO Go file, not just the
schema in openapi.yaml, even when the path/response read-shape checks out.
**Escalation handling**: independently re-verified the engineer's claim
against the same 3 Go files before deciding (found identical) — then
amended the ADR in-place with a dated "Amendment" section (this repo's
established correction pattern, see ADR 0037) rather than minting a new
ADR number, and renumbered the cross-repo asks to slot into
`EPIC-OVERVIEW.md`'s canonical registry (the story packet's own draft
numbering collided with two already-claimed numbers from parallel/prior
stories — always check the CANONICAL file's last number, not just what
the draft used). **Decision (Option A)**: wire list/get/publish real
(maximizes the genuinely wireable surface); create/update/delete become
permanently-blocked stubs (hybrid DI, matching US-E18.5/US-E18.13); the
entire teacher builder route (create/edit) gets blocked in real mode — a
bigger UI-behavior change than the story's original "hide delete only"
framing, explicitly flagged for and passed through the design-review gate
rather than silently shipped. Independent-worktree pre-existing-failure
verification (a recurring epic technique, `git worktree add <path> <sha>
--detach`) confirmed a Storybook test/`aria-disabled` mismatch predates
this US, logged as a follow-up rather than fixed in-scope. 307 files/1950
tests (baseline 303/1902, +4/+48), tsc/build clean, tech-lead APPROVED
first pass (independently re-verified error-code mapping + raw:true
placement + blocked-stub unconditional-throw against the Go source), a11y
PASS (1 should-fix + 2 minor, all fixed same-branch by fe-lead directly —
cheap copy/heading fixes don't need a round-trip back to the engineer),
QA GO (wrote new Storybook/unit coverage for the real-mode gating +
blocked-route + 3-value-status + error-path claims rather than trusting
the self-report, per the epic's now-standard QA brief). **Follow-up resolved
(2026-07-17, tiny lane, branch `fix/exam-builder-validation-story`,
merged)**: the logged `Builder Validation`/`aria-disabled` mismatch was two
bugs, not one, and they were masking each other — `toBeDisabled()` always
failed first, so the story's second assertion (`getByLabelText` against a
plain sr-only `<span>`, not a form-control label — never matches, wrong
query for that DOM shape) had never actually executed even on a "passing"
run. Kept `aria-disabled` on the component (intentional keep-focusable
pattern, matches `builder-action-bar.stories.tsx`'s own correct assertion);
fixed the story to `toHaveAttribute("aria-disabled","true")` + a click-
is-no-op check + swapped to `getByText`. **Lesson**: when a component
intentionally uses `aria-disabled` over native `disabled`, check every
OTHER story asserting against that same button too — a fix scoped to "the
one failing assertion" can still leave a second, adjacent bug that was
only invisible because test execution never reached it.

**US-E18.16 (lesson-plan + question-bank, 2026-07-17, Wave 3) — the epic
table's own naming assumption can be wrong at the DOMAIN level, not just
DTO/path drift; when ground-truthing BOTH sides finds zero existing web
feature at all, stop and descope rather than force a wire.** Every prior
"blocked" US in this epic (E18.8/9/11/13/14/15) had an EXISTING mock feature/
screen to remap into a hybrid or force-mock repository. Here, ground-truthing
`edu-api/services/core/internal/lms/{lessonplan,exercisebank}` (routes.go +
DTOs + `ERROR_CODES.md`) confirmed BOTH real BE contracts are clean and
well-formed (11-code `LESSON_PLAN_*`, ~12-code `QUESTION_*`) — but grepping
the web side found: (1) the epic table's `"lessons"→"/lms/lesson-plans"`
label conflated two UNRELATED domain objects that happen to share the English
word "lesson" — `src/features/lesson-bank` is a teacher file/resource-sharing
repository (`fileType`/`fileUrl`/`visibility`/`viewCount`, no publish
workflow), while BE's `lesson-plans` is a structured DRAFT→PUBLISHED planning
DOCUMENT (`objectives`/`contentOutline`/`activities`/`assessmentMethod`) —
zero field overlap beyond `subjectId`/`title`, no lossless mapping in either
direction; (2) no web feature (mock or otherwise) exists at all for BE's
`exercisebank` question-bank service — the only "questions"-named code
(`LMS_EP.questions`, `ListQuestionsUseCase`/`AskQuestionUseCase`) is an
unrelated per-lesson Q&A comment thread with a completely different shape.
**Decision**: zero code changes. Unlike the "flagged for uiux/ba" language
used alongside a still-executed partial wire (E18.9/E18.11's self-view),
here NOTHING is wireable because nothing pre-exists to wire INTO — building
new repository/DI/UI code for a feature with no consuming screen would be
inventing net-new product surface under a "BE-wiring" epic whose explicit
goal is "UI không đổi hành vi." Registered the ground-truth BE contract
summary in the story packet + `EPIC-OVERVIEW.md` finding #27 so a future
`/uiux`→`/ba` pass (if "teacher lesson-plan authoring"/"teacher question
bank" screens become a real product ask) starts from an accurate contract
instead of re-discovering it. Harness story kept `status planned` (not
`implemented` — no proof exists because no code exists; `tdd.md`'s "no story
implemented without real proof" bars marking this done as if it shipped
something). Still ran the full branch-claim→docs-edit→merge→cleanup
lifecycle (branch/push/commit/merge/delete) even for a docs-only, zero-`src/`
change — kept the pipeline discipline uniform rather than special-casing a
"nothing to wire" story into a shortcut. 307 files/1950 tests unchanged
(no source touched), tsc/build green (sanity re-run, not required by any
gate since nothing changed). **Lesson generalizing beyond this epic**: when
a US assumes an existing mock feature maps 1:1 to a named real endpoint,
verify BOTH directions before writing any code — read the real DTO fields
AND the existing web entity's fields side-by-side and ask whether they
describe the same real-world object, not just whether the English names
rhyme. A shared noun ("lesson", "question") is not evidence of a shared
domain model.

**US-E13.2 (attendance, 2026-07-18, cross-referenced from E13-teacher-workspace,
Wave 2 "cao" drift/normal lane) — packet said BE US-046 was `planned`; it had
shipped. Real drift was bigger than "period-based ≠ class/date-based": no
subject axis EITHER (a daily homeroom roll call, not a per-subject-period
session) — replaced the entity, didn't remap it.** 4-state status
(`PRESENT/ABSENT/LATE/EXCUSED_ABSENT`) vs the mock's 3-state — `late` mapped
to the EXISTING `--edu-info` token (no new token, so stayed `normal` lane
despite the intake heuristic that flags "new design-system token" as a
high-risk trigger — reusing an existing token for a new semantic role is not
the same as minting one). **Two parallel planning docs
(fe-component-architect + fe-state-engineer) both independently proposed
cross-feature repository composition** (an `IStudentNameResolver` port+adapter
vs. direct `ITeacherClassRepository` constructor injection) to resolve the
name-on-wire gap (yet another confirmation of the recurring asks
#6/7/9/13/15/18/20/21/22 pattern) — but the actual established codebase
precedent (`real-weekly-timetable.repository.ts`, US-E18.11) is to DUPLICATE
the small `GET /classes`/`GET /classes/:id/students` fetch inline with local
DTOs, never cross-import another feature's concrete repository. Caught this
conflict by re-reading the actual precedent file myself before briefing the
engineer, rather than letting two independently-correct-sounding subagent
plans silently diverge into the implementation — the engineer was briefed
with an explicit override citing the precedent, and it followed it cleanly
(zero cross-feature import in the final `attendance.repository.ts`). Unlike
most high-drift US's in this epic, NOTHING ended up permanently blocked —
class-list, name-resolution, record, read, and (bounded ≤31-day fan-out)
history are all real; logged cross-repo ask #28 for a bulk history-range
endpoint as a nice-to-have, not a blocker. a11y found a genuine NEW-in-branch
contrast fail (`late` toggle's solid `bg-edu-info`+`text-edu-text-primary` =
4.42:1, just under 4.5 AA) that the component-architecture doc had explicitly
flagged as "must re-verify" — the fix (tint `bg-edu-info/15` matching
`StatusBadge`'s already-AA-safe `info` tone) reused an existing pattern, no
new token; also caught a missing `aria-live` on the history tab's new
client-`useQuery` surface (RSC→client conversions that add async loading
states need a fresh a11y look even when the underlying data didn't change).
**Two concurrent background-agent races observed and handled cleanly this
session**: (1) the resumed a11y-fix `fe-nextjs-engineer` agent committed its
own fix to the SAME 2 files while fe-lead was independently editing one of
them — re-checking `git log`/`git diff` before assuming "nothing landed yet"
found the agent's commit already covered both fixes correctly, so fe-lead's
own edit to the first file was superseded cleanly (no conflict, just
redundant work avoided by checking first); (2) confirms the now-standard
practice: always `git status`/`git log --oneline main..HEAD` before assuming
a background fix hasn't landed. 343 files/2216 tests (baseline 338/2179),
tsc/build clean, tech-lead APPROVED first pass (independently re-verified
error taxonomy/raw:true/ensureFreshSession/route-prefix/status-round-trip/
history-fan-out/i18n-boundary/layering against the Go source and ran the
suite itself), a11y FAIL (2 blocking: contrast + aria-live) → both fixed →
re-verified green, QA GO (closed 7 AC-coverage gaps with new interaction
assertions: period-selector-absence guard, 4-state toggle incl. `late`'s
tint class, roster 3-column guard, summary-card 4-tile count math,
history `aria-live`+per-day badges, save success + correction-window-expired
toast). ADR `0058`.

**US-E18.18 (notification/SSE, 2026-07-23, Wave 4, normal lane) — the epic
table's own service-ownership grouping can mislead: "unread-counts" was
filed under "Notification wiring" because the route lives on the
`notification` service, but its shape (`{roomId, unreadCount}[]`) is
exclusively a MESSAGING concept — wire it into the feature that actually
needs it, not the feature that happens to share the service.** Also: the
web's own speculative `RealtimeEvent` SSE contract (ADR 0009: "web defines
first, BE follows") turned out to have ZERO overlap with the real wire once
BE shipped — real frames are FLAT (no `payload` wrapper), omit `eventId`
entirely, and `typing` omits `tenantId`/embedded `type` too (SSE `event:`
line is the sole type signal). Don't assume a pre-BE speculative contract
survives contact with the real one just because "the team defined it first
on purpose" — re-ground-truth it like any other mock-first guess once BE
ships. **New cross-cutting finding for future SSE/proxy work**: a decision in
the SIBLING repo (edu-api ADR 0047, dated AFTER this repo's original SSE
proxy design) can silently invalidate an existing architectural choice here
— the direct-bypass proxy (calls the notification service directly,
bypassing Kong, per ADR 0009/0030) now structurally 401s once BE adopts
gateway-injected-claims-only auth, INDEPENDENT of the Kong-routing gap that
was already the known blocker. Always check the sibling repo's OWN recent
decisions folder (`edu-api/docs/decisions/`) for anything dated after a
web-side ADR that assumed a particular BE trust/auth model — don't assume
the BE side is static. Kept the domain's existing 3-state `PresenceState`
UNCHANGED (zero VM/UI ripple) by doing the 2-state(real)→3-state(domain)
derivation entirely in the mapper with an injected clock — same "translate
in the mapper, don't touch the domain" principle as US-E18.7's coefficient/
weight unit scaling. tech-lead-reviewer's only Revision-Required items were
durable-artifact gaps (ADR/TEST_MATRIX/EPIC-OVERVIEW) that the LEAD owns per
role, not code — closed directly without looping back to the engineer,
correctly distinguishing "code needs a fix" from "the lead forgot to
register the paper trail." QA independently re-verified 10/10 AC and closed
3 real test-coverage gaps (SSE proxy's real-branch fetch had zero test
despite being the literal path-fix AC; inbound typing only had a
pure-reducer test, not a rendered Storybook proof; presence's 5-min
threshold lacked exact ±1s boundary tests) — zero production defects. 389
files/2527 tests (baseline 385/2492, +4/+35), tsc/build clean. ADR `0061`.
This closes out E18's actionable Wave 4 scope (US-E18.16 already descoped
zero-code) — the epic itself is now complete; only cross-repo asks remain
open (#1/#33 Kong routing + ADR-0047, and the long-running "IAM has no
name/listing" gap-class asks #6/7/9/13/15/18/20/21/22).
