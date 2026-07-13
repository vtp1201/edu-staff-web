import type {
  AuditLogPageResult,
  IModerationRepository,
  ModerationResult,
} from "../repositories/i-moderation.repository";

/**
 * Read a page of the moderation audit log (UC-1929). Thin passthrough.
 * `scopeId` is a single fixed value resolved server-side (state-design.md §1
 * open-question flag on INT-191-07's `roomId`).
 */
export class GetModerationAuditLogUseCase {
  constructor(private readonly repo: IModerationRepository) {}

  execute(
    scopeId: string,
    cursor: string | null,
  ): Promise<ModerationResult<AuditLogPageResult>> {
    return this.repo.getModerationAuditLog(scopeId, cursor);
  }
}
