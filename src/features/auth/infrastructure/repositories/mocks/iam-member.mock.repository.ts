import "server-only";
import type { TenantMembership } from "@/features/tenant/domain/entities/tenant-membership.entity";
import type { AuthTokens } from "../../../domain/entities/auth-user.entity";
import type {
  IIamMemberRepository,
  InviteMemberRequest,
} from "../../../domain/repositories/i-iam-member.repository";

/** Mock IAM member repo (NEXT_PUBLIC_USE_MOCK=true, decision 0014). */
export class MockIamMemberRepository implements IIamMemberRepository {
  async listMyTenants(): Promise<TenantMembership[]> {
    return [
      { tenantId: "tenant-acme", roles: ["admin"], status: "ACTIVE" },
      { tenantId: "tenant-beta", roles: ["teacher"], status: "ACTIVE" },
    ];
  }

  async switchTenant(tenantId: string, _clientId: string): Promise<AuthTokens> {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const b64 = (o: unknown) =>
      Buffer.from(JSON.stringify(o)).toString("base64url");
    const token = `${b64({ alg: "none" })}.${b64({ tenantId, exp })}.mock`;
    return {
      accessToken: token,
      refreshToken: `mock-refresh.${tenantId}`,
      sessionId: "mock-session",
    };
  }

  async inviteMember(
    _tenantId: string,
    _req: InviteMemberRequest,
  ): Promise<void> {}
  async revokeInvitation(
    _tenantId: string,
    _invitationId: string,
  ): Promise<void> {}
  async addMember(
    _tenantId: string,
    _userId: string,
    _roles: string[],
  ): Promise<void> {}
  async changeRoles(
    _tenantId: string,
    _userId: string,
    _roles: string[],
  ): Promise<void> {}
  async removeMember(_tenantId: string, _userId: string): Promise<void> {}
  async acceptInvitation(_token: string): Promise<void> {}
}
