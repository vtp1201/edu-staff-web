/**
 * Stable failure union for the messaging feature. The `type` doubles as the
 * i18n key under `messaging.errors.*` — presentation translates, the domain
 * never does.
 */
export type MessagingFailure =
  | { type: "load-conversations-failed"; cause?: string }
  | { type: "load-messages-failed"; conversationId?: string; cause?: string }
  | { type: "send-message-failed"; cause?: string }
  | { type: "create-conversation-failed"; cause?: string }
  // US-E18.52 — the contact picker is a REAL IAM directory read now. One
  // user-facing type; `cause` keeps the IAM failure distinguishable:
  // `role-filter-required` (a disallowed/missing `role=` filter — an FE wiring
  // bug) vs `forbidden` (no directory access at all) vs
  // `directory-port-not-wired` (DI misconfiguration).
  | { type: "load-contacts-failed"; cause?: string }
  // US-E10.4 — group lifecycle + message interactions
  | { type: "create-group-failed"; cause?: string }
  // US-E18.50 / BE US-193 — the real `POST /rooms/groups` is role-gated
  // (ADMIN/MANAGER/TEACHER/STAFF allow-list); a STUDENT/PARENT attempt returns
  // 403 SOCIAL_GROUP_ROOM_CREATION_FORBIDDEN. Distinct from a generic create
  // failure: retrying can never help — the copy must say "not permitted".
  | { type: "create-group-forbidden" }
  // US-E18.50 / BE US-193 — archive is scoped to self-service (`custom`) rooms;
  // a system-provisioned class_chat/parent_group returns
  // 409 SOCIAL_ROOM_NOT_SELF_SERVICE. Distinct so the UI can explain WHY.
  | { type: "group-not-self-service" }
  | { type: "group-mutation-failed"; action?: string; cause?: string }
  | { type: "leave-group-failed"; cause?: string }
  | { type: "pin-failed"; cause?: string }
  // US-E18.51 — real pin board (BE US-192). Each maps 1:1 to a distinct wire
  // outcome so an actionable failure never shows as a generic "pin failed".
  /** 409 `SOCIAL_PIN_LIMIT_REACHED` — the room already holds 50 pins. */
  | { type: "pin-limit-reached" }
  /** 409 `SOCIAL_MESSAGE_ALREADY_PINNED`. */
  | { type: "message-already-pinned" }
  /** 404 `SOCIAL_MESSAGE_NOT_PINNED` — unpin against a stale pin board. */
  | { type: "message-not-pinned" }
  /** 403 `SOCIAL_INSUFFICIENT_ROOM_PERMISSION` / `ROOM_NOT_MEMBER` — the caller
   *  lacks the room's `moderate_msg` capability (OWNER/ADMIN/MODERATOR). */
  | { type: "pin-forbidden" }
  /** Pin-board read failed. Carries the wire code as `cause`, exactly like the
   *  message-history read whose 120/min quota it shares (429
   *  `SOCIAL_READ_RATE_LIMITED`) — no parallel rate-limit mapping. */
  | { type: "load-pinned-failed"; cause?: string }
  | { type: "delete-message-failed"; cause?: string }
  // US-E18.17 — real self-delete window is 5 min; a reactive 403 past the
  // window (client/server race) surfaces this distinct key.
  | { type: "delete-window-expired" }
  | { type: "not-group-admin" }
  // US-E18.17 — read-state + typing (real `social` rooms). Typing failures
  // (incl. 429 cooldown) are swallowed at the presentation call site, but the
  // repo/use-case layer still returns a proper Result — never a special-case
  // below the presentation boundary.
  | { type: "mark-read-failed"; cause?: string }
  | { type: "typing-signal-failed"; cause?: string }
  // US-E10.6 — presence snapshot (INT-401). One generic member: the UI treats
  // every presence failure identically (render no dot), so no need to over-model.
  | { type: "load-presence-failed"; cause?: string };
