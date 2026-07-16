import "server-only";
import { ensureFreshSession } from "@/bootstrap/di/auth.di";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { IClassLogRepository } from "@/features/class-log/domain/repositories/i-class-log.repository";
import { ApproveEntryUseCase } from "@/features/class-log/domain/use-cases/approve-entry.use-case";
import { CreateEntryUseCase } from "@/features/class-log/domain/use-cases/create-entry.use-case";
import { ListEntriesUseCase } from "@/features/class-log/domain/use-cases/list-entries.use-case";
import { RejectEntryUseCase } from "@/features/class-log/domain/use-cases/reject-entry.use-case";
import { ReviseEntryUseCase } from "@/features/class-log/domain/use-cases/revise-entry.use-case";
import { SubmitEntryUseCase } from "@/features/class-log/domain/use-cases/submit-entry.use-case";
import { ClassLogRepository } from "@/features/class-log/infrastructure/repositories/class-log.repository";
import { MockClassLogRepository } from "@/features/class-log/infrastructure/repositories/mocks/class-log.mock.repository";

async function makeRepo(): Promise<IClassLogRepository> {
  if (USE_MOCK) return new MockClassLogRepository();
  await ensureFreshSession();
  return new ClassLogRepository(await createServerHttpClient());
}

export async function makeClassLogRepository(): Promise<IClassLogRepository> {
  return makeRepo();
}

export async function makeListEntriesUseCase() {
  return new ListEntriesUseCase(await makeRepo());
}

export async function makeCreateEntryUseCase() {
  return new CreateEntryUseCase(await makeRepo());
}

export async function makeSubmitEntryUseCase() {
  return new SubmitEntryUseCase(await makeRepo());
}

export async function makeReviseEntryUseCase() {
  return new ReviseEntryUseCase(await makeRepo());
}

export async function makeApproveEntryUseCase() {
  return new ApproveEntryUseCase(await makeRepo());
}

export async function makeRejectEntryUseCase() {
  return new RejectEntryUseCase(await makeRepo());
}
