import type {
  IModerationRepository,
  ModerationActionResult,
} from "../repositories/i-moderation.repository";

/**
 * Dismiss a report (UC-1926). Passthrough — the `status === "pending"`
 * precondition is enforced by button visibility + the server's 409, not
 * re-validated here (the use-case has no report object to check at call time;
 * over-guarding would duplicate server truth incorrectly). plan.md Phase 2.
 */
export class DismissReportUseCase {
  constructor(private readonly repo: IModerationRepository) {}

  execute(reportId: string): Promise<ModerationActionResult> {
    return this.repo.dismissReport(reportId);
  }
}
