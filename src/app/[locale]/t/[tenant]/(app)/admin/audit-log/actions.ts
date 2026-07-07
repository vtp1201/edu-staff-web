"use server";

import { requireRole } from "@/bootstrap/auth-guard/require-role.server";
import { makeGetAuditLogUseCase } from "@/bootstrap/di/audit-log.di";
import type { AuditLogFilter } from "@/features/audit-log/domain/entities/audit-log-filter.entity";
import { isRetryableFailure } from "@/features/audit-log/domain/failures/audit-log.failure";
import { AUDIT_LOG_PAGE_SIZE } from "@/features/audit-log/domain/repositories/i-audit-log.repository";
import type { AuditLogActionResult } from "@/features/audit-log/presentation/audit-log-screen/audit-log-screen.i-vm";

/**
 * Read a page of the audit log (US-E12.12). Defense-in-depth RBAC: the admin
 * role check is the FIRST statement, before any DI/use-case wiring, alongside
 * the RSC-level AdminLayout guard (US-E14.6 review lesson — a missing RBAC
 * check on a read action was flagged). Returns stable failure keys; no i18n.
 */
export async function getAuditLogAction(
  filter: AuditLogFilter,
  cursor: string | null,
): Promise<AuditLogActionResult> {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) {
    return {
      ok: false,
      errorKey:
        guard.reason === "unauthenticated" ? "unauthorized" : "forbidden",
      retryable: false,
    };
  }

  const useCase = await makeGetAuditLogUseCase();
  const result = await useCase.execute(filter, cursor, AUDIT_LOG_PAGE_SIZE);
  if (result.ok) return { ok: true, data: result.value };

  return {
    ok: false,
    errorKey: result.error.type,
    retryable: isRetryableFailure(result.error),
  };
}
