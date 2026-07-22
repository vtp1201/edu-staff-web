/**
 * Wire shape for `POST /social/api/v1/rooms/school-dms` (US-118/ADR 0089).
 * Find-or-create a same-tenant 1:1 DM — returns the room id + whether it was
 * newly created + the DM request status.
 */
export type SchoolDmResponseDto = {
  roomId: string;
  created: boolean;
  requestStatus: "accepted" | "pending";
};
