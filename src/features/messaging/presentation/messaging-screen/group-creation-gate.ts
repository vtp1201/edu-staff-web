import type { UserRole } from "@/features/auth/domain/entities/auth-user.entity";
import type { MessagingFailure } from "@/features/messaging/domain/failures/messaging.failure";

/**
 * US-E18.50 / BE US-193 (ADR 0132) — may this appRole create a self-service
 * group room? The server's allow-list is the IAM enum set
 * `ADMIN | MANAGER | TEACHER | STAFF`; `role-meta.ts` collapses ADMIN+MANAGER →
 * `principal` and TEACHER+STAFF → `teacher`, so the appRole-side allow-list is
 * exactly the staff tier. `admin` is included because the app's own admin
 * namespace maps onto the ADMIN enum.
 *
 * Deny-by-default, mirroring the server: an unknown or unreadable role gets
 * `false`. This only removes the AFFORDANCE — the repository still maps the
 * 403 to `create-group-forbidden`, so a forced call is still refused.
 */
export function canCreateGroupFor(role: UserRole | null): boolean {
  return role === "teacher" || role === "principal" || role === "admin";
}

/**
 * Narrow a rejected create-group mutation back to a stable failure key for the
 * modal banner. The mutation rethrows the action's `errorKey` as an `Error`
 * message, so only the keys `createGroup` can actually produce are recognised;
 * anything else falls back to the generic retryable copy. Total by design — a
 * bad key must never reach `t()` and blow up the render.
 */
export function createGroupErrorKey(
  error: unknown,
): MessagingFailure["type"] | undefined {
  if (!error) return undefined;
  const message = error instanceof Error ? error.message : "";
  return message === "create-group-forbidden"
    ? "create-group-forbidden"
    : "create-group-failed";
}
