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
  email: string;
  roles: DirectoryRole[];
}
