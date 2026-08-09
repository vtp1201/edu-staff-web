# 0074 Read `memberId`, never `sub`, for anything core owns

Date: 2026-08-09

## Status

Accepted

## Context

Every id core keys its records by is a MEMBER id — `homeroomTeacherId`,
`studentMemberId`, `teacherMemberId`, `authorMemberId`, `approverMemberId`. The
web read the JWT `sub` claim for these comparisons instead, which worked on the
demo data and would have kept working: BE confirmed (reply 2026-08-09, ask #3)
that a member id **equals** the user id by design — `iam.members` is keyed by
the composite `(tenant_id, user_id)` and there is no surrogate member id.

So the two claims carry the same VALUE. They do not carry the same MEANING:

- `memberId` exists only on a **tenant-scoped** token (minted by
  `POST /iam/api/v1/members/switch-tenant`). Reading it is itself the proof that
  the session has a tenant context.
- `sub` is present on the pre-switch token too. Code that compares `sub` also
  "works" on a session with no tenant scope — which is exactly the shape of bug
  that shows nothing and reports nothing.

This surfaced live: the teacher's homeroom filter compared `sub` against
`homeroomTeacherId`. It matched only because the two ids coincide; on a
deployment where they did not, a teacher would silently lose every homeroom
class with no error anywhere.

## Decision

Client code MUST read the `memberId` claim (`decodeMemberId()` in
`bootstrap/lib/jwt.ts`) whenever it compares against, or sends, any `*MemberId`
field of `core`. `decodeSubClaim()` is for identifying the USER (IAM-scope
concerns), not for addressing core records.

`decodeMemberId()` falls back to `sub` for tokens minted before IAM added the
claim — a compatibility shim, not an invitation to rely on the equality.

Consequence: if IAM ever introduces a surrogate member id, no call site changes.

## Verification

- `decodeMemberId` is what `attendance.di.ts`, `teacher-class.di.ts`,
  `timetable-view.di.ts` and `parent-consent.di.ts` pass into their
  repositories; `grep -rn "decodeSubClaim" src/bootstrap/di` returns only
  user-scope call sites.
- Live: a teacher token's `memberId` matches `homeroomTeacherId` on
  `GET /core/api/v1/classes`, and the attendance screen lists that class.

## Related

- BE reply `docs/reports/2026-08-09-be-to-fe-reply-teacher-live.md` §#3.
- `.claude/rules/api-integration.md` §Auth flow.
