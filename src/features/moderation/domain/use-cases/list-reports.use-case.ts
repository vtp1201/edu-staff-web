import type { ReportQueueFilter } from "../entities/report-queue-filter.entity";
import type {
  IModerationRepository,
  ModerationResult,
  ReportQueuePageResult,
} from "../repositories/i-moderation.repository";

/**
 * List the report queue (UC-1924). Thin passthrough — the empty-positive vs
 * empty-filtered distinction is a PRESENTATION concern (compares result length
 * against stats.pendingCount), NOT domain (plan.md Phase 2, YAGNI).
 */
export class ListReportsUseCase {
  constructor(private readonly repo: IModerationRepository) {}

  execute(
    filter: ReportQueueFilter,
    cursor: string | null,
  ): Promise<ModerationResult<ReportQueuePageResult>> {
    return this.repo.listReports(filter, cursor);
  }
}
