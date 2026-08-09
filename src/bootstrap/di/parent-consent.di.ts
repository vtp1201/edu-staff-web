import "server-only";
import { ensureFreshSession } from "@/bootstrap/di/auth.di";
import { makeBatchResolveMembersUseCase } from "@/bootstrap/di/iam-directory.di";
import { getAccessToken } from "@/bootstrap/lib/auth-token.server";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { decodeMemberId } from "@/bootstrap/lib/jwt";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { IParentConsentRepository } from "@/features/parent-links/domain/repositories/i-parent-consent.repository";
import { GetLinkedStudentsUseCase } from "@/features/parent-links/domain/use-cases/get-linked-students.use-case";
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
  const http = await createServerHttpClient();
  // core has no `me` alias on this route — pass the token's own memberId.
  const selfMemberId = decodeMemberId((await getAccessToken()) ?? "");
  // Child display names: the links wire carries none (same gap as every other
  // core list), so decorate with one batched IAM lookup.
  const batchResolve = await makeBatchResolveMembersUseCase();
  const resolveNames = async (memberIds: string[]) => {
    const names = new Map<string, string>();
    const result = await batchResolve.execute(memberIds);
    if (result.ok)
      for (const m of result.value) names.set(m.memberId, m.displayName);
    return names;
  };
  return new ParentConsentRepository(http, selfMemberId, resolveNames);
}

export async function makeGetLinkedStudentsWithConsentsUseCase() {
  return new GetLinkedStudentsWithConsentsUseCase(await makeRepo());
}

/** Children list only — see the use-case doc for why this is separate. */
export async function makeGetLinkedStudentsUseCase() {
  return new GetLinkedStudentsUseCase(await makeRepo());
}

export async function makeUpdateConsentUseCase() {
  return new UpdateConsentUseCase(await makeRepo());
}
