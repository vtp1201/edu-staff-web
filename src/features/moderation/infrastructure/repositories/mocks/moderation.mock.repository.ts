import "server-only";
import { mockDelay } from "@/bootstrap/lib/mock";
import type { AuditEntryEntity } from "../../../domain/entities/audit-entry.entity";
import type { ModerationStatsEntity } from "../../../domain/entities/moderation-stats.entity";
import type { ReportEntity } from "../../../domain/entities/report.entity";
import type { ReportDetailEntity } from "../../../domain/entities/report-detail.entity";
import type { ReportQueueFilter } from "../../../domain/entities/report-queue-filter.entity";
import {
  type AuditLogPageResult,
  type CreateReportInput,
  type IModerationRepository,
  MODERATION_PAGE_SIZE,
  type ModerationActionResult,
  type ModerationResult,
  type RemoveContentRepoInput,
  type ReportQueuePageResult,
} from "../../../domain/repositories/i-moderation.repository";

const PRINCIPAL_NAME = "Lê Thị Bích Ngọc (BGH)";

/**
 * Deterministic forced-403 fixture (anti-demo rule, plan.md Phase 3). Removing
 * THIS specific report always returns `forbidden`, letting Storybook/QA exercise
 * AC-1928.6 without a hidden `failedOnce`/toggle state machine. It is a fixed,
 * documented id — not a mutable induced-failure flag.
 */
export const MOCK_FORBIDDEN_REPORT_ID = "rep-forbidden";

/** A contentId reported by 3 distinct reporters — drives UC-1930's duplicate list. */
const TRIPLE_REPORTED_CONTENT_ID = "post-777";

function iso(daysAgo: number, hour = 9): string {
  const d = new Date("2026-07-11T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - daysAgo);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}

/**
 * Seed reports — mock *data* (names/snippets are not i18n copy). Spans all 3
 * kinds, all 3 statuses, and duplicate counts (incl. the triple-reported post).
 */
function seedReports(): ReportEntity[] {
  const base = (
    partial: Partial<ReportEntity> & Pick<ReportEntity, "id" | "kind">,
  ): ReportEntity => ({
    contentId: `content-${partial.id}`,
    contentPreview: "Nội dung bị báo cáo.",
    authorId: "author-x",
    authorName: "Người dùng",
    reporterId: "reporter-x",
    reporterName: "Người báo cáo",
    reason: "spam",
    note: null,
    status: "pending",
    createdAt: iso(1),
    duplicateCount: 0,
    resolvedBy: null,
    resolvedAt: null,
    resolveNote: null,
    ...partial,
  });

  return [
    base({
      id: MOCK_FORBIDDEN_REPORT_ID,
      kind: "post",
      contentId: "post-403",
      contentPreview:
        "Bài viết này dùng để minh hoạ trường hợp máy chủ từ chối quyền gỡ.",
      authorName: "Nguyễn Văn An",
      reporterName: "Trần Thị Bình",
      reason: "inappropriate-language",
      createdAt: iso(0, 8),
    }),
    base({
      id: "rep-001",
      kind: "post",
      contentId: TRIPLE_REPORTED_CONTENT_ID,
      contentPreview: "Chia sẻ link kiếm tiền nhanh, ai cũng làm được!!!",
      authorName: "Phạm Quốc Huy",
      reporterName: "Đỗ Thị Lan",
      reason: "spam",
      duplicateCount: 2,
      createdAt: iso(0, 9),
    }),
    base({
      id: "rep-002",
      kind: "post",
      contentId: TRIPLE_REPORTED_CONTENT_ID,
      contentPreview: "Chia sẻ link kiếm tiền nhanh, ai cũng làm được!!!",
      authorName: "Phạm Quốc Huy",
      reporterName: "Vũ Minh Khoa",
      reason: "spam",
      duplicateCount: 2,
      createdAt: iso(0, 10),
    }),
    base({
      id: "rep-003",
      kind: "post",
      contentId: TRIPLE_REPORTED_CONTENT_ID,
      contentPreview: "Chia sẻ link kiếm tiền nhanh, ai cũng làm được!!!",
      authorName: "Phạm Quốc Huy",
      reporterName: "Ngô Bảo Châu",
      reason: "misinformation",
      duplicateCount: 2,
      createdAt: iso(0, 11),
    }),
    base({
      id: "rep-004",
      kind: "comment",
      contentId: "comment-201",
      contentPreview: "Bình luận có lời lẽ xúc phạm giáo viên chủ nhiệm.",
      authorName: "Hoàng Văn Dũng",
      reporterName: "Lý Thị Mai",
      reason: "bullying",
      note: "Xúc phạm cá nhân nhiều lần.",
      createdAt: iso(1, 14),
    }),
    base({
      id: "rep-005",
      kind: "comment",
      contentId: "comment-202",
      contentPreview: "Ngôn từ tục tĩu trong phần bình luận bài tập.",
      authorName: "Bùi Thanh Tùng",
      reporterName: "Cao Thị Hồng",
      reason: "inappropriate-language",
      createdAt: iso(1, 15),
    }),
    base({
      id: "rep-006",
      kind: "message",
      contentId: "message-301",
      contentPreview: "Tin nhắn quấy rối gửi tới học sinh khác.",
      authorName: "Đặng Quốc Việt",
      reporterName: "Trịnh Thu Hà",
      reason: "bullying",
      createdAt: iso(2, 8),
    }),
    base({
      id: "rep-007",
      kind: "post",
      contentId: "post-401",
      contentPreview: "Thông tin sai về lịch thi cuối kỳ.",
      authorName: "Mai Văn Sơn",
      reporterName: "Phan Thị Yến",
      reason: "misinformation",
      createdAt: iso(2, 10),
    }),
    // Resolved subset (drives stats + audit seed).
    base({
      id: "rep-008",
      kind: "post",
      contentId: "post-402",
      contentPreview: "Bài viết spam quảng cáo đã được xử lý.",
      authorName: "Lương Văn Bình",
      reporterName: "Tạ Thị Nhung",
      reason: "spam",
      status: "dismissed",
      resolvedBy: PRINCIPAL_NAME,
      resolvedAt: iso(3, 9),
      resolveNote: "Không vi phạm — nội dung hợp lệ.",
      createdAt: iso(4, 9),
    }),
    base({
      id: "rep-009",
      kind: "comment",
      contentId: "comment-203",
      contentPreview: "Bình luận vi phạm đã bị gỡ.",
      authorName: "Trương Văn Đức",
      reporterName: "Hồ Thị Thảo",
      reason: "inappropriate-language",
      status: "removed",
      resolvedBy: PRINCIPAL_NAME,
      resolvedAt: iso(3, 11),
      resolveNote: "Vi phạm quy tắc ứng xử — đã gỡ.",
      createdAt: iso(5, 11),
    }),
    base({
      id: "rep-010",
      kind: "message",
      contentId: "message-302",
      contentPreview: "Tin nhắn spam đã được xử lý.",
      authorName: "Đinh Công Minh",
      reporterName: "Chu Thị Vân",
      reason: "spam",
      status: "dismissed",
      resolvedBy: PRINCIPAL_NAME,
      resolvedAt: iso(2, 16),
      resolveNote: "Đã nhắc nhở người dùng.",
      createdAt: iso(6, 16),
    }),
    base({
      id: "rep-011",
      kind: "post",
      contentId: "post-404",
      contentPreview: "Nội dung bắt nạt đã bị gỡ tuần trước.",
      authorName: "Nguyễn Thị Quỳnh",
      reporterName: "Lê Văn Hoàng",
      reason: "bullying",
      status: "removed",
      resolvedBy: PRINCIPAL_NAME,
      resolvedAt: iso(1, 13),
      resolveNote: "Vi phạm nghiêm trọng.",
      createdAt: iso(7, 13),
    }),
  ];
}

function buildStats(reports: ReportEntity[]): ModerationStatsEntity {
  return {
    pendingCount: reports.filter((r) => r.status === "pending").length,
    resolvedThisWeekCount: reports.filter((r) => r.status !== "pending").length,
    removedCount: reports.filter((r) => r.status === "removed").length,
  };
}

function matchesFilter(r: ReportEntity, filter: ReportQueueFilter): boolean {
  if (filter.status === "pending" && r.status !== "pending") return false;
  if (filter.status === "resolved" && r.status === "pending") return false;
  if (filter.contentType !== "all" && r.kind !== filter.contentType) {
    return false;
  }
  const q = filter.search.trim().toLowerCase();
  if (q) {
    const hay =
      `${r.authorName} ${r.reporterName} ${r.contentPreview}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

/**
 * In-memory `social` moderation mock (US-E19.2). Mutates report status +
 * appends audit entries on dismiss/remove so a mock QA session exercises the
 * full flow (dismiss/remove → stats + audit update). Forced-403 is a single
 * documented fixture id ({@link MOCK_FORBIDDEN_REPORT_ID}), NOT a toggle.
 */
export class MockModerationRepository implements IModerationRepository {
  // Fresh state per `new` (deterministic across test runs / DI per-request).
  private reports: ReportEntity[] = seedReports();
  private audit: AuditEntryEntity[] = this.reports
    .filter((r) => r.status !== "pending")
    .map((r, i) => this.toAuditEntry(r, i));

  private toAuditEntry(r: ReportEntity, seq: number): AuditEntryEntity {
    return {
      entryId: `audit-${r.id}-${seq}`,
      actorId: "principal-1",
      actorName: r.resolvedBy ?? PRINCIPAL_NAME,
      action: r.status === "removed" ? "removed" : "dismissed",
      contentRef: { kind: r.kind, contentId: r.contentId },
      reason: r.resolveNote ?? r.reason,
      timestamp: r.resolvedAt ?? r.createdAt,
    };
  }

  async createReport(
    _input: CreateReportInput,
  ): Promise<ModerationActionResult> {
    await mockDelay();
    return { ok: true };
  }

  async listReports(
    filter: ReportQueueFilter,
    cursor: string | null,
  ): Promise<ModerationResult<ReportQueuePageResult>> {
    await mockDelay();
    const filtered = this.reports.filter((r) => matchesFilter(r, filter));
    const start = cursor ? Number.parseInt(cursor, 10) : 0;
    const slice = filtered.slice(start, start + MODERATION_PAGE_SIZE);
    const nextIndex = start + slice.length;
    const hasMore = nextIndex < filtered.length;
    return {
      ok: true,
      value: {
        reports: slice.map((r) => ({ ...r })),
        stats: buildStats(this.reports),
        nextCursor: hasMore ? String(nextIndex) : null,
        hasMore,
      },
    };
  }

  async getReportDetail(
    reportId: string,
  ): Promise<ModerationResult<ReportDetailEntity>> {
    await mockDelay();
    const r = this.reports.find((x) => x.id === reportId);
    if (!r) return { ok: false, error: { type: "not-found" } };

    const duplicateReports = this.reports
      .filter((x) => x.contentId === r.contentId && x.id !== r.id)
      .map((x) => ({
        reportId: x.id,
        reporterName: x.reporterName,
        createdAt: x.createdAt,
      }));

    const context =
      r.kind === "comment"
        ? [
            {
              authorName: r.authorName,
              text: "Bài viết gốc chứa bình luận bị báo cáo.",
              highlighted: false,
            },
          ]
        : r.kind === "message"
          ? [
              {
                authorName: "Học sinh khác",
                text: "Tin nhắn trước đó trong cuộc trò chuyện.",
                highlighted: false,
              },
              {
                authorName: r.authorName,
                text: r.contentPreview,
                highlighted: true,
              },
            ]
          : [];

    return {
      ok: true,
      value: {
        ...r,
        fullContent: `${r.contentPreview} (nội dung đầy đủ trong môi trường mock).`,
        context,
        duplicateReports,
      },
    };
  }

  async dismissReport(reportId: string): Promise<ModerationActionResult> {
    await mockDelay();
    const r = this.reports.find((x) => x.id === reportId);
    if (!r) return { ok: false, error: { type: "not-found" } };
    if (r.status !== "pending") {
      return { ok: false, error: { type: "already-resolved" } };
    }
    r.status = "dismissed";
    r.resolvedBy = PRINCIPAL_NAME;
    r.resolvedAt = new Date().toISOString();
    this.audit.unshift(this.toAuditEntry(r, this.audit.length));
    return { ok: true };
  }

  async removeContent(
    input: RemoveContentRepoInput,
  ): Promise<ModerationActionResult> {
    await mockDelay();
    // Deterministic forced-403 fixture (AC-1928.6) — code-only, no message.
    if (input.reportId === MOCK_FORBIDDEN_REPORT_ID) {
      return { ok: false, error: { type: "forbidden" } };
    }
    // ADR 0052: feed's direct-removal path has no report in scope — there is no
    // queue row to look up or resolve, so succeed without the report branch.
    if (!input.reportId) {
      return { ok: true };
    }
    const r = this.reports.find((x) => x.id === input.reportId);
    if (!r) return { ok: false, error: { type: "not-found" } };
    if (r.status !== "pending") {
      return { ok: false, error: { type: "already-resolved" } };
    }
    r.status = "removed";
    r.resolvedBy = PRINCIPAL_NAME;
    r.resolvedAt = new Date().toISOString();
    r.resolveNote = input.resolveNote ?? null;
    this.audit.unshift(this.toAuditEntry(r, this.audit.length));
    return { ok: true };
  }

  async getModerationAuditLog(
    _scopeId: string,
    cursor: string | null,
  ): Promise<ModerationResult<AuditLogPageResult>> {
    await mockDelay();
    // Reverse-chronological (newest first) — unshift on write keeps order.
    const sorted = [...this.audit].sort((a, b) =>
      b.timestamp.localeCompare(a.timestamp),
    );
    const start = cursor ? Number.parseInt(cursor, 10) : 0;
    const slice = sorted.slice(start, start + MODERATION_PAGE_SIZE);
    const nextIndex = start + slice.length;
    const hasMore = nextIndex < sorted.length;
    return {
      ok: true,
      value: {
        entries: slice.map((e) => ({ ...e })),
        nextCursor: hasMore ? String(nextIndex) : null,
        hasMore,
      },
    };
  }
}
