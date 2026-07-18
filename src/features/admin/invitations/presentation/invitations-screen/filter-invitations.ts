import type { Invitation } from "../../domain/entities/invitation.entity";
import type { InvitationsStatusFilter } from "./invitations-screen.i-vm";

export interface FilterInvitationsResult {
  rows: Invitation[];
  /** Total rows before any filter/search (distinguishes AC-001.3 vs AC-002.4). */
  rawCount: number;
  /** Rows after filter/search. */
  filteredCount: number;
}

/**
 * Pure client-side filter for the invitation table (US-E21.1, UC-002).
 * Status tab + email substring are AND-combined. Filtering is client-side over
 * the single cached list — there is no server filter param (ground-truth #1).
 *
 * Lives in presentation (not domain use-case) because it runs in the client
 * container over already-fetched data; it stays a pure, framework-free function
 * so it is unit-testable and layer-clean.
 */
export function filterInvitations(
  invitations: Invitation[],
  status: InvitationsStatusFilter,
  query: string,
): FilterInvitationsResult {
  const q = query.trim().toLowerCase();
  const rows = invitations.filter(
    (inv) =>
      (status === "all" || inv.status === status) &&
      (!q || inv.email.toLowerCase().includes(q)),
  );
  return {
    rows,
    rawCount: invitations.length,
    filteredCount: rows.length,
  };
}

/** Per-status counts for the tab badges — computed from the full raw list. */
export function statusCounts(
  invitations: Invitation[],
): Record<InvitationsStatusFilter, number> {
  return {
    all: invitations.length,
    pending: invitations.filter((i) => i.status === "pending").length,
    accepted: invitations.filter((i) => i.status === "accepted").length,
    expired: invitations.filter((i) => i.status === "expired").length,
    revoked: invitations.filter((i) => i.status === "revoked").length,
  };
}
