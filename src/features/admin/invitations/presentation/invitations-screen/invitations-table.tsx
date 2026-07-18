import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/shared/utils";
import { ExpiryCountdownCell } from "./expiry-countdown-cell";
import { InvitationRoleBadge } from "./invitation-role-badge";
import { InvitationRowActions } from "./invitation-row-actions";
import { InvitationStatusBadge } from "./invitation-status-badge";
import type { InvitationsRowsProps } from "./invitations-rows.i-vm";

/** Desktop invitation table (≥820px). */
export function InvitationsTable({
  rows,
  labels,
  onCopyLink,
  onResend,
  onRevokeRequest,
}: InvitationsRowsProps) {
  const { columns } = labels;
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{columns.email}</TableHead>
            <TableHead>{columns.role}</TableHead>
            <TableHead>{columns.invitedBy}</TableHead>
            <TableHead>{columns.sentDate}</TableHead>
            <TableHead>{columns.expiry}</TableHead>
            <TableHead>{columns.status}</TableHead>
            <TableHead className="text-right">{columns.actions}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.id}
              className={cn(row.status === "revoked" && "opacity-65")}
            >
              <TableCell className="font-bold text-foreground">
                {row.email}
              </TableCell>
              <TableCell>
                <InvitationRoleBadge role={row.role} label={row.roleLabel} />
              </TableCell>
              <TableCell className="text-edu-text-secondary">
                {row.invitedBy}
              </TableCell>
              <TableCell className="text-edu-text-secondary tabular-nums">
                {row.sentAtLabel}
              </TableCell>
              <TableCell>
                <ExpiryCountdownCell countdown={row.countdown} />
              </TableCell>
              <TableCell>
                <InvitationStatusBadge
                  status={row.status}
                  label={row.statusLabel}
                />
              </TableCell>
              <TableCell className="text-right">
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
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
