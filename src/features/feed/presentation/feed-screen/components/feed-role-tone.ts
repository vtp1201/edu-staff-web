import type { StatusTone } from "@/components/shared/status-badge";
import type { FeedRole } from "../../../domain/entities/feed-post.entity";

/**
 * Role → badge tone (design-system.md §Role→màu, decision 0013): teacher→primary,
 * principal→success, student→warning, parent→purple. Reuses the existing
 * StatusBadge tone set — NOT a parallel colour system (component-organization.md).
 *
 * `null` (US-E18.31: identity missing on the wire, or an IAM member role with
 * no feed badge) keeps the neutral `primary` avatar tone; the caller omits the
 * badge entirely rather than labelling the author with a guessed role.
 */
export function feedRoleTone(role: FeedRole | null): StatusTone {
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
