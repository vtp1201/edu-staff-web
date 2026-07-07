import "server-only";

import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { IAuditLogRepository } from "@/features/audit-log/domain/repositories/i-audit-log.repository";
import { GetAuditLogUseCase } from "@/features/audit-log/domain/use-cases/get-audit-log.use-case";
import { AuditLogRepository } from "@/features/audit-log/infrastructure/repositories/audit-log.repository";
import { MockAuditLogRepository } from "@/features/audit-log/infrastructure/repositories/mock-audit-log.repository";

async function makeRepo(): Promise<IAuditLogRepository> {
  if (USE_MOCK) return new MockAuditLogRepository();
  return new AuditLogRepository(await createServerHttpClient());
}

export async function makeGetAuditLogUseCase() {
  return new GetAuditLogUseCase(await makeRepo());
}
