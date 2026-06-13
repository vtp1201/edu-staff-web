import "server-only";
import type { AxiosInstance } from "axios";
import { IAM_MEMBER_EP } from "@/bootstrap/endpoint/iam-member.endpoint";
import { errorCodeOf } from "@/bootstrap/lib/api-envelope";
import type { TenantMembership } from "@/features/tenant/domain/entities/tenant-membership.entity";
import type { AuthTokens } from "../../domain/entities/auth-user.entity";
import type { IamMemberFailure } from "../../domain/failures/iam-member.failure";
import type {
  IIamMemberRepository,
  InviteMemberRequest,
} from "../../domain/repositories/i-iam-member.repository";
import type { MembershipSummaryDto } from "../dtos/iam-member-response.dto";
import type { TokenResponseDto } from "../dtos/token-response.dto";
import { mapTokens } from "../mappers/auth.mapper";
import { mapMembershipSummary } from "../mappers/iam-member.mapper";

/**
 * Maps a normalised {@link ApiError} (branch on `code`, never message) into the
 * domain {@link IamMemberFailure} union.
 */
function mapIamFailure(err: unknown): IamMemberFailure {
  const code = errorCodeOf(err);
  switch (code) {
    case "FORBIDDEN_ACTION":
      return { type: "forbidden" };
    case "RESOURCE_NOT_FOUND":
      return { type: "not-found" };
    case "USER_EMAIL_ALREADY_EXISTS":
      return { type: "email-exists" };
    case "INVITATION_NOT_FOUND":
    case "INVITATION_EXPIRED":
      return { type: "invitation-not-found" };
    case "LAST_ADMIN_INVARIANT_VIOLATION":
      return { type: "last-admin" };
    case "NETWORK_ERROR":
      return { type: "network-error" };
    default:
      return { type: "unknown" };
  }
}

export class IamMemberRepository implements IIamMemberRepository {
  constructor(private readonly http: AxiosInstance) {}

  async listMyTenants(): Promise<TenantMembership[]> {
    const dto = (await this.http.get(
      IAM_MEMBER_EP.myTenants,
    )) as unknown as MembershipSummaryDto[];
    return dto.map(mapMembershipSummary);
  }

  async switchTenant(tenantId: string, clientId: string): Promise<AuthTokens> {
    const dto = (await this.http.post(IAM_MEMBER_EP.switchTenant, {
      tenantId,
      clientId,
    })) as unknown as TokenResponseDto;
    return mapTokens(dto);
  }

  async inviteMember(
    tenantId: string,
    req: InviteMemberRequest,
  ): Promise<void> {
    try {
      await this.http.post(IAM_MEMBER_EP.invitations(tenantId), req);
    } catch (err) {
      throw mapIamFailure(err);
    }
  }

  async revokeInvitation(
    tenantId: string,
    invitationId: string,
  ): Promise<void> {
    try {
      await this.http.delete(IAM_MEMBER_EP.invitation(tenantId, invitationId));
    } catch (err) {
      throw mapIamFailure(err);
    }
  }

  async addMember(
    tenantId: string,
    userId: string,
    roles: string[],
  ): Promise<void> {
    try {
      await this.http.post(IAM_MEMBER_EP.members(tenantId), { userId, roles });
    } catch (err) {
      throw mapIamFailure(err);
    }
  }

  async changeRoles(
    tenantId: string,
    userId: string,
    roles: string[],
  ): Promise<void> {
    try {
      await this.http.patch(IAM_MEMBER_EP.member(tenantId, userId), { roles });
    } catch (err) {
      throw mapIamFailure(err);
    }
  }

  async removeMember(tenantId: string, userId: string): Promise<void> {
    try {
      await this.http.delete(IAM_MEMBER_EP.member(tenantId, userId));
    } catch (err) {
      throw mapIamFailure(err);
    }
  }

  async acceptInvitation(token: string): Promise<void> {
    try {
      await this.http.post(IAM_MEMBER_EP.acceptInvitation, { token });
    } catch (err) {
      throw mapIamFailure(err);
    }
  }
}
