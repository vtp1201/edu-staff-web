"use server";

import {
  makeListInvitationsUseCase,
  makeResendInvitationUseCase,
  makeRevokeInvitationUseCase,
  makeSendInvitationBatchUseCase,
} from "@/bootstrap/di/admin-invitations.di";
import type { SendInvitationBatchInput } from "@/features/admin/invitations/domain/entities/invitation.entity";
import { isRetryableInvitationFailure } from "@/features/admin/invitations/domain/failures/invitation.failure";
import type {
  ListActionResult,
  ListInvitationsRequest,
  MutationActionResult,
  SendBatchActionResult,
} from "@/features/admin/invitations/presentation/invitations-screen/invitations-screen.i-vm";

/**
 * One cursor page of the invitation list. `status`/`cursor` are real server
 * params (IAM US-147); `tenantId` stays server-derived in the DI factory
 * (NFR-006) and is never accepted from the client.
 */
export async function refreshInvitationsAction(
  params: ListInvitationsRequest = {},
): Promise<ListActionResult> {
  const useCase = await makeListInvitationsUseCase();
  const result = await useCase.execute({
    status: params.status,
    cursor: params.cursor,
  });
  if (!result.ok) {
    return {
      ok: false as const,
      errorKey: result.failure.type,
      // Stable boolean, not a policy the client re-derives from the key.
      retryable: isRetryableInvitationFailure(result.failure),
    };
  }
  return { ok: true as const, data: result.value };
}

export async function sendInvitationBatchAction(
  input: SendInvitationBatchInput,
): Promise<SendBatchActionResult> {
  const useCase = await makeSendInvitationBatchUseCase();
  const result = await useCase.execute(input);
  if (!result.ok) return { ok: false as const, errorKey: result.failure.type };
  return {
    ok: true as const,
    outcome: {
      succeeded: result.value.succeeded,
      failed: result.value.failed.map((f) => ({
        email: f.email,
        failureKey: f.failure.type,
      })),
    },
  };
}

export async function resendInvitationAction(
  invitationId: string,
): Promise<MutationActionResult> {
  const useCase = await makeResendInvitationUseCase();
  const result = await useCase.execute(invitationId);
  if (!result.ok) {
    return {
      ok: false as const,
      errorKey: result.failure.type,
      // Stable NUMBER for the 429 toast — never translated copy (i18n stays at
      // the presentation boundary).
      retryAfterSeconds:
        result.failure.type === "rate-limited"
          ? result.failure.retryAfterSeconds
          : undefined,
    };
  }
  return { ok: true as const };
}

export async function revokeInvitationAction(
  invitationId: string,
): Promise<MutationActionResult> {
  const useCase = await makeRevokeInvitationUseCase();
  const result = await useCase.execute(invitationId);
  if (!result.ok) return { ok: false as const, errorKey: result.failure.type };
  return { ok: true as const };
}
