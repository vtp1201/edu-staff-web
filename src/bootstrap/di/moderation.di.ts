import "server-only";
import type { IModerationRepository } from "@/features/moderation/domain/repositories/i-moderation.repository";
import { DismissReportUseCase } from "@/features/moderation/domain/use-cases/dismiss-report.use-case";
import { GetModerationAuditLogUseCase } from "@/features/moderation/domain/use-cases/get-moderation-audit-log.use-case";
import { ListReportsUseCase } from "@/features/moderation/domain/use-cases/list-reports.use-case";
import { RemoveContentUseCase } from "@/features/moderation/domain/use-cases/remove-content.use-case";
import { SubmitReportUseCase } from "@/features/moderation/domain/use-cases/submit-report.use-case";
import { MockModerationRepository } from "@/features/moderation/infrastructure/repositories/mocks/moderation.mock.repository";

/**
 * Per-request repo factory (US-E19.2).
 *
 * **PERMANENTLY mock-first regardless of `USE_MOCK`** (US-E18.20) — joining
 * `staff-leave.di.ts` / `teaching-plan.di.ts` / `discipline.di.ts` /
 * `feed.di.ts`'s fully-blocked class. Deliberately NOT a `USE_MOCK`-conditional
 * choice: `social`'s `openapi.yaml` IS published now and the transport works.
 * The hold is a **list/detail/audit shape gap** the moderation queue cannot be
 * built on:
 *
 * 1. **No queue filters, no stats.** Real `GET /api/v1/reports` takes
 *    cursor+limit only (no `status`/`contentType`/`search`) and is hardcoded to
 *    the caller's tenant's PENDING rows — the screen's resolved/all tabs,
 *    content-type filter and free-text search have nothing to bind to. Its
 *    `ReportInboxItem` has no pending/resolved/removed counts either, so
 *    `ModerationStatsEntity`'s stat row has zero backing.
 * 2. **No detail endpoint at all.** There is no `GET /api/v1/reports/{reportId}`
 *    in the contract, so the detail sheet (full content + context + duplicate
 *    reports) is entirely unbacked.
 * 3. **No COMMENT report target.** `SubmitReportRequest.targetType` ∈
 *    `{MESSAGE, POST}` — the shipped comment-report flow has no endpoint. Nor
 *    is there a comment moderate-delete (only the post variant), so
 *    `ModerationRepository.removeContent` fails fast for `kind: "comment"`.
 * 4. **Audit trail is a different concept.** `GET /rooms/{roomId}/moderation-audit`
 *    (US-086) is a ROOM role/mute/capability change audit, not this feature's
 *    dismiss/remove content-moderation trail (`AuditEntryEntity`).
 * 5. **`resolve` needs a CAS key the signature lacks.** Real
 *    `ResolveReportRequest` requires the inbox row's echoed-back `filedAt`
 *    alongside `action`; `dismissReport(reportId)` has no such parameter.
 *
 * Post moderate-delete IS real (`POST /feeds/posts/{postId}/moderate-delete`)
 * and is now issued correctly, but is unreachable: its only sources of a valid
 * `postId` are the (unbacked) queue or the feed's direct-removal path (ADR
 * 0052), and `feed.di.ts` is force-mocked too. Same "isolated real endpoint,
 * zero reachable real id" shape as US-E18.9.
 */
async function makeRepo(): Promise<IModerationRepository> {
  return new MockModerationRepository();
}

/**
 * SUBMIT-REPORT factory — the cross-route shared entry point. US-E19.1 (feed)
 * and US-E10.6 (messaging) each write their OWN thin `'use server'` action that
 * calls THIS factory and wraps the shared ReportContentDialog. Exported from
 * bootstrap/di (not colocated in any route's actions.ts) so it is importable
 * cross-route, per plan.md's consumer contract.
 */
export async function makeSubmitReportUseCase() {
  return new SubmitReportUseCase(await makeRepo());
}

export async function makeListReportsUseCase() {
  return new ListReportsUseCase(await makeRepo());
}

export async function makeDismissReportUseCase() {
  return new DismissReportUseCase(await makeRepo());
}

export async function makeRemoveContentUseCase() {
  return new RemoveContentUseCase(await makeRepo());
}

export async function makeGetModerationAuditLogUseCase() {
  return new GetModerationAuditLogUseCase(await makeRepo());
}

/**
 * getReportDetail has no domain rule (pure fetch) → exposed as the repo itself
 * rather than a no-op use-case (same "no domain rule → skip the use-case" call
 * as US-E14.4). The RSC/action calls `.getReportDetail(reportId)` directly.
 */
export async function makeModerationRepository(): Promise<IModerationRepository> {
  return makeRepo();
}
