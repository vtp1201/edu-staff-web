import type { StatusTone } from "@/components/shared/status-badge";
import type { HomeroomEntryStatus } from "../../domain/entities/homeroom-entry-status.entity";

/** Pure status → StatusBadge tone (design-spec class-log). */
export const STATUS_TONE: Record<HomeroomEntryStatus, StatusTone> = {
  DRAFT: "muted",
  SUBMITTED: "warning",
  APPROVED: "success",
  REJECTED: "error",
};
