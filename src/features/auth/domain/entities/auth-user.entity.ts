export type UserRole = "teacher" | "principal" | "student" | "parent";

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

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
}
