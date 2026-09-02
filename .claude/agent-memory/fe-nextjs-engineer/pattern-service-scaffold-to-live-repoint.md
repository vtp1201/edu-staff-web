---
name: pattern-service-scaffold-to-live-repoint
description: US-E24.1 — un-force-mocking a whole SERVICE (not one endpoint) means the mock-era domain model is fiction; check the gateway+service path composition (double segment) and delete UI, don't stub it
metadata:
  type: project
---

When BE ships a service that was previously a scaffold (force-mocked, e.g. ADR
0073 → 0075), the un-mock is NOT a DI one-liner — the mock invented the whole
domain model, and almost none of it survives contact with the contract.

**Why:** `features/lms` had chapters → typed video/pdf/text lessons with a
duration label and per-student `done`, per-lesson notes, per-lesson Q&A, course
progress %, and assignment score/feedback/attachment. The real contract has a
`Course` container, ONE ordered `CourseItem` timeline (LESSON | ASSIGNMENT |
DOCUMENT | EXAM), plain-text lesson content, and a single-attempt `Submission`
with no grade. Everything else was mock fiction that had been tested and
storybooked into looking verified.

**How to apply:**

1. **Path composition is the first thing to verify, before any code.** Kong
   route `/lms/api/v1` (`strip_path: true`) → upstream `http://lms:3004/api/v1`,
   and the service mounts under `/api/v1/lms/...` ⇒ the gateway path is
   `/lms/api/v1/lms/...` — a DOUBLE segment. Read
   `edu-api/gateway/kong/kong.yml` + the service's `openapi.yaml`
   (`grep -n "^  /"`), never the mock-era mirror. Write the endpoint snapshot
   test FIRST and assert the old wrong shapes are ABSENT by name.
2. **List projections are genuinely narrower than the full read** and that is
   load-bearing, not an omission to patch: `CourseSummary` has no
   `description`/`createdAt`; `AssignmentSummary` has no `instructions`, no
   `createdAt` and — the operative gap — no `state`. Model them as separate
   types and assert `not.toHaveProperty` in the mapper test.
3. **A per-student field that is a SEPARATE point read cannot back a list
   filter.** "Did I submit?" is `GET .../submissions/{id}/submissions/me`; the
   class partition is bounded at 500 rows, so rebuilding the old 4 status tabs
   would be 500 requests. Move the read to the moment a detail sheet opens.
4. **A documented "not found" that means a normal state resolves to `null`, not
   a failure**: `404 LMS_SUBMISSION_NOT_FOUND` = "not submitted yet". Every
   OTHER 404 on the same call still throws — test both branches.
5. **Class-scoped lists need a class the service will not tell you.** `lms`
   requires `classId` and has no self-scope route ⇒ resolve it from core's
   `GET /members/{memberId}/enrollment` (self-readable by STUDENT) in a
   `bootstrap/lib/resolve-my-*.ts` helper (cross-service composition never goes
   in a repository, decision 0017). Fail-soft to `null` → a DISTINCT `no-class`
   UI state, never a fallback class. Costs a cross-service dependency: `core`
   down ⇒ the `lms` screens degrade.
6. **Delete the contract-less UI, don't stub it.** 15 components went (notes,
   Q&A, mark-complete, progress card, video/pdf players, status tabs, graded
   sheet, score-tone, attachment field, late-submit confirm). Deleting is what
   makes the missing contract visible to the next reader.
7. **A BE rule change can delete a whole client flow**: `dueAt` became ENFORCING
   (`409 LMS_ITEM_CLOSED`), so the "confirm late submission?" dialog is not a
   feature to preserve — a late submit is refused. Surface the refusal.
8. **Invert the old force-mock DI env-matrix test, don't delete it** — it is the
   cheapest proof the pin is really gone. Build the factories SEQUENTIALLY in
   the test if you assert an ordered `calls` log (`Promise.all` interleaves the
   refresh/http pairs).

Related: [[pattern-unmock-anticipatory-dto]], [[pattern-real-mode-that-was-never-real]],
[[pattern-force-mock-vs-honest-degrade]], [[pattern-boundary-narrow-remap]].
