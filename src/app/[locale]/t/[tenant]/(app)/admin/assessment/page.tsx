import { makeSchoolConfigRepository } from "@/bootstrap/di/admin-school-setup.di";
import { makeAssessmentSchemeRepository } from "@/bootstrap/di/assessment-scheme.di";
import { AssessmentSchemeScreen } from "@/features/assessment-scheme/presentation/assessment-scheme-screen/assessment-scheme-screen";
import {
  loadAssessmentSchemeAction,
  loadSubjectsForGradeAction,
  saveAssessmentSchemeAction,
  saveGradeScaleAction,
} from "./actions";

const FALLBACK_GRADE_LEVELS = [10, 11, 12];

export default async function AssessmentPage() {
  const [assessmentRepo, schoolRepo] = await Promise.all([
    makeAssessmentSchemeRepository(),
    makeSchoolConfigRepository(),
  ]);

  const [gradeScaleResult, configResult] = await Promise.all([
    assessmentRepo.getGradeScale(),
    schoolRepo.getConfig(),
  ]);

  const gradeLevelRange =
    configResult.ok && configResult.data.gradeLevelRange
      ? configResult.data.gradeLevelRange
      : null;

  const availableGradeLevels = gradeLevelRange
    ? Array.from(
        { length: gradeLevelRange.maxGrade - gradeLevelRange.minGrade + 1 },
        (_, i) => gradeLevelRange.minGrade + i,
      )
    : FALLBACK_GRADE_LEVELS;

  return (
    <AssessmentSchemeScreen
      initialGradeScale={gradeScaleResult.ok ? gradeScaleResult.data : null}
      initialError={gradeScaleResult.ok ? null : gradeScaleResult.error}
      availableGradeLevels={availableGradeLevels}
      onSaveGradeScale={saveGradeScaleAction}
      onSaveAssessmentScheme={saveAssessmentSchemeAction}
      onLoadSubjectsForGrade={loadSubjectsForGradeAction}
      onLoadAssessmentScheme={loadAssessmentSchemeAction}
    />
  );
}
