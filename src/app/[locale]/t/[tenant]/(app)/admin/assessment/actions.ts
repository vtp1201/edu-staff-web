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
    // Client-side band-continuity/coverage rejection — NOT a server failure key.
    // `SaveResult.errorKey` is a plain string (not the failure union); the screen
    // shows its own per-error message from the validation-error map, so a generic
    // "invalid grade scale" key is the honest catch-all here (US-E18.7).
    return { ok: false, errorKey: "invalid-grade-scale" };
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
    // Client-side weight-sum/count rejection — NOT a server failure key. The
    // screen renders the specific validation message; this generic key is the
    // save-boundary fallback (US-E18.7).
    return { ok: false, errorKey: "invalid-scheme" };
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
  termId: string,
): Promise<AssessmentScheme | null> {
  const repo = await makeAssessmentSchemeRepository();
  const result = await repo.getAssessmentScheme(subjectId, yearLabel, termId);
  return result.ok ? result.data : null;
}
