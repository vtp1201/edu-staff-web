import type { GradePublishMode } from "@/features/admin-school-setup/domain/entities/school-config.entity";
import type { AssessmentScheme } from "@/features/assessment-scheme/domain/entities/assessment-scheme.entity";
import type {
  GradePublishStatus,
  GradeSheet,
  StudentScoreRow,
} from "../../domain/entities/grade-sheet.entity";
import { calculateWeightedAverage } from "../../domain/use-cases/calculate-weighted-average.use-case";
import type {
  GradeSheetResponseDto,
  StudentScoreRowDto,
} from "../dtos/grades-response.dto";

function toPublishStatus(raw: string): GradePublishStatus {
  switch (raw) {
    case "PUBLISHED":
      return "PUBLISHED";
    case "PENDING_APPROVAL":
      return "PENDING_APPROVAL";
    default:
      return "DRAFT";
  }
}

export function mapStudentScoreRow(
  dto: StudentScoreRowDto,
  scheme: AssessmentScheme,
): StudentScoreRow {
  return {
    studentId: dto.studentId,
    studentName: dto.studentName,
    studentCode: dto.studentCode,
    scores: { ...dto.scores },
    // Recompute defensively so the average always agrees with the scores +
    // scheme weights, regardless of what the wire reported.
    average: calculateWeightedAverage(dto.scores, scheme.columns),
    publishStatus: toPublishStatus(dto.publishStatus),
  };
}

export function mapGradeSheet(
  dto: GradeSheetResponseDto,
  scheme: AssessmentScheme,
  publishMode: GradePublishMode,
): GradeSheet {
  return {
    classSubjectId: dto.classSubjectId,
    term: dto.term,
    scheme,
    rows: dto.rows.map((r) => mapStudentScoreRow(r, scheme)),
    publishMode,
  };
}
