# Memory Index

- [Confirmed conventions](conventions.md) — verified repo patterns I rely on during review
- [Recurring violations](recurring-violations.md) — issues I keep flagging in this repo
- [core class-list enrichment + MANAGER read](be-class-list-enrichment.md) — which /classes endpoints are enriched, and the un-fanout consumer list
- [IAM batch member lookup + linked-students](be-iam-batch-member-lookup.md) — tiered `?ids=` contract, the ONE allowed client, and the parent roster row (no name)
- [social /reports moderation contract](be-social-moderation-reports.md) — ADMIN-only gate, composite point-read key, no audit trail, no reporter identity
- [core class-roster read](be-core-class-roster-read.md) — MANAGER is NOT authorized on `/classes/{id}/students`; hard-delete enrollment; no status/code on the wire
- [core staff-leave contract](be-core-staff-leave.md) — tenant-wide list defaults to SUBMITTED (3-state fan-out), approve/reject composite key, US-170 nullables
- [core enrollment pool (unassigned students)](be-core-enrollment-pool.md) — ids-only unpaginated enrolled-ids read + the FE-COMPOSE set-difference rule (no BE pool endpoint, ever)
- [core grade-scale bands + requiredCount](be-core-grade-scale-bands.md) — asymmetric omitempty (null vs absent), one 422 for all band rules, count is display-only
- [appRole `admin` unreachable in real mode](platform-admin-approle-unreachable.md) — ROLE_ENUM_TO_APP has no `admin`; /admin/* is mock-only; ADR-worthy, not a story fix
- [Flaky principal-classes story](flaky-storybook-principal-classes.md) — the one Storybook test that intermittently fails; re-run before blaming a branch
- [core member-attendance read](be-member-attendance-read.md) — PARENT allowed since US-047 (openapi prose stale), guard ordering, UPPER_SNAKE enum, ATTENDANCE_FORBIDDEN
