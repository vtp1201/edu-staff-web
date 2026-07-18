import "server-only";
import { ensureFreshSession } from "@/bootstrap/di/auth.di";
import { getAccessToken } from "@/bootstrap/lib/auth-token.server";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { decodeTenantId } from "@/bootstrap/lib/jwt";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { IInvitationRepository } from "@/features/admin/invitations/domain/repositories/i-invitation.repository";
import { ListInvitationsUseCase } from "@/features/admin/invitations/domain/use-cases/list-invitations.use-case";
import { ResendInvitationUseCase } from "@/features/admin/invitations/domain/use-cases/resend-invitation.use-case";
import { RevokeInvitationUseCase } from "@/features/admin/invitations/domain/use-cases/revoke-invitation.use-case";
import { SendInvitationBatchUseCase } from "@/features/admin/invitations/domain/use-cases/send-invitation-batch.use-case";
import { InvitationRepository } from "@/features/admin/invitations/infrastructure/repositories/invitation.repository";
import type { IIamMemberRepository } from "@/features/auth/domain/repositories/i-iam-member.repository";
import { IamMemberRepository } from "@/features/auth/infrastructure/repositories/iam-member.repository";
import { MockIamMemberRepository } from "@/features/auth/infrastructure/repositories/mocks/iam-member.mock.repository";

/**
 * Admin invitations repository factory (per-request, US-E21.1).
 *
 * HYBRID / PARTIALLY-BLOCKED (mirrors `class-management.di.ts`'s hybrid-delegate
 * + `staff-leave.di.ts`'s force-mock precedent):
 *   - send/revoke go through the REAL `IamMemberRepository` in real mode
 *     (`inviteMember`/`revokeInvitation` are real IAM routes), the mock in mock
 *     mode.
 *   - list/resend are PERMANENTLY mock (no real IAM route exists — ground-truth
 *     #1/#7, integration.md §6). The `listIam` collaborator is ALWAYS the mock,
 *     regardless of `NEXT_PUBLIC_USE_MOCK`, so a flip to real mode never breaks
 *     the table.
 *
 * `tenantId` is server-derived from the access-token claim (NFR-006). In mock
 * mode the mock token carries no real tenantId, so it falls back to the seed
 * tenant (the mock repo ignores tenantId anyway).
 */
export async function makeInvitationRepository(): Promise<IInvitationRepository> {
  const iamMock = new MockIamMemberRepository();

  if (USE_MOCK) {
    return new InvitationRepository(iamMock, iamMock, "tenant-acme");
  }

  await ensureFreshSession();
  const tenantId = decodeTenantId((await getAccessToken()) ?? "") ?? "";
  const iamReal: IIamMemberRepository = new IamMemberRepository(
    await createServerHttpClient(),
  );
  // mutations → real; list/resend → always mock.
  return new InvitationRepository(iamReal, iamMock, tenantId);
}

export async function makeListInvitationsUseCase() {
  return new ListInvitationsUseCase(await makeInvitationRepository());
}

export async function makeSendInvitationBatchUseCase() {
  return new SendInvitationBatchUseCase(await makeInvitationRepository());
}

export async function makeResendInvitationUseCase() {
  return new ResendInvitationUseCase(await makeInvitationRepository());
}

export async function makeRevokeInvitationUseCase() {
  return new RevokeInvitationUseCase(await makeInvitationRepository());
}
