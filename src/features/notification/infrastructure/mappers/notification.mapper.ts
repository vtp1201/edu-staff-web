import "server-only";
import type {
  NotificationEntity,
  NotificationType,
} from "../../domain/entities/notification.entity";
import { mockKeyPairForType } from "../../domain/entities/notification-message-key";
import type {
  MockNotificationResponseDto,
  NotificationResponseDto,
} from "../dtos/notification-response.dto";

const VALID_TYPES: ReadonlySet<NotificationType> = new Set([
  "grade",
  "attendance",
  "discipline",
  "announcement",
  "system",
]);

function toType(raw: string): NotificationType {
  if (VALID_TYPES.has(raw as NotificationType)) return raw as NotificationType;
  return "system";
}

/**
 * REAL wire DTO → Entity (US-E18.25, ADR 0066).
 *
 * Straight passthrough of the BE-owned i18n key + params — NO locale, NO
 * translation here (i18n.md §"Nơi dịch": presentation translates, never the
 * repository/mapper). Params default to `{}` so a wire row that omits them
 * can never make `t(key, undefined)` blow up downstream.
 */
export function mapNotification(
  dto: NotificationResponseDto,
): NotificationEntity {
  return {
    id: dto.id,
    type: toType(dto.type),
    titleKey: dto.titleKey,
    titleParams: dto.titleParams ?? {},
    bodyKey: dto.bodyKey,
    bodyParams: dto.bodyParams ?? {},
    ts: dto.ts,
    read: dto.read,
  };
}

/**
 * MOCK fixture DTO → the SAME entity shape the real mapper produces.
 *
 * The mock has no key/param data of its own (its pre-rendered `titleVi`/… text
 * is deliberately dropped — ADR 0066), so a plausible key-pair is synthesised
 * from the fixture's category. `announcement`/`system` have no real producer
 * and resolve to the `unknown` sentinel pair. Only displayable scalars are
 * emitted (`severity`, `occurredAt`) — never a UUID.
 *
 * @param index fixture position — only used to alternate between the two real
 *   `attendance` producer key-pairs so demo data shows both.
 */
export function mapMockNotification(
  dto: MockNotificationResponseDto,
  index = 0,
): NotificationEntity {
  const type = toType(dto.type);
  const { titleKey, bodyKey } = mockKeyPairForType(type, index);
  const severity: Record<string, string> =
    type === "discipline" ? { severity: "MINOR" } : {};

  return {
    id: dto.id,
    type,
    titleKey,
    titleParams: { ...severity },
    bodyKey,
    bodyParams: { ...severity, occurredAt: dto.ts },
    ts: dto.ts,
    read: dto.read,
  };
}
