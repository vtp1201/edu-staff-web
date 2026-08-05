# US-E18.43 Sealed-students listing real (BE US-183)

## Status

implemented

## Lane

normal

## Dependencies

- Depends on: none (BE US-183, merged `edu-api` main `1042aa94`, 2026-08-05)
- Blocks: none
- Feature module(s) chạm: `src/features/academic-records/` (seal/unseal sub-surface only)
- Shared contract/file: `ACADEMIC_RECORDS_EP`, `IAcademicRecordsSealRepository`, `iam-directory`'s `BatchResolveMembersUseCase` (already composed in `academic-records.di.ts`)

## Ground truth (fe-lead, verified before delegating)

`docs/reports/2026-08-05-be-to-fe-response.md` §"#21 (phần còn lại — sealed-students) → US-183":
new route `GET /core/api/v1/classes/{classId}/terms/{termId}/academic-records/sealed-students`
(ADMIN/SUPER_ADMIN) → `data: [{studentMemberId, sealedAt, sealedBy,
resealCount}]` — subset currently SEALED of the class roster, unpaginated.
**This closes only the LISTING half of ask #21.** The audit-trail half stays
as-is: BE confirmed the data model keeps only the latest seal cycle
(`sealedAt`/`sealedBy` + `resealCount`) plus the existing unseal-requests
history (US-150, already wired US-E18.24) — there is NO multi-cycle
seal/unseal event log. Do NOT model UI as if a fuller audit trail exists;
`getSealAuditTrail` stays permanently mocked (no wire source at all, separate
from this endpoint) — untouched by this story.

## Current state (read before touching anything)

- `src/features/academic-records/domain/repositories/i-academic-records-seal.repository.ts`
  — `listSealedStudents(filter?: Partial<SealBatchKey>)` returns
  `SealResult<SealedStudentOption[]>`.
- `src/features/academic-records/infrastructure/repositories/academic-records-seal.repository.ts`
  — `listSealedStudents()` currently `return this.notImplemented()` (permanent
  stub, doc-commented as "no endpoint exists"). **That comment block (lines
  ~114-121, "listAvailableClasses, getSealAuditTrail, listSealedStudents and
  listTenantAdmins remain PERMANENTLY dormant") is now WRONG for
  `listSealedStudents` specifically** — update it; the other 3 stay dormant
  for their own, still-valid reasons.
- `src/features/academic-records/infrastructure/dtos/seal-response.dto.ts`'s
  `SealedStudentResponseDto` (`{studentId, studentName, classId, term, year,
  sealedAt}`) is a MOCK-ERA INVENTED shape that does NOT match the real wire
  at all (no `studentName`/`classId`/`term`/`year` on the real response, and
  `studentId` is actually `studentMemberId`, plus real adds `sealedBy` +
  `resealCount` which the invented DTO never had). **Do not reuse this DTO for
  the real path** — either add a distinct real DTO or replace it outright
  (check if the mock repository still needs the old shape; if so keep both,
  clearly separated, same precedent as other US's in this epic that kept an
  invented mock DTO alongside a new real one).
- `SealedStudentOption` (domain entity, `seal-batch.entity.ts:183`) is the
  boundary shape the picker (`unseal-initiate-form.tsx`) actually consumes:
  `{studentId, studentName, classId, term, year, sealedAt}`. The real mapper
  must PRODUCE this shape from the real response:
  - `studentId` ← `studentMemberId`.
  - `classId`/`term`/`year` ← already known by the CALLER (same as
    `SealStatusRollup`'s precedent, "the wire response is key-less, caller
    already knows the key") — fill these from the `filter`/key params passed
    in, not from the response.
  - `studentName` ← has NO source on this response. Resolve via the SAME
    `resolveMembers`/`BatchResolveMembersUseCase` composition this repository
    already receives via its constructor (used today for unseal-request actor
    names — check `unsealRequestSummaryMapper`/how `resolveMembers` is
    threaded in). This is an ADMIN/SUPER_ADMIN-only endpoint, so the caller is
    STAFF-tier — the batch lookup returns `displayName` for these ids (no
    tier-narrowing concern here, unlike a PARENT/STUDENT caller elsewhere in
    this epic).
  - `resealCount`/`sealedBy` (new real fields) — add to `SealedStudentOption`
    if the picker UI can use them (check `unseal-initiate-form.tsx` — if it
    doesn't render them, decide whether to add now or leave for a future UI
    story; document your choice).
- ⚠️ **Reachability caveat — read the existing doc-comment on
  `AcademicRecordsSealRepository` (lines ~123-128) before declaring this
  "done".** It says `SealBatchKey.term` is a LABEL ('HK1'/'HK2'), NOT a real
  `termId` (UUID), and the class/term SELECTOR (`listAvailableClasses`) is
  itself permanently mock-sourced (no BE endpoint) — so even the 5
  already-real methods (`sealBatch`, `getSealStatus`, etc.) are "not
  meaningfully reachable end-to-end" until that selector is wired to a real
  term feature. Wiring `listSealedStudents`'s HTTP call for REAL is still
  correct and worth doing (matches its 5 siblings, and the real termId format
  will be needed whenever the selector IS eventually fixed), but you MUST
  carry the SAME caveat forward in your doc-comment — do not claim end-to-end
  reachability that doesn't exist. This is not a new gap you're expected to
  close; it's pre-existing and out of scope here.

## Scope

1. Wire `listSealedStudents()` in `AcademicRecordsSealRepository` to
   `GET /classes/{classId}/terms/{termId}/academic-records/sealed-students`
   (add the endpoint constant to `ACADEMIC_RECORDS_EP`, replacing the dead
   `sealedStudents: () => "/core/api/v1/academic-records/sealed-students"`
   constant with the real path shape — classId/termId path params, not a
   standalone path).
2. Map the real response to `SealedStudentOption[]` per the rules above
   (batch-resolve `studentName`, fill `classId`/`term`/`year` from the known
   key, never throw on a failed name lookup — same defensive pattern as every
   other batch-resolve composition in this repo, empty/placeholder name on
   failure, not an error).
3. Extend `toSealFailure()` with whatever error codes this specific endpoint
   can return (ground-truth against `services/core/docs/{openapi.yaml,ERROR_CODES.md}`
   — likely just the shared `ACADEMIC_RECORD_FORBIDDEN`/`ACADEMIC_RECORD_NOT_FOUND`
   already handled generically, confirm no new code is needed).
4. `HybridAcademicRecordsSealRepository` — remove `listSealedStudents` from
   its mock-delegated set; route it to the real repo like the other 5. Update
   its doc-comment (currently says 4 methods delegate to mock — now 3).
5. Fix the stale doc-comment on `AcademicRecordsSealRepository` (§"Current
   state" above) AND on `academic-records.endpoint.ts` (says "remaining
   constants stay permanently unreachable... sealedStudents" — no longer
   true for this one).
6. Keep `MockAcademicRecordsSealRepository.listSealedStudents` working for
   `USE_MOCK=true` — no change needed unless the entity shape gained new
   fields (`resealCount`/`sealedBy`) that the mock should also populate for
   consistency.

## NOT in scope

- `listAvailableClasses`, `getSealAuditTrail`, `listTenantAdmins` — stay
  permanently mocked, untouched, for their own documented reasons.
- Fixing the class/term-selector reachability gap — out of scope, no BE ask
  filed for it in this batch, do not invent work here.
- The read-only viewer (`academic-records.di.ts`'s `makeRepository()`) —
  unrelated, permanently mock, untouched.

## Acceptance Criteria

- Real mode: `listSealedStudents` calls the real endpoint and returns
  correctly-mapped `SealedStudentOption[]` (with resolved student names where
  the batch lookup succeeds).
- `USE_MOCK=true` unchanged.
- Doc-comments no longer claim `listSealedStudents` has no BE endpoint.
- The reachability caveat (term-label vs real termId) is preserved/updated in
  the doc-comment, not silently dropped.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | mapper test (real DTO → `SealedStudentOption`, batch-resolve success/failure), repository test |
| Integration | `HybridAcademicRecordsSealRepository` routing test (real not mock for this method now) |
| E2E | none new — no UI change beyond whatever new fields you decide to surface |
| Platform | `bun vitest run` zero-regression, `bun run build` mock+real |
| Release | merged to main, branch deleted |

## Harness Delta

- TEST_MATRIX row for sealed-students listing real-mode.
- Partially close ask #21 in the FE→BE report (listing half only — audit-trail half stays open).
- EPIC-OVERVIEW.md Wave 6 row.

## Evidence

### Ground truth re-verified (edu-api `main`)

`services/core/docs/openapi.yaml:4081` —
`GET /api/v1/classes/{classId}/terms/{termId}/academic-records/sealed-students`,
`operationId: listSealedStudents`, ADMIN/SUPER_ADMIN, responses `200` /
`401 Unauthorized` / `403 Forbidden` **only** (no 404, no 422 — nothing to add to
`toSealFailure`; the existing generic `ACADEMIC_RECORD_FORBIDDEN`/403 branch plus
the 404/5xx fallbacks cover it, confirmed by the new table test). Description
confirms: currently-SEALED subset of the roster, latest-seal-cycle metadata,
residue rows for un-enrolled students excluded, **unpaginated** (no cursor to
drain, so no `raw: true` and no exposure to that bug class).
`SealedStudentResponse` (`openapi.yaml:10822`) —
`required: [studentMemberId, sealedAt, sealedBy, resealCount]` with `sealedAt`
and `sealedBy` **nullable**. Same doc explicitly states there is no multi-cycle
seal event log → `getSealAuditTrail` is not merely un-shipped, it is
unimplementable; that is now written into the endpoint file + repo + DI comments.

### What was built

- **New real DTO** `SealedStudentListItemDto`. The pre-existing
  `SealedStudentResponseDto` was mock-era invention (no `studentName`/`classId`/
  `term`/`year` on the wire, `studentId` is really `studentMemberId`, and the real
  payload adds `sealedBy`/`resealCount`). It is NOT reused for the real path; it
  is kept in place, doc-commented as dead mock-era documentation (no code path
  reads it — the mock repository returns `SealedStudentOption` fixtures directly
  and never went through a DTO), matching the precedent of other US's in this epic.
- **`sealedStudentMapper(dto, key, nameMap)`** — rewritten. `studentMemberId` →
  `studentId`; `classId`/`term`/`year` re-attached from the CALLER's
  `SealBatchKey` (the wire row is key-less, exactly like `SealStatusResponse` /
  `sealStatusRollupMapper`); `studentName` from `nameMap` with a raw-id fallback,
  the same convention as `unsealRequestSummaryMapper`.
- **Name resolution reuses the EXISTING composition** — no second batch-lookup
  client. `AcademicRecordsSealRepository` already receives the optional
  `MemberNameResolver` (wired in `academic-records.di.ts` from
  `makeBatchResolveMembersUseCase()`, IAM US-144); `listSealedStudents` calls the
  same private `memberNameMap()` helper as `getPendingUnsealRequests`: ONE deduped
  batch call for the whole listing, a resolver failure degrades to raw ids and
  never fails the caller, an empty list skips the lookup entirely (all three
  asserted).
- **`sealedBy` / `resealCount` deliberately NOT added to
  `SealedStudentOption`** — the picker renders `name · class · year` plus a
  "sealed <date>" hint and nothing else, and this entity is that picker's boundary
  contract. Documented in the mapper; a future UI story can widen it when it
  actually surfaces them. (Asserted by a key-set test so a silent leak fails.)
- **`SealedStudentOption.sealedAt` widened to `string | null`** — forced by the
  nullable wire field. `unseal-initiate-form.tsx` now guards
  `student?.sealedAt &&` before formatting, so a null date HIDES the hint instead
  of rendering `Invalid Date`; the row stays selectable (dropping a sealed student
  from the unseal picker would hide an actionable row).
- **Incomplete key ⇒ honest failure, zero HTTP.** The endpoint is class+term
  path-scoped. `listSealedStudents(undefined | {classId} | {term})` returns
  `{type:"not-found"}` and performs NO request, rather than faking an empty picker.
- **Hybrid facade**: `listSealedStudents` moved from the mock set to the real set
  (6 real / 3 mock); doc-comment, DI-factory comment, endpoint-file header and the
  repository/test headers all re-counted. `listAvailableClasses`,
  `getSealAuditTrail`, `listTenantAdmins` untouched and still mocked.
- **Mock repository unchanged** (behaviorally). It keeps its tenant-wide
  filter-optional listing — that is what the screen's caller expects offline — and
  now carries a doc-comment stating the divergence from the real path instead of
  hiding it.

### ⚠️ Reachability caveat — PRESERVED (explicitly, per the packet)

I did NOT find any reason to revise it; I carried it forward verbatim and
extended it. `SealBatchKey.term` is still `'HK1'`/`'HK2'` — a LABEL, not a termId
UUID — and the class/term selector that feeds it (`listAvailableClasses`) is
itself permanently mock-sourced, so `listSealedStudents` is now
**real-but-not-reachable-end-to-end, exactly like its five real siblings**. That
sentence lives in four places: the `AcademicRecordsSealRepository` class comment
(rewritten to say "applying to ALL SIX real methods — `listSealedStudents`
inherits it unchanged"), the hybrid facade's method comment, the DI factory
comment, and the endpoint constant's comment. Nowhere does this story claim
end-to-end reachability.

I also recorded a SECOND, narrower reachability fact I hit while wiring (not a new
gap to fix, per the packet — flagged for `fe-lead`): the screen's caller
(`academic-record-seal-container.tsx:113`) calls `actions.listSealedStudents()`
with **no filter** and keys the query un-scoped, because the mock served a
tenant-wide list. The real endpoint cannot serve that shape, so in real mode the
call now fails `not-found` with no HTTP request. Scoping that query to the
selected class/term (plus `enabled: classId !== null`, mirroring `pendingQuery`)
would be the fix, but it is a UI-behavior change (it would also narrow the mock
picker) and it would NOT make the call reachable while `term` is a label — so it
is deliberately out of scope here. Note also that the container never surfaces
this query's error state (`data ?? []` + `isPending` only), so a failure shows an
empty picker — a pre-existing UI gap, unchanged by this story.

### Proof (run in this worktree)

- `bunx tsc --noEmit` — clean.
- `bun vitest run` — **478 files / 3569 tests pass**, zero regression. Honest
  note: across four full-suite runs, two runs showed 1–2 failures, both
  5000ms-timeouts in UNRELATED RSC page tests
  (`app/[locale]/t/[tenant]/(app)/(shared)/feed/page.test.ts`,
  `.../admin/parent-links/page.test.ts`) — load-dependent pre-existing flakes;
  both pass in isolation (8/8) and neither touches `academic-records`.
- `bunx vitest run --config vitest.storybook.mts src/features/academic-records`
  — 36/36 pass.
- `bun lint` — clean for every touched file (same 1 pre-existing unrelated
  warning + 1 info in `features/messaging/.../message-context-menu.tsx`).
- `NEXT_PUBLIC_USE_MOCK= bun run build` **and** `NEXT_PUBLIC_USE_MOCK=true bun run
  build` — both green.

### For `fe-lead`

- Ask #21: close the LISTING half only; the audit-trail half is not "pending BE",
  it is **unimplementable** as specified (no multi-cycle event log) — worth
  restating that way in the report rather than leaving it as an open ask.
- EPIC-OVERVIEW.md Wave 6 row + the container-scoping follow-up above.
