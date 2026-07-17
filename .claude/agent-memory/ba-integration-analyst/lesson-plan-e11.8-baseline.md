---
name: lesson-plan-e11.8-baseline
description: core service lessonplan sub-domain (US-E11.8) - real ground-truthed contract, 6 routes, query-param filter gaps, Kong path convention
metadata:
  type: project
---

`core` service `lessonplan` sub-domain (`services/core/internal/lms/lessonplan/`)
is a REAL, ground-truthed, reachable contract (confirmed via routes.go + Kong
`core-protected` route, not just openapi.yaml) — same tier of confidence as
exam-bank (US-E18.15/16). 6 routes: create, list-mine, get, update, publish,
list-by-subject. No delete, no unpublish (by design, one-way state machine).

**Kong path convention for `core`:** `/core/api/v1/lms/<resource>` (Kong strips
`/core`, upstream core receives `/api/v1/lms/<resource>`) — this is the
`EXAM_BANK_EP`/`SUBJECT_CATALOGUE_EP` pattern. Do NOT confuse with `LMS_EP`
(`/lms/api/v1/...`), which is a different, still-unbuilt service prefix
despite the similar-sounding name — a recurring trap since both "lesson plan"
and "lms" screens share vocabulary.

**Filter/query-param gap (important, recurring pattern class):** list endpoints
frequently support FAR less server-side query surface than requirements docs
assume. Here: `GET ""` (list mine) only takes `cursor`/`limit` — no
subjectId/gradeLevel/status/search params exist server-side despite the design
spec showing filter dropdowns for all of these. `GET /subject/:subjectId` adds
only a `tag` param. Always read the actual handler (`c.Query(...)` calls) to
get the real supported query surface — never assume a filter dropdown in a
design maps to a BE query param. Client-side-filter-over-fetched-page is the
correct resolution when the handler doesn't read that query key.

**Response shape:** `LessonPlanResponse` has `publishedAt` with Go's
`omitempty` — the JSON key is ABSENT (not null, not "") for DRAFT plans. DTO
mapper must treat missing key as "not published", not as an error.

Failure union follows the `ExamBankFailure`/`map-exam-bank-error.ts` template
exactly (11-code taxonomy from ERROR_CODES.md, UPPER_SNAKE codes via
`errorCodeOf`/`statusOf`, `not-found`/`forbidden`/generic-status-fallback tail).

See [Error mapping conventions](error-mapping-conventions.md) for the shared
pattern this reuses.
