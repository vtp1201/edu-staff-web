# Memory Index

- [Repo conventions for teacher feature](project-teacher-feature-conventions.md) — existing teacher feature structure, dashboard repo patterns, DI factory shape
- [Admin ClassResponseDto has homeroomTeacherId](project-class-dto-homeroom.md) — admin ClassResponseDto carries homeroomTeacherId; teacher DTO does not (open contract question)
- [RosterTable is not shareable yet](project-roster-table-not-shared.md) — admin RosterTable coupled to unenroll actions; defer promotion until read-only variant also needed by admin
- [GenderBadge promotion trigger](project-gender-badge-promotion.md) — GenderBadge lives in admin-roster; promote to shared when teacher roster uses it (component-organization rule)
- [Discipline feature E09.1 base](project-discipline-e091-base.md) — existing entities, repo interface, mock+fixtures, DI shape for the discipline feature; E09.2 extends without forking
- [Staff leave US-E09.3 plan](project-staff-leave-e093-plan.md) — phase breakdown, conflicts (AC-4/5/9 vs design inline reject), key open questions (avatar tone, errorLight token, CalendarClock icon)
- [Messaging E10.4 plan](project-messaging-e104-plan.md) — 7-phase additive plan on US-E10.1; GroupEntity shape, 9 new repo methods, 5 new i18n error keys, dark-mode quoted-bubble token ADR flag
- [Staff E14.6 seal plan](project-us-e146-seal-plan.md) — ADR-vs-AC discrepancy (reason min-length), batch-level seal entity added onto per-student viewer feature, single-admin fallback mock pattern
