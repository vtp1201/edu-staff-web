import type { ModerationFailure } from "../failures/moderation.failure";
import type {
  CreateReportInput,
  IModerationRepository,
  ModerationActionResult,
} from "../repositories/i-moderation.repository";

/**
 * Submit a report (UC-1922). Client-side guard mirrors the shared dialog's own
 * validation (reason required; note required iff reason === "other") so an
 * invalid submit never hits the network; otherwise delegates to the repo. The
 * server remains authoritative (422 still handled downstream).
 */
export class SubmitReportUseCase {
  constructor(private readonly repo: IModerationRepository) {}

  async execute(input: CreateReportInput): Promise<ModerationActionResult> {
    if (!input.reason) {
      const error: ModerationFailure = { type: "validation" };
      return { ok: false, error };
    }
    const trimmedNote = input.note?.trim() ?? "";
    if (input.reason === "other" && trimmedNote.length === 0) {
      const error: ModerationFailure = { type: "validation" };
      return { ok: false, error };
    }
    return this.repo.createReport({
      kind: input.kind,
      contentId: input.contentId,
      reason: input.reason,
      note: trimmedNote.length > 0 ? trimmedNote : undefined,
    });
  }
}
