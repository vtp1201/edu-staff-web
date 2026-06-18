import type {
  AssessmentScheme,
  SubjectForGrade,
} from "../../domain/entities/assessment-scheme.entity";
import type { GradeScale } from "../../domain/entities/grade-scale.entity";
import type { AssessmentSchemeFailure } from "../../domain/failures/assessment-scheme.failure";

export interface AssessmentSchemeScreenVM {
  initialGradeScale: GradeScale | null;
  initialError: AssessmentSchemeFailure | null;
  /** Derived from school config (e.g. 10, 11, 12) — passed from the page. */
  availableGradeLevels: number[];
}

export interface SaveGradeScaleInput {
  scale: GradeScale;
}

export interface SaveAssessmentSchemeInput {
  scheme: AssessmentScheme;
}

export type SaveResult = { ok: boolean; errorKey?: string };

export interface AssessmentSchemeScreenProps extends AssessmentSchemeScreenVM {
  onSaveGradeScale: (input: SaveGradeScaleInput) => Promise<SaveResult>;
  onSaveAssessmentScheme: (
    input: SaveAssessmentSchemeInput,
  ) => Promise<SaveResult>;
  onLoadSubjectsForGrade: (gradeLevel: number) => Promise<SubjectForGrade[]>;
  onLoadAssessmentScheme: (
    subjectId: string,
    yearLabel: string,
  ) => Promise<AssessmentScheme | null>;
}
