import "server-only";
import { ensureFreshSession } from "@/bootstrap/di/auth.di";
import { getAccessToken } from "@/bootstrap/lib/auth-token.server";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { decodeSubClaim } from "@/bootstrap/lib/jwt";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import { resolveMyGradeSubjects } from "@/bootstrap/lib/resolve-my-grade-subjects";
import type { GradePublishMode } from "@/features/admin-school-setup/domain/entities/school-config.entity";
import type { AssessmentScheme } from "@/features/assessment-scheme/domain/entities/assessment-scheme.entity";
import { TT22_PRESET } from "@/features/assessment-scheme/domain/entities/assessment-scheme.entity";
import type { ClassSubjectTermKey } from "@/features/grades/domain/entities/class-subject-term-key.entity";
import type { GradesFailure } from "@/features/grades/domain/failures/grades.failure";
import type { IGradeApprovalRepository } from "@/features/grades/domain/repositories/i-grade-approval.repository";
import type { IGradeBookRepository } from "@/features/grades/domain/repositories/i-grade-book.repository";
import type { IGradesRepository } from "@/features/grades/domain/repositories/i-grades.repository";
import type { IGradesTermRepository } from "@/features/grades/domain/repositories/i-grades-term.repository";
import { ApproveGradeBatchUseCase } from "@/features/grades/domain/use-cases/approve-grade-batch.use-case";
import { BulkLockBatchesUseCase } from "@/features/grades/domain/use-cases/bulk-lock-batches.use-case";
import { GetChildGradesUseCase } from "@/features/grades/domain/use-cases/get-child-grades.use-case";
import { GetChildListUseCase } from "@/features/grades/domain/use-cases/get-child-list.use-case";
import { GetGradeBookUseCase } from "@/features/grades/domain/use-cases/get-grade-book.use-case";
import { GetGradeSheetUseCase } from "@/features/grades/domain/use-cases/get-grade-sheet.use-case";
import { GetMyGradesUseCase } from "@/features/grades/domain/use-cases/get-my-grades.use-case";
import { LockTermUseCase } from "@/features/grades/domain/use-cases/lock-term.use-case";
import { RequestGradeRevisionUseCase } from "@/features/grades/domain/use-cases/request-grade-revision.use-case";
import { SaveScoreUseCase } from "@/features/grades/domain/use-cases/save-score.use-case";
import { SubmitColumnScoresUseCase } from "@/features/grades/domain/use-cases/submit-column-scores.use-case";
import { GradeBookRepository } from "@/features/grades/infrastructure/repositories/grade-book.repository";
import { GradesRepository } from "@/features/grades/infrastructure/repositories/grades.repository";
import { MockGradeApprovalRepository } from "@/features/grades/infrastructure/repositories/mocks/grade-approval.mock.repository";
import { MockGradeBookRepository } from "@/features/grades/infrastructure/repositories/mocks/grade-book.mock.repository";
import { MockGradesRepository } from "@/features/grades/infrastructure/repositories/mocks/grades.mock.repository";
import { makeAdminSettingsRepository } from "./admin-settings.di";
import { makeAssessmentSchemeRepository } from "./assessment-scheme.di";

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
  key: ClassSubjectTermKey,
): Promise<AssessmentScheme> {
  try {
    const repo = await makeAssessmentSchemeRepository();
    const result = await repo.getAssessmentScheme(
      key.subjectId,
      key.academicYearLabel,
      key.termId,
    );
    if (result.ok) {
      return result.data;
    }
  } catch {
    // fall through to preset
  }
  return {
    subjectId: key.subjectId,
    yearLabel: key.academicYearLabel,
    termId: key.termId,
    columns: TT22_PRESET,
  };
}

/** Resolves display names for the class/subject via the real picker composition. */
async function resolveDisplayNames(
  key: ClassSubjectTermKey,
): Promise<{ className: string; subjectName: string }> {
  try {
    const options = await resolveMyGradeSubjects();
    const match = options.find(
      (o) => o.classId === key.classId && o.subjectId === key.subjectId,
    );
    if (match)
      return { className: match.className, subjectName: match.subjectName };
  } catch {
    // fall through to id fallback
  }
  return { className: key.classId, subjectName: key.subjectId };
}

async function makeRepo(
  key: ClassSubjectTermKey,
): Promise<IGradesRepository & IGradesTermRepository> {
  const publishMode = await resolvePublishMode();
  if (USE_MOCK) {
    return new MockGradesRepository(publishMode);
  }
  // Proactive refresh (decision 0018, playbook step 6).
  await ensureFreshSession();
  const scheme = await resolveScheme(key);
  const http = await createServerHttpClient();
  return new GradesRepository(http, scheme, publishMode);
}

export async function makeGetGradeSheetUseCase(key: ClassSubjectTermKey) {
  return new GetGradeSheetUseCase(await makeRepo(key));
}

export async function makeSaveScoreUseCase(key: ClassSubjectTermKey) {
  return new SaveScoreUseCase(await makeRepo(key));
}

export async function makeSubmitColumnScoresUseCase(key: ClassSubjectTermKey) {
  return new SubmitColumnScoresUseCase(await makeRepo(key));
}

export async function makeLockTermUseCase(key: ClassSubjectTermKey) {
  return new LockTermUseCase(await makeRepo(key));
}

// ─── US-E13.6 / US-E18.12 — read-only multi-role grade book ─────────────────

async function makeGradeBookRepo(
  key: ClassSubjectTermKey,
): Promise<IGradeBookRepository> {
  const publishMode = await resolvePublishMode();
  if (USE_MOCK) {
    return new MockGradeBookRepository(publishMode);
  }
  // Proactive refresh (decision 0018, playbook step 6).
  await ensureFreshSession();
  const scheme = await resolveScheme(key);
  const http = await createServerHttpClient();
  const { className, subjectName } = await resolveDisplayNames(key);
  return new GradeBookRepository(
    http,
    scheme,
    publishMode,
    className,
    subjectName,
  );
}

export async function makeGetGradeBookUseCase(key: ClassSubjectTermKey) {
  return new GetGradeBookUseCase(await makeGradeBookRepo(key));
}

/**
 * Self-view repo (student self / parent-linked child) — spans EVERY subject
 * the student takes in the year, so unlike the class-view repo it resolves
 * scheme per-(subjectId, termId) lazily rather than up front for one subject.
 */
async function makeSelfViewGradeBookRepo(): Promise<IGradeBookRepository> {
  const publishMode = await resolvePublishMode();
  if (USE_MOCK) {
    return new MockGradeBookRepository(publishMode);
  }
  await ensureFreshSession();
  const http = await createServerHttpClient();
  const fallbackScheme: AssessmentScheme = {
    subjectId: "",
    yearLabel: "",
    termId: "",
    columns: TT22_PRESET,
  };
  const resolveSchemeFor = (
    subjectId: string,
    termId: string,
    academicYearLabel: string,
  ) => resolveScheme({ classId: "", subjectId, termId, academicYearLabel });
  return new GradeBookRepository(
    http,
    fallbackScheme,
    publishMode,
    "",
    "",
    resolveSchemeFor,
  );
}

/** Student self-view — `studentMemberId` resolved server-side via the JWT `sub` claim, never a URL param. */
export async function makeGetMyGradesUseCase() {
  return new GetMyGradesUseCase(await makeSelfViewGradeBookRepo());
}

export async function makeGetChildGradesUseCase() {
  return new GetChildGradesUseCase(await makeSelfViewGradeBookRepo());
}

/** US-E13.7 — parent child-switcher: permanently mock (ADR 0054). */
export async function makeGetChildListUseCase() {
  return new GetChildListUseCase(new MockGradeBookRepository());
}

/** Resolves the signed-in student's own memberId from the access-token `sub` claim. */
export async function resolveCurrentStudentMemberId(): Promise<string | null> {
  const token = await getAccessToken();
  return token ? decodeSubClaim(token) : null;
}

// ─── US-E14.4 — grade approval pipeline (admin, PERMANENTLY MOCK, ADR 0054) ──

/**
 * Force-mocked permanently (ADR 0054) — regardless of `USE_MOCK`, matching
 * `staff-leave.di.ts`'s unconditional-mock pattern. There is no batchId
 * resolution path, no tenant-wide pending-approval rollup, and no reject
 * transition for `GradeEntry` on the wire — a real branch here would 404/
 * silently misbehave the moment `USE_MOCK` flips false app-wide. The real
 * `GradeApprovalRepository`/`createServerHttpClient()` construction is
 * intentionally UNREACHABLE from this factory.
 */
async function makeApprovalRepo(): Promise<IGradeApprovalRepository> {
  return new MockGradeApprovalRepository();
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
