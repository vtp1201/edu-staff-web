import type { ModerationStatsResponseDto } from "./moderation-stats-response.dto";

/** Queue row wire shape (INT-191-02) — camelCase per api-integration.md. */
export interface ReportResponseDto {
  reportId: string;
  kind: "post" | "comment" | "message";
  contentId: string;
  contentPreview: string;
  authorId: string;
  authorName: string;
  reporterId: string;
  reporterName: string;
  reason: string;
  note?: string | null;
  status: "pending" | "dismissed" | "removed";
  createdAt: string;
  duplicateCount: number;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  resolveNote?: string | null;
}

/**
 * `GET /reports` payload (envelope `data`): the report rows plus the embedded
 * stat row (FR-103). Pagination lives in `meta.pagination` (read via
 * `{ raw: true }` + parseEnvelope).
 */
export interface ReportListResponseDto {
  reports: ReportResponseDto[];
  stats: ModerationStatsResponseDto;
}
