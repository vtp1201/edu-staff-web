import type { DirectoryRole } from "./directory-member.entity";

/** Self-reported gender, exactly the IAM wire enum (US-169). */
export type MemberGender = "MALE" | "FEMALE" | "OTHER";

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
  /**
   * Date of birth as it arrives on the wire — RFC3339 date-time
   * (`2010-03-15T00:00:00Z`), NOT a display string; formatting belongs to the
   * consuming feature. Staff-tier only (PII, ADR-0122) AND optional per user
   * (IAM US-169, widened in US-E18.35): absence means either "narrowed caller"
   * or "this member never set it". Consumers must render an honest
   * "chưa cập nhật" placeholder, never a fabricated value.
   */
  dob?: string;
  /** Staff-tier only AND optional per user — see {@link MemberSummary.dob}. */
  gender?: MemberGender;
}
