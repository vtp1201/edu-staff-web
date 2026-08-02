import type { DirectoryRole } from "./directory-member.entity";

/**
 * One batch-lookup row (IAM US-144, `GET /iam/api/v1/members?ids=`) — display
 * resolution only, so it deliberately carries no `status`/`userId` (the wire
 * `MemberBatchItem` has neither). Unlike the directory list, `LEFT` members ARE
 * resolved here so historical rows (staffing assignments, conduct records)
 * keep their names.
 */
export interface MemberSummary {
  memberId: string;
  displayName: string;
  /**
   * Staff-tier only (ADR-0120, widened in US-E18.33). ABSENT — not empty — when
   * the caller is a STAFF/STUDENT/PARENT tenant member. Consumers that need a
   * guaranteed value must be reachable only from a staff-tier surface, or
   * degrade gracefully; `email`/`roles` presence is the tier signal.
   */
  email?: string;
  /** Staff-tier only — see {@link MemberSummary.email}. */
  roles?: DirectoryRole[];
}
