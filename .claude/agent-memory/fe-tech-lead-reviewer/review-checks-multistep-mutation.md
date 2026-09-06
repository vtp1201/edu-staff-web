---
name: review-checks-multistep-mutation
description: Review bar for a two-step mutation (create then upload N files) — the partial-failure retry trap and the fail-open role denylist
metadata:
  type: feedback
---

When reviewing a Server Action that does "create record, then upload N attachments
sequentially, report N/M failures, offer a files-only retry", check these two things
that look right and are not:

1. **The retry must re-send only the FAILED files, not all of them.** If the upload
   loop returns a bare `failedCount`, the retry handler has no way to know *which*
   files failed and re-sends the whole set. With a BE-side cap (core's leave
   attachments = max 3) that both duplicates the successes and guarantees the retry
   fails with `*_LIMIT_EXCEEDED` — a permanently unrecoverable state.
   Required change: return the failed files' identity (indices/names), not a count.
   **Storybook cannot catch this** — the story mocks the action, so a passing
   "retry hits the same requestId" interaction test proves nothing about payload.

2. **Role resolution must be an allowlist, not a denylist.** `if (role !== "student")
   return clientSuppliedId` passes an arbitrary target through for teacher /
   principal / admin / unreadable-token. Repo convention is fail-closed
   (`assertCanDecideLeave`, decision `0063`). Demand `if (role === "parent") return
   requested; if (role === "student") return claim; return null`.

**Why:** found both in US-E24.6 (`parent/attendance/actions.ts`) on an otherwise
excellent, heavily-documented implementation — comments and tests asserted the
*intended* invariant while the code shipped the weaker one.

**How to apply:** any story whose hard-gate flags include `mutation` + `multipart
upload` + `role differentiation`. Read `uploadAll`'s RETURN TYPE first; read the
role-branch's `else` first.

Related: [[recurring-violations]], [[conventions]]
