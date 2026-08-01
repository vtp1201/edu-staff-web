import "server-only";
import { ensureFreshSession } from "@/bootstrap/di/auth.di";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { BatchResolveMembersUseCase } from "@/features/iam-directory/domain/use-cases/batch-resolve-members.use-case";
import { SearchMembersUseCase } from "@/features/iam-directory/domain/use-cases/search-members.use-case";
import { IamDirectoryRepository } from "@/features/iam-directory/infrastructure/repositories/iam-directory.repository";

/**
 * IAM member-directory factories (per-request, US-E18.23 / IAM US-144).
 *
 * This module owns NO screen: it is a pure infrastructure capability that other
 * features COMPOSE from their own DI (`class-management.di.ts` for the teacher
 * picker, `staffing.di.ts` for assignment display names). `bootstrap/di` — not
 * a feature's domain — is exactly where composing across features is allowed
 * (decision 0017, same precedent as `bootstrap/lib/resolve-current-term.ts`).
 *
 * DELIBERATELY REAL-ONLY — there is no `USE_MOCK` branch here. `USE_MOCK`
 * (decision 0014) selects a whole screen's data source, and this module has no
 * screen of its own; each CONSUMER factory already gates on `USE_MOCK` and
 * simply never reaches these factories in mock mode (their mock repositories
 * carry their own seeded names). Adding a second gate here would let a
 * half-mock/half-real repository exist, which is exactly what decision 0014
 * avoids.
 *
 * Proactive refresh (decision 0018): rotate the access token BEFORE the
 * protected IAM call if it is about to expire, avoiding a wasted 401.
 */
async function makeRepo(): Promise<IamDirectoryRepository> {
  await ensureFreshSession();
  return new IamDirectoryRepository(await createServerHttpClient());
}

/** Reads the WHOLE directory (follows `nextCursor` until `hasMore` is false). */
export async function makeSearchMembersUseCase(): Promise<SearchMembersUseCase> {
  return new SearchMembersUseCase(await makeRepo());
}

/** Resolves display names for an arbitrary-length id list (chunks at 50). */
export async function makeBatchResolveMembersUseCase(): Promise<BatchResolveMembersUseCase> {
  return new BatchResolveMembersUseCase(await makeRepo());
}
