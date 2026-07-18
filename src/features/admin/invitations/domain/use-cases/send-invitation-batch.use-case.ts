import type { SendInvitationBatchInput } from "../entities/invitation.entity";
import type { InvitationFailure } from "../failures/invitation.failure";
import type {
  IInvitationRepository,
  SendBatchOutcome,
} from "../repositories/i-invitation.repository";
import { fail, type Result } from "./result";

/**
 * Orchestrates a batch invitation send (US-E21.1). Dedupes same-email-twice
 * within the batch (case-insensitive, AC-003.4/OQ-A → merge), then delegates
 * the fan-out + per-email reconciliation to the repository. The use-case stays
 * role-format-agnostic — the UI→wire role mapping is the infrastructure's job.
 */
export class SendInvitationBatchUseCase {
  constructor(private readonly repo: IInvitationRepository) {}

  async execute(
    input: SendInvitationBatchInput,
  ): Promise<Result<SendBatchOutcome, InvitationFailure>> {
    const seen = new Set<string>();
    const emails: string[] = [];
    for (const raw of input.emails) {
      const trimmed = raw.trim();
      const key = trimmed.toLowerCase();
      if (!trimmed || seen.has(key)) continue;
      seen.add(key);
      emails.push(trimmed);
    }

    if (emails.length === 0) {
      return fail({
        type: "validation",
        fields: [{ field: "emails", message: "empty" }],
      });
    }

    return this.repo.sendInvitationBatch({ ...input, emails });
  }
}
