---
name: pattern-destructive-confirm-and-moderation
description: E19.2 high-risk patterns — errorSlot on DestructiveConfirmDialog, never-optimistic remove, conflictAs toFailure, screen-owning-router Storybook setup
metadata:
  type: project
---

From US-E19.2 (content moderation, high-risk destructive remove). Reusable when
building a destructive/role-gated action screen.

**Shared `DestructiveConfirmDialog` now has an `errorSlot` prop** (`components/shared/destructive-confirm-dialog`):
`{ tone: "forbidden"|"transient"; message; onRetry? }`. `forbidden` renders NO retry
control AND force-disables the confirm button (via `confirmDisabled` on
`DestructiveDialogActions`) so a user can't bypass "no retry" by re-clicking; cancel
stays enabled. `transient` shows a retry + leaves confirm enabled. Reuse for any
confirm flow needing an inline post-failure error. Host clears it (pass undefined)
on re-open/success — component never auto-clears.

**Never-optimistic destructive mutation shape** (state-design law): the `useMutation`
has ZERO `onMutate`/`setQueryData`. `onSuccess` invalidates the WHOLE `lists()`
subtree (stats ride inside every list page) + `detail(id)` + `audits()`. Distinct:
`onError` for the 409/already-resolved branch STILL invalidates `lists()`/`detail()`
(a real concurrent server change) — "never optimistic" ≠ "never invalidate on error".
403/transient invalidate nothing. Reviewer greps the mutation for `onMutate` (must be absent).

**`toFailure(err, conflictAs)` disambiguates a bare 409 by OPERATION, not message**:
explicit codes first (ALREADY_REPORTED→already-reported, ALREADY_RESOLVED→already-resolved),
then `status===409` → the caller-supplied `conflictAs` default ("already-reported" for
create, "already-resolved" for resolve/remove). Still 100% code/status branching — the
param is set by the calling method, never read from `error.message`. Mandatory test:
construct ApiError with a MISLEADING message (`{code:"FORBIDDEN", message:"please retry"}`)
→ assert `forbidden`.

**Mock deterministic forced-failure = a fixed exported id, NOT a toggle** (anti-demo):
`export const MOCK_FORBIDDEN_REPORT_ID`; the mock returns `forbidden` for that id only.
QA/reviewer greps for `failedOnce`/toggle state machines and rejects them.

**Storybook for a screen that owns next/navigation + TanStack Query**:
`parameters: { nextjs: { appDirectory: true } }` (or the full-suite run throws
"invariant expected app router to be mounted"); decorator wraps QueryClientProvider —
set `defaultOptions.queries.retryDelay: 0` so error stories (retryable failures)
settle within the play timeout. Drive a URL-derived tab via
`nextjs: { navigation: { query: { tab: "audit" } } }` (clicking a tab that only
writes the URL via router.replace won't re-derive in the mock). Never-optimistic
proof: never-resolving action → assert confirm `aria-busy` + the row still exists via
`getAllByRole("button", { name, hidden: true })` (rows are aria-hidden under the open
Sheet+AlertDialog but still in the DOM = not optimistically removed).

**Full `bun vitest:storybook run` has a large pre-existing baseline of failures**
(~70, "app router to be mounted" in screens lacking `nextjs.appDirectory`) — ALWAYS
run your own story file in isolation and grep the full-run FAIL list for YOUR files
before attributing a failure to your change.
