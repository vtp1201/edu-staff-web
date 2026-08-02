import type { ReportRef } from "../entities/report.entity";
import type {
  IModerationRepository,
  ModerationActionResult,
} from "../repositories/i-moderation.repository";

/**
 * Dismiss a report (UC-1926). Passthrough — the `status === "pending"`
 * precondition is enforced by button visibility + the server's CAS 409, not
 * re-validated here (the use-case has no report object to check at call time;
 * over-guarding would duplicate server truth incorrectly). plan.md Phase 2.
 *
 * Takes the whole {@link ReportRef}: a bare `reportId` cannot address the row
 * (US-E18.32) — the resolve CAS needs the echoed-back `filedAt`.
 */
export class DismissReportUseCase {
  constructor(private readonly repo: IModerationRepository) {}

  execute(ref: ReportRef): Promise<ModerationActionResult> {
    return this.repo.dismissReport(ref);
  }
}
