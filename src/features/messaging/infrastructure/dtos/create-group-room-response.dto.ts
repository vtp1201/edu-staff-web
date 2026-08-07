/**
 * `POST /api/v1/rooms/groups` 201 payload (BE US-193, `CreateGroupRoomResponse`
 * in `services/social/docs/openapi.yaml`). Ground-truthed against the Go DTO
 * (`room_request.go`) too, not just the spec.
 *
 * Deliberately narrow: the response does NOT echo membership. The caller is
 * seeded as the room OWNER server-side, but there is no member list, no
 * description, no kind and no colour on this wire — those either do not exist
 * on the `Room` entity at all or are client-side derivations.
 */
export type CreateGroupRoomResponseDto = {
  roomId: string;
  scope: "SCHOOL";
  /** The caller's own tenant, resolved server-side; nullable on the wire. */
  tenantId: string | null;
  roomType: "custom";
  name: string;
  status: "active";
  createdAt: string;
};
