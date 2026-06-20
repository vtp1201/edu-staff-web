import "server-only";
import type { AxiosInstance } from "axios";
import { GRADES_EP } from "@/bootstrap/endpoint/grades.endpoint";
import { errorCodeOf, statusOf } from "@/bootstrap/lib/api-envelope";
import type { GradePublishMode } from "@/features/admin-school-setup/domain/entities/school-config.entity";
import type { AssessmentScheme } from "@/features/assessment-scheme/domain/entities/assessment-scheme.entity";
import type {
  ChildSummary,
  GradeBook,
} from "../../domain/entities/grade-book.entity";
import type { GradesFailure } from "../../domain/failures/grades.failure";
import type { IGradeBookRepository } from "../../domain/repositories/i-grade-book.repository";
import type { GradeBookResponseDto } from "../dtos/grade-book-response.dto";
import { mapGradeBook } from "../mappers/grade-book.mapper";

/**
 * Maps a normalised {@link ApiError} (UPPER_SNAKE `code` / HTTP status) to the
 * grades failure union, then THROWS it (the IGradeBookRepository contract is
 * throwing — the use-case layer catches it).
 */
function throwFailure(err: unknown): never {
  const code = errorCodeOf(err);
  const status = statusOf(err) ?? 0;
  let failure: GradesFailure;
  if (code === "GRADES_NOT_PUBLISHED") {
    failure = { type: "not-published" };
  } else if (code === "GRADE_BOOK_NOT_FOUND" || status === 404) {
    failure = { type: "not-found" };
  } else if (code === "FORBIDDEN" || status === 403) {
    failure = { type: "forbidden" };
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
   * grade-book shape the gradebook endpoint does not itself carry.
   */
  constructor(
    private readonly http: AxiosInstance,
    private readonly scheme: AssessmentScheme,
    private readonly publishMode: GradePublishMode,
  ) {}

  async getGradeBook(csId: string, term: string): Promise<GradeBook> {
    try {
      const dto = (await this.http.get(GRADES_EP.gradeBook(csId), {
        params: { term },
      })) as unknown as GradeBookResponseDto;
      return mapGradeBook(dto, this.scheme, this.publishMode);
    } catch (err) {
      throwFailure(err);
    }
  }

  async getMyGrades(term: string): Promise<GradeBook> {
    try {
      const dto = (await this.http.get(GRADES_EP.myGrades, {
        params: { term },
      })) as unknown as GradeBookResponseDto;
      return mapGradeBook(dto, this.scheme, this.publishMode);
    } catch (err) {
      throwFailure(err);
    }
  }

  async getChildGrades(childId: string, term: string): Promise<GradeBook> {
    try {
      const dto = (await this.http.get(GRADES_EP.childGrades(childId), {
        params: { term },
      })) as unknown as GradeBookResponseDto;
      return mapGradeBook(dto, this.scheme, this.publishMode);
    } catch (err) {
      throwFailure(err);
    }
  }

  getChildList(): Promise<ChildSummary[]> {
    // OQ-001: endpoint (GRADES_EP.childList) unconfirmed; stub rejects with
    // NOT_IMPLEMENTED until the core service ships the parent-children contract.
    return Promise.reject({ type: "not-found" } satisfies GradesFailure);
  }
}
