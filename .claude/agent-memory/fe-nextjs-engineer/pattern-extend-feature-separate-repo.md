---
name: pattern-extend-feature-separate-repo
description: Extending an existing feature with a new admin flow — add a separate repo interface, not widen the existing one
metadata:
  type: feedback
---

When a 2nd story adds a flow to an existing feature module (e.g. grades: E14.2
entry → E14.4 admin approval), prefer a **separate repo interface +
impl + mock** (`i-<new>.repository.ts`) over widening the existing
`IXxxRepository`.

**Why:** the existing grades repo's constructor needed `(http, scheme,
publishMode)` threaded from two other DI factories; the approval flow needs none
of that. A separate `IGradeApprovalRepository(http)` kept E14.2 entirely
untouched (its 700+ tests stayed green) and let the approval DI factory be a
clean `USE_MOCK ? Mock : new Repo(http)`.

**How to apply:** new flow shares entities/failure-union but has its own repo
contract. List/detail endpoints that carry NO domain rules → expose
`makeXxxRepository()` and call from the RSC/action directly; only the
state-mutating ops get use-case classes. Extending the shared failure union
(`grades.failure.ts`) DOES ripple to every `Record<Failure["type"], …>` in the
OTHER screen — add the new keys there (map to a generic errorUnknown msg) or tsc
fails. See also [[gotcha-result-shape-and-dynamic-i18n]].

Filter-pill a11y: Biome rejects `role="group"`/`role="radio"` on div — use a
`<fieldset class="border-0 p-0">` + sr-only `<legend>` wrapping `aria-pressed`
buttons (confirms [[gotcha-filter-pills-a11y]]).
