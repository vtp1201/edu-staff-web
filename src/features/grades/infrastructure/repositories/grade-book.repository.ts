import "server-only";
import type { AxiosInstance } from "axios";
import { GRADES_EP } from "@/bootstrap/endpoint/grades.endpoint";
import { errorCodeOf, statusOf } from "@/bootstrap/lib/api-envelope";
import type { GradePublishMode } from "@/features/admin-school-setup/domain/entities/school-config.entity";
import type { AssessmentScheme } from "@/features/assessment-scheme/domain/entities/assessment-scheme.entity";
import type { ClassSubjectTermKey } from "../../domain/entities/class-subject-term-key.entity";
import type {
  ChildSummary,
  GradeBook,
} from "../../domain/entities/grade-book.entity";
import type { GradesFailure } from "../../domain/failures/grades.failure";
import type { IGradeBookRepository } from "../../domain/repositories/i-grade-book.repository";
import type {
  ListGradesResponseDto,
  StudentGradesResponseDto,
} from "../dtos/grade-book-response.dto";
import {
  mapGradeBook,
  mapSubjectTermGroup,
} from "../mappers/grade-book.mapper";

/**
 * Maps a normalised {@link ApiError} to the grades failure union — same
 * 11-code taxonomy as `grades.repository.ts` (US-E18.12, ADR 0054), minus the
 * per-cell-write-only codes (`invalid-value`/`column-not-in-scheme`/
 * `not-draft`) that a read-only repository never triggers.
 */
function throwFailure(err: unknown): never {
  const code = errorCodeOf(err);
  const status = statusOf(err) ?? 0;
  let failure: GradesFailure;
  if (code === "GRADE_ENTRY_NOT_FOUND" || status === 404) {
    failure = { type: "not-found" };
  } else if (code === "GRADE_ENTRY_TEACHER_NOT_ASSIGNED") {
    failure = { type: "teacher-not-assigned" };
  } else if (code === "GRADE_ENTRY_FORBIDDEN" || status === 403) {
    failure = { type: "forbidden" };
  } else if (code === "GRADE_SCALE_NOT_CONFIGURED") {
    failure = { type: "scale-not-configured" };
  } else if (code === "ASSESSMENT_SCHEME_NOT_CONFIGURED") {
    failure = { type: "scheme-not-configured" };
  } else if (code === "NETWORK_ERROR" || status >= 500) {
    failure = { type: "network-error" };
  } else {
    failure = { type: "unknown" };
  }
  throw failure;
}

export class GradeBookRepository implements IGradeBookRepository {
  /**
   * `scheme` + `publishMode` are sourced (by the DI factory) from the REAL
   * assessment-scheme and operational-settings services and threaded into the
   * grade-book shape the gradebook endpoint does not itself carry. `scheme` is
   * the class-view's single (subject, term)-scoped scheme; `resolveScheme` is
   * an OPTIONAL per-(subjectId, termId) resolver used for the self-view
   * (`getMyGrades`/`getChildGrades`), which spans every subject the student
   * takes in the year — each group can have a DIFFERENT scheme, unlike the
   * single-subject class view. Falls back to `scheme` when omitted.
   */
  constructor(
    private readonly http: AxiosInstance,
    private readonly scheme: AssessmentScheme,
    private readonly publishMode: GradePublishMode,
    private readonly className: string,
    private readonly subjectName: string,
    private readonly resolveScheme?: (
      subjectId: string,
      termId: string,
      academicYearLabel: string,
    ) => Promise<AssessmentScheme>,
  ) {}

  async getGradeBook(key: ClassSubjectTermKey): Promise<GradeBook> {
    try {
      const dto = (await this.http.get(
        GRADES_EP.listGrades(key.classId, key.subjectId, key.termId),
        { params: { year: key.academicYearLabel } },
      )) as unknown as ListGradesResponseDto;
      return mapGradeBook(
        dto,
        this.scheme,
        this.publishMode,
        this.className,
        this.subjectName,
        key.academicYearLabel,
      );
    } catch (err) {
      throwFailure(err);
    }
  }

  private async getMemberGrades(
    memberId: string,
    academicYearLabel: string,
  ): Promise<GradeBook[]> {
    try {
      const dto = (await this.http.get(GRADES_EP.memberGrades(memberId), {
        params: { year: academicYearLabel },
      })) as unknown as StudentGradesResponseDto;
      const books: GradeBook[] = [];
      for (const group of dto.groups) {
        const scheme = this.resolveScheme
          ? await this.resolveScheme(
              group.subjectId,
              group.termId,
              academicYearLabel,
            )
          : this.scheme;
        books.push(
          mapSubjectTermGroup(
            group,
            scheme,
            this.publishMode,
            dto.studentMemberId,
            dto.academicYearLabel,
            this.className,
            // No subjectName source per-group on this wire response (only
            // subjectId) — falls back to the id (same gap as studentName in
            // grades.mapper.ts) until a subject-catalogue join is composed.
            group.subjectId,
          ),
        );
      }
      return books;
    } catch (err) {
      throwFailure(err);
    }
  }

  async getMyGrades(
    studentMemberId: string,
    academicYearLabel: string,
  ): Promise<GradeBook[]> {
    return this.getMemberGrades(studentMemberId, academicYearLabel);
  }

  async getChildGrades(
    childId: string,
    academicYearLabel: string,
  ): Promise<GradeBook[]> {
    return this.getMemberGrades(childId, academicYearLabel);
  }

  getChildList(): Promise<ChildSummary[]> {
    // Permanently mock (ADR 0054) — `GET /members/{id}/linked-students` has no
    // display fields (no name/class); this method is never called on the real
    // branch (the DI factory routes it to the mock repo instead).
    return Promise.reject({ type: "not-found" } satisfies GradesFailure);
  }
}
