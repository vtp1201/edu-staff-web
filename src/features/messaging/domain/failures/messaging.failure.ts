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
  // US-E10.4 — group lifecycle + message interactions
  | { type: "create-group-failed"; cause?: string }
  | { type: "group-mutation-failed"; action?: string; cause?: string }
  | { type: "leave-group-failed"; cause?: string }
  | { type: "pin-failed"; cause?: string }
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
