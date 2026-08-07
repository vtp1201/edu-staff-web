---
name: be-social-group-rooms
description: social self-service group-room contract (BE US-193/ADR 0132) — what is real, and the 5 group methods that are NOT
metadata:
  type: project
---

Ground-truthed 2026-08-07 against `edu-api/services/social/docs/openapi.yaml` +
`internal/room/adapter/http/routes.go` + `core/application/usecase/remove_room_member.go`.

**Real (US-193):**
- `POST /api/v1/rooms/groups` (201) — body `{name}` ONLY (1..255). Creator+tenant from
  claims. Allow-list ADMIN/MANAGER/TEACHER/STAFF; else 403
  `SOCIAL_GROUP_ROOM_CREATION_FORBIDDEN`. Response does NOT echo membership.
- `POST /api/v1/rooms/{roomId}/archive` (204, idempotent) — `custom` rooms only;
  409 `SOCIAL_ROOM_NOT_SELF_SERVICE` on class_chat/parent_group; 403
  `SOCIAL_INSUFFICIENT_ROOM_PERMISSION` (OWNER-only `delete_room`, ADR 0065).

**NOT real — verified absent/blocked, don't re-litigate:**
- `updateGroup` — `routes.go` has ONLY `GET /:roomId` and `POST /:roomId/archive`.
  There is no `PATCH`/`PUT /rooms/{roomId}`; a room name is not editable at all.
- `getGroup`/`addGroupMembers`/`removeGroupMember` — endpoints exist, but `RoomMember`
  is `{userId, roomRole, mutedUntil, joinedAt, addedAt}` — **no display name**. Any FE
  method returning `GroupEntity` needs a 3-call fan-out (detail + members +
  `GET /social/rooms/{id}/members/directory`) plus description/kind/colour that exist on
  NO room endpoint. That's an entity reshape, not a repo swap.
- `leaveGroup` — `DELETE /rooms/{roomId}/members/{userId}` self-leave DOES bypass the
  `remove_member` capability when actor==target (ADR 0094, confirmed in
  `remove_room_member.go`), but the last-OWNER guard is **retained unconditionally**
  (a sole OWNER cannot leave) and the endpoint is **not scoped to `custom` rooms** — it
  would let a member leave a provisioned `class_chat`/`parent_group`.

**Why the leave/add/remove trio must wait for the members read:** wiring a real write
whose confirming read is still mock = the US-E18.31 fake-success surface.
See [[recurring-violations]] #8.
