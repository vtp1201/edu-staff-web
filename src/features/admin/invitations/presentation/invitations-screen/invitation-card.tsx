import { cn } from "@/shared/utils";
import { ExpiryCountdownCell } from "./expiry-countdown-cell";
import { InvitationRoleBadge } from "./invitation-role-badge";
import { InvitationRowActions } from "./invitation-row-actions";
import { InvitationStatusBadge } from "./invitation-status-badge";
import type { InvitationsRowsLabels } from "./invitations-rows.i-vm";
import type { InvitationRowVM } from "./invitations-screen.i-vm";

export interface InvitationCardProps {
  row: InvitationRowVM;
  labels: InvitationsRowsLabels;
  onCopyLink: (row: InvitationRowVM) => void;
  onResend: (id: string) => void;
  onRevokeRequest: (row: InvitationRowVM) => void;
}

/** Single mobile card — same fields + reused sub-components as the table row
 *  (composition, not a stripped re-implementation — FR-013). */
export function InvitationCard({
  row,
  labels,
  onCopyLink,
  onResend,
  onRevokeRequest,
}: InvitationCardProps) {
  return (
    <div
      className={cn(
        "border-border border-b p-4 last:border-b-0",
        row.status === "revoked" && "opacity-65",
      )}
    >
      <div className="flex items-start gap-2.5">
        <div className="min-w-0 flex-1">
          <p className="break-all font-extrabold text-foreground text-sm">
            {row.email}
          </p>
          <p className="mt-0.5 text-muted-foreground text-xs">
            {labels.invitedByPrefix} {row.invitedBy} · {row.sentAtLabel}
          </p>
        </div>
        <InvitationRowActions
          actions={row.actions}
          isRowMutating={row.isRowMutating}
          copyLabel={labels.copyLabelOf(row.email)}
          resendLabel={labels.resendLabelOf(row.email)}
          revokeLabel={labels.revokeLabelOf(row.email)}
          groupLabel={labels.rowActionsGroupLabelOf(row.email)}
          onCopyLink={() => onCopyLink(row)}
          onResend={() => onResend(row.id)}
          onRevokeRequest={() => onRevokeRequest(row)}
        />
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <InvitationRoleBadge role={row.role} label={row.roleLabel} />
        <InvitationStatusBadge status={row.status} label={row.statusLabel} />
        <ExpiryCountdownCell countdown={row.countdown} />
      </div>
    </div>
  );
}
