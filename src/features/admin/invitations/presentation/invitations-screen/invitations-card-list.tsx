import { InvitationCard } from "./invitation-card";
import type { InvitationsRowsProps } from "./invitations-rows.i-vm";

/** Mobile card list (<820px) — same data + actions as the desktop table. */
export function InvitationsCardList({
  rows,
  labels,
  onCopyLink,
  onResend,
  onRevokeRequest,
}: InvitationsRowsProps) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card">
      {rows.map((row) => (
        <InvitationCard
          key={row.id}
          row={row}
          labels={labels}
          onCopyLink={onCopyLink}
          onResend={onResend}
          onRevokeRequest={onRevokeRequest}
        />
      ))}
    </div>
  );
}
