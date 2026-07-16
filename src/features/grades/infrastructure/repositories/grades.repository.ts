import "server-only";
import type { AxiosInstance } from "axios";
import { GRADES_EP } from "@/bootstrap/endpoint/grades.endpoint";
import { errorCodeOf, statusOf } from "@/bootstrap/lib/api-envelope";
import type { GradePublishMode } from "@/features/admin-school-setup/domain/entities/school-config.entity";
import type { AssessmentScheme } from "@/features/assessment-scheme/domain/entities/assessment-scheme.entity";
import type { ClassSubjectTermKey } from "../../domain/entities/class-subject-term-key.entity";
import type {
  GradeCell,
  GradeSheet,
} from "../../domain/entities/grade-sheet.entity";
import type { GradesFailure } from "../../domain/failures/grades.failure";
import type { IGradesRepository } from "../../domain/repositories/i-grades.repository";
import type { IGradesTermRepository } from "../../domain/repositories/i-grades-term.repository";
import type {
  GradeEntryResponseDto,
  ListGradesResponseDto,
  LockGradeResponseDto,
} from "../dtos/grades-response.dto";
import { mapGradeCell, mapGradeSheet } from "../mappers/grades.mapper";

/**
 * Ground-truthed 11-code error taxonomy (US-E18.12, ADR 0054 — same
 * `pkg/kit/response/error.go` `codeFromKey` UPPER_SNAKE convention as
 * US-E18.7/8/9/11). `GRADE_ENTRY_NOT_SUBMITTED` (documented but unreachable —
 * no path drives an entry through SUBMITTED) maps defensively to `not-draft`.
 */
function throwFailure(err: unknown, columnId: string, maxScore: number): never {
  const code = errorCodeOf(err);
  const status = statusOf(err) ?? 0;
  let failure: GradesFailure;
  if (code === "GRADE_ENTRY_NOT_FOUND" || status === 404) {
    failure = { type: "not-found" };
  } else if (code === "GRADE_ENTRY_TEACHER_NOT_ASSIGNED") {
    failure = { type: "teacher-not-assigned" };
  } else if (code === "GRADE_ENTRY_FORBIDDEN" || status === 403) {
    failure = { type: "forbidden" };
  } else if (code === "GRADE_ENTRY_INVALID_VALUE") {
    failure = { type: "invalid-value", columnId, maxScore };
  } else if (
    code === "GRADE_ENTRY_NOT_DRAFT" ||
    code === "GRADE_ENTRY_NOT_SUBMITTED"
  ) {
    failure = { type: "not-draft" };
  } else if (code === "GRADE_ENTRY_NOT_PENDING_APPROVAL") {
    failure = { type: "not-pending-approval" };
  } else if (code === "GRADE_ENTRY_NOT_PUBLISHED") {
    failure = { type: "not-published" };
  } else if (code === "GRADE_ENTRY_LOCKED") {
    failure = { type: "locked" };
  } else if (code === "GRADE_SCALE_NOT_CONFIGURED") {
    failure = { type: "scale-not-configured" };
  } else if (code === "ASSESSMENT_SCHEME_NOT_CONFIGURED") {
    failure = { type: "scheme-not-configured" };
  } else if (code === "GRADE_ENTRY_COLUMN_NOT_IN_SCHEME") {
    failure = { type: "column-not-in-scheme", columnId };
  } else if (code === "GRADE_ENTRY_STUDENT_NOT_ENROLLED") {
    failure = { type: "student-not-enrolled" };
  } else if (code === "NETWORK_ERROR" || status >= 500) {
    failure = { type: "network-error" };
  } else {
    failure = { type: "unknown" };
  }
  throw failure;
}

const DEFAULT_MAX_SCORE = 10;

export class GradesRepository
  implements IGradesRepository, IGradesTermRepository
{
  /**
   * `scheme` + `publishMode` are sourced (by the DI factory) from the REAL
   * assessment-scheme and operational-settings services and threaded into the
   * grade-sheet shape the grades endpoints do not themselves carry.
   */
  constructor(
    private readonly http: AxiosInstance,
    private readonly scheme: AssessmentScheme,
    private readonly publishMode: GradePublishMode,
  ) {}

  async getGradeSheet(key: ClassSubjectTermKey): Promise<GradeSheet> {
    try {
      const dto = (await this.http.get(
        GRADES_EP.listGrades(key.classId, key.subjectId, key.termId),
        { params: { year: key.academicYearLabel } },
      )) as unknown as ListGradesResponseDto;
      return mapGradeSheet(
        dto,
        this.scheme,
        this.publishMode,
        key.academicYearLabel,
      );
    } catch (err) {
      throwFailure(err, "", DEFAULT_MAX_SCORE);
    }
  }

  async saveScore(
    key: ClassSubjectTermKey,
    studentId: string,
    columnId: string,
    value: number,
  ): Promise<{ studentId: string; columnId: string; cell: GradeCell }> {
    try {
      const dto = (await this.http.put(
        GRADES_EP.entry(
          key.classId,
          key.subjectId,
          key.termId,
          studentId,
          columnId,
        ),
        { value: String(value), academicYearLabel: key.academicYearLabel },
      )) as unknown as GradeEntryResponseDto;
      return {
        studentId: dto.studentMemberId,
        columnId: dto.columnId,
        cell: mapGradeCell(dto),
      };
    } catch (err) {
      throwFailure(err, columnId, DEFAULT_MAX_SCORE);
    }
  }

  async submitScore(
    key: ClassSubjectTermKey,
    studentId: string,
    columnId: string,
  ): Promise<{ studentId: string; columnId: string; cell: GradeCell }> {
    try {
      const dto = (await this.http.post(
        GRADES_EP.submitEntry(
          key.classId,
          key.subjectId,
          key.termId,
          studentId,
          columnId,
        ),
        {},
      )) as unknown as GradeEntryResponseDto;
      return {
        studentId: dto.studentMemberId,
        columnId: dto.columnId,
        cell: mapGradeCell(dto),
      };
    } catch (err) {
      throwFailure(err, columnId, DEFAULT_MAX_SCORE);
    }
  }

  async lockTerm(key: ClassSubjectTermKey): Promise<{ lockedCount: number }> {
    try {
      const dto = (await this.http.post(
        GRADES_EP.lockTerm(key.classId, key.subjectId, key.termId),
        {},
      )) as unknown as LockGradeResponseDto;
      return { lockedCount: dto.lockedCount };
    } catch (err) {
      throwFailure(err, "", DEFAULT_MAX_SCORE);
    }
  }
}
