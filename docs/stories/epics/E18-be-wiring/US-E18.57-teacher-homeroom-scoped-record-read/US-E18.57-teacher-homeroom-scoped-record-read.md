# US-E18.57 Teacher homeroom-scoped academic-record read (ADR 0136 grant)

## Status

in-progress

## Lane

high-risk

> Hard-gate flag: auth/RBAC + PII visibility (which role sees whose học bạ) —
> high-risk per Feature Intake even though the code delta is expected to be
> small; a wrong empty-vs-forbidden mapping here is a real information-
> disclosure/UX-trust risk, not a cosmetic bug.

## Dependencies

- Depends on: US-E18.56 (same feature module — must be merged to `main` first; branch off `main` only after that merge)
- Blocks: none
- Feature module(s) chạm: `src/features/academic-records/` (viewer read slice only)
- Shared contract/file: `docs/product/screens.md` rows for the teacher academic-record route (US-E18.54 review left these stale — closing that SHOULD-FIX here)

## Ground truth (BE response 2026-08-08 §3, ADR 0136 BE-side)

New allow-list for BOTH học bạ reads:

| Role | Read scope |
| --- | --- |
| SUPER_ADMIN/ADMIN/MANAGER | any student — unchanged |
| STUDENT | self — unchanged |
| PARENT | linked child — unchanged |
| **TEACHER** | **only records of classes where the caller is the current GVCN (homeroom teacher)** — NEW |

- **List-by-member** (`GET /members/{memberId}/academic-records` — the ONLY
  endpoint this repo's viewer calls, confirmed in US-E18.56's ground truth):
  **NOT all-or-nothing**. BE filters the returned `records[]` down to the
  classes the caller-teacher is homeroom of. A student may have records
  across many classes/years; a teacher sees only their own homeroom slice of
  that history.
- Teacher is homeroom of **zero** of this student's classes → **`200` with
  `records: []`**, NOT 403. This must render the existing EMPTY state
  (`record.years.length === 0` branch in `academic-record-screen.tsx`), never
  the error/forbidden branch.
- Teacher IS homeroom of at least one → 200 with that filtered subset,
  response body shape unchanged (same fields ADMIN sees).
- Scope is by **current** homeroom assignment — losing the GVCN assignment
  loses the read immediately (BE-side, no FE caching concern since this is an
  RSC-per-request read).
- **No new write/mutation permission** — seal/unseal/approve remain
  ADMIN-only; this US must not add any seal-related affordance to the teacher
  view (there is none today — confirm it stays that way, don't accidentally
  wire one).
- The single-record endpoint
  (`GET /classes/{classId}/terms/{termId}/students/{studentId}/academic-record`)
  ALSO now grants scoped-TEACHER (403 for a non-homeroom class) — **irrelevant
  to this repo**, same reasoning as US-E18.56: the viewer never calls it.

## Current state (read before touching anything — likely near-zero code delta)

- `teacher/students/[studentId]/academic-record/page.tsx` already calls the
  SAME `buildAcademicRecordVM({role: "teacher", studentId, year})` →
  `makeGetAcademicRecordUseCase().execute(memberId)` →
  `AcademicRecordsRepository.getRecords(memberId)` path as every other role.
  There is **no client-side role branching** anywhere in this call chain — the
  RBAC filter is entirely BE-side, keyed off the caller's token, not a role
  parameter FE sends. This means the ARCHITECTURE already does the right
  thing: once BE returns a filtered `records[]` (possibly empty) instead of a
  blanket 403, this pipeline needs **no repository/use-case/mapper change** to
  produce the correct data.
- `academic-record-screen.tsx` ALREADY branches on
  `!record || record.years.length === 0` → empty-state markup (`empty.title`/
  `empty.description`), completely separate from the `error` branch
  (`role="alert"`, `t(error.${error})`) — i.e. the AC "200 + records:[] must
  render empty state, not error state" is **already satisfied by existing
  code**, since a successful `{ok:true, data: {years: []}}` never touches the
  error branch.
- What is genuinely new: the CONTENT of that empty state is currently one
  generic message shared by every role/reason (a brand-new student with truly
  zero records, an admin looking at an empty roster, ...). For a TEACHER who
  is not homeroom of ANY of this student's classes, "chưa có học bạ" (no
  records exist) is a confusing/misleading message — the student likely DOES
  have records, the teacher just isn't authorized to see any of them. The
  packet's task text explicitly asks for copy meaning "không có học bạ nào
  bạn được xem" (nothing you're authorized to see), which is a materially
  different claim from "there is nothing here." This IS new UI/copy work.
- `docs/product/screens.md` rows for the teacher academic-record route (and
  neighbours 127/137 per US-E18.54's tech-lead review) still say the route
  "always shows forbidden in real mode for every teacher" — this is the
  SHOULD-FIX left open by that review; it is now flatly wrong and must be
  corrected as part of THIS story (it's the same fact this US changes).

## Scope

1. **Role-aware empty-state copy**: give `academic-record-screen.tsx`'s empty
   branch a role/reason-aware message for the TEACHER case specifically —
   e.g. add `academicRecord.empty.teacherNoHomeroomAccess.{title,description}`
   i18n keys (vi source + en mirror) and select them when `vm.role ===
   "teacher"` (generic empty copy stays the default for the other three
   roles, unchanged). Do not invent a distinction between "teacher sees empty
   because genuinely 0 records" vs "teacher sees empty because not homeroom" —
   BE gives no signal to tell those apart (both are `records: []`), so ONE
   teacher-specific message that is accurate for BOTH readings is correct
   (e.g. "Không có học bạ nào bạn được xem cho học sinh này" — accurate
   whether the true reason is zero records or zero-homeroom-overlap).
2. **Regression/contract tests** proving the pipeline needs no repository
   change: a repository-level test where the DTO's `records: []` (simulating
   BE's filtered-to-nothing response) resolves to `{ok: true, data: {years:
   []}}`, NOT a failure — this is the test that would have caught the OLD
   all-or-nothing 403 behavior as wrong, so write it even though it currently
   passes trivially; it is the regression guard for this exact contract.
3. **VM/screen test**: `buildAcademicRecordVM({role: "teacher", ...})` with a
   mocked use-case returning `{ok:true, data:{years: []}}` → VM has
   `error: null`, `record.years: []`; screen renders the NEW teacher-specific
   empty copy (not the generic one, not the error alert).
4. **Mock repository fixture**: check `MockAcademicRecordsRepository` — it has
   no role parameter to filter on (matches real repo's shape), so it cannot
   simulate "teacher sees a homeroom-filtered subset" meaningfully in mock
   mode. Do NOT invent role-awareness in the mock repo (`USE_MOCK` selects a
   whole screen's data source, decision `0014`; per-role filtering belongs to
   BE, never faked client-side). Leave the mock's existing teacher-route
   fixture behavior as-is unless it currently hardcodes something now
   factually wrong (grep for any teacher-specific special-casing in mocks —
   there should be none; confirm, don't add any).
5. **Docs fix (this story's real payload)**: correct `docs/product/screens.md`
   rows for the teacher academic-record route (and the two neighbouring rows
   the US-E18.54 review named, 127/137) — replace "always forbidden in real
   mode" with the accurate homeroom-scoped description.
6. **Do not touch** `docs/decisions/0055-academic-records-seal-wiring-contract.md`'s
   still-open SHOULD-FIX from US-E18.54 (the viewer force-mock supersession
   note) — unrelated surface, out of scope for this ask batch; note it as a
   still-open pre-existing item in Evidence, don't silently fix or silently
   ignore.

## NOT in scope

- Any change to the seal/unseal repository or its permissions.
- Any change to the single-record endpoint or a new call to it.
- Inventing a way to distinguish "genuinely 0 records" from "0 authorized
  records" in the empty-state copy — BE gives no such signal; do not simulate
  one client-side (e.g. do not add a second call to probe "does this student
  have ANY records at all" — that would itself be a scope/authorization leak).
- Re-litigating US-E18.54's other open SHOULD-FIX items (subject-catalogue
  test coverage, ADR 0055 supersession note) — separate, pre-existing, not
  part of this ask.

## Acceptance Criteria

- Real mode, TEACHER is homeroom of ≥1 of the student's classes: sees exactly
  that filtered set of records, year-grouped, response fields unchanged from
  what ADMIN sees for the same rows.
- Real mode, TEACHER is homeroom of 0 of the student's classes: `200 records:
  []` renders the EMPTY state with teacher-specific copy — never the error/
  forbidden alert.
- A genuine 403 (e.g. malformed/edge-case BE response, or any other role
  hitting an actual forbidden) still renders the existing error alert
  unchanged — the `forbidden` failure branch is not removed or weakened, only
  no longer the expected outcome for "not homeroom".
- No new write affordance appears anywhere in the teacher view.
- `docs/product/screens.md` accurately reflects the grant (no route reads
  "always forbidden").
- Zero regression to STUDENT/PARENT/ADMIN routes or to seal/unseal.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | repository test: `records:[]` DTO → `{ok:true, data:{years:[]}}` (not a failure); VM test: teacher role + empty records → correct copy key selected, `error:null` |
| Integration | `academic-records.di.test.ts` env-matrix unaffected (no DI change expected — confirm, don't assume) |
| E2E | Storybook interaction: new "teacher, no homeroom access" empty state (screenshot-distinct copy from the generic empty state), plus existing "teacher, homeroom records present" happy path if not already covered |
| Platform | `bun vitest run` zero-regression, `bunx tsc --noEmit`, `bun lint`, `bun run build` (mock + real) |
| Release | merged to main, branch deleted |

## Harness Delta

- `harness-cli story update --id US-E18.57 --status implemented --unit 1 --integration 1 --e2e 1 --platform 1` once proof exists.
- `docs/product/screens.md` rows corrected (see Scope §5).
- `docs/TEST_MATRIX.md` note update for the teacher route (from "blocked/
  forbidden" to "homeroom-scoped, real").
- Mark ask #48 answered in the batch consumption report.

## Evidence

(fe-nextjs-engineer / fe-tech-lead-reviewer / fe-accessibility-auditor / fe-qa-playwright fill in below as work proceeds.)
