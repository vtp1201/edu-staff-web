"use server";

import {
  makeListInvitationsUseCase,
  makeResendInvitationUseCase,
  makeRevokeInvitationUseCase,
  makeSendInvitationBatchUseCase,
} from "@/bootstrap/di/admin-invitations.di";
import type { SendInvitationBatchInput } from "@/features/admin/invitations/domain/entities/invitation.entity";
import type {
  ListActionResult,
  MutationActionResult,
  SendBatchActionResult,
} from "@/features/admin/invitations/presentation/invitations-screen/invitations-screen.i-vm";

export async function refreshInvitationsAction(): Promise<ListActionResult> {
  const useCase = await makeListInvitationsUseCase();
  const result = await useCase.execute();
  if (!result.ok) return { ok: false as const, errorKey: result.failure.type };
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
  if (!result.ok) return { ok: false as const, errorKey: result.failure.type };
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
