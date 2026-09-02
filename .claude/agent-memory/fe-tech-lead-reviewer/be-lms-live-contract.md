---
name: be-lms-live-contract
description: services/lms is live — the DOUBLE `lms` path segment through Kong, what the wire does NOT carry, and the classId that has no lms source
metadata:
  type: reference
---

`services/lms` went live 2026-09-02 (US-E24.1, ADR 0075 supersedes the 0073 force-mock).
Verified against `edu-api/gateway/kong/kong.yml` + `services/lms/docs/openapi.yaml`.

## The double `lms` segment is CORRECT — don't "fix" it

Kong route `lms-protected`: `paths: /lms/api/v1`, `strip_path: true`,
url `http://lms:3004/api/v1`. The service mounts its own routes under `/api/v1/lms/...`.
Web `baseURL` is Kong root (`http://localhost:8000`), so every `LMS_EP` value is
`/lms/api/v1/lms/...`. Dropping either segment 404s. Only 14 business paths exist
(`grep -n "^  /" openapi.yaml` = 15 incl. `/health`).

## What the wire does NOT carry (anything of this shape is FABRICATED)

No progress %, no completion, no per-student status on a list row, no score/grade/
feedback/attachment (grading = BE US-141, unshipped), no chapters, no video/pdf lesson
types, no notes, no Q&A, no color. Completion/progress lives in `openapi.draft.yaml`
(BE US-254) — draft, must not be consumed (ADR 0076).
`CourseItem.state` (`UPCOMING_HIDDEN|OPEN|CLOSED`) is **BE-computed** — a client that
re-derives it from `now` is a blocking finding. Deriving *lateness* from `dueAt` IS
contract-sanctioned (there is no `late` flag).
List projections are genuinely narrower than the point reads: `CourseSummary` has no
`description`/`createdAt`; `AssignmentSummary` has no `state`/`instructions`/`startAt`.

## Both lists REQUIRE `classId`, and `lms` cannot answer it

`GET /courses?classId=` and `GET /assignments?classId=` are mandatory-classId; `lms` has
no self-scope route. The student's class comes from **core** `GET /members/{memberId}/
enrollment` (`TIMETABLE_VIEW_EP.memberEnrollment`, `memberId` claim per ADR 0074).
⇒ the two student LMS screens now have a **cross-service dependency on `core`**, and they
degrade to a `no-class` state if the token lacks the `memberId` claim — see
[[platform-admin-approle-unreachable]] for the sibling claim-gap class of bug.

## Failure mapping gotchas (ERROR_CODES.md)

- `LMS_CLASS_NOT_FOUND` is **403**, not 404 (caller supplied the classId ⇒ not a secret).
- `LMS_ITEM_NOT_OPEN` is **404** on purpose (existence oracle).
- `404 LMS_SUBMISSION_NOT_FOUND` on `.../submissions/me` means "not submitted yet" ⇒ must
  resolve to `null`, NOT a failure. Every other 404 on that call still throws.
- `LMS_COURSE_FORBIDDEN` is documented as **deliberately absent** — omitting it is right.
- A student only ever receives PUBLISHED courses and never `UPCOMING_HIDDEN` items,
  with ONE exception: an `EXAM` tile is returned before its `startAt`.
