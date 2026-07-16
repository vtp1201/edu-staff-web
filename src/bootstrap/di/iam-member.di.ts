import "server-only";
import { ensureFreshSession } from "@/bootstrap/di/auth.di";
import { OAUTH_CLIENT_ID } from "@/bootstrap/endpoint/iam-member.endpoint";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { IIamMemberRepository } from "@/features/auth/domain/repositories/i-iam-member.repository";
import { IamMemberRepository } from "@/features/auth/infrastructure/repositories/iam-member.repository";
import { MockIamMemberRepository } from "@/features/auth/infrastructure/repositories/mocks/iam-member.mock.repository";

async function makeRepo(): Promise<IIamMemberRepository> {
  if (USE_MOCK) return new MockIamMemberRepository();
  // Proactive refresh (decision 0018): every method this repo exposes is a
  // protected IAM call. See EPIC-OVERVIEW.md playbook step 6 (US-E18.6).
  await ensureFreshSession();
  return new IamMemberRepository(await createServerHttpClient());
}

/**
 * Per-request IAM member/invitation operations facade (US-E06.4).
 *
 * TR-015 — `switchTenant` returns the rotated tenant-scoped {@link AuthTokens}.
 * The calling Server Action is responsible for persisting them via
 * `setAuthCookies(tokens)` (bootstrap/lib/auth-token.server.ts) so the new
 * httpOnly token pair takes effect; the DI facade does not touch cookies.
 */
export async function makeInviteMemberAction() {
  const repo = await makeRepo();
  return {
    inviteMember: (tenantId: string, email: string, roles: string[]) =>
      repo.inviteMember(tenantId, { email, roles }),
    revokeInvitation: (tenantId: string, invitationId: string) =>
      repo.revokeInvitation(tenantId, invitationId),
    addMember: (tenantId: string, userId: string, roles: string[]) =>
      repo.addMember(tenantId, userId, roles),
    changeRoles: (tenantId: string, userId: string, roles: string[]) =>
      repo.changeRoles(tenantId, userId, roles),
    removeMember: (tenantId: string, userId: string) =>
      repo.removeMember(tenantId, userId),
    acceptInvitation: (token: string) => repo.acceptInvitation(token),
    listMyTenants: () => repo.listMyTenants(),
    switchTenant: (tenantId: string) =>
      repo.switchTenant(tenantId, OAUTH_CLIENT_ID),
  };
}
