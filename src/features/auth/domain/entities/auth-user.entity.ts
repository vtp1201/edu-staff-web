// NOTE: "admin" claim from IAM is mock-first (decision 0014/0022).
// BE dependency: IAM must issue role: "admin" in JWT claim (US-049).
export type UserRole = "teacher" | "principal" | "student" | "parent" | "admin";

export interface UserTenantRole {
  role: UserRole;
  tenantId: string;
  tenantName: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  roles: UserTenantRole[];
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
