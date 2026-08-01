# US-E18.23 Member-directory wiring (IAM US-144 + core US-149)

## Status

planned

## Lane

normal

## Dependencies

- Depends on: none (BE contracts already merged to edu-api `origin/main`: IAM
  `GET /iam/api/v1/tenants/{id}/members`, `GET /iam/api/v1/members?ids=`;
  core `GET /core/api/v1/conduct/staff-leave-requests?status=` tenant-wide).
- Blocks: none known.
- Feature module(s) chạm:
  - NEW shared `src/features/iam-directory/` (member-directory + batch-lookup
    domain/infra — consumed by the three callers below via their own DI, not
    duplicated 3×).
  - `src/features/admin/class-management/` (`listTeachers` un-mock).
  - `src/features/admin/staffing/` (assignment `memberName` resolution).
  - `src/features/staff-leave/` (audit only — see Design Notes residual gap).
- Shared contract/file: `bootstrap/endpoint/iam-member.endpoint.ts` (add
  directory + batch routes), `bootstrap/lib/mock.ts` (`USE_MOCK` per decision
  `0014`), `docs/stories/epics/E18-be-wiring/EPIC-OVERVIEW.md` (asks #6/#7/#9/#13
  registry rows updated in the same commit).

## Product Contract

Un-mock the three repositories the epic has been carrying as
permanently-or-hybrid mock-first specifically because IAM had no member
listing/lookup: `class-management.listTeachers`, `staffing`'s assignment
member-name display, and (audit only) `staff-leave`'s tenant-wide list.
No new screens, no ViewModel shape change for class-management/staffing —
real data now flows through the exact same contracts. `staff-leave` gets a
documented decision (wire or stay mock) based on whether its residual
`department`/`leaveType` gap (below) is shippable.

## Relevant Product Docs

- `docs/stories/epics/E18-be-wiring/EPIC-OVERVIEW.md` (asks #6, #7, #9, #13)
- `../edu-api/services/iam/docs/INTEGRATION.md` footnote ⁹ (member directory,
  US-144) + `services/iam/docs/openapi.yaml` (`MemberListItem`,
  `MemberBatchItem`, tags `Members`)
- `../edu-api/services/iam/docs/ERROR_CODES.md` (`member_list_forbidden`,
  `too_many_member_ids` — both lowercase, per the existing IAM-caveat
  precedent from US-E18.6)
- `../edu-api/services/core/docs/INTEGRATION.md` (staff-leave tenant-wide list,
  US-149) + `services/core/docs/openapi.yaml` (`StaffLeaveRequestResponse`)

## Acceptance Criteria

### `iam-directory` (new shared module)

- Given a caller whose tenant `memberRoles` include ADMIN/MANAGER/TEACHER,
  When the module lists the tenant member directory with an optional
  `role`/`search` filter, Then it follows `nextCursor` until
  `meta.pagination.hasMore` is `false`, treating short pages (even
  zero-length ones) as **not done** — never stopping early on a short page.
- Given a caller without directory-reader RBAC (STUDENT/PARENT/STAFF), When
  the module lists the directory, Then it surfaces a `forbidden` failure
  mapped from IAM's lowercase `member_list_forbidden` (not `FORBIDDEN`).
- Given a set of ≤50 member ids, When the module batch-resolves display
  names, Then it returns a name (or graceful fallback) only for ids IAM
  actually resolves — unknown/other-tenant/malformed ids are silently
  omitted by BE, never surfaced as a per-id error.
- Given >50 ids requested, When batch-resolving, Then the module either
  chunks the request transparently (≤50 per call) or surfaces `too_many_member_ids`
  as a clear failure — document which and why.

### `class-management.listTeachers`

- Given `USE_MOCK=false` and a caller with directory RBAC, When
  `listTeachers({ search })` is called, Then it queries the real directory
  with `role=TEACHER` (+ `search` forwarded) and returns real `TeacherMember[]`
  — no more permanent mock delegation.
- Given the directory call 403s (RBAC denial) or network-errors, Then the
  existing `ClassManagementFailure` union surfaces the right typed failure
  (extend the union only if a genuinely new failure case is needed).

### `staffing` assignment display names

- Given a `PositionAssignmentResponseDto.memberId`, When the assignments
  screen renders, Then `memberName` resolves via the batch-lookup (not the
  raw `memberId` fallback) whenever the id is resolvable; unresolvable ids
  keep the existing raw-id fallback (documented, not a regression).

### `staff-leave` (audit — wire or document why not)

- Given BE US-149 now offers a tenant-wide `status`-filterable list and
  US-144 offers batch name resolution, When auditing `StaffLeaveRepository`,
  Then either (a) it is wired real with `department`/`leaveType` gracefully
  degraded (documented placeholder, no invented data) and `approve`/`reject`
  pass the now-real `staffMemberId` query param, or (b) it stays mock-first
  with an updated (not stale) blocking rationale + a new cross-repo ask for
  the missing `department`/`leaveType` fields. Either outcome must be
  reflected in `staff-leave.di.ts`'s doc comment and the EPIC-OVERVIEW ask
  #13 row — no silent leave of the stale rationale.

## Design Notes

- Commands: none new (existing use-cases unchanged in shape).
- Queries: `iam-directory` search/batch-lookup use-cases (new); existing
  `listTeachers`/staffing assignment list use-cases unchanged in signature.
- API:
  - `GET /iam/api/v1/tenants/{tenantId}/members?role=&search=&cursor=&limit=`
  - `GET /iam/api/v1/members?ids=a,b,c` (max 50/call, scoped to active tenant
    claim — no tenant id in the path)
  - `GET /core/api/v1/conduct/staff-leave-requests?status=&cursor=&limit=`
    (no `staffMemberId` = tenant-wide, ADMIN/MANAGER/SUPER_ADMIN only, else
    `403 VIOLATION_FORBIDDEN`)
- Domain rules: `memberId === userId` on the list endpoint (no surrogate id);
  `LEFT` members excluded from the list but included in batch lookup
  (historical rows keep names). IAM error codes are raw lowercase on the wire
  (`member_list_forbidden`, `too_many_member_ids`) — map explicitly, do not
  assume UPPER_SNAKE like `core`/`social` (US-E18.6 caveat, still true here).
- UI surfaces: `(app)/admin/classes` (homeroom/teacher picker),
  `(app)/admin/staffing` (assignment list), `(app)/admin/staff-leave`
  (audit only) — confirm exact routes during planning.
- **Residual gap carried forward, NOT closed by this US:** `EnrollmentResponse`
  (admin roster) still has zero display fields and `MemberListItem` still has
  no `dob`/`gender` — ask #9 stays open; do not attempt to wire
  `getClassRoster`/`getSearchPool` under this US.
- **Residual gap carried forward, NOT closed by this US:** PARENT-facing
  child-switcher display names — PARENT gets 403 on both directory endpoints
  (ask #20). Do not wire those.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `iam-directory` use-cases (pagination-until-hasMore-false, RBAC-403 mapping, batch chunking/limit); `class-management` `listTeachers` real-repo test; `staffing` mapper/repository name-resolution test; `staff-leave` decision (wired: repo test; stays mock: unchanged, doc-only). |
| Integration | Repository↔HTTP envelope/pagination/error-code mapping tests (mocked HTTP client) per the above. |
| E2E | Storybook/Playwright only if a ViewModel/UI state genuinely changes (e.g. staff-leave department/leaveType degraded state) — N/A if pure data-source swap with unchanged VM shape. |
| Platform | `tsc --noEmit`, `bun build`, full `bun vitest run`. |
| Release | Design-review gate verdict or explicit N/A rationale; EPIC-OVERVIEW asks #6/#7/#9/#13 rows updated. |

## Harness Delta

- Register story via `harness-cli story add --id US-E18.23 --lane normal`.
- Update `docs/TEST_MATRIX.md` with new rows for `iam-directory` +
  `class-management.listTeachers` + `staffing` name-resolution (+ `staff-leave`
  row updated in place if wired).
- Update `EPIC-OVERVIEW.md` cross-repo request rows #6, #7, #9 (partial —
  note dob/gender still missing), #13 (resolve or refine); add a new ask
  (≥ #41) only if `staff-leave`'s `department`/`leaveType` gap needs a fresh
  BE request.

## Evidence

(added after validation exists)
