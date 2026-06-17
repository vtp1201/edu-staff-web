import "server-only";
import type {
  NotificationEntity,
  NotificationType,
} from "../../domain/entities/notification.entity";
import type { NotificationResponseDto } from "../dtos/notification-response.dto";

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
 * DTO → Entity. Locale is passed in so this mapper can be tested with either locale.
 * The `locale` is the next-intl locale string ("vi" | "en").
 */
export function mapNotification(
  dto: NotificationResponseDto,
  locale: string,
): NotificationEntity {
  const title = locale === "vi" ? dto.titleVi : dto.titleEn;
  const body = locale === "vi" ? dto.bodyVi : dto.bodyEn;
  return {
    id: dto.id,
    type: toType(dto.type),
    title: title || dto.titleVi,
    body: body || dto.bodyVi,
    ts: dto.ts,
    read: dto.read,
  };
}
