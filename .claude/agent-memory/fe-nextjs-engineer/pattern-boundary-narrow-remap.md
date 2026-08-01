---
name: pattern-boundary-narrow-remap
description: US-E18.24 — remapping an existing mock-first feature onto a narrower real wire contract (internal-rich/boundary-narrow entities, error-code-before-status ordering, i18n block restructure when a UI concept dies)
metadata:
  type: project
---

Un-mocking an EXISTING feature whose mock invented richer data than the wire has.

**Internal-rich, boundary-narrow.** Keep the mock's fat entity as internal state,
add NEW entities 1:1 with each real response, and map at each repo method's
boundary. Prove it with a key-set assertion
(`expect(Object.keys(result.data).sort()).toEqual([...])`) — a `toMatchObject`
would silently pass while mock-only fields leak into the real contract's shape.
Doc-comment the demoted entities `MOCK-INTERNAL-ONLY` or the next reader
re-wires them.

**`toFailure` ordering is load-bearing.** Put the `switch (code)` BEFORE the
generic `status === 404 / 403 / >=500` fallbacks. A specific code on a generic
status (`UNSEAL_REQUEST_NOT_FOUND` = 404 → `no-pending-request`, not
`not-found`) is swallowed otherwise. Only the per-code matrix test catches this.

**Optional-vs-required in openapi is real signal.** Check the schema's
`required:` list, not just the property block — nullable/absent timestamp fields
(`lastSealedAt`, `unsealedAt`) must be `field?: string | null` in the DTO with
`?? null` in the mapper. The plan will not have this detail.

**When the wire kills a UI concept, kill the i18n block too.** Losing one field
(per-subject list) cascaded: `gate.allLocked.*`/`gate.notAllLocked.*` no longer
described anything, so the whole block became `gate.rollup.*`. Grep for dead
keys after re-fielding components (`card.confirmedBy`, `statusApprovedSelf` were
orphaned by dropping `coSignerName`/`selfApproved`). `tsc` catches dangling
references in EVERY dynamic-`t()` namespace — here both `academicRecord.error`
and `academicRecordSeal.errors` needed the same 3 new keys.

**Editing messages/*.json programmatically: never re-sort the whole file.**
`json.dump(sorted(everything))` produced a 2000-line diff; sort only the objects
you actually touched.

**A 3-value enum with 2 indistinguishable states needs explicit UI copy.**
`PENDING` covered both "never sealed" and "sealed then fully unsealed",
distinguishable only by a non-null timestamp. Add the two strings and a story
per branch — otherwise the UI silently lies about one of them.

**Phase commits under lefthook.** `tsc --noEmit` runs against the WORKING TREE,
not the index — so finish all phases green, then `git add` per-phase file sets
and commit in order. Phase-1-only commits mid-flight always fail the hook.

**Repo-wide `bun lint` truncates diagnostics — it can misattribute YOUR error.**
A formatting error in a file I had just edited surfaced under a trailing,
unrelated pre-existing diagnostic in `messaging/message-context-menu.tsx`, so it
read as "someone else's, pre-existing". Before concluding that, scope it:
`bunx biome check src/features/<x>`. Stash-vs-dirty exit-code comparison is the
fastest disambiguation.

**Shared `LoadMoreButton` needs `hasError` explicitly.** Passing only
`errorLabel` compiles fine but the retry copy is unreachable and a
`fetchNextPage` failure is silent. Convention across feed/moderation/this
screen: `hasError={query.isError && rows.length > 0}` — the exact complement of
a first-page-only screen-level error escalation (rows present ⇒ the load-more
failed ⇒ keep rows, swap label only). The shared component only swaps the
LABEL; it has no `aria-live`, so announcing appended rows would be a shared-
component change across 7 callers — flag it, don't drive-by widen it.

Related: [[pattern-be-wiring-remap]], [[pattern-hybrid-partial-real-wiring]],
[[gotcha-openapi-drifts-from-go-source]], [[pattern-shared-infra-feature-module]].
