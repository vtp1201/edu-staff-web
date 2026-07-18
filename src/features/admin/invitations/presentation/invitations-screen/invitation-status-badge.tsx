import { CalendarX, Check, Clock, type LucideIcon, X } from "lucide-react";
import {
  StatusBadge,
  type StatusTone,
} from "@/components/shared/status-badge/status-badge";
import type { InvitationStatus } from "../../domain/entities/invitation.entity";

const STATUS_TONE: Record<InvitationStatus, StatusTone> = {
  pending: "warning",
  accepted: "teal",
  expired: "muted",
  revoked: "error-dark",
};

const STATUS_ICON: Record<InvitationStatus, LucideIcon> = {
  pending: Clock,
  accepted: Check,
  expired: CalendarX,
  revoked: X,
};

export interface InvitationStatusBadgeProps {
  status: InvitationStatus;
  /** Already-translated status label. */
  label: string;
}

/** Thin wrapper over the shared StatusBadge — status→tone lookup, incl. the
 *  `error-dark` tone for revoked (added in US-E21.1). */
export function InvitationStatusBadge({
  status,
  label,
}: InvitationStatusBadgeProps) {
  const Icon = STATUS_ICON[status];
  return (
    <StatusBadge tone={STATUS_TONE[status]} className="gap-1">
      <Icon className="size-3" aria-hidden="true" />
      {label}
    </StatusBadge>
  );
}
