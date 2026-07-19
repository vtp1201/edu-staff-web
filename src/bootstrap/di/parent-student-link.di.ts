import "server-only";
import { ensureFreshSession } from "@/bootstrap/di/auth.di";
import { getAccessToken } from "@/bootstrap/lib/auth-token.server";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { decodeRoleClaim, decodeTenantId } from "@/bootstrap/lib/jwt";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type {
  AuthContext,
  IParentStudentLinkRepository,
} from "@/features/admin/parent-links/domain/repositories/i-parent-student-link.repository";
import { CreateParentStudentLinkUseCase } from "@/features/admin/parent-links/domain/use-cases/create-parent-student-link.use-case";
import { GetLinkConsentDetailUseCase } from "@/features/admin/parent-links/domain/use-cases/get-link-consent-detail.use-case";
import { ListParentStudentLinksUseCase } from "@/features/admin/parent-links/domain/use-cases/list-parent-student-links.use-case";
import { SearchParentCandidatesUseCase } from "@/features/admin/parent-links/domain/use-cases/search-parent-candidates.use-case";
import { SearchStudentCandidatesUseCase } from "@/features/admin/parent-links/domain/use-cases/search-student-candidates.use-case";
import { UnlinkParentStudentLinkUseCase } from "@/features/admin/parent-links/domain/use-cases/unlink-parent-student-link.use-case";
import {
  MOCK_TENANT_ID,
  MockParentStudentLinkRepository,
} from "@/features/admin/parent-links/infrastructure/repositories/mock-parent-student-link.repository";
import { ParentStudentLinkRepository } from "@/features/admin/parent-links/infrastructure/repositories/parent-student-link.repository";

/**
 * Parent-student-link repository factory (per-request, US-E20.1). ALL 6
 * endpoints are mock-first (`core` not built, decision 0014; `iam` search-by-role
 * has no contract) — `NEXT_PUBLIC_USE_MOCK` selects the mock; the real repo is
 * kept structurally ready. `ensureFreshSession()` runs before
 * `createServerHttpClient()` in the real branch (decision 0018 playbook).
 */
async function makeRepo(): Promise<IParentStudentLinkRepository> {
  if (USE_MOCK) return new MockParentStudentLinkRepository();
  await ensureFreshSession();
  return new ParentStudentLinkRepository(await createServerHttpClient());
}

/**
 * HIGH-RISK: assemble the server-derived authorization context for create/unlink
 * (spec.md §"High-Risk Security Enforcement" pt.1, AC-005.5). `requireRole` is
 * ROLE-ONLY (tenant is enforced at the layout, not the Server Action); the
 * repository must ALSO re-validate the tenant against the link's own tenant. The
 * role + tenantId are decoded here from the httpOnly access-token claim, NEVER
 * from client input. In mock mode `decodeRoleClaim` returns "admin" and the mock
 * token carries no tenantId, so it falls back to the seed tenant (which the mock
 * store owns) — keeping the re-auth path exercised end-to-end in dev.
 */
export async function makeParentLinksAuthContext(): Promise<AuthContext> {
  const token = (await getAccessToken()) ?? "";
  const role = decodeRoleClaim(token) ?? "student"; // unknown ⇒ non-admin
  const tenantId = decodeTenantId(token) ?? MOCK_TENANT_ID;
  return { role, tenantId };
}

export async function makeListParentStudentLinksUseCase() {
  return new ListParentStudentLinksUseCase(await makeRepo());
}

export async function makeCreateParentStudentLinkUseCase() {
  return new CreateParentStudentLinkUseCase(await makeRepo());
}

export async function makeUnlinkParentStudentLinkUseCase() {
  return new UnlinkParentStudentLinkUseCase(await makeRepo());
}

export async function makeGetLinkConsentDetailUseCase() {
  return new GetLinkConsentDetailUseCase(await makeRepo());
}

export async function makeSearchStudentCandidatesUseCase() {
  return new SearchStudentCandidatesUseCase(await makeRepo());
}

export async function makeSearchParentCandidatesUseCase() {
  return new SearchParentCandidatesUseCase(await makeRepo());
}
