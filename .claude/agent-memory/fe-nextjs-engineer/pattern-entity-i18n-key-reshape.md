---
name: pattern-entity-i18n-key-reshape
description: US-E18.25 — reshaping an entity from pre-rendered text to BE i18n key+params; shared known-key table in domain, bounded drain/batch loops, guard-throw outside toFailure
metadata:
  type: project
---

Un-mocking a feature whose mock shipped **pre-rendered text** while the real wire
ships **i18n key + params** (BE no-free-text-at-rest policy).

**Why:** ADR 0066 / US-E18.25. The mock's `titleVi/titleEn` was itself the thing
to retire — domain/repo must never translate (`i18n.md`).

**How to apply:**

- **Known-key table belongs in `domain/`, not the component.** Three layers need
  the same list and none may import each other: the infra mock mapper, the
  presentation allow-list, and a client-side SSE hook that synthesises entities.
  A pure `domain/entities/<x>-message-key.ts` (arrays + `isKnownXKey` type
  guards + `mockKeyPairForType`) is importable from `presentation` (types/pure TS
  only) AND `infrastructure`. Planner-sketched inline `Set`s in the `.tsx` would
  have duplicated it 3×.
- **Grep for the surprise consumer BEFORE trusting the plan's file list.** Here a
  mock-only SSE hook (`use-notification-new-event.ts`) also constructed the
  entity from `titleVi/titleEn` — not in the plan's file table. The entity type
  change is what surfaces it (compile error), but grep `\.title\b|titleVi` first.
- **Presentation fallback:** `isKnownTitleKey(k) ? (`titles.${k}` as const) :
  ("titles.unknown" as const)` — the type guard NARROWS `k` so the template
  literal type-checks against typed messages with no wide cast.
- **Default every ICU arg the copy uses**: `t(key, { severity: "", ...params })`.
  A param-less wire row otherwise produces an ICU formatting error at render.
  Keep copy off unformattable params (raw ISO `occurredAt` renders ugly and the
  row already shows a `<time>`), but still pass params through.
- **Two mappers, not one union DTO**: `mapNotification(realDto)` passthrough +
  `mapMockNotification(mockDto, index)` synthesising a plausible key-pair. Fixture
  data file stays byte-identical (retype only). Categories with no real producer
  → the `unknown` sentinel pair, never borrow another category's copy.
- **Bounded loops**: `markAllRead` repeats a 500-capped `read-batch` while
  `hasMore`; guard `throw new Error(...)` lives INSIDE the `while` but OUTSIDE the
  per-call `try` so `toFailure` cannot swallow the invariant violation into
  `{type:"unknown"}` — test asserts `rejects.toThrow(/MAX_BATCHES/)` AND the exact
  call count. Export `MAX_BATCHES`/`MAX_PAGES` so the test locks the literal bound.
- **Client-side drain for a filter the wire lacks**: page at the BE max following
  the REAL cursor, filter locally, break on `collected.length >= limit ||
  !realHasMore`, and report the REAL last-page `hasMore` (never recomputed) so
  "Load more" keeps draining. Test the all-read-page-1 → page-2-has-unread case.
- Retiring a `Hybrid*` facade = delete class + test, DI back to plain
  `USE_MOCK ? Mock : Real` (keep `ensureFreshSession()` in the real branch).

Related: [[pattern-hybrid-partial-real-wiring]], [[pattern-boundary-narrow-remap]],
[[gotcha-result-shape-and-dynamic-i18n]].
