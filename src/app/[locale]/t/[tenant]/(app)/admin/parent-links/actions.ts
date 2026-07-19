"use server";

import { requireRole } from "@/bootstrap/auth-guard";
import {
  makeCreateParentStudentLinkUseCase,
  makeGetLinkConsentDetailUseCase,
  makeListParentStudentLinksUseCase,
  makeParentLinksAuthContext,
  makeSearchParentCandidatesUseCase,
  makeSearchStudentCandidatesUseCase,
  makeUnlinkParentStudentLinkUseCase,
} from "@/bootstrap/di/parent-student-link.di";
import type { LinkCandidate } from "@/features/admin/parent-links/domain/entities/link-candidate.entity";
import type { ParentStudentConsent } from "@/features/admin/parent-links/domain/entities/parent-student-consent.entity";
import type { ParentStudentLink } from "@/features/admin/parent-links/domain/entities/parent-student-link.entity";
import type { ParentStudentLinkFailure } from "@/features/admin/parent-links/domain/failures/parent-student-link.failure";
import { isRetryableFailure } from "@/features/admin/parent-links/domain/failures/parent-student-link.failure";
import { PARENT_LINKS_PAGE_SIZE } from "@/features/admin/parent-links/domain/repositories/i-parent-student-link.repository";
import type { Result } from "@/features/admin/parent-links/domain/use-cases/result";
import type {
  ActionResult,
  CreateLinkActionInput,
  ParentLinksFilter,
  ParentLinksPage,
} from "@/features/admin/parent-links/presentation/parent-links-screen/parent-links-screen.i-vm";

/** Domain Result → stable-key ActionResult (no i18n; presentation translates). */
function toActionResult<T>(
  result: Result<T, ParentStudentLinkFailure>,
): ActionResult<T> {
  if (result.ok) return { ok: true, data: result.value };
  return {
    ok: false,
    errorKey: result.failure.type,
    retryable: isRetryableFailure(result.failure),
    fields:
      result.failure.type === "validation" ? result.failure.fields : undefined,
  };
}

/** Read path — RBAC defense-in-depth alongside the AdminLayout RSC guard. */
export async function listLinksAction(
  filter: ParentLinksFilter,
  cursor: string | null,
): Promise<ActionResult<ParentLinksPage>> {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) return { ok: false, errorKey: "forbidden", retryable: false };

  const useCase = await makeListParentStudentLinksUseCase();
  const result = await useCase.execute({
    q: filter.q || undefined,
    classId: filter.classId,
    cursor,
    limit: PARENT_LINKS_PAGE_SIZE,
  });
  return toActionResult(result);
}

/**
 * Create (HIGH-RISK). `requireRole` FIRST (returns forbidden with ZERO repo
 * calls if not admin, AC-006.2), THEN the server-derived `authCtx` (role +
 * tenant) is re-validated by the repository against the link's own tenant
 * (AC-005.5). Both checks are required — `requireRole` alone is role-only.
 */
export async function createLinkAction(
  input: CreateLinkActionInput,
): Promise<ActionResult<ParentStudentLink>> {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) return { ok: false, errorKey: "forbidden", retryable: false };

  const authCtx = await makeParentLinksAuthContext();
  const useCase = await makeCreateParentStudentLinkUseCase();
  const result = await useCase.execute(input, authCtx);
  return toActionResult(result);
}

/**
 * Unlink (HIGH-RISK, INT-003). Same two-layer gate as create — `requireRole`
 * short-circuit (AC-006.3) + server-side role/tenant re-auth in the repository
 * (AC-005.5). Never optimistic on the client (AC-005.4).
 */
export async function unlinkLinkAction(
  linkId: string,
): Promise<ActionResult<undefined>> {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) return { ok: false, errorKey: "forbidden", retryable: false };

  const authCtx = await makeParentLinksAuthContext();
  const useCase = await makeUnlinkParentStudentLinkUseCase();
  const result = await useCase.execute(linkId, authCtx);
  if (!result.ok) {
    return {
      ok: false,
      errorKey: result.failure.type,
      retryable: isRetryableFailure(result.failure),
    };
  }
  return { ok: true, data: undefined };
}

export async function getLinkConsentDetailAction(
  studentId: string,
  parentId: string,
): Promise<ActionResult<ParentStudentConsent>> {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) return { ok: false, errorKey: "forbidden", retryable: false };

  const useCase = await makeGetLinkConsentDetailUseCase();
  return toActionResult(await useCase.execute(studentId, parentId));
}

export async function searchStudentCandidatesAction(
  q: string,
  classId?: string,
): Promise<ActionResult<LinkCandidate[]>> {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) return { ok: false, errorKey: "forbidden", retryable: false };

  const useCase = await makeSearchStudentCandidatesUseCase();
  return toActionResult(await useCase.execute(q, classId));
}

export async function searchParentCandidatesAction(
  q: string,
): Promise<ActionResult<LinkCandidate[]>> {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) return { ok: false, errorKey: "forbidden", retryable: false };

  const useCase = await makeSearchParentCandidatesUseCase();
  return toActionResult(await useCase.execute(q));
}
