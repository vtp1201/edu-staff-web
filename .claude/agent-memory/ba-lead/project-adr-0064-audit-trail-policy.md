---
name: project-adr-0064-audit-trail-policy
description: ADR 0064 resolved the US-E20.1 audit-trail open item; sets a repo-wide policy for future audit-worthy mutations
metadata:
  type: project
---

ADR `docs/decisions/0064-audit-trail-emission-policy.md` (2026-07-25) resolved
the outstanding US-E20.1 (parent-links) open item: do NOT extend the shared
`AuditEntityType` union in `src/features/audit-log/` for any feature's
mutations.

**Why:** ground-truthing found the generic `audit-log` feature
(`IAuditLogRepository`) has exactly one method, `getAuditLog` — no
append/emit/write path exists anywhere in the codebase; it's a fixed mock
seed pending `core` BE endpoint US-064. Two existing high-risk mutation
features already faced this exact question and answered it independently by
building their OWN feature-scoped audit-trail entity instead: `moderation`
(`AuditEntryEntity`) and `academic-records` Seal/Unseal
(`SealAuditEntry`/`GetSealAuditTrailUseCase`). Notably ADR `0037`'s decision
text literally said "written to the audit log" but the shipped code diverged
and built the feature-scoped `SealAuditEntry` instead — a real
decision-vs-implementation drift worth knowing about.

**Policy (how to apply):** when any future high-risk mutation (grade lock,
staff-discipline approve/reject, student-absences flag, etc.) raises an
audit-worthiness question, do NOT re-litigate the shared-union option —
default answer is a feature-scoped entity + query use-case + mock repo
inside that feature's own folder, mock-first, mirroring
`academic-records`/`moderation`. Only escalate to a new ADR if there's a
reason to deviate from this default.

Follow-up backlog: `US-E20.3` registered (status planned) via
`harness-cli story add` — parent-links audit trail itself, not built.
`docs/TEST_MATRIX.md` has a planned row for it. `docs/decisions/README.md`
has no manual index list (decisions aren't cross-referenced there — just
`harness-cli decision add` registration + the file itself).

See also [[project-be-api-readiness]] for core US-064 BE-readiness context.
