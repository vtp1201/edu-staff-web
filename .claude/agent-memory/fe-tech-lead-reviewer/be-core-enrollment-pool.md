---
name: be-core-enrollment-pool
description: core enrolled-student-ids contract + the FE-COMPOSE rule for the "unassigned students" pool (no BE endpoint will ever return it)
metadata:
  type: reference
---

`GET /core/api/v1/enrollments/student-ids?academicYear=2025-2026` (BE US-182,
`edu-api` ADR 0125) — ADMIN/SUPER_ADMIN/MANAGER, returns
`{academicYear, studentMemberIds: string[]}`: ids-only (no PII), deduplicated,
**unpaginated** → plain unwrapped GET, no `raw: true`/`parseEnvelope`.
403 code is `CLASS_FORBIDDEN`. `studentMemberIds` is `[]`, never null.

**There is no "students not enrolled in any class" endpoint and BE says there
never will be.** The pool is an FE set difference: IAM STUDENT directory
(`SearchMembersUseCase`, role `STUDENT` — the app's ONE directory client, it
already drains all pages) MINUS this id set, composed in
`bootstrap/di/<feature>.di.ts` (decision 0017), never in the repository.

Accepted caveats (do NOT "fix" client-side): students of an ARCHIVED class stay
subtracted; the stale window between the two reads is harmless because a
duplicate enroll hits LWT per-year uniqueness → 409
`ROSTER_STUDENT_ALREADY_ENROLLED`.

**Why this matters at review time:** any pool composed this way must fail closed
on EITHER side (a partial pool silently hides enrollable students), and pool
members are unassigned by definition → `currentClassId`/`currentClassName` are
structurally `null`, never a second lookup. See [[recurring-violations]] for the
related false-empty defect class.
