import "server-only";
import type { AxiosInstance } from "axios";
import { PRINCIPAL_REPORTS_EP } from "@/bootstrap/endpoint/principal-reports.endpoint";
import {
  type ApiEnvelope,
  errorCodeOf,
  parseEnvelope,
  statusOf,
} from "@/bootstrap/lib/api-envelope";
import type { AttendanceTrendPointEntity } from "@/features/principal/domain/reports/entities/attendance-trend-point.entity";
import type { ReportListItemEntity } from "@/features/principal/domain/reports/entities/report-list-item.entity";
import type {
  ReportsSummaryEntity,
  Term,
} from "@/features/principal/domain/reports/entities/reports-summary.entity";
import type { SubjectAverageEntity } from "@/features/principal/domain/reports/entities/subject-average.entity";
import type { PrincipalReportsFailure } from "@/features/principal/domain/reports/failures/principal-reports.failure";
import type {
  IPrincipalReportsRepository,
  ReportListPage,
} from "@/features/principal/domain/reports/repositories/i-principal-reports.repository";
import type { AttendanceTrendResponseDto } from "../dtos/attendance-trend-response.dto";
import type { ReportListItemResponseDto } from "../dtos/report-list-item-response.dto";
import type { ReportsSummaryResponseDto } from "../dtos/reports-summary-response.dto";
import type { SubjectAveragesResponseDto } from "../dtos/subject-average-response.dto";
import { PrincipalReportsMapper } from "../mappers/principal-reports.mapper";

/** Map a normalised ApiError to the read-path failure union. Branch on
 *  error.code (UPPER_SNAKE) / status, NEVER on message (decision 0008). */
function toFailure(err: unknown): PrincipalReportsFailure {
  const code = errorCodeOf(err);
  const status = statusOf(err);
  if (code === "NETWORK_ERROR" || status === undefined) {
    return { type: "network-error" };
  }
  if (code === "TERM_NOT_FOUND" || status === 404) {
    return { type: "term-not-found" };
  }
  if (status === 401 || status === 403) return { type: "unauthorized" };
  return { type: "unknown" };
}

/** Generate-path failure: auth errors surface as unauthorized, everything
 *  else (server/transport) as generation-failed (INT-005). */
function toGenerateFailure(err: unknown): PrincipalReportsFailure {
  const status = statusOf(err);
  if (status === 401 || status === 403) return { type: "unauthorized" };
  return { type: "generation-failed" };
}

/**
 * Real HTTP repository (INT-001..005). Throwing convention: resolves the entity
 * on success, throws a {@link PrincipalReportsFailure} on failure — the Server
 * Action layer catches it and surfaces `errorKey`.
 *
 * NOTE (spec §0): there is NO forced-failure / ordinal / demo logic here.
 * Errors are 1:1 with genuine HTTP outcomes only.
 */
export class PrincipalReportsRepository implements IPrincipalReportsRepository {
  constructor(private readonly http: AxiosInstance) {}

  async getReportsSummary(termId: Term): Promise<ReportsSummaryEntity> {
    try {
      const payload = (await this.http.get(PRINCIPAL_REPORTS_EP.summary, {
        params: { termId },
      })) as unknown as ReportsSummaryResponseDto;
      return PrincipalReportsMapper.toSummary(payload);
    } catch (err) {
      throw toFailure(err);
    }
  }

  async getSubjectAverages(termId: Term): Promise<SubjectAverageEntity[]> {
    try {
      const payload = (await this.http.get(
        PRINCIPAL_REPORTS_EP.subjectAverages,
        { params: { termId } },
      )) as unknown as SubjectAveragesResponseDto;
      return payload.subjects.map(PrincipalReportsMapper.toSubjectAverage);
    } catch (err) {
      throw toFailure(err);
    }
  }

  async getAttendanceTrend(
    termId: Term,
  ): Promise<AttendanceTrendPointEntity[]> {
    try {
      const payload = (await this.http.get(
        PRINCIPAL_REPORTS_EP.attendanceTrend,
        { params: { termId } },
      )) as unknown as AttendanceTrendResponseDto;
      return payload.weeks.map(PrincipalReportsMapper.toAttendanceTrendPoint);
    } catch (err) {
      throw toFailure(err);
    }
  }

  async getPeriodicReports(
    termId: Term,
    cursor?: string,
  ): Promise<ReportListPage> {
    try {
      const params: Record<string, string> = { termId };
      if (cursor) params.cursor = cursor;
      const envelope = (await this.http.get(PRINCIPAL_REPORTS_EP.list, {
        params,
        raw: true,
      })) as unknown as ApiEnvelope<ReportListItemResponseDto[]>;
      const { data, pagination } = parseEnvelope(envelope);
      return {
        items: data.map(PrincipalReportsMapper.toReportListItem),
        nextCursor: pagination?.nextCursor ?? null,
        hasMore: pagination?.hasMore ?? false,
      };
    } catch (err) {
      throw toFailure(err);
    }
  }

  async generateReport(termId: Term): Promise<ReportListItemEntity> {
    try {
      const payload = (await this.http.post(PRINCIPAL_REPORTS_EP.generate, {
        termId,
      })) as unknown as ReportListItemResponseDto;
      return PrincipalReportsMapper.toReportListItem(payload);
    } catch (err) {
      throw toGenerateFailure(err);
    }
  }
}
