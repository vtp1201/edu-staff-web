import "server-only";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { IAssessmentSchemeRepository } from "@/features/assessment-scheme/domain/repositories/i-assessment-scheme.repository";
import { AssessmentSchemeRepository } from "@/features/assessment-scheme/infrastructure/repositories/assessment-scheme.repository";
import { MockAssessmentSchemeRepository } from "@/features/assessment-scheme/infrastructure/repositories/mock-assessment-scheme.repository";
import { ensureFreshSession } from "./auth.di";

/**
 * Per-request factory for the assessment-scheme repository.
 * Plain `USE_MOCK` gate (decision 0014/0017) — NOT a force-mock: every method of
 * `AssessmentSchemeRepository` hits a real `core` endpoint (grade-scale +
 * assessment-scheme since US-E18.7; the grade-scoped subject list since
 * US-E18.42 / BE US-177), so real mode is fully wired and `USE_MOCK` only
 * selects the offline/dev in-memory mock. Validation lives in pure domain
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
