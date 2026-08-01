import type { Invitation } from "../../domain/entities/invitation.entity";

export interface FilterInvitationsResult {
  rows: Invitation[];
  /** Total rows before the search (distinguishes AC-001.3 vs AC-002.4). */
  rawCount: number;
  /** Rows after the search. */
  filteredCount: number;
}

/**
 * Pure client-side EMAIL SEARCH for the invitation table (US-E21.1 UC-002,
 * narrowed in US-E18.29).
 *
 * The status tab is no longer filtered here: it is a real `GET .../invitations
 * ?status=` server param, so each tab is its own cursor-paginated query and the
 * rows handed in already belong to the active tab. Search has NO wire param, so
 * it stays client-side — over the pages LOADED so far, which is why the screen
 * shows an explicit "results may be partial" hint while more pages remain.
 *
 * Lives in presentation (not a domain use-case) because it runs in the client
 * container over already-fetched data; it stays a pure, framework-free function
 * so it is unit-testable and layer-clean.
 */
export function filterInvitations(
  invitations: Invitation[],
  query: string,
): FilterInvitationsResult {
  const q = query.trim().toLowerCase();
  const rows = q
    ? invitations.filter((inv) => inv.email.toLowerCase().includes(q))
    : invitations;
  return {
    rows,
    rawCount: invitations.length,
    filteredCount: rows.length,
  };
}
