import type { DirectoryRole } from "../../domain/entities/directory-member.entity";

/**
 * `MemberBatchItem` — one row of `GET /iam/api/v1/members?ids=` (IAM US-144).
 * Display resolution only: the wire schema carries no `status` and no `userId`.
 */
export interface MemberBatchItemDto {
  memberId: string;
  displayName: string;
  email: string;
  roles: DirectoryRole[];
}
