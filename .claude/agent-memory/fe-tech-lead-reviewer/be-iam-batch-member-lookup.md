---
name: be-iam-batch-member-lookup
description: IAM GET /members?ids= tiered batch lookup contract + the one client that may call it
metadata:
  type: reference
---

`GET /api/v1/members?ids=` (`iam`, openapi.yaml ~L535, schema `MemberBatchItem` ~L1387).
Verified 2026-08-02 (US-E18.33 review).

- Comma-separated `ids`, **max 50** (`too_many_member_ids` = 400 above it).
- **TIERED by caller role (ADR-0120)**: staff tier (SUPER_ADMIN platform role, or tenant
  ADMIN/MANAGER/TEACHER) → `memberId+displayName+email+roles`; every OTHER tenant member
  (STAFF/STUDENT/PARENT) → `memberId+displayName` ONLY, the other keys **ABSENT** from the
  JSON. Field presence IS the tier signal → a mapper must spread `email`/`roles`
  conditionally, never materialise `email: undefined`.
- `dob`/`gender` = staff-tier-only PII (ADR-0122), also optional per user → never usable as a
  tier probe, and deliberately NOT declared in the web DTO.
- Not an existence oracle: unknown / malformed / other-tenant ids are silently omitted.
  Callers must own a raw-id fallback.
- **One client only**: `iam-directory`'s `BatchResolveMembersUseCase` (chunks ≤50, dedups,
  drops empties). Never accept a second batch-lookup client in a review.

Companion roster read: `core` `GET /api/v1/members/{memberId}/linked-students` →
`{ links: LinkedStudentItemResponse[] }` (object, NOT a bare array, not paginated).
Row = `linkId, parentMemberId, studentMemberId, createdAt, classId?, className?` —
**no display name at all**. PARENT may only pass its OWN memberId (else 403
`PARENTLINK_FORBIDDEN`); ADMIN/MANAGER/SUPER_ADMIN any member. `classId`/`className`
absent ≡ null (US-148 D5).

Beware: `features/parent-links`' `ParentConsentRepository` casts this SAME URL to a bare
`LinkedStudentResponseDto[]` with a `fullName` the wire never sends — stale drift
(see [[recurring-violations]] "two features casting the SAME URL").
