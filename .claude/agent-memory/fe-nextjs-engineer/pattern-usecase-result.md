---
name: pattern-usecase-result
description: When a use-case has validation that can fail, return a discriminated Result<T> instead of throwing; server action maps failure.type to errorKey
metadata:
  type: feedback
---

Domain use-cases with validation (date-order, graded-term-delete, etc.) return a
discriminated `Result<T>` (`{ ok: true; value } | { ok: false; failure: CalendarFailure }`)
rather than throwing. Pure-throw style (like `SaveAttendanceUseCase`) is only for
guard errors with no UI branch.

**Why:** keeps the failure union as an end-to-end error catalog (i18n keys at
`<feature>.errors.<type>`); presentation translates the stable key. Matches the
`errorKey: Failure["type"]` convention in `.claude/rules/i18n.md`.

**How to apply:** put `ok()`/`fail()` helpers + `Result<T>` in a small `result.ts`
beside the use-cases. Server action: `if (!result.ok) return { ok:false, errorKey: result.failure.type }`.
Unexpected thrown/transport errors in the action map to `network-error`/`unknown`.

Note: `ActionResult<T>` VM type must guard the intersection —
`T extends object ? {ok:true}&T : {ok:true}` — a plain `{ok:true}&Record<string,never>`
fails tsc (`ok` incompatible with `never` index). Use `ActionResult` (no arg) for
void results.
