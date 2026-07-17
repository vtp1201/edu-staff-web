---
name: lms-exercisebank-e11-9-baseline
description: core service exercisebank (question-bank) US-E11.9 — REAL contract ground-truth, FORBIDDEN_ACTION dual-use gap, immutable-field gap, filter support matrix
metadata:
  type: project
---

## core/exercisebank is REAL (exception to core=mock-first default)

Unlike most `core` service sub-domains, exercisebank (question bank, US-053) is
shipped and ground-truthed. Kong routes `/core/api/v1/*` (strip_path) →
`core:8081/api/v1/*` via `core-protected` route, `edu-edge-auth` protected.
6 endpoints under `/api/v1/lms/questions` (search, list-mine POST/GET, GET/PUT
:id, PUT :id/publish). Source: `edu-api/services/core/internal/lms/exercisebank/**`.

## Contract gotchas found ground-truthing (2026-07-17)

1. **`UpdateQuestionRequest` (Go struct) has ONLY `body`, `expectedAnswer`, `tags`**
   — no `difficulty` field. So difficulty is immutable-on-update just like
   questionType/subjectId/gradeLevel (4 immutable fields total, not 3). A
   requirements.md draft for US-E11.9 wrongly said difficulty was editable —
   flagged as requirements defect, not an integration choice.
2. **`FORBIDDEN_ACTION` (403 `forbidden_action`) is ONE error constructor
   (`domainerror.ErrForbidden()`) reused for TWO different denials**: role-gate
   (search/list-mine/create requiring TEACHER or, for search, canBrowseBank
   TEACHER/MANAGER/ADMIN) AND ownership-gate (update/publish by non-author,
   `Question.IsOwnedBy` check in `question.go`). The wire gives no code-level
   way to distinguish — client must branch by **which endpoint/call-site**
   produced the 403, not by inspecting the code, and map to distinct failure
   variants (e.g. `forbidden-browse` vs `forbidden-edit`) for correct UX copy.
3. `QUESTION_NOT_VISIBLE` (403) is a SEPARATE, distinct code — only from
   single-GET (`GET /:id`) visibility gate (DRAFT viewed by non-author/non-
   manager/admin). Never conflated with FORBIDDEN_ACTION.
4. `expectedAnswer` confirmed optional (`*string`, `omitempty,max=5000`) for
   ALL 3 questionTypes on both Create/UpdateQuestionRequest — no per-type
   required rule anywhere in Go source. Any design-spec/requirements claiming
   it's required for publish is wrong.
5. **Server-side filter support is narrow** — `ListMyQuestions` handler only
   reads `cursor`/`limit` (NO status/questionType/difficulty/gradeLevel query
   params exist for scope=mine — ALL client-side post-filter). `SearchQuestions`
   supports `subjectId`/`gradeLevel`/`difficulty`/`tag`/`cursor`/`limit` but
   NOT `questionType` (always client post-filter); gradeLevel/difficulty only
   take effect server-side on the by-subject partition path — ignored on the
   by-tag path (search_questions.go routes subject vs tag to different Scylla
   partitions, D2 decision: no unfiltered tenant-wide scan allowed).

**Why:** these gaps are easy to assume-away without reading the actual Go
structs/handlers — the requirements doc for this story already had 2 wrong
assumptions (difficulty editable, expectedAnswer required) before ground-truthing.
**How to apply:** for any future US touching exercisebank, re-verify against
`create_question_request.go`/`update_question_request.go`/`question_handler.go`/
`search_questions.go`/`question.go`/`question_errors.go` directly — don't trust
a prior story's requirements.md verbatim, even one written this same day.

See full integration map: `docs/stories/epics/E11-lms-exams/US-E11.9-question-bank/integration.md`.
