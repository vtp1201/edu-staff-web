---
name: be-social-message-pin
description: social room message-pin contract (BE US-192) — always-empty senderName, no wire capability, self-healing board read, error-code set
metadata:
  type: reference
---

# `social` message pin / pin board (BE US-192, consumed by US-E18.51)

Verified by reading the Go source directly, not just `openapi.yaml`.

## Endpoints
- `POST|DELETE /api/v1/rooms/{roomId}/messages/{messageId}/pin` — **no request body**
  (handler builds input from path params + `actorFrom(c)`). 201 / 204.
- `GET /api/v1/rooms/{roomId}/pinned-messages` — flat array, **not paginated**
  (bounded by the 50 cap), newest-pin-first. Enveloped ⇒ the normal interceptor
  unwrap applies; do NOT use `{ raw: true }`/`parseEnvelope` here.

## Gates differ per verb (the reason pins are their own resource)
- Board READ = room **membership only** (`requireMember`).
- pin/unpin = `moderate_msg` capability (OWNER/ADMIN/MODERATOR, ADR 0065).
⇒ A 403 on the READ is a membership problem, NOT a capability problem. Never map
it to a `pin-forbidden`-style key.

## Two traps confirmed in the Go source
1. **`senderName` — SUPERSEDED 2026-08-08 (BE US-205, consumed by US-E18.58).**
   Was always `""` on the pin board (`toMessageDTO(msg, "")`); ask #32(b′) is now
   answered. Current contract, and it is **per-endpoint**:
   - **pin board** — resolved server-side from the member projection: a REAL
     name, never `""`; when the sender is not projected yet BE emits the literal
     English sentinel **`"Member"`**.
   - **history / search / edit** — still `toMessageDTO(m, "")` i.e. `""`
     (unchanged; names come from the room directory instead).
   FE rule: normalise BOTH the `"Member"` sentinel (exact, case-sensitive,
   post-trim — a real name may *contain* the word) and a blank to an ABSENT
   entity key, and render the one existing i18n fallback. Never mint a
   placeholder in the mapper; never print the English sentinel in a vi locale.
   The `openapi.yaml` `Message`-schema drift was fixed BE-side (additive,
   non-required field).
2. **No caller room-role/capability exists anywhere on the wire** (`RoomSummary`
   carries none). Any binary `disabled = !isAdmin` gate is permanently dead in
   real mode. Correct pattern = tri-state: `undefined` (unknown) ⇒ enabled +
   reactive 403; only an explicit `false` (mock world) disables.

## Error codes (UPPER_SNAKE on the wire; lower_snake in Go)
| Go | HTTP | meaning |
| --- | --- | --- |
| `social_pin_limit_reached` | 409 | 50-pin room cap (hard, not configurable) |
| `social_message_already_pinned` | 409 | — |
| `social_message_not_pinned` | 404 | unpin against a stale board |
| `social_insufficient_room_permission` | 403 | lacks `moderate_msg`; ALSO what a non-member gets (`notMemberToForbidden` converts the 404) |
| `social_read_rate_limited` | 429 | shared 120/min quota with message HISTORY — reuse history's mapping, don't invent a parallel rate-limit failure |

Two different 409s ⇒ branching on status is insufficient; must branch on `code`.

## Self-healing board read
The list use-case drops a pin whose message point-read 404s **and** one whose
`status == deleted` — the pin row itself survives until an explicit unpin (no
reconciler). So the FE mapper must SKIP such rows, never render a
"message deleted" placeholder.

## No realtime signal
Pin/unpin have NO SSE/websocket push (unlike send/typing). Freshness = refetch
the board after the 201/204. Confirmed absent, not merely unbuilt.
