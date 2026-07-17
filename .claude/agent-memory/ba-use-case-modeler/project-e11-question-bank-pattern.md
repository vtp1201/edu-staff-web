---
name: project-e11-question-bank-pattern
description: US-E11.9 question-bank UC pattern — mandatory-filter gate as first-class state, identical-wire-code-split failures, ground-truth-over-design-spec correction
metadata:
  type: project
---

US-E11.9 (Teacher Question Bank, docs/stories/epics/E11-lms-exams/US-E11.9-question-bank/)
established these reusable patterns:

1. **Mandatory-filter gate as a 5th first-class UI state** (`QBFilterRequiredPrompt`),
   distinct from empty/error/loading/success — client-side pre-validates a BE 422
   (`QUESTION_SEARCH_FILTER_REQUIRED`) so the gate is proactive, not just a caught
   error. Model both the client pre-gate AC AND a defense-in-depth AC mapping the
   422-if-somehow-reached case back to the SAME state (never a generic error banner).
   Reusable whenever a search/list endpoint has a mandatory-filter-else-422 contract.

2. **Split failure variants from one wire error code by call-site, not by code.**
   `FORBIDDEN_ACTION` (403) meant "wrong role" on search/list/create but "not the
   owner" on update/publish — ba-integration-analyst split these into
   `forbidden-browse` vs `forbidden-edit` at the mapper/repository layer (branch by
   endpoint, not by inspecting the error). ba-use-case-modeler's job: write genuinely
   distinct AC/copy for each variant even though the wire signal is identical — don't
   let one AC "cover" both just because the HTTP status matches.

3. **Ground-truthed BE contract beats design-spec/requirements text when they conflict**
   (here: `expectedAnswer` optional for all types, never a publish gate — corrected
   design-spec `expectedAnswerField.required`/`publish.disabledUntil`; and FR-009
   corrected from 3→4 immutable fields on edit, `difficulty` included). Bake settled
   corrections directly into AC without re-litigating as [OPEN QUESTION] — only the
   still-undecided items (principal/admin future scope, subject-dropdown real-vs-mock
   source, authorId→name batch-lookup) stay open.

4. **Server-vs-client-side secondary-filter split** (same shape as the sibling
   lesson-plan story): when a filter has zero/partial server query-param support,
   model it explicitly as a client-side post-filter AC + a distinct edge-case-matrix
   row, and flag the "load more must keep fetching underlying pages when a
   post-filter reduces visible count" nuance rather than silently presenting it as
   full server filtering. Same caveat within one endpoint can differ by which OTHER
   filter satisfied a mandatory gate (e.g. gradeLevel/difficulty apply server-side
   only on the by-subject partition path, not by-tag) — model that combination as
   its own AC pair (subject-mode vs tag-mode), not one merged AC.
