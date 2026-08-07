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
import type { IGradeDecisionRepository } from "@/features/grades/domain/repositories/i-grade-decision.repository";
import type { IGradesRepository } from "@/features/grades/domain/repositories/i-grades.repository";
import type { IGradesTermRepository } from "@/features/grades/domain/repositories/i-grades-term.repository";
import type { IPendingApprovalRepository } from "@/features/grades/domain/repositories/i-pending-approval.repository";
import { ApproveColumnEntryUseCase } from "@/features/grades/domain/use-cases/approve-column-entry.use-case";
import { ApproveGradeBatchUseCase } from "@/features/grades/domain/use-cases/approve-grade-batch.use-case";
import { BulkLockBatchesUseCase } from "@/features/grades/domain/use-cases/bulk-lock-batches.use-case";
import { GetChildGradesUseCase } from "@/features/grades/domain/use-cases/get-child-grades.use-case";
import { GetChildListUseCase } from "@/features/grades/domain/use-cases/get-child-list.use-case";
import { GetGradeBookUseCase } from "@/features/grades/domain/use-cases/get-grade-book.use-case";
import { GetGradeSheetUseCase } from "@/features/grades/domain/use-cases/get-grade-sheet.use-case";
import { GetMyGradesUseCase } from "@/features/grades/domain/use-cases/get-my-grades.use-case";
import { ListPendingApprovalBatchesUseCase } from "@/features/grades/domain/use-cases/list-pending-approval-batches.use-case";
import { LockTermUseCase } from "@/features/grades/domain/use-cases/lock-term.use-case";
import { RejectColumnEntryUseCase } from "@/features/grades/domain/use-cases/reject-column-entry.use-case";
import { RequestGradeRevisionUseCase } from "@/features/grades/domain/use-cases/request-grade-revision.use-case";
import { SaveScoreUseCase } from "@/features/grades/domain/use-cases/save-score.use-case";
import { SubmitColumnScoresUseCase } from "@/features/grades/domain/use-cases/submit-column-scores.use-case";
import { GradeBookRepository } from "@/features/grades/infrastructure/repositories/grade-book.repository";
import { GradesRepository } from "@/features/grades/infrastructure/repositories/grades.repository";
import { MockGradeApprovalRepository } from "@/features/grades/infrastructure/repositories/mocks/grade-approval.mock.repository";
import { MockGradeBookRepository } from "@/features/grades/infrastructure/repositories/mocks/grade-book.mock.repository";
import { MockGradesRepository } from "@/features/grades/infrastructure/repositories/mocks/grades.mock.repository";
import { MockPendingApprovalRepository } from "@/features/grades/infrastructure/repositories/mocks/pending-approval.mock.repository";
import {
  ParentChildListRepository,
  type ResolveChildNames,
} from "@/features/grades/infrastructure/repositories/parent-child-list.repository";
import { PendingApprovalRepository } from "@/features/grades/infrastructure/repositories/pending-approval.repository";
import { makeAdminSettingsRepository } from "./admin-settings.di";
import { makeAssessmentSchemeRepository } from "./assessment-scheme.di";
import { makeBatchResolveMembersUseCase } from "./iam-directory.di";

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
): Promise<
  IGradesRepository & IGradesTermRepository & IGradeDecisionRepository
> {
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

/**
 * US-E18.44 (BE US-184) — per-cell reject / request-revision. ADMIN/MANAGER
 * only; the Server Action re-checks the role before calling this factory and
 * `core` enforces its own 403, so this factory carries no role logic of its
 * own (same shape as `makeLockTermUseCase`, the other ADMIN/MANAGER action).
 * Ordinary `USE_MOCK ? Mock : Real` — the mock supports the transition so the
 * flow is demoable with `NEXT_PUBLIC_USE_MOCK=true`.
 */
export async function makeRejectColumnEntryUseCase(key: ClassSubjectTermKey) {
  return new RejectColumnEntryUseCase(await makeRepo(key));
}

/**
 * US-E18.46 — per-cell APPROVE (`PENDING_APPROVAL → PUBLISHED`). Same actor,
 * same gate and same `USE_MOCK ? Mock : Real` shape as the reject factory
 * above; the Server Action re-checks the role and `core` enforces its own 403,
 * so this factory carries no role logic of its own.
 */
export async function makeApproveColumnEntryUseCase(key: ClassSubjectTermKey) {
  return new ApproveColumnEntryUseCase(await makeRepo(key));
}

/**
 * US-E18.46 (BE US-186) — tenant-wide pending-approval rollup.
 *
 * Takes NO `ClassSubjectTermKey`: this read is what TELLS the approver which
 * tuples exist, so it cannot be keyed by one. It therefore also skips the
 * per-key scheme/publish-mode resolution `makeRepo` performs — the rollup needs
 * neither, and doing them would cost two service reads per page for data the
 * response never carries.
 */
export async function makeListPendingApprovalBatchesUseCase() {
  return new ListPendingApprovalBatchesUseCase(await makePendingApprovalRepo());
}

async function makePendingApprovalRepo(): Promise<IPendingApprovalRepository> {
  if (USE_MOCK) {
    return new MockPendingApprovalRepository();
  }
  // Proactive refresh (decision 0018, playbook step 6).
  await ensureFreshSession();
  const http = await createServerHttpClient();
  return new PendingApprovalRepository(http);
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

/**
 * US-E13.7 parent child-switcher roster — REAL since US-E18.33.
 *
 * ADR 0054 pinned this to the mock UNCONDITIONALLY for one reason only: the
 * roster endpoint carries no display NAME and no directory endpoint a PARENT
 * could call resolved one. IAM ADR-0120 removed exactly that blocker
 * (`GET /members?ids=` is now callable by any tenant member, returning
 * `memberId + displayName` for a narrowed-tier caller), so the factory drops
 * to the standard `USE_MOCK ? Mock : Real` shape.
 *
 * The real branch composes TWO services, and only `bootstrap/di` may
 * (decision 0017):
 * - `core` `GET /members/{selfId}/linked-students` → WHICH children. `selfId`
 *   is the token's own `sub` claim; the client never supplies a parent id.
 * - `iam-directory`'s `BatchResolveMembersUseCase` → their names. This is the
 *   app's single batch-lookup client (chunks ≤50 ids); do NOT add a second.
 *   A failed lookup returns an EMPTY map, never throws — the repository owns
 *   the per-row raw-id fallback so the roster still renders.
 */
export async function makeGetChildListUseCase() {
  if (USE_MOCK) {
    return new GetChildListUseCase(new MockGradeBookRepository());
  }
  // Proactive refresh (decision 0018, playbook step 6).
  await ensureFreshSession();
  const http = await createServerHttpClient();
  const parentMemberId = await resolveCurrentMemberId();
  const batchResolve = await makeBatchResolveMembersUseCase();
  const resolveNames: ResolveChildNames = async (ids) => {
    const result = await batchResolve.execute(ids);
    const names = new Map<string, string>();
    if (result.ok) {
      for (const m of result.value) names.set(m.memberId, m.displayName);
    }
    return names;
  };
  return new GetChildListUseCase(
    new ParentChildListRepository(http, parentMemberId, resolveNames),
  );
}

/**
 * The signed-in caller's own memberId, from the access-token `sub` claim.
 * Role-agnostic — used for the student self-view AND (US-E18.33) for the
 * parent's own linked-children read. Never a client-supplied id.
 */
async function resolveCurrentMemberId(): Promise<string | null> {
  const token = await getAccessToken();
  return token ? decodeSubClaim(token) : null;
}

/** Resolves the signed-in student's own memberId from the access-token `sub` claim. */
export async function resolveCurrentStudentMemberId(): Promise<string | null> {
  return resolveCurrentMemberId();
}

// ─── US-E14.4 — grade approval pipeline (admin, PERMANENTLY MOCK, ADR 0054) ──

/**
 * Force-mocked permanently (ADR 0054) — regardless of `USE_MOCK`, matching
 * `staff-leave.di.ts`'s unconditional-mock pattern. There is no batchId
 * resolution path and no tenant-wide pending-approval rollup on the wire
 * (cross-repo ask #18, still OPEN) — a real branch here would 404/silently
 * misbehave the moment `USE_MOCK` flips false app-wide.
 *
 * US-E18.44 note: BE US-184 DID add a reject transition, but it is PER-CELL
 * (`.../grades/{studentId}/columns/{columnId}/reject`, wired through
 * `makeRejectColumnEntryUseCase` above), NOT per-batch. It resolves only one of
 * the reasons this factory is force-mocked; the missing `batchId` source and
 * the missing tenant-wide rollup both stand, so this stays mock. The real
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
