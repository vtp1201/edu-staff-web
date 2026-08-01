"use server";

import { requireRole } from "@/bootstrap/auth-guard";
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
 *
 * `requireRole` FIRST (zero repo calls when it rejects): a Server Action is an
 * independently-invocable POST endpoint, so the `/admin` RSC layout guard covers
 * only the page render — not this path. Load-bearing here because the response
 * is real PII (invitee emails + the resolved inviter identity), ADR 0063.
 */
export async function refreshInvitationsAction(
  params: ListInvitationsRequest = {},
): Promise<ListActionResult> {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) {
    return { ok: false as const, errorKey: "forbidden", retryable: false };
  }

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

/** Same `requireRole` gate as the read — see `refreshInvitationsAction`. */
export async function sendInvitationBatchAction(
  input: SendInvitationBatchInput,
): Promise<SendBatchActionResult> {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) return { ok: false as const, errorKey: "forbidden" };

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

/** Same `requireRole` gate as the read — see `refreshInvitationsAction`. */
export async function resendInvitationAction(
  invitationId: string,
): Promise<MutationActionResult> {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) return { ok: false as const, errorKey: "forbidden" };

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

/** Same `requireRole` gate as the read — see `refreshInvitationsAction`. */
export async function revokeInvitationAction(
  invitationId: string,
): Promise<MutationActionResult> {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) return { ok: false as const, errorKey: "forbidden" };

  const useCase = await makeRevokeInvitationUseCase();
  const result = await useCase.execute(invitationId);
  if (!result.ok) return { ok: false as const, errorKey: result.failure.type };
  return { ok: true as const };
}
