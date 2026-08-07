/**
 * A tenant role as IAM spells it on the wire — UPPERCASE (ground-truthed
 * against `MemberListItem.roles` in `edu-api/services/iam/docs/openapi.yaml`,
 * US-E18.23). Note this is the *role* casing; IAM's *error codes* are raw
 * lowercase — the two conventions differ, do not unify them.
 */
export type DirectoryRole =
  | "ADMIN"
  | "MANAGER"
  | "TEACHER"
  | "STAFF"
  | "STUDENT"
  | "PARENT";

/**
 * A member-directory row (IAM US-144, `GET /iam/api/v1/tenants/{id}/members`).
 *
 * `memberId === userId` — a membership's identity IS `(tenantId, userId)`,
 * there is no surrogate id. Both fields are kept because the wire carries both
 * and callers key on different ones (staffing holds `memberId`, class
 * management's homeroom picker holds `userId`).
 *
 * `LEFT` members are excluded by BE from this list (but ARE resolvable via the
 * batch lookup, so historical rows keep their names) — hence `status` here
 * never carries `LEFT`.
 *
 * TIERED since ADR 0129 (BE US-190), the same idiom `MemberSummary` already
 * uses on the batch endpoint: a STAFF/STUDENT/PARENT caller receives ONLY
 * `memberId`/`userId`/`displayName`. Presence — not a sentinel value — is the
 * tier signal.
 */
export interface DirectoryMember {
  memberId: string;
  userId: string;
  displayName: string;
  /**
   * Staff-tier only (SUPER_ADMIN, or tenant ADMIN/MANAGER/TEACHER — ADR 0129).
   * ABSENT (not empty, not null) for a narrowed-tier caller. A consumer that
   * needs a guaranteed value must be reachable only from a staff-tier surface
   * (`/admin/*`, `/principal/*`), or degrade honestly by omitting it.
   */
  email?: string;
  /** Staff-tier only — see {@link DirectoryMember.email}. */
  roles?: DirectoryRole[];
  /** Staff-tier only — see {@link DirectoryMember.email}. */
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
}
