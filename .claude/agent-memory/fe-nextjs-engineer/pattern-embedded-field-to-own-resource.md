---
name: pattern-embedded-field-to-own-resource
description: E18.51 — when the real contract exposes a mock-era EMBEDDED field as its own endpoint with its own auth gate, delete the field (don't repoint it); plus tri-state capability gates and "" as absent
metadata:
  type: project
---

US-E18.51 wired social message pin/unpin + pin board (BE US-192) onto a feature
whose mock era carried `GroupEntity.pinnedMessages` as an embedded array.
Extends [[pattern-hybrid-partial-real-wiring]], [[pattern-messaging-rooms-remap-e18-17]].

**Embedded mock field → own real resource ⇒ DELETE the field.** Three tests for
"is it really the same thing?": (a) different AUTH gate (board read = membership,
pin/unpin = `moderate_msg`), (b) different LIFECYCLE (own loading/error/refetch —
an entity field cannot express those), (c) different HOST availability (the
parent read `getGroup` was still force-mocked, so populating the field would put
mock rows next to real writes = the fake-publish class from
[[pattern-partial-gap-closure-wiring]]). Composing the real read INTO the mock
entity at DI is equally wrong: it couples a real read's quota/failures to a mock
read and hides the resource from other room types the endpoint serves. New
entity file + new repo method + own query key + props threaded
screen→window→panel→row. Ripple was small because only ONE component read it —
grep the consumers before assuming the reshape is expensive.

**`""` on the wire is ABSENT, not a value.** Go `toMessageDTO(msg, "")` — the
pin board embeds messages with an always-empty `senderName` (it is stamped from
the SENDER's claims at send time, never persisted). Entity field goes optional,
mapper does `msg.senderName?.trim()` + conditional spread, presentation renders
an i18n fallback. Prove it with `expect(Object.keys(x)).not.toContain(...)` /
`not.toHaveProperty` — `toEqual` happily passes with `senderName: undefined`.
Also: the Go handler emitted a field `openapi.yaml` never declared (drift again,
[[gotcha-openapi-drifts-from-go-source]]) — read the handler AND the use-case,
the use-case is where the field is zeroed.

**A mock-era capability field is `undefined` in real mode ⇒ tri-state the gate.**
`pinDisabled = isGroup && !selfIsGroupAdmin` becomes a permanently DEAD control
once the wire has no room-role field. Change to `=== false`: `undefined` =
unknown ⇒ allow the attempt, map the server 403 to a distinct failure. Same rule
for any new affordance (`canUnpin !== false`). Otherwise you ship the
[[gotcha-affordance-unreachable-by-role]] defect on purpose.

**An AC verb with no UI is unreachable.** "can pin/unpin" — the codebase had a
`unpinMessage` repo method wired to nothing for two epics. Adding the missing
affordance is in scope; a repo method nobody can call is not proof.

**Same status, different codes ⇒ separate failures; but don't invent a parallel
mapping for a SHARED quota.** Two 409s (cap-reached vs already-pinned) get
distinct keys; the board's 429 reuses message-history's exact shape
(`{type: load-…-failed, cause: CODE}`). And a 403 on the READ path is membership,
not capability — deliberately NOT the `*-forbidden` key (assert this negatively).

**No realtime signal ⇒ prove the refetch by CALL COUNT.** Gate the list query on
the entity being active, not on the panel being open, or invalidation cannot
actually refetch (the board would just be stale next open). Snapshot
`mock.calls.length` before the mutation and assert it grows — "the panel fetches
when I open it" proves nothing about invalidation.

**Exhaustive `Record<Failure["type"], true>` as an error-key guard.** Narrowing a
mutation rejection (`new Error(errorKey)`) to something `t()` accepts: a Record
makes a new failure member a COMPILE error, and `Object.hasOwn` (not `in`) keeps
`toString`/`constructor` out.
