import type {
  IModerationRepository,
  ModerationActionResult,
  RemoveContentRepoInput,
} from "../repositories/i-moderation.repository";

/**
 * Remove reported content (UC-1928, HIGH-RISK, destructive). Passthrough
 * delegate — the *never-optimistic* rule lives in presentation (no client-side
 * status mutation before the promise resolves), NOT the use-case. plan.md
 * Phase 2. If BE confirms `resolveNote` becomes required, a validation branch
 * is added here (open question #3).
 */
export class RemoveContentUseCase {
  constructor(private readonly repo: IModerationRepository) {}

  execute(input: RemoveContentRepoInput): Promise<ModerationActionResult> {
    return this.repo.removeContent(input);
  }
}
