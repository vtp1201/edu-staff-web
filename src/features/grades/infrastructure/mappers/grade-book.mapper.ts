import type { GradePublishMode } from "@/features/admin-school-setup/domain/entities/school-config.entity";
import type { AssessmentScheme } from "@/features/assessment-scheme/domain/entities/assessment-scheme.entity";
import type {
  ConductGrade,
  GradeBook,
  GradeBookRow,
} from "../../domain/entities/grade-book.entity";
import type { GradeCell } from "../../domain/entities/grade-sheet.entity";
import { calculateWeightedAverage } from "../../domain/use-cases/calculate-weighted-average.use-case";
import type {
  ListGradesResponseDto,
  StudentGradeRowResponseDto,
  SubjectTermGradesResponseDto,
} from "../dtos/grade-book-response.dto";
import { mapGradeCell } from "./grades.mapper";

/**
 * `conductGrade` has NO source on the `GradeEntry`/`GradeReport` wire (it
 * belongs to the separate `conduct` domain, out of scope for US-E18.12) —
 * defaults to "TB" until the grade-book composes the real conduct-grade
 * feature (follow-up, matches the epic's fallback-with-doc-comment pattern
 * for genuinely missing cross-domain fields).
 */
const DEFAULT_CONDUCT_GRADE: ConductGrade = "TB";

function mapRow(
  dto: StudentGradeRowResponseDto,
  scheme: AssessmentScheme,
): GradeBookRow {
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
    studentName: dto.studentMemberId, // no display-name field on the wire (see grades.mapper.ts)
    studentCode: dto.studentMemberId,
    scores,
    average: calculateWeightedAverage(values, scheme.columns),
    conductGrade: DEFAULT_CONDUCT_GRADE,
  };
}

export function mapGradeBook(
  dto: ListGradesResponseDto,
  scheme: AssessmentScheme,
  publishMode: GradePublishMode,
  className: string,
  subjectName: string,
  academicYearLabel: string,
): GradeBook {
  return {
    classId: dto.classId,
    subjectId: dto.subjectId,
    termId: dto.termId,
    academicYearLabel,
    className,
    subjectName,
    scheme,
    rows: dto.students.map((s) => mapRow(s, scheme)),
    publishMode,
  };
}

/**
 * Maps ONE (subject, term) self-view group (`GET /members/{id}/grades`) into
 * a single-row `GradeBook` for the viewing student/child — the "row" is
 * always the viewer themself, so `rows` has exactly one element.
 */
export function mapSubjectTermGroup(
  group: SubjectTermGradesResponseDto,
  scheme: AssessmentScheme,
  publishMode: GradePublishMode,
  studentMemberId: string,
  academicYearLabel: string,
  className: string,
  subjectName: string,
): GradeBook {
  const studentRow: StudentGradeRowResponseDto = {
    studentMemberId,
    entries: group.entries,
    termAverage: "",
  };
  return {
    classId: "", // self-view has no classId on the wire (year+subject scoped only)
    subjectId: group.subjectId,
    termId: group.termId,
    academicYearLabel,
    className,
    subjectName,
    scheme,
    rows: [mapRow(studentRow, scheme)],
    publishMode,
  };
}
