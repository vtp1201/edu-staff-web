# Memory Index

- [Confirmed conventions](conventions.md) — verified repo patterns I rely on during review
- [Recurring violations](recurring-violations.md) — issues I keep flagging in this repo
- [core class-list enrichment + MANAGER read](be-class-list-enrichment.md) — which /classes endpoints are enriched, and the un-fanout consumer list
- [IAM batch member lookup + linked-students](be-iam-batch-member-lookup.md) — tiered `?ids=` contract, the ONE allowed client, and the parent roster row (no name)
- [social /reports moderation contract](be-social-moderation-reports.md) — ADMIN-only gate, composite point-read key, no audit trail, no reporter identity
- [core class-roster read](be-core-class-roster-read.md) — MANAGER is NOT authorized on `/classes/{id}/students`; hard-delete enrollment; no status/code on the wire
- [core member-attendance read](be-member-attendance-read.md) — PARENT allowed since US-047 (openapi prose stale), guard ordering, UPPER_SNAKE enum, ATTENDANCE_FORBIDDEN
