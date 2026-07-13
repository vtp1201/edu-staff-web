import type { AttendanceTrendPointEntity } from "@/features/principal/domain/reports/entities/attendance-trend-point.entity";
import type { ReportListItemEntity } from "@/features/principal/domain/reports/entities/report-list-item.entity";
import type { ReportsSummaryEntity } from "@/features/principal/domain/reports/entities/reports-summary.entity";
import type { SubjectAverageEntity } from "@/features/principal/domain/reports/entities/subject-average.entity";
import type { AttendanceTrendPointResponseDto } from "../dtos/attendance-trend-response.dto";
import type { ReportListItemResponseDto } from "../dtos/report-list-item-response.dto";
import type { ReportsSummaryResponseDto } from "../dtos/reports-summary-response.dto";
import type { SubjectAverageResponseDto } from "../dtos/subject-average-response.dto";

/** DTO → Entity. Wire is camelCase, so mapping is field-explicit (no rename)
 *  but the boundary stays honest — nullable trends pass through verbatim. */
export const PrincipalReportsMapper = {
  toSummary(dto: ReportsSummaryResponseDto): ReportsSummaryEntity {
    return {
      totalStudents: dto.totalStudents,
      totalStudentsTrend: dto.totalStudentsTrend,
      schoolAverage: dto.schoolAverage,
      schoolAverageTrend: dto.schoolAverageTrend,
      attendanceRate: dto.attendanceRate,
      attendanceRateTrend: dto.attendanceRateTrend,
      incidentCount: dto.incidentCount,
      incidentCountTrend: dto.incidentCountTrend,
    };
  },

  toSubjectAverage(dto: SubjectAverageResponseDto): SubjectAverageEntity {
    return {
      subjectId: dto.subjectId,
      subjectName: dto.subjectName,
      average: dto.average,
    };
  },

  toAttendanceTrendPoint(
    dto: AttendanceTrendPointResponseDto,
  ): AttendanceTrendPointEntity {
    return { weekLabel: dto.weekLabel, rate: dto.rate };
  },

  toReportListItem(dto: ReportListItemResponseDto): ReportListItemEntity {
    return {
      id: dto.id,
      name: dto.name,
      term: dto.term,
      createdAt: dto.createdAt,
      status: dto.status,
    };
  },
};
