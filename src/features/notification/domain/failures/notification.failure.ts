/**
 * Typed failure union for the notification feature (US-E10.2).
 * The `type` keys map to i18n keys under `notifications.errors`.
 * Presentation translates; domain/repo/action never does.
 */
export type NotificationFailure =
  | { type: "not-found" }
  | { type: "unauthorized" }
  | { type: "network-error" }
  | { type: "unknown" };
