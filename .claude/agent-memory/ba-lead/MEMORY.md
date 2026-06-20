# Memory Index

- [BE API Readiness Audit 2026-06-14](project-be-api-readiness.md) — IAM+core READY via Kong:8000; core gaps=attendance(US-046)/class-log(US-044)/grade-entry(US-060) planned; assessment-scheme(US-059) LIVE
- [Design 1406 Re-baseline 2026-06-14](project-design-1406-rebaseline.md) — real delta=29/04 vs 1406 (NOT 1206 vs 1406); design-spec.jsonc stale for login/teacher-dashboard/principal-teachers/profile-linked-accounts; ADR 0034; 4 new stories: US-E01.2/E13.4/E13.5/E08.5
- [1506 Design Handoff 2026-06-15](project-1506-handoff.md) — 17 new design files; 3 new epics (E09/E10/E11); 16 new stories; ADR 0037 (two-ADMIN unseal) + 0038 (baseline); design unblocked: E12.6/E14.1/E14.2; commit 661a7ea on main
- [US-E10.4 Messaging Extensions Pattern](pattern-messaging-extension.md) — group admin is in-feature flag (selfIsGroupAdmin) not system RBAC; social service mock-first; MESSAGING_EP + MessagingFailure + MessageEntity all additive; 47 i18n keys pre-staged; spec at docs/stories/epics/E10-communications/US-E10.4-messaging-enhancements/spec.md
