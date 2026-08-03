import type { DirectoryRole } from "../../domain/entities/directory-member.entity";
import type { MemberGender } from "../../domain/entities/member-summary.entity";

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
 * `dob`/`gender` are staff-tier-only PII (ADR-0122), declared since US-E18.35
 * because the ADMIN class-roster screen renders exactly those two columns. They
 * are optional TWICE OVER: absent for a narrowed-tier caller, and absent for a
 * staff-tier caller when the member simply has not set them (IAM US-169). Only
 * `email`/`roles` are a reliable tier signal — never infer the tier from these.
 */
export interface MemberBatchItemDto {
  memberId: string;
  displayName: string;
  /** Staff tier only — absent for STAFF/STUDENT/PARENT callers. */
  email?: string;
  /** Staff tier only — absent for STAFF/STUDENT/PARENT callers. */
  roles?: DirectoryRole[];
  /**
   * Date of birth, RFC3339 date-time (Go `*time.Time`, e.g.
   * `2010-03-15T00:00:00Z`). Staff tier only, AND absent when unset (US-169).
   */
  dob?: string;
  /** Staff tier only, AND absent when unset (US-169). */
  gender?: MemberGender;
}
