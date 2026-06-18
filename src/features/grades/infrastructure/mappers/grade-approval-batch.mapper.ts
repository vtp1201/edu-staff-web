import type {
  BatchScorePreviewRow,
  BatchStatus,
  GradeApprovalBatch,
  GradeApprovalBatchDetail,
} from "../../domain/entities/grade-approval-batch.entity";
import type {
  BatchScorePreviewRowDto,
  GradeApprovalBatchDetailDto,
  GradeApprovalBatchDto,
} from "../dtos/grade-approval-batch-response.dto";

/** Performance bands (SCALE_10) — single source for label + distribution. */
const BANDS: { label: string; min: number; max: number }[] = [
  { label: "Giỏi", min: 8.5, max: 10.01 },
  { label: "Khá", min: 7, max: 8.5 },
  { label: "Trung bình", min: 5, max: 7 },
  { label: "Yếu", min: 3.5, max: 5 },
  { label: "Kém", min: 0, max: 3.5 },
];

/** Map an average score to its Vietnamese performance label. */
export function gradeLabel(average: number | null): string {
  if (average === null) return "—";
  const band = BANDS.find((b) => average >= b.min && average < b.max);
  return band?.label ?? "Kém";
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
): { label: string; count: number }[] {
  return BANDS.map((b) => ({
    label: b.label,
    count: rows.filter(
      (r) => r.average !== null && r.average >= b.min && r.average < b.max,
    ).length,
  }));
}

function mapPreviewRow(dto: BatchScorePreviewRowDto): BatchScorePreviewRow {
  return {
    studentName: dto.studentName,
    studentCode: dto.studentCode,
    average: dto.average,
    gradeLabel: gradeLabel(dto.average),
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
