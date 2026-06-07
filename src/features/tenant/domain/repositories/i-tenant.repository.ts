import "server-only";
import type { AuthTokens } from "@/features/auth/domain/entities/auth-user.entity";
import type { TenantMembership } from "../entities/tenant-membership.entity";

export interface ITenantRepository {
  /** GET /members/me/tenants — caller's memberships. */
  listMyMemberships(): Promise<TenantMembership[]>;
  /** POST /members/switch-tenant — mint a tenant-scoped token pair (BORN 403 if non-member). */
  switchTenant(tenantId: string): Promise<AuthTokens>;
}
