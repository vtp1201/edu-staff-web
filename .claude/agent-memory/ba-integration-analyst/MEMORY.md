# Integration Analyst Memory Index

- [Social service mock-first status](social-service-status.md) — social status per-endpoint now (feed/report US-097→100/098 shipped, pin/unpin US-101 in_progress); check DR before flagging mock-first
- [Social feed/moderation E19 baseline](social-feed-moderation-e19-baseline.md) — shared moderate-delete contract, pin/unpin genuine mock-first, FR-108 role-gate=principal only, noti mapping for removal notify
- [Messaging feature E10.1 baseline](messaging-e10-baseline.md) — existing contracts, DTOs, repo patterns from US-E10.1
- [Error mapping conventions](error-mapping-conventions.md) — UPPER_SNAKE codes, failure union, errorCodeOf pattern
- [Grades E13 baseline](grades-e13-baseline.md) — GradeBook E13.6/E13.7 contracts, IGradeBookRepository, MockGradeBookRepository, childrenList open question
- [Discipline E09 baseline](discipline-e09-baseline.md) — E09.4 parent endpoints, MockDisciplineRepository, child-list ambiguity, failure codes, conduct grade+leave status badge mappings
- [LMS Exam E11 baseline](lms-exam-e11-baseline.md) — E11.1 entity shapes (no type discriminant, non-nullable score/passed), E11.5 deltas, breaking entity changes, open questions for lms team
- [E21 Invitations baseline](e21-invitations-baseline.md) — IAM_MEMBER_EP existing wiring, resend/batch/preview gaps, ADR 0051 accept contract (signin→me pattern reuse)
- [Tenant membership contract gap](tenant-membership-contract-gap.md) — two parallel MembershipSummaryDto impls (tenant vs iam-member); one has unused tenantName? field; E23 display-field gap
- [Parent-student links E20 baseline](parent-student-links-e20-baseline.md) — E20.1/E20.2 mock-first core, no real member-search endpoint, audit-log reuse recommendation for unlink history
- [Email verification E22 baseline](email-verification-e22-baseline.md) — iam OTP verify endpoints all REAL, emailVerified DTO gap (web-side, not BE), wrong/expired/too-many-attempts already mapped via CODE_MAP
- [Principal Reports E03 baseline](principal-reports-e03-baseline.md) — no school-wide core rollup exists anywhere; all-mock-first; poll-vs-SSE and export recommendation pattern
