import "server-only";
import { ensureFreshSession } from "@/bootstrap/di/auth.di";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { IParentConsentRepository } from "@/features/parent-links/domain/repositories/i-parent-consent.repository";
import { GetLinkedStudentsWithConsentsUseCase } from "@/features/parent-links/domain/use-cases/get-linked-students-with-consents.use-case";
import { UpdateConsentUseCase } from "@/features/parent-links/domain/use-cases/update-consent.use-case";
import { MockParentConsentRepository } from "@/features/parent-links/infrastructure/repositories/mock-parent-consent.repository";
import { ParentConsentRepository } from "@/features/parent-links/infrastructure/repositories/parent-consent.repository";

/**
 * Parent-consent repository factory (per-request, US-E20.2). All 3 endpoints
 * are mock-first (`core` not built, decision 0014) — `NEXT_PUBLIC_USE_MOCK`
 * selects the mock; the real repo is kept structurally ready.
 * `ensureFreshSession()` runs before `createServerHttpClient()` in the real
 * branch (decision 0018 playbook). Mirrors `parent-student-link.di.ts`.
 */
async function makeRepo(): Promise<IParentConsentRepository> {
  if (USE_MOCK) return new MockParentConsentRepository();
  await ensureFreshSession();
  return new ParentConsentRepository(await createServerHttpClient());
}

export async function makeGetLinkedStudentsWithConsentsUseCase() {
  return new GetLinkedStudentsWithConsentsUseCase(await makeRepo());
}

export async function makeUpdateConsentUseCase() {
  return new UpdateConsentUseCase(await makeRepo());
}
