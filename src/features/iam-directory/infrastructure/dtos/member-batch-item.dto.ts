import type { DirectoryRole } from "../../domain/entities/directory-member.entity";

/**
 * `MemberBatchItem` — one row of `GET /iam/api/v1/members?ids=` (IAM US-144).
 * Display resolution only: the wire schema carries no `status` and no `userId`.
 *
 * TIERED BY CALLER ROLE (ADR-0120, widened in US-E18.33). Only `memberId` and
 * `displayName` are guaranteed:
 * - staff tier (SUPER_ADMIN platform role, or tenant role ADMIN/MANAGER/
 *   TEACHER) → `email` + `roles` present;
 * - every OTHER tenant member (STAFF/STUDENT/PARENT) → the `email`, `roles`,
 *   `dob` and `gender` KEYS ARE ABSENT from the JSON (not empty string / not
 *   empty array). Absence IS the tier signal.
 *
 * `dob`/`gender` are staff-tier-only PII (ADR-0122) and are deliberately NOT
 * declared here at all — nothing in this app reads them, and typing a field we
 * never want to render is how PII leaks start.
 */
export interface MemberBatchItemDto {
  memberId: string;
  displayName: string;
  /** Staff tier only — absent for STAFF/STUDENT/PARENT callers. */
  email?: string;
  /** Staff tier only — absent for STAFF/STUDENT/PARENT callers. */
  roles?: DirectoryRole[];
}
