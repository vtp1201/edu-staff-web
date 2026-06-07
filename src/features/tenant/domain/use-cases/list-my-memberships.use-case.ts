import type { TenantMembership } from "../entities/tenant-membership.entity";
import type { ITenantRepository } from "../repositories/i-tenant.repository";

export class ListMyMembershipsUseCase {
  constructor(private readonly repo: ITenantRepository) {}

  execute(): Promise<TenantMembership[]> {
    return this.repo.listMyMemberships();
  }
}
