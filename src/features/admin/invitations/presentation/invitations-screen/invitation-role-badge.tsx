import {
  BookOpen,
  type LucideIcon,
  School,
  Settings2,
  UserCheck,
  Users,
} from "lucide-react";
import {
  StatusBadge,
  type StatusTone,
} from "@/components/shared/status-badge/status-badge";
import type { InvitationRole } from "../../domain/entities/invitation.entity";

const ROLE_TONE: Record<InvitationRole, StatusTone> = {
  teacher: "primary",
  student: "warning",
  parent: "purple",
  manager: "success",
  admin: "error",
};

const ROLE_ICON: Record<InvitationRole, LucideIcon> = {
  teacher: UserCheck,
  student: BookOpen,
  parent: Users,
  manager: School,
  admin: Settings2,
};

export interface InvitationRoleBadgeProps {
  role: InvitationRole;
  /** Already-translated role label. */
  label: string;
}

/** Thin wrapper over the shared StatusBadge — role→tone lookup (design-spec
 *  roleBadgeColors). Icon is decorative (aria-hidden); label always rendered. */
export function InvitationRoleBadge({ role, label }: InvitationRoleBadgeProps) {
  const Icon = ROLE_ICON[role];
  return (
    <StatusBadge tone={ROLE_TONE[role]} className="gap-1">
      <Icon className="size-3" aria-hidden="true" />
      {label}
    </StatusBadge>
  );
}
