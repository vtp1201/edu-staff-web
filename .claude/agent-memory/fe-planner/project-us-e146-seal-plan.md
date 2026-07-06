---
name: project-us-e146-seal-plan
description: US-E14.6 Academic Record Seal plan — ADR 0037 vs AC-7 discrepancy resolution, batch-level seal entity design, mock-first admin-count fallback pattern
metadata:
  type: project
---

Plan written into docs/stories/epics/E14-academic-records/US-E14.6-academic-record-seal/story.md
under "## Implementation Plan" (2026-07-05).

Key decisions surfaced for fe-nextjs-engineer:
- ADR 0037 says unseal reason min 10 chars; AC-7 says >= 20 chars. Plan says: **follow AC-7 (20)**,
  since AC is the finalized testable spec and ADR prose predates it. Flagged as [OPEN QUESTION] for
  fe-lead to annotate ADR 0037 with a superseding note (do not silently edit ADR history).
- Existing `src/features/academic-records/` is a per-STUDENT viewer feature (US-E14.5,
  `AcademicRecord.years[].terms[]`, `TermStatus` enum). US-E14.6 adds a batch-level
  (classId+term+year) admin seal/unseal slice onto the SAME feature module — new entities
  (`SealBatchStatus`, `UnsealRequest`, `SealAuditEntry`, `TenantAdminSummary`) in a NEW
  `i-academic-records-seal.repository.ts` (separate interface from the viewer's
  `i-academic-records.repository.ts` — different bounded concern, avoids bloating the read-only
  viewer contract). Reuses `TermStatus` vocabulary, does not fork a parallel enum.
- Self-approve fallback (only 1 admin in tenant) has no real "list admins" endpoint yet — planned
  as a `listTenantAdmins()` method on the same seal repository, mock returns a fixture list;
  recommended a constructor flag on the mock repo (`{ adminCount: 1 }`) to deterministically
  exercise the single-admin fallback path in tests/Storybook.
- RBAC: `/admin/*` layout already guards role via `evaluateAdminAccess` (no new guard needed at
  page level); Server Actions still need `requireRole(["admin"])` per action, matching
  `admin/grades/approval/actions.ts` pattern exactly.
- Reference for admin RSC+action+DI pattern: `src/app/[locale]/t/[tenant]/(app)/admin/grades/approval/`
  (page.tsx + actions.ts) and `src/bootstrap/di/grades.di.ts`.
