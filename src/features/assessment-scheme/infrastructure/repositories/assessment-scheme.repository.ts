import "server-only";
import type { AxiosInstance } from "axios";
import { ASSESSMENT_EP } from "@/bootstrap/endpoint/assessment-scheme.endpoint";
import { errorCodeOf } from "@/bootstrap/lib/api-envelope";
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
  SubjectForGradeDto,
} from "../dtos/assessment-scheme-response.dto";
import {
  mapAssessmentScheme,
  mapGradeScale,
  mapSubjectForGrade,
} from "../mappers/assessment-scheme.mapper";

type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: AssessmentSchemeFailure };

/**
 * Map a normalised {@link ApiError} (via its UPPER_SNAKE `code`) to the
 * assessment-scheme failure union. Branch on `code`, never the localised message.
 */
function mapFailure(err: unknown): AssessmentSchemeFailure {
  const code = errorCodeOf(err);
  switch (code) {
    case "GRADE_SCALE_NOT_FOUND":
    case "ASSESSMENT_SCHEME_NOT_FOUND":
    case "SUBJECT_NOT_FOUND":
      return { type: "not-found" };
    case "ASSESSMENT_FORBIDDEN":
    case "FORBIDDEN":
      return { type: "forbidden" };
    case "ASSESSMENT_WEIGHTS_INVALID":
      return { type: "invalid-weights" };
    case "GRADE_SCALE_THRESHOLDS_INVALID":
      return { type: "invalid-thresholds" };
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
      await this.http.put(ASSESSMENT_EP.gradeScale, scale);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: mapFailure(err) };
    }
  }

  async listSubjectsForGrade(
    gradeLevel: number,
  ): Promise<Result<SubjectForGrade[]>> {
    try {
      const data = (await this.http.get(
        ASSESSMENT_EP.subjectsByGrade(gradeLevel),
      )) as unknown as SubjectForGradeDto[];
      return { ok: true, data: data.map(mapSubjectForGrade) };
    } catch (err) {
      return { ok: false, error: mapFailure(err) };
    }
  }

  async getAssessmentScheme(
    subjectId: string,
    yearLabel: string,
  ): Promise<Result<AssessmentScheme>> {
    try {
      const data = (await this.http.get(
        ASSESSMENT_EP.assessmentScheme(subjectId, yearLabel),
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
        ASSESSMENT_EP.assessmentScheme(scheme.subjectId, scheme.yearLabel),
        scheme,
      );
      return { ok: true };
    } catch (err) {
      return { ok: false, error: mapFailure(err) };
    }
  }
}
