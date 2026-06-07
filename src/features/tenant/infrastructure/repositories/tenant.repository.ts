import "server-only";
import type { AxiosInstance } from "axios";
import {
  OAUTH_CLIENT_ID,
  TENANT_EP,
} from "@/bootstrap/endpoint/tenant.endpoint";
import type { AuthTokens } from "@/features/auth/domain/entities/auth-user.entity";
import type { TokenResponseDto } from "@/features/auth/infrastructure/dtos/token-response.dto";
import { mapTokens } from "@/features/auth/infrastructure/mappers/auth.mapper";
import type { TenantMembership } from "../../domain/entities/tenant-membership.entity";
import type { ITenantRepository } from "../../domain/repositories/i-tenant.repository";
import type { MyTenantsResponseDto } from "../dtos/membership-response.dto";
import { mapMembership } from "../mappers/tenant.mapper";

export class TenantRepository implements ITenantRepository {
  constructor(private readonly http: AxiosInstance) {}

  async listMyMemberships(): Promise<TenantMembership[]> {
    // Interceptor unwraps the envelope → payload directly (US-E06.1).
    const dto = (await this.http.get(
      TENANT_EP.myTenants,
    )) as unknown as MyTenantsResponseDto;
    return dto.map(mapMembership);
  }

  async switchTenant(tenantId: string): Promise<AuthTokens> {
    const tokens = (await this.http.post(TENANT_EP.switchTenant, {
      tenantId,
      clientId: OAUTH_CLIENT_ID,
    })) as unknown as TokenResponseDto;
    return mapTokens(tokens);
  }
}
