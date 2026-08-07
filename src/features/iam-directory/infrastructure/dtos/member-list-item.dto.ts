import type { DirectoryRole } from "../../domain/entities/directory-member.entity";

/**
 * `MemberListItem` — one row of `GET /iam/api/v1/tenants/{id}/members`
 * (IAM US-144). camelCase on the wire (decision 0017). `status` cannot be
 * `LEFT` here (BE excludes LEFT members from the directory list).
 *
 * TIERED since ADR 0129 (BE US-190): only `memberId`/`userId`/`displayName` are
 * unconditionally `required` in `openapi.yaml`. `email`/`roles`/`status` are
 * emitted ONLY to a staff-tier caller (SUPER_ADMIN, or tenant ADMIN/MANAGER/
 * TEACHER) — for every other tenant member the KEYS ARE MISSING, not null.
 */
export interface MemberListItemDto {
  memberId: string;
  userId: string;
  displayName: string;
  /** Staff-tier only (ADR 0129) — absent for a STAFF/STUDENT/PARENT caller. */
  email?: string;
  /** Staff-tier only — see {@link MemberListItemDto.email}. */
  roles?: DirectoryRole[];
  /** Staff-tier only — see {@link MemberListItemDto.email}. */
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
}
