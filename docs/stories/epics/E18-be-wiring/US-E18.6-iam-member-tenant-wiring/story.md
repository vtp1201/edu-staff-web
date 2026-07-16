# US-E18.6 IAM member + tenant wiring — swap to real `iam` contract

## Status

in-progress

## Lane

normal

## Dependencies

- Depends on: US-E18.0 (gateway smoke, proof-of-pattern — implemented).
- Blocks: none.
- Feature module(s) chạm: `src/features/auth/domain/failures/iam-member.failure.ts`,
  `src/features/auth/domain/repositories/i-iam-member.repository.ts`,
  `src/features/auth/infrastructure/{dtos,mappers,repositories}/iam-member*`,
  `src/features/tenant/**` (audit only, no change needed).
- Shared contract/file: `bootstrap/di/iam-member.di.ts`, `bootstrap/di/tenant.di.ts`
  (add `ensureFreshSession`), `messages/{vi,en}.json` (`iamMember.errors.*`
  namespace, rename + additive keys only). No shared file edited by another
  in-flight US.

## Product Contract

`src/features/auth/infrastructure/repositories/iam-member.repository.ts` and
`src/features/tenant/infrastructure/repositories/tenant.repository.ts` were
already flipped to `USE_MOCK ? Mock : Real(http)` (US-E06.4/US-E06.3) — the
epic table's "MATCH" label is correct at the **path** level: every path in
`bootstrap/endpoint/{iam-member,tenant}.endpoint.ts` matches
`edu-api/services/iam/docs/openapi.yaml` exactly (`/iam/api/v1/tenants`,
`/iam/api/v1/tenants/{id}/members`, `/iam/api/v1/members/me/tenants`,
`/iam/api/v1/members/switch-tenant`, invitations, activate/deactivate — no
path drift at all, unlike every other Wave-1 cluster).

The epic table flagged the real risk correctly: **"iam ERROR_CODES.md gần
rỗng — xác nhận taxonomy với BE trước khi map failure."** Reading
`ERROR_CODES.md` alone is not authoritative enough (it documents i18n message
keys, and this repo's convention elsewhere blends both cases defensively) — I
cross-checked the actual Go source
(`services/iam/internal/membership/core/domain/error/member.go`,
`services/iam/internal/tenant/core/domain/error/tenant.go`, and every
`membership/core/application/usecase/*.go`) to confirm the literal
`error.code` string each endpoint emits. Confirmed: IAM's wire `error.code` is
**always the lowercase snake_case i18n key** (`apperror.Conflict("member_already_exists")`
etc.) — never the UPPER_SNAKE guessed codes the old `mapIamFailure` switched
on. Every one of the 7 cases in the old switch was **wrong and would never
match a real response**, silently falling through to `{ type: "unknown" }`
for every real IAM error this repository could ever receive. Fixed:

| Real wire `error.code` | HTTP | Old (never matched) | New `IamMemberFailure` |
| --- | --- | --- | --- |
| `forbidden_action` | 403 | `FORBIDDEN_ACTION` | `forbidden` |
| `member_not_found` | 404 | `RESOURCE_NOT_FOUND` | `not-found` |
| `member_already_exists` | 409 | `USER_EMAIL_ALREADY_EXISTS` | `member-exists` (renamed from `email-exists` — the real conflict is a duplicate `userId` membership, not an email collision; the old name was actively misleading) |
| `member_last_admin` | 409 | `LAST_ADMIN_INVARIANT_VIOLATION` | `last-admin` (kept) |
| `member_tenant_inactive` | 409 | *(unmapped)* | `tenant-inactive` (new — `inviteMember`/`addMember`/`changeRoles` all 409 when the tenant isn't ACTIVE) |
| `member_invalid_transition` | 409 | *(unmapped)* | `invalid-transition` (new — illegal member status transition, e.g. role-change on a `LEFT` member) |
| `invitation_invalid` | 410 | `INVITATION_NOT_FOUND` (404, never fires) | `invitation-invalid` (renamed from `invitation-not-found` — real status is 410 Gone, covers unknown/already-used/revoked token, not just "not found") |
| `invitation_expired` | 410 | `INVITATION_EXPIRED` (never matched — wrong code, and the old switch pointed it at the same "not-found" bucket anyway) | `invitation-expired` (new, now actually distinguishable) |
| `invitation_email_mismatch` | 403 | *(unmapped — F8 mismatch fell through to `unknown`)* | `invitation-email-mismatch` (new) |
| `network-error` (client sentinel) | — | `NETWORK_ERROR` | `network-error` (kept, correct — this one is web's own sentinel, not a wire code) |
| anything else | — | `unknown` | `unknown` (kept) |

`member_suspended` (403, `ErrMemberSuspended`) is defined in the BE domain but
**never thrown by any of the 6 use-cases this repository calls**
(invite/revoke/add/changeRoles/removeMember/acceptInvitation — confirmed by
reading each use-case's `.go` file) — no failure case added for it; documented
here so a future BE change that starts throwing it isn't silently swallowed
without a code review noticing.

**DTO cleanup** (`iam-member-response.dto.ts`): `MembershipSummaryDto` had a
speculative `tenantName?` field and `MemberResponseDto` had speculative
`email?`/`name?` fields — none exist on IAM's real `MembershipSummary`/
`MemberResponse` schemas (confirmed line-by-line against `openapi.yaml`
components). Removed both (dead fields; `MemberResponseDto`/
`InvitationResponseDto` themselves are currently unused — no repository method
parses a member/invitation response body, every mutating call is
fire-and-forget `void` — kept the type declarations for wire-shape
documentation/future use, just corrected their shape).

**`ensureFreshSession()` (playbook step 6)** was not wired into
`iam-member.di.ts` nor `tenant.di.ts` — every method these two DI factories
expose is a protected IAM call (Bearer-token required). Added
`await ensureFreshSession()` before `createServerHttpClient()` in both real
branches, matching the pattern already used in `staffing.di.ts`/
`calendar.di.ts`/`class-management.di.ts`/`admin-roster.di.ts`. No recursion
risk: `ensureFreshSession` → `makeRefreshSessionUseCase` (in `auth.di.ts`),
which does not call back into `ensureFreshSession`.

**Duplication note (not fixed, flagged only):** `IamMemberRepository` in the
`auth` feature and `TenantRepository` in the `tenant` feature both implement
`listMyTenants`/`listMyMemberships` and `switchTenant` against the identical
two endpoints. `IamMemberRepository`'s versions are **currently dead code** —
no Server Action calls `makeInviteMemberAction()` (grepped the whole `src/`
tree; only its own DI file, repository, failure, interface reference it). The
production `select-tenant`/`select-role` flows exclusively use the `tenant`
feature's `TenantRepository`, which already had the *correct* DTO shape (no
`tenantName`) before this US. Not deleting the duplicate now — the broader
`invite/revoke/addMember/changeRoles/removeMember/acceptInvitation` surface on
`IamMemberRepository` looks like intentional scaffolding for a not-yet-built
admin "invite member" screen, and removing `listMyTenants`/`switchTenant` from
it would be an unrelated behavior-narrowing edit outside this US's "swap to
real, zero regression" mandate. Left as a note for whoever builds the
member-invite screen: reuse `ITenantRepository` for the tenant-list/switch
part instead of `IIamMemberRepository`'s copy, or consolidate the two.

No screen/page/component touched — `select-tenant`, `select-role` UI and their
Server Actions are unchanged (they were already correctly wired against the
`tenant` feature). `IamMemberFailure` has zero UI consumers today, so per epic
mandate ("UI không đổi hành vi") the a11y/design-review/QA-E2E gates are N/A —
recorded here.

## Relevant Product Docs

- `edu-api/services/iam/docs/openapi.yaml` (paths 261-613, schemas 1217-1372)
- `edu-api/services/iam/docs/ERROR_CODES.md` (§member, §tenant — insufficient
  alone, ground-truthed against Go source, see above)
- `docs/stories/epics/E18-be-wiring/EPIC-OVERVIEW.md` (playbook + cross-repo asks)

## Acceptance Criteria

- Every `IamMemberRepository` method maps the real IAM `error.code` (lowercase
  snake_case, confirmed against Go source) to the correct `IamMemberFailure`,
  not a guessed/never-matching code.
- `IamMemberFailure` union covers `tenant-inactive`, `invalid-transition`,
  `invitation-expired`, `invitation-email-mismatch` in addition to the
  existing `forbidden`/`not-found`/`last-admin`/`network-error`/`unknown`;
  `email-exists` renamed to `member-exists` (no consumer relies on the old
  name — grepped clean).
- `iamMember.errors.*` i18n keys (vi + en) match the renamed/new failure types
  1:1 — no orphaned or missing key.
- `MembershipSummaryDto`/`MemberResponseDto` in `iam-member-response.dto.ts`
  match the real `MembershipSummary`/`MemberResponse` schemas exactly (no
  speculative fields).
- `ensureFreshSession()` wired into the real branch of both `iam-member.di.ts`
  and `tenant.di.ts`.
- Zero regression on the full test suite; `bun run build` green.
- No UI/behavior change (`select-tenant`/`select-role` untouched).

## Design Notes

- Commands: `inviteMember`, `revokeInvitation`, `addMember`, `changeRoles`,
  `removeMember`, `acceptInvitation`, `switchTenant` (all IAM, `iam-member.di.ts`
  + `tenant.di.ts`).
- Queries: `listMyTenants` / `listMyMemberships`.
- API: `edu-api` `iam` service, prefix `/iam/api/v1/...` (Kong-routed).
- Tables: none touched (frontend only).
- Domain rules: last-admin invariant, tenant-active invariant, invitation F8
  email-match invariant — all now correctly surfaced as typed failures instead
  of silently falling into `unknown`.
- UI surfaces: none (zero UI consumers of `IamMemberFailure` today).

## Validation

`scripts/bin/harness-cli story update --id US-E18.6 --status implemented --unit 1 --integration 1 --e2e 0 --platform 1`

| Layer | Expected proof |
| --- | --- |
| Unit | `iam-member.mapper.test.ts` (new, or extended) — mapper round-trip incl. the trimmed DTO shape |
| Integration | `iam-member.repository.test.ts` — full corrected error matrix (real lowercase codes), `ensureFreshSession` behavior verified at DI level or documented |
| E2E | n/a — no UI change |
| Platform | full suite zero-regression vs baseline (287 files / 1714 tests), `tsc --noEmit`, `bun run build` |
| Release | tech-lead review verdict |

## Harness Delta

- `docs/TEST_MATRIX.md` — add `US-E18.6` row.
- Story status → `implemented` once gate green.

## Evidence

(filled in after implementation — command output pasted here)
