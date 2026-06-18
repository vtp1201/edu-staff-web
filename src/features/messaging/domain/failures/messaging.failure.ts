/**
 * Stable failure union for the messaging feature. The `type` doubles as the
 * i18n key under `messaging.errors.*` — presentation translates, the domain
 * never does.
 */
export type MessagingFailure =
  | { type: "load-conversations-failed"; cause?: string }
  | { type: "load-messages-failed"; conversationId?: string; cause?: string }
  | { type: "send-message-failed"; cause?: string }
  | { type: "create-conversation-failed"; cause?: string };
