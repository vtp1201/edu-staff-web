import "server-only";
import type { AxiosInstance } from "axios";
import { ASSESSMENT_EP } from "@/bootstrap/endpoint/assessment-scheme.endpoint";
import {
  type ApiEnvelope,
  errorCodeOf,
  parseEnvelope,
} from "@/bootstrap/lib/api-envelope";
import type {
  AssessmentScheme,
  SubjectForGrade,
} from "../../domain/entities/assessment-scheme.entity";
import type { GradeScale } from "../../domain/entities/grade-scale.entity";
import type { AssessmentSchemeFailure } from "../../domain/failures/assessment-scheme.failure";
import type { IAssessmentSchemeRepository } from "../../domain/repositories/i-assessment-scheme.repository";
import type {
  AssessmentSchemeResponseDto,
  GradeScaleResponseDto,
  SubjectListItemDto,
} from "../dtos/assessment-scheme-response.dto";
import {
  mapAssessmentScheme,
  mapGradeScale,
  mapSubjectForGrade,
  toSetAssessmentSchemeRequestDto,
  toSetGradeScaleRequestDto,
} from "../mappers/assessment-scheme.mapper";

type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: AssessmentSchemeFailure };

/** Field names blamed by a 422 `VALIDATION_FAILED` (`error.fields[]`). */
function blamedFields(err: unknown): string[] {
  const fields = (err as { fields?: Array<{ field?: string }> })?.fields;
  return Array.isArray(fields)
    ? fields.map((f) => f?.field).filter((f): f is string => Boolean(f))
    : [];
}

/**
 * Map a normalised {@link ApiError} (via its UPPER_SNAKE `code`) to the
 * assessment-scheme failure union. Codes ground-truthed against the Go source
 * (`services/core/internal/assessment/core/domain/error/config.go` +
 * `internal/curriculum/adapter/http/dto/subject.go` +
 * `pkg/kit/response/error.go`, decision 0008 holds for `core`) — US-E18.7 /
 * ADR 0053, extended for `GET /subjects` in US-E18.42. Branch on `code` (and,
 * for the shared validation code, the blamed field) — never the localised
 * message.
 */
function mapFailure(err: unknown): AssessmentSchemeFailure {
  const code = errorCodeOf(err);

  // 422 VALIDATION_FAILED is shared across `core` write/read paths, so it only
  // means "bad grade level" when the server BLAMES `gradeLevel` — the sole
  // validated query param of `GET /subjects` (BE US-177: int 1..13, out-of-range
  // or non-numeric → 422 on field `gradeLevel`). Never branch on the message.
  if (
    code === "VALIDATION_FAILED" &&
    blamedFields(err).includes("gradeLevel")
  ) {
    return { type: "invalid-grade-level" };
  }

  switch (code) {
    case "GRADE_SCALE_NOT_FOUND":
    case "ASSESSMENT_SCHEME_NOT_FOUND":
    case "SUBJECT_NOT_FOUND":
      return { type: "not-found" };
    case "GRADE_SCALE_FORBIDDEN":
    case "ASSESSMENT_SCHEME_FORBIDDEN":
      return { type: "forbidden" };
    case "GRADE_SCALE_INVALID_TYPE":
      return { type: "invalid-scale-type" };
    case "GRADE_SCALE_LETTER_GRADES_REQUIRED":
      return { type: "letter-grades-required" };
    // One shared 422 for every band violation (BE US-189) — no `error.fields[]`
    // detail to disambiguate, so the client mirrors the same rules up front.
    case "GRADE_SCALE_INVALID_BANDS":
      return { type: "invalid-bands" };
    case "ASSESSMENT_SCHEME_COLUMN_IN_USE":
      return { type: "column-in-use" };
    case "ASSESSMENT_SCHEME_MAX_COLUMNS":
      return { type: "max-columns" };
    case "ASSESSMENT_SCHEME_INVALID_COLUMN":
      return { type: "invalid-column" };
    case "NETWORK_ERROR":
      return { type: "network-error" };
    default:
      return { type: "unknown" };
  }
}

export class AssessmentSchemeRepository implements IAssessmentSchemeRepository {
  constructor(private readonly http: AxiosInstance) {}

  async getGradeScale(): Promise<Result<GradeScale>> {
    try {
      const data = (await this.http.get(
        ASSESSMENT_EP.gradeScale,
      )) as unknown as GradeScaleResponseDto;
      return { ok: true, data: mapGradeScale(data) };
    } catch (err) {
      return { ok: false, error: mapFailure(err) };
    }
  }

  async saveGradeScale(
    scale: GradeScale,
  ): Promise<{ ok: true } | { ok: false; error: AssessmentSchemeFailure }> {
    try {
      await this.http.put(
        ASSESSMENT_EP.gradeScale,
        toSetGradeScaleRequestDto(scale),
      );
      return { ok: true };
    } catch (err) {
      return { ok: false, error: mapFailure(err) };
    }
  }

  /**
   * Every ACTIVE subject of one grade level. `gradeLevel` is a real BE filter
   * ANDed with `status` and applied BEFORE pagination (BE US-177) — that makes
   * each PAGE fully matching, not the only page, so this drains the cursor to
   * the end (same pattern as subject-catalogue's `fetchAllSubjectDtos`,
   * US-E18.3). `raw: true` MUST stay a top-level axios-config sibling of
   * `params` (recurring bug class, `EPIC-OVERVIEW.md`).
   */
  async listSubjectsForGrade(
    gradeLevel: number,
  ): Promise<Result<SubjectForGrade[]>> {
    try {
      const dtos: SubjectListItemDto[] = [];
      let cursor: string | undefined;
      do {
        const env = (await this.http.get(ASSESSMENT_EP.subjects, {
          params: {
            gradeLevel,
            status: "ACTIVE",
            ...(cursor ? { cursor } : {}),
          },
          raw: true,
        })) as unknown as ApiEnvelope<SubjectListItemDto[]>;
        const { data, pagination } = parseEnvelope(env);
        dtos.push(...data);
        cursor =
          pagination?.hasMore && pagination.nextCursor
            ? pagination.nextCursor
            : undefined;
      } while (cursor);
      return { ok: true, data: dtos.map(mapSubjectForGrade) };
    } catch (err) {
      return { ok: false, error: mapFailure(err) };
    }
  }

  async getAssessmentScheme(
    subjectId: string,
    yearLabel: string,
    termId: string,
  ): Promise<Result<AssessmentScheme>> {
    try {
      const data = (await this.http.get(
        ASSESSMENT_EP.assessmentScheme(subjectId, yearLabel, termId),
      )) as unknown as AssessmentSchemeResponseDto;
      return { ok: true, data: mapAssessmentScheme(data) };
    } catch (err) {
      return { ok: false, error: mapFailure(err) };
    }
  }

  async saveAssessmentScheme(
    scheme: AssessmentScheme,
  ): Promise<{ ok: true } | { ok: false; error: AssessmentSchemeFailure }> {
    try {
      await this.http.put(
        ASSESSMENT_EP.assessmentScheme(
          scheme.subjectId,
          scheme.yearLabel,
          scheme.termId,
        ),
        toSetAssessmentSchemeRequestDto(scheme),
      );
      return { ok: true };
    } catch (err) {
      return { ok: false, error: mapFailure(err) };
    }
  }
}
