import "server-only";
import type { AuthTokens } from "@/features/auth/domain/entities/auth-user.entity";
import type { TenantMembership } from "../../../domain/entities/tenant-membership.entity";
import type { ITenantRepository } from "../../../domain/repositories/i-tenant.repository";

/** Mock memberships for dev (BE noti/core may lag); swap via USE_MOCK (decision 0014). */
export class MockTenantRepository implements ITenantRepository {
  async listMyMemberships(): Promise<TenantMembership[]> {
    return [
      { tenantId: "tenant-acme", roles: ["teacher"], status: "ACTIVE" },
      { tenantId: "tenant-beta", roles: ["parent"], status: "ACTIVE" },
    ];
  }

  async switchTenant(tenantId: string): Promise<AuthTokens> {
    // Real BE returns a signed JWT carrying a `tenantId` claim. The mock mints
    // an UNSIGNED look-alike with the same claim so the tenant guard
    // (decodeTenantId) and exp cookie work end-to-end under USE_MOCK.
    const exp = Math.floor(Date.now() / 1000) + 3600;
    return {
      accessToken: fakeJwt({ tenantId, exp }),
      refreshToken: `mock-refresh.${tenantId}`,
      sessionId: "mock-session",
    };
  }
}

function fakeJwt(payload: Record<string, unknown>): string {
  const b64 = (o: unknown) =>
    Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${b64({ alg: "none", typ: "JWT" })}.${b64(payload)}.mock`;
}
