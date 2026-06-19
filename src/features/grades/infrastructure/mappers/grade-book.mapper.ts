import type { GradePublishMode } from "@/features/admin-school-setup/domain/entities/school-config.entity";
import type { AssessmentScheme } from "@/features/assessment-scheme/domain/entities/assessment-scheme.entity";
import type {
  ConductGrade,
  GradeBook,
  GradeBookRow,
} from "../../domain/entities/grade-book.entity";
import type { GradePublishStatus } from "../../domain/entities/grade-sheet.entity";
import { calculateWeightedAverage } from "../../domain/use-cases/calculate-weighted-average.use-case";
import type {
  GradeBookResponseDto,
  GradeBookRowDto,
} from "../dtos/grade-book-response.dto";

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

function toConductGrade(raw: string): ConductGrade {
  switch (raw) {
    case "Tot":
    case "Kha":
    case "TB":
    case "Yeu":
      return raw;
    default:
      return "TB";
  }
}

export function mapGradeBookRow(
  dto: GradeBookRowDto,
  scheme: AssessmentScheme,
): GradeBookRow {
  return {
    studentId: dto.studentId,
    studentName: dto.studentName,
    studentCode: dto.studentCode,
    scores: { ...dto.scores },
    // Recompute defensively so the average always agrees with scores + weights.
    average: calculateWeightedAverage(dto.scores, scheme.columns),
    conductGrade: toConductGrade(dto.conductGrade),
    publishStatus: toPublishStatus(dto.publishStatus),
  };
}

export function mapGradeBook(
  dto: GradeBookResponseDto,
  scheme: AssessmentScheme,
  publishMode: GradePublishMode,
): GradeBook {
  return {
    classSubjectId: dto.classSubjectId,
    term: dto.term,
    className: dto.className,
    subjectName: dto.subjectName,
    scheme,
    rows: dto.rows.map((r) => mapGradeBookRow(r, scheme)),
    publishMode,
  };
}
