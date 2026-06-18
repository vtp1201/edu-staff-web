import "server-only";
import type { AxiosInstance } from "axios";
import { GRADES_EP } from "@/bootstrap/endpoint/grades.endpoint";
import { errorCodeOf, statusOf } from "@/bootstrap/lib/api-envelope";
import type { GradePublishMode } from "@/features/admin-school-setup/domain/entities/school-config.entity";
import type { AssessmentScheme } from "@/features/assessment-scheme/domain/entities/assessment-scheme.entity";
import type {
  GradeSheet,
  StudentScoreRow,
} from "../../domain/entities/grade-sheet.entity";
import type { GradesFailure } from "../../domain/failures/grades.failure";
import type { IGradesRepository } from "../../domain/repositories/i-grades.repository";
import type {
  GradeSheetResponseDto,
  StudentScoreRowDto,
} from "../dtos/grades-response.dto";
import { mapGradeSheet, mapStudentScoreRow } from "../mappers/grades.mapper";

/**
 * Maps a normalised {@link ApiError} (UPPER_SNAKE `code` / HTTP status) to the
 * grades failure union, then THROWS it (the IGradesRepository contract is
 * throwing — the use-case / action layer catches it).
 */
function throwFailure(err: unknown): never {
  const code = errorCodeOf(err);
  const status = statusOf(err) ?? 0;
  let failure: GradesFailure;
  if (code === "GRADE_SHEET_NOT_FOUND" || status === 404) {
    failure = { type: "not-found" };
  } else if (code === "FORBIDDEN" || status === 403) {
    failure = { type: "forbidden" };
  } else if (code === "GRADES_ALREADY_PUBLISHED" || status === 409) {
    failure = { type: "already-published" };
  } else if (code === "NETWORK_ERROR" || status >= 500) {
    failure = { type: "network-error" };
  } else {
    failure = { type: "unknown" };
  }
  throw failure;
}

export class GradesRepository implements IGradesRepository {
  /**
   * `scheme` + `publishMode` are sourced (by the DI factory) from the REAL
   * assessment-scheme and operational-settings services and threaded into the
   * grade-sheet shape the grades endpoint does not itself carry.
   */
  constructor(
    private readonly http: AxiosInstance,
    private readonly scheme: AssessmentScheme,
    private readonly publishMode: GradePublishMode,
  ) {}

  async getGradeSheet(csId: string, term: string): Promise<GradeSheet> {
    try {
      const dto = (await this.http.get(GRADES_EP.sheet(csId), {
        params: { term },
      })) as unknown as GradeSheetResponseDto;
      return mapGradeSheet(dto, this.scheme, this.publishMode);
    } catch (err) {
      throwFailure(err);
    }
  }

  async saveScore(
    csId: string,
    studentId: string,
    columnId: string,
    value: number,
  ): Promise<StudentScoreRow> {
    try {
      const dto = (await this.http.put(GRADES_EP.saveScore(csId, studentId), {
        columnId,
        value,
      })) as unknown as StudentScoreRowDto;
      return mapStudentScoreRow(dto, this.scheme);
    } catch (err) {
      throwFailure(err);
    }
  }

  async publishGrades(csId: string, term: string): Promise<void> {
    try {
      await this.http.post(GRADES_EP.publish(csId), { term });
    } catch (err) {
      throwFailure(err);
    }
  }
}
