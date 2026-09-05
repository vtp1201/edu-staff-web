---
name: authz-gate-patterns-teacher-class-hub
description: The three server-side authorization shapes used by the teacher class-hub actions, and why TeacherClass.subjects is a trustworthy scope source
metadata:
  type: project
---

`src/app/[locale]/t/[tenant]/(app)/teacher/classes/[classId]/actions.ts` carries THREE
distinct role-gate shapes. Know which one a new action should copy before reviewing it.

| Shape | Used by | Mechanism |
| --- | --- | --- |
| `assertHomeroomOf(classId)` | daily-entry actions (US-E24.11) | `TeacherClass.roles.includes("homeroom")` |
| authCtx tuple `{ useCase, authCtx }` from DI | leave decide, period-log (0063) | gate runs at the REPOSITORY boundary |
| `assertOwnCourseSubject(classId, courseId)` | 7 LMS course mutations (US-E24.10) | subject-set membership + `course.classId === classId` |

**Why `TeacherClass.subjects` is a legitimate scope source:** it is NOT "all subjects
this class offers". `teacher-dashboard.mapper.ts` builds it from `dto.teachingSubjectIds`
(BE US-234) on rows returned by `GET /teacher/classes`, which core scopes to the caller's
token. `GetMyClassUseCase` deliberately has no point-read — it filters `listMyClasses()`,
so "not mine" is indistinguishable from "does not exist". A GVCN therefore has an EMPTY
subject set for colleagues' subjects, which is exactly what makes the gate bite.
`assertCourseInMyClass` is the deliberately weaker sibling for the readonly READ.

**How to apply:** for any new class-scoped mutation, require the `classId`-pinning half
too — a subject-only check leaves a cross-class hole (a valid `courseId` from another
class). The US-E24.10 test proves this case explicitly. Also require the forge test to
assert `expect(useCase).not.toHaveBeenCalled()`, not just the returned `forbidden` key.

Related: [[recurring-violations]], [[be-lms-live-contract]].
