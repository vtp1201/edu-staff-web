import "server-only";
import { ensureFreshSession } from "@/bootstrap/di/auth.di";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { IModerationRepository } from "@/features/moderation/domain/repositories/i-moderation.repository";
import { DismissReportUseCase } from "@/features/moderation/domain/use-cases/dismiss-report.use-case";
import { GetModerationAuditLogUseCase } from "@/features/moderation/domain/use-cases/get-moderation-audit-log.use-case";
import { ListReportsUseCase } from "@/features/moderation/domain/use-cases/list-reports.use-case";
import { RemoveContentUseCase } from "@/features/moderation/domain/use-cases/remove-content.use-case";
import { SubmitReportUseCase } from "@/features/moderation/domain/use-cases/submit-report.use-case";
import { MockModerationRepository } from "@/features/moderation/infrastructure/repositories/mocks/moderation.mock.repository";
import { ModerationRepository } from "@/features/moderation/infrastructure/repositories/moderation.repository";

/**
 * Per-request repo factory (US-E19.2 → US-E18.20 → **US-E18.32**).
 *
 * `USE_MOCK ? Mock : Real`. This factory was PERMANENTLY force-mocked by
 * US-E18.20 over FIVE blocking gaps in `social`'s real contract. BE **US-172**
 * (+ US-166) closed FOUR of them, so the queue is now wired for real; the fifth
 * has no endpoint at all and is handled by an honest degrade rather than a mock
 * fallback. Re-ground-truthed against `services/social/docs/openapi.yaml`:
 *
 * 1. **No queue filters, no stats — RESOLVED (US-172).** `GET /reports` now
 *    takes `status` (PENDING|RESOLVED) + `contentType` (MESSAGE|POST|COMMENT) +
 *    `search`, all applied SERVER-side, and `GET /reports/stats` returns
 *    tenant-wide `{pending, resolved}` counters that are explicitly unaffected
 *    by those filters. Two caveats shaped the code: `status=all` is
 *    **deliberately unsupported** (two partition walks + a merge), so that tab
 *    was removed rather than faked; and `contentType`/`search` run over a
 *    BOUNDED in-app scan, so a short/empty page with `hasMore=true` is normal
 *    and the UI must keep offering "load more" on an empty filtered page.
 * 2. **No detail endpoint — RESOLVED (US-166).** `GET /reports/{reportId}`
 *    exists but is **not standalone-shareable**: `reportId` is a clustering
 *    column, so the caller must echo `filedAt` (REQUIRED) + `status` from the
 *    list row. Modelled as `ReportRef`, threaded list-row → Sheet, which makes
 *    a bookmarkable detail URL structurally impossible.
 * 3. **No COMMENT report target — RESOLVED (US-166).** `SubmitReportRequest`
 *    accepts COMMENT, and comment moderate-delete is real. From the QUEUE the
 *    removal goes through `resolve` with `action: DELETE` (which is wired for
 *    all three target types) — the direct comment route needs a parent postId
 *    that a report row does not carry. A comment delete is IRREVERSIBLE.
 * 4. **Audit trail is a different concept — STILL OPEN.** US-172 does not touch
 *    it. `GET /rooms/{roomId}/moderation-audit` (US-086) is a ROOM
 *    role/mute/capability audit, not this feature's dismiss/remove
 *    content-moderation trail, and no tenant-wide equivalent exists.
 *    `ModerationRepository.getModerationAuditLog` therefore degrades to a
 *    typed failure with ZERO HTTP — it does NOT fall back to the in-memory
 *    mock. A fabricated compliance trail is worse than an absent one, and the
 *    non-mock branch IS the production configuration (`USE_MOCK` is false when
 *    the env var is unset; `next.config.ts` refuses a deploy build with it on).
 *    The screen hides the audit tab when `auditLogEnabled` is false.
 * 5. **`resolve`/`dismiss` CAS key — RESOLVED by signature change.** Confirmed
 *    still required: `ResolveReportRequest` is `{action, filedAt}` with
 *    `filedAt` in the `required` list. `dismissReport`/`removeContent` now take
 *    the same `ReportRef`, so the key can never be missing at the call site.
 *
 * NOT wired, by contract: reporter identity (`ReportInboxItem` never declares
 * `reporterUserId` — NFR-098-01), the reported content preview/author, and the
 * duplicate-report list. Those entity fields read `null` on every real call and
 * presentation omits the affordance; only the mock fills them.
 */
async function makeRepo(): Promise<IModerationRepository> {
  if (USE_MOCK) return new MockModerationRepository();
  // decision 0018 — proactive refresh BEFORE the shared http client is created.
  await ensureFreshSession();
  return new ModerationRepository(await createServerHttpClient());
}

/**
 * SUBMIT-REPORT factory — the cross-route shared entry point. US-E19.1 (feed)
 * and US-E10.6 (messaging) each write their OWN thin `'use server'` action that
 * calls THIS factory and wraps the shared ReportContentDialog. Exported from
 * bootstrap/di (not colocated in any route's actions.ts) so it is importable
 * cross-route.
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
 * `getReportDetail` and `getReportStats` have no domain rule (pure fetches) →
 * exposed as the repository itself rather than no-op use-cases (same "no domain
 * rule → skip the use-case" call as US-E14.4). The action calls
 * `.getReportDetail(ref)` / `.getReportStats()` directly.
 */
export async function makeModerationRepository(): Promise<IModerationRepository> {
  return makeRepo();
}
