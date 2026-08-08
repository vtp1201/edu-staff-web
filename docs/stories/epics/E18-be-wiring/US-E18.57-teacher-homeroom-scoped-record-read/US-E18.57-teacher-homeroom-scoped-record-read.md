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

### A11y audit — fe-accessibility-auditor (2026-08-08)

**Scope.** Only the diff introduced by this story: `academic-record-screen.tsx`
role-aware empty-state branch, `academic-record-screen.i-vm.ts`
`emptyStateCopyKey()`, the two new i18n subkeys, and the new
`TeacherNoHomeroomAccessEmpty` story. Verified against `git diff main...HEAD --
src/features/academic-records/presentation` directly (not assumed from the
engineer's report).

**Checks performed:**

1. **No new interactive element / ARIA / heading — CONFIRMED.** The diff is
   template-literal-only: `t("empty.title")` → `` t(`${emptyKey}.title`) ``
   and same for `.description`. Same two `<p>` tags, same wrapping `<div>`,
   same `space-y-6` outer container. `emptyStateCopyKey()` is a pure string
   selector with no JSX. No `aria-*`, `role`, or heading tag touched.
2. **Reading order / association — PASS.** Title `<p>` then description `<p>`
   as plain DOM siblings inside one dashed-border container — identical
   pattern to the pre-existing generic empty state and to the `error` block
   above it. No `aria-label`/`aria-describedby` exists anywhere on this
   container (confirmed via `grep -n "aria-"` on the file — the only
   `aria-*` occurrences are on the unrelated `error` block's icon
   (`aria-hidden`), the disabled print button, and the tablist), so there is
   no stale-announcement risk: nothing hardcodes an ARIA reference to the old
   copy's text that could now point at content that no longer matches.
3. **Contrast — PASS, no new token.** Container classes unchanged: `rounded-xl
   border border-border border-dashed bg-card p-10 text-center` (dashed
   border unchanged); title `font-bold text-foreground`; description
   `text-sm text-muted-foreground`. Both text classes are the same ones used
   by the generic empty copy already audited in US-E18.54 — `text-foreground`
   (`--edu-text-primary` 11.52:1) and `text-muted-foreground` (aliased to
   `--edu-text-secondary`, 5.48:1 on white/card) — both PASS AA for normal
   text. No raw color, no new `--edu-*` token introduced by this story.
4. **Screen-reader script — PASS, correctly non-alarming.** For a teacher
   landing on this state, NVDA/VoiceOver in a linear read announces: "Không
   có học bạ nào bạn được xem" (title, bold text — not a heading, so it does
   not appear in a heading-navigation (H-key) outline; this matches the
   pre-existing generic empty state, which is also a `<p>`, so no regression
   in navigability was introduced by this story) followed immediately by
   "Bạn chỉ xem được học bạ của những lớp bạn đang chủ nhiệm. Học sinh này có
   thể có học bạ ở lớp khác mà bạn không được xem." Confirmed via the diff and
   the story's own assertion (`canvas.queryByRole("alert")` → not present)
   that `role="alert"` was NOT added to this branch — the teacher-empty state
   is announced as ordinary content, not interrupted/flagged as an error,
   which is correct: BE ADR-0136 makes this a `200 {records: []}` success,
   not a permission failure, and forcing `role="alert"` here would misrepresent
   a normal, expected outcome to a screen-reader user as something having gone
   wrong. The genuine `forbidden` branch (`role="alert"`, separate code path)
   is untouched, so a real 403 still interrupts correctly.
5. **Storybook reachability — PASS.** `TeacherNoHomeroomAccessEmpty` is
   exported the same way as every other `Story` in this file (default args +
   `play` function) — reachable by the addon-a11y (axe-core) panel like its
   siblings. No new color/contrast/landmark issue is introduced for axe to
   catch (same container/token profile as `EmptyRecord`, which already passed
   in US-E18.54's audit). No manual browser run was performed as part of this
   audit — Storybook a11y-addon results should be spot-checked once by
   `fe-qa-playwright` per the pipeline's usual division of labor, but nothing
   in the diff creates a plausible new violation.
6. **i18n copy quality — PASS.** vi title "Không có học bạ nào bạn được xem" /
   description "Bạn chỉ xem được học bạ của những lớp bạn đang chủ nhiệm. Học
   sinh này có thể có học bạ ở lớp khác mà bạn không được xem." — plain,
   non-technical Vietnamese; explains the homeroom-scope rule in a factual
   register without implying the teacher made a mistake or was denied
   something they should have. en mirror ("You can only view records for
   classes where you are the homeroom teacher…") matches in tone and meaning.
   Both live in `messages/{vi,en}.json` under `academicRecord.empty.
   teacherNoHomeroomAccess.*` (typed keys, no hardcoded string) — consistent
   with `.claude/rules/i18n.md`.

**Verdict: PASS — no findings, zero A11Y-XXX entries.** This is a genuinely
narrow, content-only change: same markup, same tokens, same ARIA surface as
the already-audited (US-E18.54) empty-state block, with correct non-alarming
semantics (no stray `role="alert"`) for what is a success response, not an
error. Gate is green from the accessibility side; nothing blocking for
`fe-lead`.

### Tech-lead review — fe-tech-lead-reviewer (2026-08-08)

**Verdict: APPROVED.** Zero `[MUST FIX]`, zero `[SHOULD FIX]`. Every claim in
the engineer's Evidence section was re-verified independently (commands listed
below), including the packet's central "zero code delta" prediction. This is
the correct shape for an RBAC-widening story: the widening happened BE-side off
the Bearer token, and the FE change is confined to the one place the widening
made a user-facing sentence untrue.

**Review Summary.** BE ADR 0136 replaced a blanket TEACHER `403` on
`GET /members/{memberId}/academic-records` with a homeroom-scoped filter whose
zero-overlap case is `200 { records: [] }`. The delta is 4 production lines
(`emptyStateCopyKey` + its two call sites), 2 i18n keys × 2 locales, 3 doc/
comment corrections, and 3 regression tests. Nothing in the data pipeline moved.

**Architecture Compliance — PASS.**
- `emptyStateCopyKey()` is a pure function in `academic-record-screen.i-vm.ts`,
  which is exactly the right home: the ViewModel file is the server↔client
  contract, the function has zero deps, and both a client component and a
  server-side VM test consume it. No layer crossed.
- `presentation/` imports nothing from `infrastructure/` or `bootstrap/di/`;
  `academic-records.repository.ts` keeps `import 'server-only'`. Naming
  conventions (`.i-vm.ts`, `.i-vm.test.ts`) followed.
- **`src/bootstrap/di/academic-records.di.ts` is byte-identical to `main`**
  (`git diff main...HEAD -- <path>` → empty), as the packet predicted. Same for
  `mocks/academic-records.mock.repository.ts` — I confirmed the mock repository
  is genuinely role-free (grep for `role|teacher|homeroom` returns only a
  `fixtures.ts` comment about subject/teacher *names as data*). Per-role
  filtering stays BE-only, consistent with decision `0014`.

**Code Quality — Excellent.** The change is minimal and the reasoning is
recorded where it will be read (repository doc-comment, `emptyStateCopyKey`
doc-comment, endpoint constant comment) rather than only in the packet. No
`any`, no new non-null assertions. The three doc corrections are real fixes, not
padding: the endpoint comment previously asserted "TEACHER is NOT in the
allow-list", which is now false and would mislead the next reader.

**Data & Contract Review — PASS.** Verified by reading, not by trusting the
report:
- `AcademicRecordsRepository.getRecords()` makes exactly **one** `this.http.get`
  plus the pre-existing injected subject-catalogue collaborator. **No new call,
  no second request, no client-side probe** was added anywhere — confirmed by
  grepping the whole feature. This is the single most important negative in a
  story like this: a "does this student have ANY records" probe would itself be
  the scope leak the packet's NOT-in-scope section forbids, and it is absent.
- `buildAcademicRecordVM()` has no "empty means forbidden" shortcut. Its only
  `forbidden` return (line 43) is the pre-existing `SELF_MEMBER_ID` self-id
  resolution guard, unreachable on the teacher route (which passes a real
  `studentId`). A successful empty read flows to
  `{ record: {years: []}, selectedYearId: null, error: null }`.
- **The forbidden branch is NOT weakened.** `git diff` of
  `academic-records.repository.test.ts` shows **zero deleted lines** — the
  failure matrix (`ACADEMIC_RECORD_FORBIDDEN`/`ROSTER_ACCESS_FORBIDDEN` 403 →
  `forbidden`) is untouched and green, and the screen still renders its
  `role="alert"` error block for it. Failure mapping remains by `error.code`/
  status, never by message.

**Design System & i18n — PASS.**
- Zero token/markup change: the empty-state block is the same dashed-border
  card with `border-border`/`bg-card`/`text-muted-foreground`. No raw colour
  introduced (none in the diff at all).
- **i18n parity mechanically verified**, not eyeballed: a recursive key-flatten
  of both message files gives **3621 keys in vi, 3621 in en, empty symmetric
  difference**, with both new keys present in both locales in the same commit.
- **Type-safety of the dynamic key PROVEN by negative test.** The concern with
  `t(\`${emptyKey}.title\`)` is that it silently degrades to `string`. It does
  not. I temporarily renamed the union member to `"empty.bogusKeyNotInMessages"`
  and re-ran `bunx tsc --noEmit`, which failed exactly as it should:
  `error TS2345: Argument of type '"empty.title" | "empty.bogusKeyNotInMessages.title"' is not assignable to parameter of type 'NamespacedMessageKeys<…>'`
  — two errors, one per call site. The template literal over a literal union
  distributes into a checked union of message keys, so this satisfies
  `.claude/rules/i18n.md`'s "no raw string into `t()`". The file was restored
  (`git diff --stat` clean on it afterwards).
- **Copy is accurate under BOTH readings** — the key correctness question, since
  BE gives no signal separating "genuinely 0 records" from "0 authorized
  records". vi title "Không có học bạ nào bạn được xem" is scoped to what the
  viewer may see, so it stays true when the student genuinely has none. The
  description hedges with "**có thể** có học bạ ở lớp khác" ("may hold records
  in other classes"), not an assertion that such records exist — so it does not
  overclaim in the genuinely-empty case either. Critically, the generic
  `academicRecord.empty.description` ("Chưa có bản ghi học bạ nào…") is exactly
  the sentence that WOULD be false for a scoped teacher, and it is correctly no
  longer shown to them. en mirrors the same hedge.

**Security Review — PASS (no findings).** This is the dimension that matters
most in this lane, so stating the negatives explicitly:
- No new RBAC surface. `emptyStateCopyKey` is a *copy* selector — it gates a
  sentence, not data or an action. Authorization remains entirely BE-side; FE
  sends no role parameter.
- **No new write affordance for TEACHER.** Read
  `academic-record-screen.tsx` end to end: the only seal-related elements are
  the read-only `SealStatusBadge` (record- and term-level) and the
  `UNSEALED` informational banner. There is no seal/unseal button, menu, or
  handler in this screen at all, for any role — nothing became reachable that
  was not before. `makeSealRepository()` and the seal repositories are
  untouched.
- No PII added to the client. The copy references no student identity, no class
  name, no memberId. Notably it also does not leak *which* classes exist or how
  many records were filtered out — the message is deliberately non-enumerating,
  which is the right call for a scoped read.
- No secrets, no `dangerouslySetInnerHTML`, no redirect, no storage write.

**Test Coverage — PASS.** Proof is meaningful, not ceremonial. The repository
regression pins `records: []` → `toEqual({ok:true, data:{…, years: []}})`, which
would fail loudly if anyone reintroduced a "no rows ⇒ not allowed" shortcut. The
VM test asserts `error === null` on a teacher empty read — it genuinely would
have failed under the pre-ADR-0136 assumption. The `EmptyRecord` story was
strengthened to assert the teacher copy does NOT leak into other roles
(negative assertion), and `TeacherNoHomeroomAccessEmpty` asserts both the
teacher copy present and `queryByRole("alert")` absent, which is the precise
"empty is not an error" guarantee. Tests are deterministic (no clock/random).

**Design-review gate — sign-off that a full `/impeccable` pass is NOT required.**
Reasoning, per `docs/DESIGN_REVIEW.md` scope: the rendered diff is two text
nodes inside the *existing* empty-state block. No new component, no new layout,
no new token, no spacing/hierarchy/state change — the markup, class list, and
element structure are byte-identical to the US-E18.54-audited block; only the
i18n key feeding the two `<p>` elements varies by role. The one new Storybook
story renders that same block. `fe-accessibility-auditor` independently returned
PASS with zero findings on the same branch, including confirming no new ARIA and
correct non-alarming semantics (no stray `role="alert"` on a success response) —
screen-reader announcement is unchanged in kind, only in wording. `fe-lead` may
treat this as a **minor content change** and close without a full gate pass. If
the copy length ever grows enough to reflow the card, revisit.

**Required Changes:** none blocking.

- `[CONSIDER]` `academic-record-screen.i-vm.ts:19` — `roleBadgeKey()` returns
  `string`, which forces the `as never` escape hatch at
  `academic-record-screen.tsx:57` to satisfy `t()`. Pre-existing, out of this
  US's scope, but the new `emptyStateCopyKey()` demonstrates the better pattern
  (literal-union return → compile-checked key, no cast). Worth aligning
  `roleBadgeKey` to a `"STUDENT" | "TEACHER" | "PARENT" | "ADMIN"` return in a
  future hygiene pass to delete the last `as never` in this screen.
- `[CONSIDER]` `academic-record-table.tsx:118` — the Storybook run surfaces a
  pre-existing React DOM-nesting warning, `<tfoot> cannot contain a nested <p>`.
  Untouched by this US (the table file is not in the diff) and not a regression,
  but it is noise in this feature's test output and should get its own hygiene
  item.

**Verification commands I personally ran** (all on
`feat/us-e18.57-teacher-homeroom-scoped-record-read`, branch confirmed via
`git branch --show-current` first):

| Command | Result |
| --- | --- |
| `git diff main...HEAD -- src/bootstrap/di/academic-records.di.ts` | **empty** — DI byte-identical, as predicted |
| `git diff main...HEAD -- …/mocks/academic-records.mock.repository.ts` | **empty** — mock untouched |
| `git diff main...HEAD -- …/academic-records.repository.test.ts \| grep '^-'` | **zero deletions** — forbidden matrix untouched |
| `bunx tsc --noEmit` | clean (exit 0) |
| `bunx tsc --noEmit` with a deliberately bogus key injected | **2 expected TS2345 errors** — proves `t()` is compile-checked; file restored |
| `bun vitest run` | **518 files / 4086 tests passed** (baseline 517/4079) |
| `bun vitest run --testNamePattern="seal\|Seal\|unseal\|Unseal"` | 15 files / **143 tests passed** |
| `bun vitest run src/features/academic-records` | 18 files / **191 tests passed** |
| `bunx vitest run --config vitest.storybook.mts` | **163 files / 1286 tests passed** (was 1285, +1 new story) |
| `bun lint` | clean — same 1 pre-existing warning + 1 info in `messaging/`, unrelated |
| `bun run build` | green; teacher academic-record route present as `ƒ` (dynamic) |
| i18n key-flatten parity script (vi vs en) | **3621 = 3621**, empty diff both directions; both new keys in both locales |
| grep for new HTTP calls / probes in the feature | **none** — one `http.get` + the pre-existing subject-catalogue collaborator |
