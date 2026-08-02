import type { UserRole } from "@/features/auth/domain/entities/auth-user.entity";
import { appRoleOf } from "@/features/auth/domain/entities/role-meta";
import type { FeedRole } from "../entities/feed-post.entity";

/**
 * appRole → the feed's badge vocabulary (US-E18.31 fix).
 *
 * The two vocabularies differ by exactly one member: `admin` is an appRole but
 * NOT a `FeedRole`. `ROLE_ENUM_TO_APP` never emits `"admin"` today (the tenant
 * administrator's IAM member role is `ADMIN` → appRole `principal`), so this is
 * a defensive dead branch, not a real mapping decision — it keeps the function
 * total instead of casting.
 */
export function feedRoleOfAppRole(appRole: UserRole | null): FeedRole | null {
  return appRole === null || appRole === "admin" ? null : appRole;
}

/**
 * IAM member role (the wire value on `Post.authorRole`/`Comment.authorRole`,
 * UPPERCASE `ADMIN|MANAGER|TEACHER|STAFF|STUDENT|PARENT`) → the feed badge.
 *
 * Delegates to the CANONICAL {@link appRoleOf} map — the same one
 * `decodeRoleClaim` uses to resolve the VIEWER's role — so the author badge and
 * the viewer's own capabilities can never disagree (ADMIN/MANAGER → principal,
 * STAFF → teacher). A genuinely unrecognised value maps to `null` = "render no
 * badge": a guessed badge is worse than no badge.
 *
 * Lowercase input is tolerated so mock/legacy payloads keep mapping.
 */
export function feedRoleOfMemberRole(
  raw: string | null | undefined,
): FeedRole | null {
  return feedRoleOfAppRole(appRoleOf((raw ?? "").toUpperCase()));
}
