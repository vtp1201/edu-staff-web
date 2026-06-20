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
  | { type: "not-group-admin" };
