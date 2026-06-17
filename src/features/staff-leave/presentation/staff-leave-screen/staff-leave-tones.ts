import {
  Calendar,
  type LucideIcon,
  TriangleAlert,
  User,
  Users,
} from "lucide-react";
import type { StatusTone } from "@/components/shared/status-badge";
import type {
  StaffActorRole,
  StaffLeaveStatus,
  StaffLeaveType,
} from "@/features/staff-leave/domain/entities/staff-leave-request.entity";

/** Status → StatusBadge tone + accent-bar class + ring for pending cards. */
export const STATUS_TONE: Record<StaffLeaveStatus, StatusTone> = {
  pending: "warning",
  approved: "success",
  rejected: "error",
};

export const STATUS_ACCENT: Record<StaffLeaveStatus, string> = {
  pending: "bg-edu-warning",
  approved: "bg-edu-success",
  rejected: "bg-edu-error",
};

/** Left border accent on the reason block, by status. */
export const STATUS_REASON_BORDER: Record<StaffLeaveStatus, string> = {
  pending: "border-l-edu-warning",
  approved: "border-l-edu-success",
  rejected: "border-l-edu-error",
};

/** Leave type → icon + text color token (design-spec). */
export const LEAVE_TYPE_META: Record<
  StaffLeaveType,
  { icon: LucideIcon; iconClass: string }
> = {
  annual: { icon: Calendar, iconClass: "text-edu-primary" },
  sick: { icon: TriangleAlert, iconClass: "text-edu-warning" },
  personal: { icon: User, iconClass: "text-muted-foreground" },
  family: { icon: Users, iconClass: "text-edu-purple" },
};

/** Actor-role badge tone. */
export const ROLE_TONE: Record<StaffActorRole, StatusTone> = {
  teacher: "primary",
  staff: "muted",
};
