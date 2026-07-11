# US-E18.2 Staffing wiring — departments/position-titles/assignments real contract remap

## Status

in-progress

## Lane

normal

## Dependencies

- Depends on: US-E18.0 (gateway smoke, proof-of-pattern — implemented), reads
  the reusable "BE-wiring remap" pattern from US-E18.1 (calendar).
- Blocks: none
- Feature module(s) chạm: `src/features/admin/staffing/` (domain entities,
  infrastructure DTOs/mapper/repository, mock repo + fixtures, presentation
  error i18n + one derived-name fallback — no screen/layout change)
- Shared contract/file: `bootstrap/endpoint/staffing.endpoint.ts` (paths
  already match, no change), `bootstrap/di/staffing.di.ts`,
  `messages/{vi,en}.json` (`staffing.errors.*` namespace, additive keys only)

## Product Contract

`src/features/admin/staffing/infrastructure/repositories/staffing.repository.ts`
was written mock-first (US-E06.8/US-E12.9) against a *guessed* shape of
`core`'s staffing API. The epic audit labeled this cluster "MATCH" at the
**path** level only (paths are in fact correct — confirmed against
`edu-api/services/core/docs/openapi.yaml` lines 1543-1998). Re-reading the
actual `DepartmentResponse`/`PositionTitleResponse`/`PositionAssignmentResponse`
schemas found **substantial DTO-shape and semantic drift**, larger than
US-E18.1's calendar cluster:

1. **`Department.conceptLabel` (single field) vs BE's two fields**:
   `conceptLabelSuggested` (enum `BO_MON|TO|KHOA`, nullable) +
   `conceptLabelCustom` (free text, nullable) — BE keeps the platform hint and
   the tenant's custom override as two independent fields (custom takes
   precedence when set). Decision: **domain entity gains both fields**
   (`conceptLabelSuggested`, `conceptLabelCustom`) replacing the single
   `conceptLabel`; presentation's existing "effective label" display logic
   becomes `conceptLabelCustom ?? conceptLabelSuggested ?? null` — grep
   `presentation/staffing-departments-screen/` for every `conceptLabel` read
   before assuming a single call site.

2. **`activeAssignmentCount` does not exist on either `DepartmentResponse` or
   `PositionTitleResponse`.** It is used in both list screens to (a) badge a
   row as "cannot archive" before the user tries, and (b) interpolate a count
   into the archive-confirmation dialog copy
   (`staffing-departments-screen.tsx:297/318`,
   `staffing-position-titles-screen.tsx:340/361`). Because this is an
   interpolated **integer**, not just a boolean guard (unlike US-E18.1's
   `hasGrades`, where "always false + rely on the real 409" was an acceptable
   softening), prefer a **real derivation**: the real repository's
   `listDepartments`/`listPositionTitles` should page through
   `GET /position-assignments?status=ACTIVE` (BE has no `positionTitleId`
   filter, and no per-department bulk filter is needed either — page once,
   fully, via `cursor`/`hasMore` until exhausted) and build two count maps
   (`Map<scopeEntityId, count>` for departments,
   `Map<positionTitleId, count>` for position titles) shared across both list
   calls in the same request when possible. If full pagination proves too
   costly/complex to land cleanly in this US, it is acceptable to fall back to
   the US-E18.1 precedent (`activeAssignmentCount` mapped `0` from the wire,
   relying on the real `409 DEPARTMENT_HAS_ACTIVE_ASSIGNMENTS` /
   `409 POSITION_TITLE_HAS_ACTIVE_ASSIGNMENTS` guard at archive time) — but
   this must be an explicit, documented trade-off in Evidence below, not a
   silent shortcut, since it visibly undercounts in the confirmation dialog
   copy.

3. **`PositionTitle.permissions` enum is a completely different taxonomy on
   the wire.** Web's `Permission` union (`MANAGE_SUBJECT_CONTENT`,
   `MANAGE_SCHEDULE`, `MANAGE_CONDUCT`, `VIEW_REPORTS`) only overlaps BE's
   `PositionPermission` enum (`VIEW_SUBJECT_CONTENT`, `MANAGE_SUBJECT_CONTENT`,
   `VIEW_GRADE_DATA`, `APPROVE_LESSON_PLAN`, `VIEW_TEACHER_ASSIGNMENTS`,
   `MANAGE_TEACHER_ASSIGNMENTS`) in one value. **This is a genuine domain-type
   change**, not repository-only: `Permission` must be redefined to the 6 BE
   values, the permission-picker UI (multi-select in
   `create-position-title-sheet.tsx`) keeps its existing widget/pattern but
   swaps its option list, and every `staffing.permissions.<value>` i18n key
   must be replaced 1:1 (remove the 3 stale keys, add the 3 missing ones,
   `VIEW_SUBJECT_CONTENT`/`VIEW_GRADE_DATA`/`APPROVE_LESSON_PLAN`/
   `VIEW_TEACHER_ASSIGNMENTS`/`MANAGE_TEACHER_ASSIGNMENTS` are net-new,
   `MANAGE_SUBJECT_CONTENT` is the only carry-over). BE also enforces
   `422 POSITION_TITLE_INVALID_PERMISSIONS` when `MANAGE_SUBJECT_CONTENT` is
   picked for a `DEPARTMENT`-scoped title — if the picker doesn't already
   filter options by the selected `scopeType`, add that client-side guard (UX
   improvement, not a behavior regression — currently impossible to hit since
   the old enum had no such BE-side rule).

4. **`PositionAssignment.status` values differ**: web's
   `"ACTIVE" | "REVOKED"` vs BE's `"ACTIVE" | "ARCHIVED"` (the `/revoke`
   endpoint transitions status to `ARCHIVED`, same status enum as
   Department/PositionTitle). Repository-only fix: map wire `"ARCHIVED"` →
   domain `"REVOKED"` in the mapper (mirrors calendar's `status`→`isActive`
   translation) — no domain/UI change needed since the meaning is identical,
   only the label BE uses for the terminal state differs.

5. **`scopeEntityType` is required on the wire (`AssignPositionRequest` +
   `PositionAssignmentResponse`) but absent from the web's
   `CreateAssignmentInput`/`PositionAssignment` entities.** The web UI does
   not need a new field: `scopeEntityType` is always fully determined by the
   selected `PositionTitle.scopeType` (`SUBJECT_PARENT` or `DEPARTMENT`) —
   BE requires the pair to match. Decision: derive `scopeEntityType` from the
   position title at the point the real repository builds the
   `AssignPositionRequest` body (`createAssignment(input)` looks up
   `input`'s associated position title's `scopeType`, or the use-case/caller
   already has it in scope from the picker — grep
   `assign-position-sheet.tsx` before choosing where to thread it through) —
   no new UI field, no domain entity field needed on `PositionAssignment`
   itself since it's implied by `positionTitleId`.

6. **`memberName`/`positionTitleName` are computed join fields with NO BE
   equivalent on `PositionAssignmentResponse`** (BE only returns `memberId`/
   `positionTitleId`). Two different resolutions:
   - `positionTitleName` **is** derivable: `GET /position-titles` returns
     `name` — the real repository can build an
     `id → name` map from the position-titles list (same
     `makeStaffingRepository()` instance, one extra list call, or reuse the
     count-derivation fetch from point 2 if sequencing allows) and join it
     onto each assignment.
   - `memberName` has **no available BE source at all** — confirmed by
     reading `edu-api/services/iam/docs/openapi.yaml`: `MemberResponse`
     (`GET /iam/api/v1/tenants/{tenantId}/members`) has only
     `tenantId/userId/roles/status`, **no name field whatsoever**; the only
     schema with `fullName` is `UserProfileResponse`, exposed solely via
     `GET /users/me` (self, not lookupable by arbitrary `userId`). This is a
     genuine cross-repo gap (same shape as the epic's already-known
     `core teachers list` / `students/unassigned` gaps). Decision for this
     US: in real (`!USE_MOCK`) mode, map `memberName` to the raw `memberId`
     (repository-level fallback, clearly commented as a known limitation) so
     the UI does not crash or render blank — do **not** hide the column or
     change the table layout. File the cross-repo ask (§Cross-repo below);
     do not attempt to invent a workaround (e.g. scraping another endpoint)
     — there is none.

7. **New/changed error codes** beyond what's already mapped in
   `staffing.failure.ts` — full `ERROR_CODES.md` "Staffing" section (both the
   Department/PositionTitle/PositionAssignment table and the
   validation/parse-error table) must be covered:
   - Already correctly mapped: `already-exists` (3 codes),
     `has-active-assignments` (2 codes), `invalid-permissions`,
     `member-not-teacher`, `academic-year-not-active`,
     `scope-entity-not-found`, `forbidden` (`POSITION_FORBIDDEN` + generic
     403), `not-found` (3 codes + generic 404).
   - **Missing**: `DEPARTMENT_ARCHIVED` (409, mutation attempted on an
     already-archived department), `POSITION_TITLE_ARCHIVED` (409, same for
     position title), `POSITION_TITLE_NOT_ACTIVE` (409, assignment created
     against a non-ACTIVE position title) — add a new failure type
     `{ type: "archived" }` covering all three (same "mutate a terminal-state
     entity" semantic, distinct from `not-found`).
   - **Missing**: `POSITION_TITLE_INVALID_SCOPE_TYPE` (400) — add
     `{ type: "invalid-scope-type" }` (defensive; UI's picker already only
     emits valid enum values, but must not silently fall to `unknown`).
   - **Missing (defensive/value-object 400s, IDs sourced from prior API
     responses not user input — should not occur in normal use but must not
     silently fall to `unknown`, per US-E18.1 precedent)**:
     `DEPARTMENT_INVALID_ID`, `DEPARTMENT_INVALID_NAME`,
     `DEPARTMENT_INVALID_CONCEPT_LABEL`, `POSITION_TITLE_INVALID_ID`,
     `POSITION_TITLE_INVALID_NAME`, `POSITION_ASSIGNMENT_INVALID_ID`,
     `POSITION_ASSIGNMENT_INVALID_MEMBER_ID`,
     `POSITION_ASSIGNMENT_INVALID_ACADEMIC_YEAR_ID`,
     `POSITION_ASSIGNMENT_INVALID_SCOPE_ENTITY_ID` — bucket these into one
     new `{ type: "validation" }` failure (engineer's call if any deserve a
     more specific type/copy; document the choice in Evidence).
   - `STAFFING_INVALID_TENANT_ID` (400, internal — bad tenant claim) — map to
     `unknown` (not user-actionable, mirrors calendar's internal-error
     handling), do not invent a dedicated UI message for it.

8. **Playbook step 6** (proactive refresh): `staffing.di.ts`'s `makeRepo()`
   real branch must call `await ensureFreshSession()` before
   `createServerHttpClient()` (verify with
   `grep -n ensureFreshSession src/bootstrap/di/staffing.di.ts` — currently
   absent, same gap class as every other cluster before US-E18.0/US-E18.1).

Mock repository (`MockStaffingRepository`) + `fixtures.ts` must be updated so
its shapes don't lie about the real contract: rename `conceptLabel` →
`conceptLabelSuggested`/`conceptLabelCustom` on mock fixtures, update the
`Permission` fixture values to the new 6-value enum, rename assignment
`"REVOKED"` internal representation is unchanged (mock already speaks the
domain entity, not the DTO — same reasoning as calendar's mock, no change
needed there beyond fixture value updates). `memberName`/`positionTitleName`
stay real names in mock fixtures (mock is unaffected by the real-mode
`memberId`-fallback decision — that's a `!USE_MOCK`-branch-only limitation).

UI screens (`staffing-departments-screen.tsx`, `staffing-position-titles-screen.tsx`,
`staffing-assignments-screen.tsx`, the two create sheets, `staffing-screen.tsx`)
are NOT expected to change layout/structure — only: (a) the concept-label
display expression (point 1), (b) the permission picker's option list + i18n
keys (point 3), (c) an optional scope-type-aware permission filter (point 3,
UX improvement only). No new screen, no design-review gate required beyond
confirming these are additive/content changes, not a redesign.

## Relevant Product Docs

- `docs/stories/epics/E18-be-wiring/EPIC-OVERVIEW.md` (playbook, Wave 1 entry)
- `docs/stories/epics/E18-be-wiring/US-E18.1-calendar-wiring/story.md` (the
  reusable remap pattern this US follows: repository-layer fan-out/mapping
  fixes preferred over domain/UI change, except where the wire genuinely
  requires a new domain shape)
- `edu-api/services/core/docs/openapi.yaml` lines 1543-1998 (paths) + 8567-8790
  (schemas) — Departments/PositionTitles/PositionAssignments
- `edu-api/services/core/docs/ERROR_CODES.md` lines 159-208 (Staffing section)
- `edu-api/services/iam/docs/openapi.yaml` lines 1272-1298 (`MemberResponse` —
  confirms no name field), 1373-1401 (`UserProfileResponse` — `fullName`,
  self-only via `/users/me`)
- `.claude/rules/api-integration.md` (envelope/error contract, decision `0008`)

## Acceptance Criteria

- `STAFFING_EP` paths unchanged (already correct).
- `DepartmentResponseDto` gains `conceptLabelSuggested`/`conceptLabelCustom`
  (replacing `conceptLabel`); `Department` domain entity updated to match;
  every presentation read-site updated (grep, don't assume single call site).
- `PositionTitleResponseDto.permissions` (and the domain `Permission` union)
  match the real 6-value BE enum; permission-picker UI option list + i18n
  keys updated 1:1 (3 removed, 5 added/changed, 1 carried over
  `MANAGE_SUBJECT_CONTENT`).
- `PositionAssignmentResponseDto.status` (`ACTIVE|ARCHIVED`) is mapped to the
  domain's `ACTIVE|REVOKED` in the mapper; no domain/UI type change.
- `scopeEntityType` is correctly derived/sent on `createAssignment` (matches
  the selected position title's `scopeType`) without adding a new UI field.
- `activeAssignmentCount` is either (a) derived via a real, paginated
  `position-assignments?status=ACTIVE` count-map fan-out shared across
  `listDepartments`/`listPositionTitles`, or (b) explicitly documented in
  Evidence as `0`-from-wire with reliance on the real `409` archive guard
  (US-E18.1 precedent) — not silently dropped either way.
- `positionTitleName` is joined from a real `position-titles` lookup in the
  real repository; `memberName` falls back to the raw `memberId` in real mode
  with a code comment documenting the cross-repo gap (§Cross-repo below) —
  neither field crashes or renders blank.
- All `Staffing` `ERROR_CODES.md` codes (both tables, ~24 codes) are mapped to
  a `StaffingFailure` variant (branch on `error.code`, never message);
  `archived`, `invalid-scope-type`, `validation` are new variants as needed.
- `staffing.di.ts`'s real branch calls `await ensureFreshSession()` before
  `createServerHttpClient()` (playbook step 6).
- New/changed failure variants + permission enum values have `vi`/`en` i18n
  keys (typed, both files updated same commit).
- Zero regression: full `bun vitest run` + `tsc --noEmit` + `bun run build`
  stay green; existing Storybook/component tests for all 4 staffing screens
  pass (update fixture literals in `.stories.tsx` for the new `Permission`
  enum + concept-label fields, this is fixture maintenance, not a behavior
  change).
- New unit tests cover: DTO→entity mapping for all 3 entities (concept-label
  split, permission enum, status rename), every new/changed failure-code
  branch, the `activeAssignmentCount`/`positionTitleName` derivation logic,
  and the `memberName` fallback.
- Smoke (best-effort, error-path only — no `SUPER_ADMIN` seed per US-E18.0
  finding #5): at least one real 401/400-class `Staffing`-cluster error
  round-tripped through `:8000` if the BE stack is reachable; if not run,
  state why in Evidence.

## Design Notes

- Commands: `POST /core/api/v1/departments`, `PATCH .../{id}`,
  `POST .../{id}/archive`, `POST .../position-titles`, `PATCH .../{id}`,
  `POST .../{id}/archive`, `POST .../position-assignments`,
  `POST .../{id}/revoke`, `POST .../position-assignments/copy`
- Queries: `GET .../departments` (cursor-paginated), `GET .../{id}`,
  `GET .../position-titles` (cursor-paginated, `status`+`scopeType` filters),
  `GET .../{id}`, `GET .../position-assignments` (cursor-paginated,
  `memberId`/`scopeEntityId`/`academicYearId`/`status` filters — **no**
  `positionTitleId` filter), `GET .../{id}`
- API: `core` service — see Relevant Product Docs
- Tables: none touched directly (BE-owned)
- Domain rules: department/position-title name unique per tenant; permission
  set non-empty + `MANAGE_SUBJECT_CONTENT` only valid for `SUBJECT_PARENT`
  scope; assignment uniqueness key
  `(positionTitleId, memberId, scopeEntityId, academicYearId)`; archive
  blocked while active assignments reference the entity; assignments are
  annual (`academicYearId` must be `ACTIVE`)
- UI surfaces: none new — 4 existing staffing screens unchanged in
  layout/structure; concept-label display expression, permission option
  list, and (if implemented) scope-aware permission filtering are the only
  visible content changes, all additive/corrective not a redesign

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `staffing.mapper.test.ts` (extended — concept-label split, permission enum remap, status rename, count-map/name-join derivation), `staffing.repository.test.ts` (extended — full `Staffing` error-code matrix, `activeAssignmentCount` derivation path, `memberName` fallback) |
| Integration | Repository-level tests above ARE the integration proof (repo↔HTTP boundary, envelope/error mapping) per `docs/TEST_MATRIX.md` convention |
| E2E | None new — existing `.stories.tsx` interaction tests for all 4 screens must stay green (fixture literal updates only, no new interaction) |
| Platform | `tsc --noEmit` clean; `bun run build` green |
| Release | Full `bun vitest run` zero-regression; gateway error-path smoke via `:8000` if BE stack reachable (see Evidence) |

## Cross-repo (file after implementation, mirror into EPIC-OVERVIEW.md)

- IAM's `MemberResponse`/tenant-members-list endpoint has no display-name
  field, and there is no bulk/by-id user-lookup endpoint reachable outside
  `/users/me` (self). The Staffing Assignments screen (and likely other
  screens showing "assigned teacher" by name) cannot resolve a human-readable
  name for an arbitrary `memberId` today. Ask: add `fullName` to
  `MemberResponse` (or a batch `GET /iam/api/v1/users?ids=` lookup) so
  consuming services can join names without an internal-only endpoint.

## Harness Delta

- `US-E18.2` → `status: implemented`, `unit: 1`, `integration: 1`, `e2e: 0`
  (no new UI/E2E), `platform: 1` once proof lands.
- `docs/TEST_MATRIX.md` row added/updated for the staffing cluster noting the
  contract-drift fix; `EPIC-OVERVIEW.md` Wave 1 table footnote added (mirrors
  the US-E18.1 footnote pattern) since "MATCH" undersold the drift here too.

## Evidence

Implemented 2026-07-11 (branch `feat/us-e18.2-staffing-wiring`).

**Drift confirmed + extra drift the analysis missed** (found once the code was touched):

1. Department concept-label split — CONFIRMED. Extra: the departments screen does
   NOT display a concept label anywhere; the only read-site was the create handler
   passing `conceptLabel: null`. So there was no "effective label" display to
   update — just the `CreateDepartmentInput`/entity shape. Added a pure
   `effectiveConceptLabel()` helper (`conceptLabelCustom ?? conceptLabelSuggested ??
   null`) to the entity for the future display, but it is not yet rendered.
2. `activeAssignmentCount` — CONFIRMED absent. Took the **real derivation**
   (option a): a fully-paginated `GET /position-assignments?status=ACTIVE` cursor
   loop builds two count maps (by `scopeEntityId` for departments, by
   `positionTitleId` for titles), applied in `listDepartments`/`listPositionTitles`
   and the single `getDepartment`/`getPositionTitle`/`patch*` (so the archive
   use-case guard reads a real count). Chosen over the `0`-from-wire fallback
   because it feeds an interpolated integer in the archive-confirm dialog copy.
   Cost: one extra paginated fetch per list/get call — acceptable for a low-volume
   admin panel.
3. `Permission` 6-value enum — CONFIRMED. Redefined the union, updated both
   `PERM_LABEL_KEY` maps (picker + table) + `ALL_PERMISSIONS`; replaced the 3 stale
   i18n keys with 5 new (`MANAGE_SUBJECT_CONTENT` carried over) in vi+en. The picker
   already filtered `MANAGE_SUBJECT_CONTENT` for non-`SUBJECT_PARENT` scope, so no
   new client guard was needed.
4. Assignment `status` — CONFIRMED. Extra: field is `createdAt` on the wire (not
   `assignedAt`) — mapped `createdAt → assignedAt`. Extra: ids are
   `departmentId`/`positionTitleId`/`positionAssignmentId` (not `id`) — renamed in
   all three DTOs+mapper (same class of drift as US-E18.1's `academicYearId`).
5. `scopeEntityType` — CONFIRMED. Derived repository-side: `createAssignment` does a
   `GET /position-titles/{id}` to read `scopeType` and sends it as `scopeEntityType`
   (and reuses the fetched title's name for the join). No UI/domain field added.
6. `memberName`/`positionTitleName` — CONFIRMED. `positionTitleName` joined from a
   `GET /position-titles` id→name map; `memberName` falls back to the raw `memberId`
   (commented, cross-repo gap filed in EPIC-OVERVIEW §Cross-repo #6). Neither
   crashes/blanks.
7. Error codes — full `Staffing` matrix mapped (both ERROR_CODES.md tables, ~28
   codes). Added `archived` (`DEPARTMENT_ARCHIVED`/`POSITION_TITLE_ARCHIVED`/
   `POSITION_TITLE_NOT_ACTIVE`), `invalid-scope-type`
   (`POSITION_TITLE_INVALID_SCOPE_TYPE`), and one `validation` bucket for the 9
   value-object 400s; `STAFFING_INVALID_TENANT_ID` → `unknown`. Rewrote `toFailure`
   as a `switch` on `error.code`. i18n keys for the 3 new types added to all 3 error
   namespaces (departments/positionTitles/assignments) in vi+en.
8. Playbook step 6 — CONFIRMED absent; wired `await ensureFreshSession()` before
   `createServerHttpClient()` in `staffing.di.ts` `makeRepo()` real branch.

**Trade-off taken for `activeAssignmentCount`:** real fan-out (option a), rationale
above.

**Proof:** `staffing.mapper.test.ts` (9, new) + `staffing.repository.test.ts`
(rewritten/extended — full error matrix, count derivation by scope+title,
pagination-loop, name join, memberName fallback, `scopeEntityType` derivation,
`ARCHIVED→REVOKED`). 60 staffing tests pass; full suite 244 files / 1334 tests pass
(zero regression); `bunx tsc --noEmit` clean; `bun run build` green; `bun lint`
clean for staffing (2 pre-existing warnings in `features/messaging`, untouched).

**Gateway smoke:** NOT run — the BE stack was not reachable (`curl :8000` →
HTTP 000 / connection refused for both `/core/api/v1/departments` and
`/iam/api/v1/users/me`). `make stack-up` was not up in this environment; nothing to
round-trip against. Error-path smoke deferred to when the stack is reachable.

**Mock repo:** updated fixtures to the new shapes (concept-label split, 6-value
permission enum) and the mock `createDepartment`/`patchDepartment` to the split
input; mock keeps real display names (the `memberId` fallback is real-mode-only).

### Review round-trip 1 (tech-lead: REVISION REQUIRED → fixed)

- **Blocking bug found:** in `staffing.repository.ts` all 5 `raw: true` flags were
  nested *inside* the `params` object instead of as a top-level axios config
  sibling of `params`. `isRawCall` (`bootstrap/lib/api-envelope.ts`) reads
  `config.raw` at the TOP level, so with `raw` nested the interceptor would unwrap
  the envelope to its `.data` array *before* the repo's `parseEnvelope` runs → in
  real (`!USE_MOCK`) mode every list/derivation call (`listDepartments`,
  `listPositionTitles`, `listAssignments`, `fetchActiveAssignmentDtos`,
  `fetchTitleNameMap`) would silently fail into `network-error`. The mocked-
  `http.get` unit tests couldn't catch it because they never exercise the real
  interceptor — exactly the class of bug this epic exists to catch.
- **Fix:** hoisted `raw: true` out of `params` to a sibling config key at all 5
  call sites (matches the `calendar.repository.ts` US-E18.1 precedent).
- **Regression guard added (reviewer's CONSIDER, taken):** new describe block in
  `staffing.repository.test.ts` — "real interceptor pipeline (raw-flag placement)"
  — whose `http.get` runs the actual `unwrapResponse` against the config the repo
  passes. Verified it FAILS when `raw` is misplaced (temporarily reintroduced the
  bug → 1 failed) and passes when correct. So a future `raw`-placement regression
  now breaks a test instead of reaching production silently.
- Re-verified after fix: 244 files / 1336 tests pass (2 new guard tests); `bunx tsc
  --noEmit` clean; `bun run build` green. Committed separately as `fix(staffing):`
  (not amended).

**Review round 1 — `fe-tech-lead-reviewer`: REVISION REQUIRED.** One blocking bug:
`raw: true` was nested inside `params` instead of being a top-level axios config key
(sibling of `params`) at 5 call sites in `staffing.repository.ts`
(`fetchAssignmentCounts`, `fetchTitleNameMap`, `listDepartments`,
`listPositionTitles`, `listAssignments`). `isRawCall` in `bootstrap/lib/api-envelope.ts`
only reads `config.raw` at the top level, so with `raw` nested, the interceptor
unwrapped the envelope early and every one of these real-mode calls would have
thrown inside `parseEnvelope` and silently degraded to `network-error` — exactly the
failure class this epic exists to catch, and undetectable by the mocked-`http.get`
unit tests. Everything else (error-code coverage, `activeAssignmentCount` fan-out,
`scopeEntityType` derivation, `memberName` fallback, i18n parity, security, TDD
depth) was Approved-grade on the first pass.

**Fix applied:** hoisted `raw: true` to the top level at all 5 call sites, matching
the `calendar.repository.ts` precedent from US-E18.1. Re-ran full gate after the fix:
`bun vitest run` → 244 files / 1334 tests pass (unchanged); `bunx tsc --noEmit`
clean; `bun run build` green. Sent back to `fe-tech-lead-reviewer` for final sign-off.
