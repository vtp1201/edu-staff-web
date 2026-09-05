---
name: gotcha-class-subjects-wire-shape
description: core GET /classes/{id}/subjects is cursor-paginated with the display name nested under lockedFields — a flat subjectName DTO still type-checks and renders undefined labels
metadata:
  type: reference
---

`GET /core/api/v1/classes/{classId}/subjects` (`CLASS_EP.classSubjects`) answers
a **cursor-paginated** `ClassSubjectSummaryResponse[]`:
`{ classSubjectId, classId, subjectId, academicYearLabel, gradeLevel, status,
lockedFields: { subjectName, … }, createdAt }`.

**Why it matters:** there is no top-level `id` and no top-level `subjectName`. A
hand-written DTO declaring `{ id, subjectName }` compiles, passes `tsc`, and
renders a picker of `undefined` options at runtime — the failure only shows up
in a browser. A repo that forgets the cursor silently HIDES page 2, which looks
like a class with fewer subjects rather than like an error.

**How to apply:** read it with `{ params: { cursor, limit: 100 }, raw: true }` +
`parseEnvelope()` and loop; map `dto.subjectId` +
`dto.lockedFields.subjectName`; dedupe by `subjectId` (a repeat crashes React on
a duplicate key). Verified precedent in the repo:
`src/bootstrap/lib/resolve-my-grade-subjects.ts`. Distinct from
`CLASS_EP.classSubjectAssignments` (`.../subject-assignments`), a different
aggregate. Ground truth: `edu-api/services/core/docs/openapi.yaml`.

Three consumers now hit this URL (grade-book helper, `principal/` teachers repo,
`features/lms` picker). A fourth should extract a shared read rather than a
fourth copy. See [[pattern-third-mode-on-shared-component]].
