/**
 * Wire shape for presence (US-E18.18, ground-truthed against
 * `GET /api/v1/presence`). The real wire is a flat 2-state model
 * (`online` boolean + `lastSeen` timestamp), NOT the domain's 3-state
 * `online|recent|offline` enum — the mapper derives the 3rd state client-side.
 * `lastSeen` is populated only when the user is offline (and previously seen);
 * it is `null` when online or never seen. All fields camelCase.
 */
export type PresenceResponseDto = {
  userId: string;
  online: boolean;
  lastSeen: string | null;
};

/** The presence endpoint wraps the rows in `{ items: [...] }`. */
export type PresenceListResponseDto = {
  items: PresenceResponseDto[];
};
