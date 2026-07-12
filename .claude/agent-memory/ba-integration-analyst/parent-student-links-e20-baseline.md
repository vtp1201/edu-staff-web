---
name: parent-student-links-e20-baseline
description: E20.1/E20.2 (DR-014) integration contracts — parent-student-links, mock-first core, no real member-search endpoint found
metadata:
  type: project
---

US-E20.1 (admin parent-student links, actor `admin` not `principal` per
decision 0022) and US-E20.2 (parent consent section, extends Profile
US-E08.5) both consume `core` service parent-student-links endpoints — all
MOCK-FIRST, confirmed by grepping every existing `core`-backed
`src/bootstrap/endpoint/*.ts` (discipline, academic-records, audit-log,
admin-roster all say "mock-first until core ships"). No edu-api repo/openapi
checked out locally to verify further.

**No real member-search-by-query endpoint exists** for the create-link
dialog's comboboxes. `IAM_MEMBER_EP.members(tenantId)`
(`src/bootstrap/endpoint/iam-member.endpoint.ts`) is a REAL, already-wired
`iam` endpoint but only used as a full tenant-member list (US-E06.4), no
`?q=&role=` filter contract demonstrated anywhere. `MESSAGING_EP.contacts`
(social service "search" UI in messaging modals) is also mock-first, not a
real iam pattern. Treated both student-search and parent-search combobox
lookups as mock-first for E20.1.

**Audit trail resolution for Unlink reversibility**: existing
`src/features/audit-log` (US-E12.12) is a real generic audit pattern
(`AuditEvent { action: CREATE|UPDATE|DELETE|APPROVE|LOCK|SEAL|UNSEAL,
entityType: "grade"|"conduct"|"record"|"setting", ... }`, mock-first
`AUDIT_LOG_EP.list`). Recommended (not decided) that unlink stays a hard
DELETE and audit history lives in this generic surface rather than inventing
link-specific archive semantics — requires extending `AuditEntityType` union
with `"parent-student-link"`, flagged as ADR-candidate to ba-lead, not
resolved unilaterally.

Shared entity recommendation across both stories: `ParentStudentLink` +
`ParentStudentConsent` (studentId, parentId, disciplineAlerts/absenceAlerts/
gradeAlerts booleans) — two independent mock repos but same field names to
avoid drift. Files:
`docs/stories/epics/E20-parent-student-links/US-E20.1-admin-parent-links/integration.md`,
`docs/stories/epics/E20-parent-student-links/US-E20.2-parent-consent-section/integration.md`.
