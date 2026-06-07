import "server-only";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { ITenantRepository } from "@/features/tenant/domain/repositories/i-tenant.repository";
import { ListMyMembershipsUseCase } from "@/features/tenant/domain/use-cases/list-my-memberships.use-case";
import { SwitchTenantUseCase } from "@/features/tenant/domain/use-cases/switch-tenant.use-case";
import { MockTenantRepository } from "@/features/tenant/infrastructure/repositories/mocks/tenant.mock.repository";
import { TenantRepository } from "@/features/tenant/infrastructure/repositories/tenant.repository";

async function makeRepo(): Promise<ITenantRepository> {
  if (USE_MOCK) return new MockTenantRepository();
  return new TenantRepository(await createServerHttpClient());
}

export async function makeListMyMembershipsUseCase() {
  return new ListMyMembershipsUseCase(await makeRepo());
}

export async function makeSwitchTenantUseCase() {
  return new SwitchTenantUseCase(await makeRepo());
}
