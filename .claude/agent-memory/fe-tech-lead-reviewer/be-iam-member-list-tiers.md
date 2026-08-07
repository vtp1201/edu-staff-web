---
name: be-iam-member-list-tiers
description: IAM LIST endpoint /tenants/{id}/members — staff vs narrowed tier, required role filter, and the two distinct 403s (ADR 0129)
metadata:
  type: project
---

`GET /iam/api/v1/tenants/{id}/members` (the LIST endpoint) is TIERED since BE US-190 /
ADR 0129 (amends 0120).

- **Staff tier** (SUPER_ADMIN, or tenant ADMIN/MANAGER/TEACHER) — full row, unchanged.
- **Narrowed tier** (STAFF/STUDENT/PARENT): `role=` is **REQUIRED** and restricted to
  `ADMIN|MANAGER|TEACHER|STAFF`; `search=` matches `displayName` only; the row carries
  **only** `memberId`/`userId`/`displayName` — `email`/`roles`/`status` keys are ABSENT
  (branch on presence, never `?? ""`).
- TWO distinct 403s, never collapse them: `member_list_role_filter_required` (narrowed
  caller, missing/disallowed `role=` — an FE wiring bug) vs `member_list_forbidden`
  (no directory access at all). IAM error codes are **raw lowercase**, unlike
  `core`/`social`'s UPPER_SNAKE.

**Entity split — check before widening.** `DirectoryMember` (this LIST endpoint) is a
GENUINELY SEPARATE type from `MemberSummary`/`MemberBatchItemDto` (the `?ids=` BATCH
endpoint, see [[be-iam-batch-member-lookup]]). US-E18.33/35/41 widened the BATCH one;
US-E18.52 widened the LIST one. Widening the wrong one compiles and passes tests.

**Why:** `DirectoryMember` is consumed by class picker, staffing, admin roster and the
principal teacher directory — all staff-tier surfaces, so the optional fields always
arrive there in practice; the optionality is type-level honesty, not a live behavior
change.
**How to apply:** on any story touching this endpoint, demand a staff-tier
byte-identical regression test (exact `Object.keys` set), and confirm the DI pins one
allowed `role=`. The endpoint takes ONE role — covering several means N full drains of
the directory (`SearchMembersUseCase` drains all pages, `PAGE_SIZE` 100).
