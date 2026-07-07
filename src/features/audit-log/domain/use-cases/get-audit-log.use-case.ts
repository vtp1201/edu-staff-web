import type { AuditLogFilter } from "../entities/audit-log-filter.entity";
import type {
  AuditLogPageResult,
  AuditLogResult,
  IAuditLogRepository,
} from "../repositories/i-audit-log.repository";

/**
 * Read a page of the append-only audit log (US-E12.12). Thin orchestration:
 * validates the date range (`from <= to`) before touching the repo, then
 * delegates. Pure — no side effects, no translation.
 */
export class GetAuditLogUseCase {
  constructor(private readonly repo: IAuditLogRepository) {}

  execute(
    filter: AuditLogFilter,
    cursor: string | null,
    limit: number,
  ): Promise<AuditLogResult<AuditLogPageResult>> {
    if (filter.from && filter.to && filter.from > filter.to) {
      return Promise.resolve({ ok: false, error: { type: "invalid-filter" } });
    }
    return this.repo.getAuditLog(filter, cursor, limit);
  }
}
