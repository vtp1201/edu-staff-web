# Memory Index

- [Repo conventions for teacher feature](project-teacher-feature-conventions.md) — existing teacher feature structure, dashboard repo patterns, DI factory shape
- [Admin ClassResponseDto has homeroomTeacherId](project-class-dto-homeroom.md) — admin ClassResponseDto carries homeroomTeacherId; teacher DTO does not (open contract question)
- [RosterTable is not shareable yet](project-roster-table-not-shared.md) — admin RosterTable coupled to unenroll actions; defer promotion until read-only variant also needed by admin
- [GenderBadge promotion trigger](project-gender-badge-promotion.md) — GenderBadge lives in admin-roster; promote to shared when teacher roster uses it (component-organization rule)
- [Discipline feature E09.1 base](project-discipline-e091-base.md) — existing entities, repo interface, mock+fixtures, DI shape for the discipline feature; E09.2 extends without forking
