import type { ReportResponseDto } from "./report-response.dto";

export interface ReportContextItemDto {
  authorName: string;
  text: string;
  highlighted: boolean;
}

export interface DuplicateReportRefDto {
  reportId: string;
  reporterName: string;
  createdAt: string;
}

/** Report detail wire shape (INT-191-03) — the row plus full content, context,
 *  and the duplicate-report list. */
export interface ReportDetailResponseDto extends ReportResponseDto {
  fullContent: string;
  context?: ReportContextItemDto[] | null;
  duplicateReports?: DuplicateReportRefDto[] | null;
}
