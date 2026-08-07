import type { MessagingFailure } from "@/features/messaging/domain/failures/messaging.failure";

/**
 * Every stable messaging failure key. Typed as an exhaustive `Record` so adding
 * a member to `MessagingFailure` without listing it here is a COMPILE error —
 * the same discipline that keeps `messaging.errors.*` in sync (a key that
 * reaches `t()` untyped would blow up at runtime instead).
 */
const MESSAGING_ERROR_KEYS: Record<MessagingFailure["type"], true> = {
  "load-conversations-failed": true,
  "load-messages-failed": true,
  "send-message-failed": true,
  "create-conversation-failed": true,
  "create-group-failed": true,
  "create-group-forbidden": true,
  "group-not-self-service": true,
  "group-mutation-failed": true,
  "leave-group-failed": true,
  "pin-failed": true,
  "pin-limit-reached": true,
  "message-already-pinned": true,
  "message-not-pinned": true,
  "pin-forbidden": true,
  "load-pinned-failed": true,
  "delete-message-failed": true,
  "delete-window-expired": true,
  "not-group-admin": true,
  "mark-read-failed": true,
  "typing-signal-failed": true,
  "load-presence-failed": true,
};

/**
 * Narrow a mutation rejection message (mutations reject with
 * `new Error(errorKey)`) to a translatable failure key. Anything else — a real
 * runtime error, a network throw — is NOT a key and must not reach `t()`.
 */
export function isMessagingErrorKey(
  value: string,
): value is MessagingFailure["type"] {
  return Object.hasOwn(MESSAGING_ERROR_KEYS, value);
}
