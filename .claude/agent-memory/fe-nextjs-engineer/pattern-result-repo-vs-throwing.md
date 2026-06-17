---
name: pattern-result-repo-vs-throwing
description: Two repo error conventions coexist — Result-shaped (calendar/admin/staff-leave) vs throwing-Failure (discipline); follow the packet's declared shape
metadata:
  type: project
---

Two repository error conventions live in this codebase; pick per packet, do not mix.

- **Result-shaped** (calendar, admin-roster, class-management, **staff-leave US-E09.3**):
  repo methods return `{ ok: true; value }` / `{ ok: false; error: Failure }` (no throw).
  Use-cases forward the Result; the Server Action maps `result.error.type` → `errorKey`.
  Validation that lives in the use-case (e.g. reject-reason length) returns the
  error Result directly without touching the repo.
- **Throwing-Failure** (discipline US-E09.1/2): repo returns `Promise<Entity>` and
  *throws* a `Failure`; the action is the try/catch boundary → `errorKey`. See
  [[pattern-throwing-repo-failure]].

**Why:** the discipline feature predates the Result convention; newer admin/core
features standardized on Result (matches calendar.di / class-management). Mirroring
the wrong one fails the reviewer (inconsistent with sibling files in the feature).

**How to apply:** read the packet's `IXxxRepository` interface signature first — if it
declares `Promise<Result<T>>` go Result-shaped; if `Promise<Entity>` go throwing.
For Result repos, the mock repo guards `not-found` / `already-processed` itself and
returns the error Result; the real repo wraps the HTTP call in try/catch →
`toFailure(err)` (branch on `errorCodeOf`/`statusOf`, never message).
