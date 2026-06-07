import type { AuthTokens } from "@/features/auth/domain/entities/auth-user.entity";
import type { ITenantRepository } from "../repositories/i-tenant.repository";

/** Switch the active tenant: mint a tenant-scoped token pair for `tenantId`. */
export class SwitchTenantUseCase {
  constructor(private readonly repo: ITenantRepository) {}

  execute(tenantId: string): Promise<AuthTokens> {
    return this.repo.switchTenant(tenantId);
  }
}
