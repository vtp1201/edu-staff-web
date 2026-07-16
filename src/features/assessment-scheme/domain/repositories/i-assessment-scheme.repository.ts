import type {
  AssessmentScheme,
  SubjectForGrade,
} from "../entities/assessment-scheme.entity";
import type { GradeScale } from "../entities/grade-scale.entity";
import type { AssessmentSchemeFailure } from "../failures/assessment-scheme.failure";

type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: AssessmentSchemeFailure };

export interface IAssessmentSchemeRepository {
  getGradeScale(): Promise<Result<GradeScale>>;
  saveGradeScale(
    scale: GradeScale,
  ): Promise<{ ok: true } | { ok: false; error: AssessmentSchemeFailure }>;
  listSubjectsForGrade(gradeLevel: number): Promise<Result<SubjectForGrade[]>>;
  getAssessmentScheme(
    subjectId: string,
    yearLabel: string,
    termId: string,
  ): Promise<Result<AssessmentScheme>>;
  saveAssessmentScheme(
    scheme: AssessmentScheme,
  ): Promise<{ ok: true } | { ok: false; error: AssessmentSchemeFailure }>;
}
