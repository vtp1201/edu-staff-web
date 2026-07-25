/**
 * `selfApproved` derivation (ADR 0073) — the ONE place this boolean is computed.
 * Audit-transparency requirement: whenever it is true the annotation MUST be
 * rendered, never suppressed by any client condition (FR-010, NFR-008 pt. 5).
 */
export function deriveSelfApproved(
  authorMemberId: string,
  approverMemberId?: string,
): boolean {
  if (!authorMemberId || !approverMemberId) return false;
  return authorMemberId === approverMemberId;
}
