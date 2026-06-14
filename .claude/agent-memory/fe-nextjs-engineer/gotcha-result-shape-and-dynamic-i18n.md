---
name: gotcha-result-shape-and-dynamic-i18n
description: Domain Result uses {ok,value}/{ok,failure} (not .error); dynamic t(`errors.${key}`) needs ALL union keys present in every namespace
metadata:
  type: feedback
---

Two recurring traps when wiring admin feature presentation/actions on this repo.

**1. Result shape is `{ ok, value }` / `{ ok, failure }` — NOT `.error`.**
`src/features/*/domain/use-cases/result.ts` defines
`Result<T,E> = { ok:true; value:T } | { ok:false; failure:E }`.
Server Actions map `result.failure.type` → `errorKey`. Story packets sometimes
show `result.error.type` / `result.ok` returning the value — that is wrong for
this codebase. Always grep the feature's `result.ts` before writing actions.

**Why:** copying the packet's `result.error.type` example fails tsc immediately.
**How to apply:** in `app/**/actions.ts`, `if (!result.ok) return { ok:false, errorKey: result.failure.type }`.

**2. Dynamic `t(`errors.${result.errorKey}`)` requires every member of the
failure union to exist as a key in that screen's `errors` namespace.**
typed next-intl checks the dynamic key against the *union* of errorKey, so if the
failure union has 10 members but a screen's `errors.*` only lists 6, tsc errors on
the 4 missing literals (`member-not-teacher`, etc.) even if that screen never
emits them. Fix: give each screen's `errors` namespace the FULL failure-union key
set (in vi.json AND en.json). Context-specific wording can differ per screen;
generic fallback wording is fine for keys a screen won't realistically hit.

**Why:** saved hours debugging "Type '\"errors.member-not-teacher\"' is not
assignable" on US-E12.9 staffing departments screen.
**How to apply:** when a feature has one shared `StaffingFailure`-style union but
multiple sub-screens each with their own `errors` namespace, mirror all union keys
into every sub-namespace.

Related: [[pattern-usecase-result]], [[pattern-mock-first-wiring]].
