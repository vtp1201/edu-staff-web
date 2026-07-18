import "server-only";
import type { AxiosInstance } from "axios";
import {
  OAUTH_CLIENT_ID,
  TENANT_EP,
} from "@/bootstrap/endpoint/tenant.endpoint";
import { errorCodeOf, statusOf } from "@/bootstrap/lib/api-envelope";
import type { AuthTokens } from "@/features/auth/domain/entities/auth-user.entity";
import type { TokenResponseDto } from "@/features/auth/infrastructure/dtos/token-response.dto";
import { mapTokens } from "@/features/auth/infrastructure/mappers/auth.mapper";
import type { TenantMembership } from "../../domain/entities/tenant-membership.entity";
import type { TenantFailure } from "../../domain/failures/tenant.failure";
import type { ITenantRepository } from "../../domain/repositories/i-tenant.repository";
import type { MyTenantsResponseDto } from "../dtos/membership-response.dto";
import { mapMembership } from "../mappers/tenant.mapper";

/**
 * Map a normalised ApiError to the tenant failure union (US-E23.1). Branch on
 * error.code (UPPER_SNAKE) / status — never on message. 403 = target-membership
 * rejection (FR-008, card-inline, non-retryable); network/5xx/timeout and
 * today's 401 (AC-9 descope) = FR-009 toast+retry; everything else = unknown
 * (the Server Action folds unknown into the generic toast too).
 */
export function toFailure(err: unknown): TenantFailure {
  const code = errorCodeOf(err);
  const status = statusOf(err);

  if (status === 403 || code === "FORBIDDEN") return { type: "forbidden" };
  if (
    code === "NETWORK_ERROR" ||
    status === undefined ||
    status === 0 ||
    status === 401 ||
    status === 408 ||
    status === 429 ||
    status >= 500
  ) {
    return { type: "network" };
  }
  return { type: "unknown" };
}

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
    try {
      const tokens = (await this.http.post(TENANT_EP.switchTenant, {
        tenantId,
        clientId: OAUTH_CLIENT_ID,
      })) as unknown as TokenResponseDto;
      return mapTokens(tokens);
    } catch (err) {
      // Stable typed failure (Path A) so switchTenantAction returns an errorKey
      // rather than a raw ApiError crossing the Server Action boundary.
      throw toFailure(err);
    }
  }
}
