import type { StatusTone } from "@/components/shared/status-badge/status-badge";
import type {
  ReportEntity,
  ReportStatus,
} from "../../../domain/entities/report.entity";

/** Report status → badge tone (icon+text, never color-only in the component). */
const STATUS_TONE: Record<ReportStatus, StatusTone> = {
  pending: "warning",
  dismissed: "muted",
  removed: "error",
};

export function reportStatusTone(status: ReportStatus): StatusTone {
  return STATUS_TONE[status];
}

/**
 * Deterministic "DD/MM/YYYY HH:mm" from an ISO timestamp, read in UTC so tests
 * are timezone-independent (no `toLocaleString` — that varies by runner TZ).
 */
export function formatReportTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** Precomputed row-view fields shared by ReportTable and ReportCard (no
 *  per-component re-derivation of tone/date — one source, §5). */
export interface ReportRowView {
  id: string;
  reason: ReportEntity["reason"];
  kind: ReportEntity["kind"];
  authorName: string;
  reporterName: string;
  contentPreview: string;
  status: ReportStatus;
  statusTone: StatusTone;
  createdAtLabel: string;
  /** Extra reports on the same content (0 = none). */
  duplicateCount: number;
}

export function formatReportRow(report: ReportEntity): ReportRowView {
  return {
    id: report.id,
    reason: report.reason,
    kind: report.kind,
    authorName: report.authorName,
    reporterName: report.reporterName,
    contentPreview: report.contentPreview,
    status: report.status,
    statusTone: reportStatusTone(report.status),
    createdAtLabel: formatReportTimestamp(report.createdAt),
    duplicateCount: report.duplicateCount,
  };
}
