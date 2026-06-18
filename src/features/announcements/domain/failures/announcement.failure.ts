/**
 * Typed failure union for the announcements feature (US-E10.3).
 * The `type` keys map to i18n keys under `announcements.errors`.
 * Presentation translates; domain/repo/action never does.
 */
export type AnnouncementFailure =
  | { type: "not-found" }
  | { type: "unauthorized" }
  | { type: "title-too-short" }
  | { type: "body-too-short" }
  | { type: "no-audience" }
  | { type: "schedule-past-date" }
  | { type: "network-error" }
  | { type: "unknown" };
