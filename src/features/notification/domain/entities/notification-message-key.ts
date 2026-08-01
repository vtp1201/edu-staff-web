/**
 * Known notification title/body i18n keys (US-E18.25, ADR 0066).
 *
 * Pure TypeScript, zero framework deps — lives in `domain/` because THREE
 * layers need the same table and none of them may import each other:
 * - `infrastructure/mappers` (mock mapper synthesises a plausible key-pair),
 * - `presentation` (known-key allow-list for the `t()` lookup + fallback),
 * - `presentation/use-notification-new-event` (mock-only SSE frame → entity).
 *
 * These are the ONLY key-pairs BE currently produces (ground-truthed against
 * `edu-api/services/notification/docs/INTEGRATION.md` §"Notification center
 * (US-146)", 2026-08-01). BE may ship a 5th pair at any time — anything not
 * listed here MUST degrade to the `unknown` fallback copy at presentation,
 * never render a raw key.
 */

export const NOTIFICATION_TITLE_KEYS = [
  "notification_discipline_violation_title",
  "notification_attendance_absence_title",
  "notification_grade_conduct_approved_title",
  "notification_attendance_leave_approved_title",
] as const;

export const NOTIFICATION_BODY_KEYS = [
  "notification_discipline_violation_body",
  "notification_attendance_absence_body",
  "notification_grade_conduct_approved_body",
  "notification_attendance_leave_approved_body",
] as const;

export type KnownNotificationTitleKey =
  (typeof NOTIFICATION_TITLE_KEYS)[number];
export type KnownNotificationBodyKey = (typeof NOTIFICATION_BODY_KEYS)[number];

/**
 * Sentinel key-pair for content this build has no copy for. Deliberately NOT
 * a member of the two lists above so it takes the presentation fallback path.
 */
export const UNKNOWN_TITLE_KEY = "notification_unknown_title";
export const UNKNOWN_BODY_KEY = "notification_unknown_body";

export function isKnownTitleKey(key: string): key is KnownNotificationTitleKey {
  return (NOTIFICATION_TITLE_KEYS as readonly string[]).includes(key);
}

export function isKnownBodyKey(key: string): key is KnownNotificationBodyKey {
  return (NOTIFICATION_BODY_KEYS as readonly string[]).includes(key);
}

/**
 * Best-effort category → key-pair mapping, used ONLY by mock/synthetic paths
 * (the mock repository's mapper and the mock-only `notification.new` SSE
 * frame) so demo data emits the SAME entity shape the real wire does.
 *
 * `announcement`/`system` have no real producer today, so they intentionally
 * resolve to the `unknown` sentinel pair rather than borrowing an unrelated
 * category's copy.
 */
export function mockKeyPairForType(
  type: string,
  variant = 0,
): { titleKey: string; bodyKey: string } {
  switch (type) {
    case "discipline":
      return {
        titleKey: "notification_discipline_violation_title",
        bodyKey: "notification_discipline_violation_body",
      };
    case "grade":
      return {
        titleKey: "notification_grade_conduct_approved_title",
        bodyKey: "notification_grade_conduct_approved_body",
      };
    case "attendance":
      return variant % 2 === 0
        ? {
            titleKey: "notification_attendance_absence_title",
            bodyKey: "notification_attendance_absence_body",
          }
        : {
            titleKey: "notification_attendance_leave_approved_title",
            bodyKey: "notification_attendance_leave_approved_body",
          };
    default:
      return { titleKey: UNKNOWN_TITLE_KEY, bodyKey: UNKNOWN_BODY_KEY };
  }
}
