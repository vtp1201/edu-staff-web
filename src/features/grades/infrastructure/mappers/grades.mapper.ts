import type { GradePublishMode } from "@/features/admin-school-setup/domain/entities/school-config.entity";
import type { AssessmentScheme } from "@/features/assessment-scheme/domain/entities/assessment-scheme.entity";
import type {
  GradeCell,
  GradeEntryStatus,
  GradeSheet,
  StudentScoreRow,
} from "../../domain/entities/grade-sheet.entity";
import { calculateWeightedAverage } from "../../domain/use-cases/calculate-weighted-average.use-case";
import type {
  GradeEntryResponseDto,
  ListGradesResponseDto,
  StudentGradeRowResponseDto,
} from "../dtos/grades-response.dto";

function toStatus(raw: string): GradeEntryStatus {
  switch (raw) {
    case "SUBMITTED":
    case "PENDING_APPROVAL":
    case "PUBLISHED":
    case "LOCKED":
      return raw;
    default:
      return "DRAFT";
  }
}

/** Maps one wire `GradeEntryResponse` to a domain `GradeCell`. */
export function mapGradeCell(dto: GradeEntryResponseDto): GradeCell {
  return { value: Number(dto.value), status: toStatus(dto.status) };
}

/**
 * `StudentGradeRowResponse` has NO display fields (no `studentName`/
 * `studentCode` on the wire — only `studentMemberId`) — same recurring gap as
 * the epic's other "list" endpoints (e.g. `memberName` falling back to
 * `memberId` in US-E18.2). Falls back to the id until a display-name source
 * exists (cross-repo ask).
 */
export function mapStudentScoreRow(
  dto: StudentGradeRowResponseDto,
  scheme: AssessmentScheme,
): StudentScoreRow {
  const scores: Record<string, GradeCell> = {};
  for (const col of scheme.columns) {
    const entry = dto.entries.find((e) => e.columnId === col.id);
    scores[col.id] = entry
      ? mapGradeCell(entry)
      : { value: null, status: "DRAFT" };
  }
  const values: Record<string, number | null> = {};
  for (const [colId, cell] of Object.entries(scores)) {
    values[colId] = cell.value;
  }
  return {
    studentId: dto.studentMemberId,
    studentName: dto.studentMemberId,
    studentCode: dto.studentMemberId,
    scores,
    // Recompute defensively so the average always agrees with the scores +
    // scheme weights, regardless of what the wire's own `termAverage` said.
    average: calculateWeightedAverage(values, scheme.columns),
  };
}

export function mapGradeSheet(
  dto: ListGradesResponseDto,
  scheme: AssessmentScheme,
  publishMode: GradePublishMode,
  academicYearLabel: string,
): GradeSheet {
  return {
    classId: dto.classId,
    subjectId: dto.subjectId,
    termId: dto.termId,
    academicYearLabel,
    scheme,
    rows: dto.students.map((s) => mapStudentScoreRow(s, scheme)),
    publishMode,
  };
}
