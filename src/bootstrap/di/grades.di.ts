import "server-only";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { GradePublishMode } from "@/features/admin-school-setup/domain/entities/school-config.entity";
import type { AssessmentScheme } from "@/features/assessment-scheme/domain/entities/assessment-scheme.entity";
import { TT22_PRESET } from "@/features/assessment-scheme/domain/entities/assessment-scheme.entity";
import type { GradesFailure } from "@/features/grades/domain/failures/grades.failure";
import type { IGradesRepository } from "@/features/grades/domain/repositories/i-grades.repository";
import { GetGradeSheetUseCase } from "@/features/grades/domain/use-cases/get-grade-sheet.use-case";
import { PublishGradesUseCase } from "@/features/grades/domain/use-cases/publish-grades.use-case";
import { SaveScoreUseCase } from "@/features/grades/domain/use-cases/save-score.use-case";
import { GradesRepository } from "@/features/grades/infrastructure/repositories/grades.repository";
import { MOCK_CLASS_SUBJECTS } from "@/features/grades/infrastructure/repositories/mocks/fixtures";
import { MockGradesRepository } from "@/features/grades/infrastructure/repositories/mocks/grades.mock.repository";
import { makeAdminSettingsRepository } from "./admin-settings.di";
import { makeAssessmentSchemeRepository } from "./assessment-scheme.di";

/** Class-subject options the signed-in teacher can grade (mock-first). */
export { MOCK_CLASS_SUBJECTS };

/** Default scale max — SCALE_10. Surfaced so use-cases can validate ranges. */
export const DEFAULT_MAX_SCORE = 10;

/** gradePublishMode is a REAL operational setting (US-059 live). */
async function resolvePublishMode(): Promise<GradePublishMode> {
  try {
    const repo = await makeAdminSettingsRepository();
    const result = await repo.getOperationalSettings();
    if (result.ok) {
      return result.data.gradePublishMode;
    }
  } catch {
    // fall through to safe default
  }
  return "SELF_PUBLISH";
}

/** Assessment scheme is REAL (US-059 live); falls back to the TT22 preset. */
async function resolveScheme(
  subjectId: string,
  yearLabel: string,
): Promise<AssessmentScheme> {
  try {
    const repo = await makeAssessmentSchemeRepository();
    const result = await repo.getAssessmentScheme(subjectId, yearLabel);
    if (result.ok) {
      return result.data;
    }
  } catch {
    // fall through to preset
  }
  return { subjectId, yearLabel, columns: TT22_PRESET };
}

async function makeRepo(
  subjectId: string,
  yearLabel: string,
): Promise<IGradesRepository> {
  const publishMode = await resolvePublishMode();
  if (USE_MOCK) {
    return new MockGradesRepository(publishMode);
  }
  const scheme = await resolveScheme(subjectId, yearLabel);
  const http = await createServerHttpClient();
  return new GradesRepository(http, scheme, publishMode);
}

export async function makeGetGradeSheetUseCase(
  subjectId = "subj-toan-10",
  yearLabel = "2024-2025",
) {
  return new GetGradeSheetUseCase(await makeRepo(subjectId, yearLabel));
}

export async function makeSaveScoreUseCase(
  subjectId = "subj-toan-10",
  yearLabel = "2024-2025",
) {
  return new SaveScoreUseCase(await makeRepo(subjectId, yearLabel));
}

export async function makePublishGradesUseCase(
  subjectId = "subj-toan-10",
  yearLabel = "2024-2025",
) {
  return new PublishGradesUseCase(await makeRepo(subjectId, yearLabel));
}

export type { GradesFailure };
