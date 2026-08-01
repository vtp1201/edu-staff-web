import "server-only";
import { ensureFreshSession } from "@/bootstrap/di/auth.di";
import { makeBatchResolveMembersUseCase } from "@/bootstrap/di/iam-directory.di";
import { getAccessToken } from "@/bootstrap/lib/auth-token.server";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { decodeTenantId } from "@/bootstrap/lib/jwt";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { IInvitationRepository } from "@/features/admin/invitations/domain/repositories/i-invitation.repository";
import { ListInvitationsUseCase } from "@/features/admin/invitations/domain/use-cases/list-invitations.use-case";
import { ResendInvitationUseCase } from "@/features/admin/invitations/domain/use-cases/resend-invitation.use-case";
import { RevokeInvitationUseCase } from "@/features/admin/invitations/domain/use-cases/revoke-invitation.use-case";
import { SendInvitationBatchUseCase } from "@/features/admin/invitations/domain/use-cases/send-invitation-batch.use-case";
import {
  InvitationRepository,
  type ResolveDisplayNames,
} from "@/features/admin/invitations/infrastructure/repositories/invitation.repository";
import { IamMemberRepository } from "@/features/auth/infrastructure/repositories/iam-member.repository";
import { MockIamMemberRepository } from "@/features/auth/infrastructure/repositories/mocks/iam-member.mock.repository";

/**
 * Admin invitations repository factory (per-request, US-E21.1 → fully real in
 * US-E18.29).
 *
 * PLAIN `USE_MOCK` GATE. The previous hybrid/force-mock wiring existed only
 * because list/resend had no real IAM route; IAM US-147 shipped both
 * (`GET .../invitations`, `POST .../invitations/{id}/resend`), so all four
 * operations now come from one source — real or mock — exactly like every other
 * un-mocked feature (US-E18.23/US-E18.25 hybrid-retirement precedent).
 *
 * `tenantId` is server-derived from the access-token claim (NFR-006). In mock
 * mode the mock token carries no real tenantId, so it falls back to the seed
 * tenant (the mock repo ignores tenantId anyway).
 *
 * `invitedBy` display resolution:
 *   - REAL: composes `iam-directory`'s `BatchResolveMembersUseCase` (IAM US-144;
 *     `memberId` IS the userId per its openapi description) — the admin caller
 *     is staff-tier, so `displayName` is present. Ids the lookup omits simply
 *     stay out of the Map and the repository degrades that one label.
 *   - MOCK: an IDENTITY map. `iam-directory.di.ts` is deliberately real-only (no
 *     `USE_MOCK` branch, by its own doc comment) and the mock invitations carry a
 *     ready-to-display name in `invitedBy`, so "resolve X to X" is the correct
 *     no-op — do NOT add a mock branch to `iam-directory.di.ts`.
 */
export async function makeInvitationRepository(): Promise<IInvitationRepository> {
  if (USE_MOCK) {
    const identityNames: ResolveDisplayNames = async (ids) =>
      new Map(ids.map((id) => [id, id]));
    return new InvitationRepository(
      new MockIamMemberRepository(),
      "tenant-acme",
      identityNames,
    );
  }

  await ensureFreshSession();
  const tenantId = decodeTenantId((await getAccessToken()) ?? "") ?? "";
  const iam = new IamMemberRepository(await createServerHttpClient());
  const batchResolve = await makeBatchResolveMembersUseCase();
  const resolveNames: ResolveDisplayNames = async (ids) => {
    const result = await batchResolve.execute(ids);
    const names = new Map<string, string>();
    if (result.ok) {
      for (const m of result.value) names.set(m.memberId, m.displayName);
    }
    // A failed lookup returns an EMPTY map, never throws: the repository owns
    // the per-row fallback so the invitation list still renders (AC-3).
    return names;
  };
  return new InvitationRepository(iam, tenantId, resolveNames);
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
