import type {
  BatchScorePreviewRow,
  BatchStatus,
  GradeApprovalBatch,
  GradeApprovalBatchDetail,
  GradeBandKey,
} from "../../domain/entities/grade-approval-batch.entity";
import type {
  BatchScorePreviewRowDto,
  GradeApprovalBatchDetailDto,
  GradeApprovalBatchDto,
} from "../dtos/grade-approval-batch-response.dto";

/** Performance bands (SCALE_10) — single source for band key + distribution. */
const BANDS: { key: GradeBandKey; min: number }[] = [
  { key: "excellent", min: 8.5 },
  { key: "good", min: 7 },
  { key: "average", min: 5 },
  { key: "weak", min: 3.5 },
  { key: "poor", min: 0 },
];

/** Map an average score to its stable performance-band key.
 *  Returns `null` when `avg` is null (score not yet entered). */
export function gradeBandKey(avg: number | null): GradeBandKey | null {
  if (avg === null) return null;
  if (avg < 3.5) return "poor";
  if (avg < 5) return "weak";
  if (avg < 7) return "average";
  if (avg < 8.5) return "good";
  return "excellent";
}

export function mapBatch(dto: GradeApprovalBatchDto): GradeApprovalBatch {
  return {
    id: dto.id,
    className: dto.className,
    subjectName: dto.subjectName,
    teacherName: dto.teacherName,
    term: dto.term,
    studentCount: dto.studentCount,
    status: dto.status as BatchStatus,
    updatedAt: dto.updatedAt,
  };
}

function buildDistribution(
  rows: BatchScorePreviewRowDto[],
): { key: GradeBandKey; count: number }[] {
  return BANDS.map((b, i) => ({
    key: b.key,
    count: rows.filter((r) => {
      if (r.average === null) return false;
      const next = BANDS[i - 1];
      return r.average >= b.min && (next === undefined || r.average < next.min);
    }).length,
  }));
}

function mapPreviewRow(dto: BatchScorePreviewRowDto): BatchScorePreviewRow {
  return {
    studentName: dto.studentName,
    studentCode: dto.studentCode,
    average: dto.average,
    gradeBandKey: gradeBandKey(dto.average),
  };
}

export function mapBatchDetail(
  dto: GradeApprovalBatchDetailDto,
): GradeApprovalBatchDetail {
  return {
    ...mapBatch(dto),
    averageScore: dto.averageScore,
    distribution: buildDistribution(dto.previewRows),
    previewRows: dto.previewRows.map(mapPreviewRow),
  };
}
