import "server-only";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { IAssessmentSchemeRepository } from "@/features/assessment-scheme/domain/repositories/i-assessment-scheme.repository";
import { AssessmentSchemeRepository } from "@/features/assessment-scheme/infrastructure/repositories/assessment-scheme.repository";
import { MockAssessmentSchemeRepository } from "@/features/assessment-scheme/infrastructure/repositories/mock-assessment-scheme.repository";
import { ensureFreshSession } from "./auth.di";

/**
 * Per-request factory for the assessment-scheme repository.
 * Mock-first (decision 0014/0017): the `core` service is not live yet, so
 * `USE_MOCK` selects the in-memory mock. Validation lives in pure domain
 * use-cases (`validate-grade-scale` / `validate-assessment-scheme`) invoked at
 * the Server Action boundary, so no use-case classes are needed here.
 */
export async function makeAssessmentSchemeRepository(): Promise<IAssessmentSchemeRepository> {
  if (USE_MOCK) {
    return new MockAssessmentSchemeRepository();
  }
  await ensureFreshSession();
  const http = await createServerHttpClient();
  return new AssessmentSchemeRepository(http);
}
