import "server-only";
import type { TenantMembership } from "@/features/tenant/domain/entities/tenant-membership.entity";
import type { AuthTokens } from "../../../domain/entities/auth-user.entity";
import type { Invitation } from "../../../domain/entities/invitation.entity";
import type { Member } from "../../../domain/entities/member.entity";
import type { IamMemberFailure } from "../../../domain/failures/iam-member.failure";
import type {
  IIamMemberRepository,
  InvitationsPage,
  InviteMemberRequest,
  ListInvitationsParams,
} from "../../../domain/repositories/i-iam-member.repository";
import { MOCK_INVITATIONS } from "./fixtures";

const DAY_MS = 86_400_000;
const genId = () => `inv-${Math.random().toString(36).slice(2, 9)}`;

/**
 * Module-level mutable in-memory invitation list (US-E21.1). Reset on each
 * `new MockIamMemberRepository()` so per-request DI + tests are deterministic —
 * same convention as `MockStaffingRepository`.
 */
let _invitations: Invitation[] = structuredClone(MOCK_INVITATIONS);

/** Mock IAM member repo (NEXT_PUBLIC_USE_MOCK=true, decision 0014). */
export class MockIamMemberRepository implements IIamMemberRepository {
  constructor() {
    _invitations = structuredClone(MOCK_INVITATIONS);
  }

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

  /**
   * Mirrors the real single-email invite: the admin-invitations fan-out calls
   * this once per email. Prepends a fresh Pending invitation so the mocked list
   * reflects the send after a refetch. `roles[0]` is the lowercased wire role
   * mapped by the caller (e.g. "manager"). The 7/14/30-day expiry the send
   * dialog collects has NO real wire field (ground-truth #2) — the mock uses a
   * flat 14-day expiry here; the caller's `expiryDays` never reaches the wire.
   */
  async inviteMember(
    _tenantId: string,
    req: InviteMemberRequest,
  ): Promise<void> {
    _invitations = [
      {
        invitationId: genId(),
        email: req.email,
        roles: req.roles.map((r) => r.toLowerCase()),
        status: "pending",
        // Mock mode resolves `invitedBy` through an identity map (see
        // `admin-invitations.di.ts`), so the seed holds a display name directly
        // instead of the raw userId the real wire carries.
        invitedBy: "Trần Minh Quân",
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 14 * DAY_MS).toISOString(),
      },
      ..._invitations,
    ];
  }

  async revokeInvitation(
    _tenantId: string,
    invitationId: string,
  ): Promise<void> {
    const found = _invitations.find((i) => i.invitationId === invitationId);
    // Race guard: absent/already-consumed row → the real BE `Get()` returns
    // `invitation_invalid` (ground-truth #6). Throw the same typed failure so
    // the adapter maps it 1:1.
    if (!found) {
      const failure: IamMemberFailure = { type: "invitation-invalid" };
      throw failure;
    }
    _invitations = _invitations.map((i) =>
      i.invitationId === invitationId ? { ...i, status: "revoked" } : i,
    );
  }

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
  async acceptInvitation(_token: string): Promise<Member> {
    return {
      tenantId: "tenant-acme",
      userId: "user-mock",
      roles: ["TEACHER"],
      status: "ACTIVE",
    };
  }

  /**
   * `status` IS a real server param (IAM US-147) so the mock applies it here.
   * Search has no wire param — it stays client-side, so no `q` is honoured.
   * Returns ONE unpaginated page (`hasMore: false`): the seed is small and
   * faking cursors would only add mock-only complexity — same choice
   * `MockIamDirectoryRepository`-era mocks made for the member list.
   */
  async listInvitations(
    _tenantId: string,
    params?: ListInvitationsParams,
  ): Promise<InvitationsPage> {
    const list = params?.status
      ? _invitations.filter((i) => i.status === params.status)
      : _invitations;
    return {
      data: list.map((i) => ({ ...i, roles: [...i.roles] })),
      nextCursor: null,
      hasMore: false,
    };
  }

  async resendInvitation(
    _tenantId: string,
    invitationId: string,
  ): Promise<Invitation> {
    const found = _invitations.find((i) => i.invitationId === invitationId);
    // Mirrors the real contract (INTEGRATION.md ¹¹): an absent/TTL-swept row is
    // indistinguishable from "never existed" → 410 `invitation_invalid`; an
    // ACCEPTED/REVOKED row still exists but is not resendable → 409. Any PENDING
    // row (including one already past `expiresAt`, i.e. projected `expired`) is
    // resendable — `roles`/`invitedBy`/`createdAt` are preserved.
    if (!found) {
      const failure: IamMemberFailure = { type: "invitation-invalid" };
      throw failure;
    }
    if (found.status === "accepted" || found.status === "revoked") {
      const failure: IamMemberFailure = { type: "invitation-not-resendable" };
      throw failure;
    }
    const refreshed: Invitation = {
      ...found,
      status: "pending",
      expiresAt: new Date(Date.now() + 14 * DAY_MS).toISOString(),
    };
    _invitations = _invitations.map((i) =>
      i.invitationId === invitationId ? refreshed : i,
    );
    return { ...refreshed, roles: [...refreshed.roles] };
  }
}
