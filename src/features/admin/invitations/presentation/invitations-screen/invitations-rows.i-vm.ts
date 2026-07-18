import type { InvitationRowVM } from "./invitations-screen.i-vm";

/**
 * The ONE prop shape both `InvitationsTable` (≥820px) and
 * `InvitationsCardList` (<820px) consume — FR-013: identical data + actions on
 * both layouts, enforced at the type level by sharing this interface.
 */
export interface InvitationsRowsProps {
  rows: InvitationRowVM[];
  labels: InvitationsRowsLabels;
  onCopyLink: (row: InvitationRowVM) => void;
  onResend: (id: string) => void;
  onRevokeRequest: (row: InvitationRowVM) => void;
}

export interface InvitationsRowsLabels {
  columns: {
    email: string;
    role: string;
    invitedBy: string;
    sentDate: string;
    expiry: string;
    status: string;
    actions: string;
  };
  invitedByPrefix: string;
  /** (email) → aria-label for the row's copy-link action. */
  copyLabelOf: (email: string) => string;
  resendLabelOf: (email: string) => string;
  revokeLabelOf: (email: string) => string;
  rowActionsGroupLabelOf: (email: string) => string;
}
