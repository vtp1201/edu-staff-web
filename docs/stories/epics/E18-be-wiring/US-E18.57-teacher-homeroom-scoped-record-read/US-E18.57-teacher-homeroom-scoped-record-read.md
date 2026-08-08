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

### fe-nextjs-engineer (2026-08-08)

**Packet's central prediction CONFIRMED — verified, not assumed.** The pipeline
needed **zero** repository / mapper / use-case / DI / mock change. Read end to
end before touching anything:

- `AcademicRecordsRepository.getRecords()` maps `dto.records ?? []` through the
  mapper and hands the (possibly empty) row list to `buildAcademicRecord()`.
  There is no "no rows ⇒ the caller must not be allowed" shortcut anywhere in
  the repo, the use case or `buildAcademicRecordVM` — a failure is produced
  ONLY from a thrown wire error via `toFailure`. So BE's new
  `200 { records: [] }` already resolved to `{ok: true, data: {years: []}}`,
  and the screen already renders that through its `record.years.length === 0`
  branch, which is textually separate from the `error` branch.
- `git grep` over `features/academic-records`: the ONLY role reference in the
  whole feature is presentational (`ROLE_TONE`, `roleBadge` i18n). The wire
  carries no role parameter — scoping is entirely BE-side off the Bearer token,
  which is exactly why a BE RBAC widening is a no-op for this call chain.
- `MockAcademicRecordsRepository` grep for `role|teacher`: **zero matches**. No
  pre-existing teacher special-casing to correct, and none added (per-role
  filtering stays BE-only, decision `0014`).
- No seal/unseal affordance exists in `academic-record-screen.tsx` (the only
  action is the disabled print button); none was added.

So the real payload of this story is copy + docs + regression guards, which is
the packet's own expected outcome, not a shortfall.

**Delta (red → green).** Wrote the failing tests first; the run at that point
failed 5 tests across 2 files (`emptyStateCopyKey is not a function`) while the
new repository test passed trivially — expected, it is a contract *guard*, and
it is written so it WOULD have failed under the old all-or-nothing-403 reading
(it pins `records: []` → `{ok:true, …}` rather than a `forbidden` failure).

1. `emptyStateCopyKey(role)` — new pure selector in
   `academic-record-screen.i-vm.ts` returning `"empty.teacherNoHomeroomAccess"`
   for `teacher`, `"empty"` for the other three roles. Static-union return type,
   so `t(\`${emptyKey}.title\`)` stays compile-checked against typed messages
   (no raw-string `t()`).
2. New i18n keys `academicRecord.empty.teacherNoHomeroomAccess.{title,
   description}` in **both** `vi.json` (source) and `en.json` (mirror). vi:
   *"Không có học bạ nào bạn được xem" / "Bạn chỉ xem được học bạ của những lớp
   bạn đang chủ nhiệm. Học sinh này có thể có học bạ ở lớp khác mà bạn không
   được xem."* — true under BOTH readings of an empty response (genuinely zero
   records OR zero homeroom overlap), since BE gives no signal to tell them
   apart. No second call was added to probe for that distinction (that would be
   a scope leak, explicitly out of scope).
3. `academic-record-screen.tsx` empty branch selects the copy via the helper —
   markup, tokens and a11y semantics unchanged (no new token, no new role/aria
   attribute, no motion). The `error` branch (`role="alert"`, `forbidden`
   included) is untouched, so a genuine 403 still alerts exactly as before.
4. Stale documentation corrected where it now lies:
   - `bootstrap/endpoint/academic-records.endpoint.ts` — the RBAC block said
     "**TEACHER is NOT in the allow-list** … degrades to `forbidden`"; now
     states the homeroom-scoped grant and the `200 records:[]`-not-403 rule.
   - `academic-records.repository.ts` doc-comment — added the explicit
     invariant that an empty `records[]` must never be treated as an
     authorization failure.
   - `docs/product/screens.md` — closes the US-E18.54 review's open SHOULD-FIX
     (its rows 75/127/137, drifted to 76/128/141 on `main`): row 128's
     "teacher route … trả `forbidden` vĩnh viễn — BE không cho TEACHER đọc
     aggregate, ask #48" removed and replaced with the accurate US-E18.56 +
     US-E18.57 history, and a dedicated **teacher-section row** added for
     `(app)/teacher/students/:studentId/academic-record` describing the
     homeroom-scoped read + the empty-not-forbidden behaviour + "no write/seal
     affordance". The parent row (141) carried no forbidden claim and was left
     alone.
5. `docs/TEST_MATRIX.md` — US-E18.57 row added (`implemented`, all four proof
   columns) directly under the US-E18.56 row.

**Deviations from the packet.** Two, both additive:
(a) the packet named only "the rows" in `screens.md`; there was in fact no
teacher row at all in the Teacher section (the claim lived inside the STUDENT
row's parenthetical), so a proper teacher row was added rather than just
editing prose — otherwise the corrected fact would still be undiscoverable
where a reader looks for it; (b) two source doc-comments
(`academic-records.endpoint.ts`, `academic-records.repository.ts`) carried the
same now-false "TEACHER is NOT in the allow-list" claim as `screens.md`; they
were corrected under the same rationale (a stale in-code RBAC claim is more
dangerous than a stale doc — the next engineer reads it as ground truth).

**Still-open pre-existing item, deliberately NOT touched (packet Scope §6).**
`docs/decisions/0055-academic-records-seal-wiring-contract.md` — the US-E18.54
review's SHOULD-FIX about the viewer force-mock supersession. Current state on
`main`: §Follow-Up *does* carry a dated "**Superseded (2026-08-07, US-E18.54)**"
paragraph, so the item looks at least partially addressed, but I made no
judgement on whether the reviewer considers it closed and made **zero** edits to
that file (`git diff -- docs/decisions/` is empty for this branch). Grep
confirms ADR 0055 contains no stale TEACHER/forbidden claim, so nothing in it is
made wrong by this US. The other US-E18.54 SHOULD-FIX (subject-catalogue
`listAllSubjects()` direct test coverage) is likewise untouched — out of scope.

**Proof (commands run in this checkout, real output).**

| Command | Result |
| --- | --- |
| `bun vitest run` | **518 files / 4086 tests passed** (baseline on `main` after US-E18.56: 517 / 4079 → +1 file, +7 tests, zero regression; includes every academic-records seal/unseal suite) |
| `bunx vitest run --config vitest.storybook.mts src/features/academic-records` | **2 files / 40 tests passed** (was 36 — +1 new story with 4 assertions; the console noise from `UnsealRequestCard`'s Invalid-Date formatter is pre-existing and non-failing) |
| `bunx tsc --noEmit` | clean |
| `bun lint` | clean — 0 errors; the only findings are the 2 pre-existing unrelated ones in `messaging/message-context-menu.tsx` (1 warning + 1 info), identical to the US-E18.56 baseline. (`bun lint:fix` reflowed two of my own imports; re-run clean.) |
| `NEXT_PUBLIC_USE_MOCK= bun run build` | green |
| `NEXT_PUBLIC_USE_MOCK=true bun run build` | green |

Tests added (7):
- `academic-record-screen.i-vm.test.ts` (NEW, 5): teacher → homeroom copy key;
  student/parent/admin → generic key; `roleBadgeKey`.
- `build-academic-record-vm.test.ts` (+1): teacher role + `{ok:true, years:[]}`
  → `error: null`, `record.years: []`, `selectedYearId: null`, teacher copy key
  selected. **This is the test that fails under the old 403 assumption.**
- `academic-records.repository.test.ts` (+1): homeroom-filtered-to-EMPTY wire
  response asserted `toEqual({ok:true, data:{studentMemberId, years: [],
  sealed:false}})` — never a failure. The 403 → `forbidden` matrix is untouched
  and still green, so the forbidden branch is not weakened.
- Storybook `TeacherNoHomeroomAccessEmpty` (new story): asserts the teacher
  title + description render AND that the generic "Không có dữ liệu học bạ"
  and `role="alert"` are both ABSENT; `EmptyRecord` strengthened to assert the
  teacher copy does NOT leak into the other roles (screenshot-distinct pair).

**AC status.** Homeroom subset renders unchanged (same pipeline, covered by the
existing role stories) · empty-with-teacher-copy proven by story + VM test ·
genuine 403 still alerts (untouched failure matrix + `ErrorState` story) · no
new write affordance (none added; only the pre-existing disabled print button)
· `screens.md` no longer says "always forbidden" · zero regression across the
full suite.

**Flagged to `fe-lead`:** nothing requiring an ADR — no new design token, no new
data contract, no architecture decision. UI delta is copy-only inside an
existing empty-state block, so the design-review/a11y gates have a trivially
small surface (no token, no color, no motion, no new interactive element).
