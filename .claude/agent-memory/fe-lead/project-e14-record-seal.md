---
name: project-e14-record-seal
description: US-E14.6 Academic Record Seal (two-ADMIN unseal) — recurring high-risk-lane review pattern (client+server gate bypass, ungated read actions)
metadata:
  type: project
---

US-E14.6 Academic Record Seal (Admin Bulk-Seal + Two-ADMIN Unseal) implemented
2026-07-06, `src/features/academic-records/` (shares the module with US-E14.5's
per-student viewer, but via a SEPARATE `IAcademicRecordsSealRepository` — batch-level
by classId/term/year, kept apart from the viewer's per-student interface rather than
bloating it).

**Why this matters for future high-risk-lane stories**: the first-pass
implementation of the two-ADMIN unseal gate (ADR 0037) was architecturally correct
on paper (coSignerId param, self-approve fallback flag, audit logging) but had a
live bypass — the UI rendered the self-approve button for ANY own-request regardless
of tenant admin count, and the domain use-case skipped ALL guards when
`coSignerId === null` with no server-side re-verification. `fe-tech-lead-reviewer`
caught this on the first review pass; it would NOT have been caught by
`fe-qa-playwright`'s AC-traceability alone (the AC as written doesn't explicitly say
"verify the button doesn't render for multi-admin"). Same review pass also found 6 of
9 Server Actions in the new admin route missing `requireRole(["admin"])` — read
actions are just as easy to forget as writes, and forgetting one leaks PII in a
high-risk lane (audit trail = who unsealed what; tenant admin roster).

**How to apply**: for any high-risk data-integrity story with a "gate" (only-if-N
condition, RBAC, financial threshold, etc.), explicitly instruct
`fe-tech-lead-reviewer` in the delegation prompt to (a) verify the gate is enforced
BOTH client-side (UI doesn't offer the bypass affordance) AND server-side
(domain/use-case independently re-checks, doesn't trust the client), and (b)
enumerate EVERY Server Action in the new route and confirm each one — reads
included — has the RBAC guard, not just the mutations. Don't rely on the engineer's
own self-report; the engineer's report explicitly said "each mutating Server Action"
and silently excluded the 6 reads.

Also confirmed this run: `fe-qa-playwright` is a genuinely productive gap-closer.
Given a coverage-gap mandate, it independently found and closed 5 real test-only
gaps (empty/error states, incomplete RBAC test proof) without touching production
code, and correctly declined to invent a Playwright spec where Storybook
interaction + mocked VM props already covers the risk (no cross-page nav, mock-first
BE) — matches the US-E14.4 precedent already in `docs/TEST_MATRIX.md`.

ADR 0037 amended (not superseded) 2026-07-05 for US-E14.6: binding unseal-reason
min length is 20 chars (matches finalized story AC-7), not the original decision
prose's 10 chars — a lesson that ADR prose written before AC finalization can drift.
Always cross-check an ADR's concrete numbers against the current story AC before
telling the engineer which one is binding, and record the resolution as an
"Amendment" section in the ADR rather than silently rewriting history.
