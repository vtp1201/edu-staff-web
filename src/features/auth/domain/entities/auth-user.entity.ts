// NOTE: "admin" claim from IAM is mock-first (decision 0014/0022).
// BE dependency: IAM must issue role: "admin" in JWT claim (US-049).
export type UserRole = "teacher" | "principal" | "student" | "parent" | "admin";

export interface UserTenantRole {
  /** appRole used for routing/landing (collapsed from the BE enum). */
  role: UserRole;
  /** Raw BE role enum ("TEACHER" | "ADMIN" | "MANAGER" | "STAFF" | …). Kept so
   * a user holding two enums that collapse to the same appRole (or the same
   * appRole across tenants) stays distinguishable (ADR 0036). */
  roleEnum: string;
  tenantId: string;
  tenantName: string;
  /** BE `tenantCode` from `/users/me` (e.g. "THPT-A"); optional until BE emits it. */
  tenantCode?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  roles: UserTenantRole[];
  /** Whether the account email has been verified (IAM `isEmailVerified`). */
  emailVerified: boolean;
}

/**
 * Token bundle returned by IAM `TokenResponse` (signin/refresh/social).
 * Wire shape is camelCase (decision `0017` / api-integration rule).
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
}

/** Full session = identity + tokens. Built from signin + `GET /users/me`. */
export interface AuthSession extends AuthTokens {
  user: AuthUser;
}
