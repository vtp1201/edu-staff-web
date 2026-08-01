import type { DirectoryRole } from "../../domain/entities/directory-member.entity";

/**
 * `MemberListItem` — one row of `GET /iam/api/v1/tenants/{id}/members`
 * (IAM US-144). camelCase on the wire (decision 0017). All six fields are
 * `required` in `openapi.yaml`; `status` cannot be `LEFT` here (BE excludes
 * LEFT members from the directory list).
 */
export interface MemberListItemDto {
  memberId: string;
  userId: string;
  displayName: string;
  email: string;
  roles: DirectoryRole[];
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
}
