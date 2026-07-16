import "server-only";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { GradePublishMode } from "@/features/admin-school-setup/domain/entities/school-config.entity";
import type { AssessmentScheme } from "@/features/assessment-scheme/domain/entities/assessment-scheme.entity";
import { TT22_PRESET } from "@/features/assessment-scheme/domain/entities/assessment-scheme.entity";
import type { GradesFailure } from "@/features/grades/domain/failures/grades.failure";
import type { IGradeApprovalRepository } from "@/features/grades/domain/repositories/i-grade-approval.repository";
import type { IGradeBookRepository } from "@/features/grades/domain/repositories/i-grade-book.repository";
import type { IGradesRepository } from "@/features/grades/domain/repositories/i-grades.repository";
import { ApproveGradeBatchUseCase } from "@/features/grades/domain/use-cases/approve-grade-batch.use-case";
import { BulkLockBatchesUseCase } from "@/features/grades/domain/use-cases/bulk-lock-batches.use-case";
import { GetChildGradesUseCase } from "@/features/grades/domain/use-cases/get-child-grades.use-case";
import { GetChildListUseCase } from "@/features/grades/domain/use-cases/get-child-list.use-case";
import { GetGradeBookUseCase } from "@/features/grades/domain/use-cases/get-grade-book.use-case";
import { GetGradeSheetUseCase } from "@/features/grades/domain/use-cases/get-grade-sheet.use-case";
import { GetMyGradesUseCase } from "@/features/grades/domain/use-cases/get-my-grades.use-case";
import { PublishGradesUseCase } from "@/features/grades/domain/use-cases/publish-grades.use-case";
import { RequestGradeRevisionUseCase } from "@/features/grades/domain/use-cases/request-grade-revision.use-case";
import { SaveScoreUseCase } from "@/features/grades/domain/use-cases/save-score.use-case";
import { GradeApprovalRepository } from "@/features/grades/infrastructure/repositories/grade-approval.repository";
import { GradeBookRepository } from "@/features/grades/infrastructure/repositories/grade-book.repository";
import { GradesRepository } from "@/features/grades/infrastructure/repositories/grades.repository";
import { MOCK_CLASS_SUBJECTS } from "@/features/grades/infrastructure/repositories/mocks/fixtures";
import { MockGradeApprovalRepository } from "@/features/grades/infrastructure/repositories/mocks/grade-approval.mock.repository";
import { MockGradeBookRepository } from "@/features/grades/infrastructure/repositories/mocks/grade-book.mock.repository";
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
  termId: string,
): Promise<AssessmentScheme> {
  try {
    const repo = await makeAssessmentSchemeRepository();
    const result = await repo.getAssessmentScheme(subjectId, yearLabel, termId);
    if (result.ok) {
      return result.data;
    }
  } catch {
    // fall through to preset
  }
  return { subjectId, yearLabel, termId, columns: TT22_PRESET };
}

async function makeRepo(
  subjectId: string,
  yearLabel: string,
  termId: string,
): Promise<IGradesRepository> {
  const publishMode = await resolvePublishMode();
  if (USE_MOCK) {
    return new MockGradesRepository(publishMode);
  }
  const scheme = await resolveScheme(subjectId, yearLabel, termId);
  const http = await createServerHttpClient();
  return new GradesRepository(http, scheme, publishMode);
}

export async function makeGetGradeSheetUseCase(
  subjectId = "subj-toan-10",
  yearLabel = "2024-2025",
  termId = "HK1",
) {
  return new GetGradeSheetUseCase(await makeRepo(subjectId, yearLabel, termId));
}

export async function makeSaveScoreUseCase(
  subjectId = "subj-toan-10",
  yearLabel = "2024-2025",
  termId = "HK1",
) {
  return new SaveScoreUseCase(await makeRepo(subjectId, yearLabel, termId));
}

export async function makePublishGradesUseCase(
  subjectId = "subj-toan-10",
  yearLabel = "2024-2025",
  termId = "HK1",
) {
  return new PublishGradesUseCase(await makeRepo(subjectId, yearLabel, termId));
}

// ─── US-E13.6 — read-only multi-role grade book ──────────────────────────────

async function makeGradeBookRepo(
  subjectId: string,
  yearLabel: string,
  termId: string,
): Promise<IGradeBookRepository> {
  const publishMode = await resolvePublishMode();
  if (USE_MOCK) {
    return new MockGradeBookRepository(publishMode);
  }
  const scheme = await resolveScheme(subjectId, yearLabel, termId);
  const http = await createServerHttpClient();
  return new GradeBookRepository(http, scheme, publishMode);
}

export async function makeGetGradeBookUseCase(
  subjectId = "subj-toan-10",
  yearLabel = "2024-2025",
  termId = "HK1",
) {
  return new GetGradeBookUseCase(
    await makeGradeBookRepo(subjectId, yearLabel, termId),
  );
}

export async function makeGetMyGradesUseCase(
  subjectId = "subj-toan-10",
  yearLabel = "2024-2025",
  termId = "HK1",
) {
  return new GetMyGradesUseCase(
    await makeGradeBookRepo(subjectId, yearLabel, termId),
  );
}

export async function makeGetChildGradesUseCase(
  subjectId = "subj-toan-10",
  yearLabel = "2024-2025",
  termId = "HK1",
) {
  return new GetChildGradesUseCase(
    await makeGradeBookRepo(subjectId, yearLabel, termId),
  );
}

// US-E13.7 — parent child-switcher: list children linked to the viewer.
export async function makeGetChildListUseCase(
  subjectId = "subj-toan-10",
  yearLabel = "2024-2025",
  termId = "HK1",
) {
  return new GetChildListUseCase(
    await makeGradeBookRepo(subjectId, yearLabel, termId),
  );
}

// ─── US-E14.4 — grade approval pipeline (admin) ──────────────────────────────

/** Approval repo only needs http (no scheme / publish-mode). Mock-first. */
async function makeApprovalRepo(): Promise<IGradeApprovalRepository> {
  if (USE_MOCK) {
    return new MockGradeApprovalRepository();
  }
  const http = await createServerHttpClient();
  return new GradeApprovalRepository(http);
}

/** List / detail have no domain rules → the RSC page can call the repo directly. */
export async function makeGradeApprovalRepository(): Promise<IGradeApprovalRepository> {
  return makeApprovalRepo();
}

export async function makeApproveGradeBatchUseCase() {
  return new ApproveGradeBatchUseCase(await makeApprovalRepo());
}

export async function makeRequestGradeRevisionUseCase() {
  return new RequestGradeRevisionUseCase(await makeApprovalRepo());
}

export async function makeBulkLockBatchesUseCase() {
  return new BulkLockBatchesUseCase(await makeApprovalRepo());
}

export type { GradesFailure };
