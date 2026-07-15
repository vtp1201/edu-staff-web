import type { StatusTone } from "@/components/shared/status-badge";
import type { FeedRole } from "../../../domain/entities/feed-post.entity";

/**
 * Role → badge tone (design-system.md §Role→màu, decision 0013): teacher→primary,
 * principal→success, student→warning, parent→purple. Reuses the existing
 * StatusBadge tone set — NOT a parallel colour system (component-organization.md).
 */
export function feedRoleTone(role: FeedRole): StatusTone {
  switch (role) {
    case "principal":
      return "success";
    case "student":
      return "warning";
    case "parent":
      return "purple";
    default:
      return "primary";
  }
}
