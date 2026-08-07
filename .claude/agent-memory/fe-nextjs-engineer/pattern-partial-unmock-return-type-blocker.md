---
name: pattern-partial-unmock-return-type-blocker
description: E18.50 — per-method ground truth must check the RETURN TYPE, not just endpoint existence; a real endpoint can be correctly left un-wired; narrowing an input type means deleting UI controls, not collecting-and-dropping
metadata:
  type: project
---

When a BE batch "ships feature X", the un-mock verdict is **per method**, and the
deciding factor is often the domain method's RETURN type, not whether an
endpoint exists.

**Why:** US-E18.50 (messaging group lifecycle, BE US-193/ADR 0132). Of 7
methods, only `createGroup` (`POST /rooms/groups`) and `deleteGroup` (→ `POST
/rooms/{id}/archive`) became real. `addGroupMembers`/`removeGroupMember`/
`getGroup` all HAVE endpoints (`POST|GET /rooms/{id}/members`, `DELETE
/rooms/{id}/members/{userId}`, `GET /rooms/{id}`) — but each returns a full
`GroupEntity` whose members need display names (`RoomMember` = userId/roomRole/
joinedAt only) plus description/kind/colour that exist on no endpoint. Wiring
them = 3-call fan-out + entity reshape, i.e. a different story. Wiring only the
write half would produce a fake-success surface (the E18.31 lesson).

**How to apply:**
- Grep the openapi AND the Go handlers/`routes.go`/use-case (spec drifts). A
  capability mentioned in an ADR (e.g. "self-leave bypass") may only be
  implemented for a sibling resource.
- Check the port signature against the wire BEFORE declaring a method real:
  `Result<boolean>` un-mocks cheaply; `Result<RichEntity>` usually does not.
- A real endpoint that is **semantically unsafe** may be correctly left mock:
  `leaveGroup` maps to `DELETE /rooms/{id}/members/{self}`, but unlike archive
  it is NOT scoped to `custom` rooms (a member could leave a provisioned
  class_chat) and the last-OWNER guard needs its own failure. Report it to
  `fe-lead` as a follow-up instead of silently enabling or silently omitting.
- Put a per-method verdict TABLE in the hybrid facade doc-comment and the reason
  next to each remaining stub; state the resulting asymmetry out loud ("a group
  you create is real, its info panel is still mock").

**Narrowing an invented input type is a UI deletion, not a mapping tweak.**
`CreateGroupInput` had 4 fields with zero wire backing. The packet offered
"remove them from the form" OR "collect but never send" — the second is a UI
that lies, so: single-step name-only form, `color-swatches.ts` deleted, 16 dead
`messaging.group.*` keys pruned from vi+en, stories rewritten. Derive what the
UI still needs (group tone) from an id via the existing `roomColorKey` rotation
in BOTH mock and real, so mock and real look alike without a persisted colour.

**A create response that doesn't echo membership gets `members: []`.** The
contract guarantees the caller is OWNER, but there is no display name on the
wire — a synthesized row is fiction. Keep the entity honest and put the
inference at the call site (`Math.max(members.length, 1)` for the optimistic
row), commented as an inference. See [[pattern-unfake-non-persistent-field]],
[[pattern-partial-gap-closure-wiring]].
