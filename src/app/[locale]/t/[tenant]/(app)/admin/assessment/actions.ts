"use server";

import { makeAssessmentSchemeRepository } from "@/bootstrap/di/assessment-scheme.di";
import type {
  AssessmentScheme,
  SubjectForGrade,
} from "@/features/assessment-scheme/domain/entities/assessment-scheme.entity";
import { validateAssessmentScheme } from "@/features/assessment-scheme/domain/use-cases/validate-assessment-scheme.use-case";
import { validateGradeScale } from "@/features/assessment-scheme/domain/use-cases/validate-grade-scale.use-case";
import type {
  SaveAssessmentSchemeInput,
  SaveGradeScaleInput,
  SaveResult,
} from "@/features/assessment-scheme/presentation/assessment-scheme-screen/assessment-scheme-screen.i-vm";

export async function saveGradeScaleAction(
  input: SaveGradeScaleInput,
): Promise<SaveResult> {
  const validation = validateGradeScale(
    input.scale.bands,
    input.scale.maxScore,
  );
  if (validation) {
    return { ok: false, errorKey: "invalid-thresholds" };
  }
  const repo = await makeAssessmentSchemeRepository();
  const result = await repo.saveGradeScale(input.scale);
  if (!result.ok) return { ok: false, errorKey: result.error.type };
  return { ok: true };
}

export async function saveAssessmentSchemeAction(
  input: SaveAssessmentSchemeInput,
): Promise<SaveResult> {
  const validation = validateAssessmentScheme(input.scheme.columns);
  if (validation) {
    return { ok: false, errorKey: "invalid-weights" };
  }
  const repo = await makeAssessmentSchemeRepository();
  const result = await repo.saveAssessmentScheme(input.scheme);
  if (!result.ok) return { ok: false, errorKey: result.error.type };
  return { ok: true };
}

export async function loadSubjectsForGradeAction(
  gradeLevel: number,
): Promise<SubjectForGrade[]> {
  const repo = await makeAssessmentSchemeRepository();
  const result = await repo.listSubjectsForGrade(gradeLevel);
  return result.ok ? result.data : [];
}

export async function loadAssessmentSchemeAction(
  subjectId: string,
  yearLabel: string,
): Promise<AssessmentScheme | null> {
  const repo = await makeAssessmentSchemeRepository();
  const result = await repo.getAssessmentScheme(subjectId, yearLabel);
  return result.ok ? result.data : null;
}
