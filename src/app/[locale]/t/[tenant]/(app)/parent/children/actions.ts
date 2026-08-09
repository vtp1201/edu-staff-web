"use server";

import { makeGetLinkedStudentsUseCase } from "@/bootstrap/di/parent-consent.di";
import { buildChildrenOverviewVM } from "@/features/parent/presentation/children-overview-screen/build-children-overview-vm";
import type { ChildrenOverviewFetchResult } from "@/features/parent/presentation/children-overview-screen/children-overview-screen.i-vm";

/**
 * Load the parent's own linked children for the overview index (US-E20.4).
 * Reuses US-E20.2's use-case + DI factory (server-side memberId scoping,
 * FR-004/NFR-007) and projects it through this screen's mapper — the consent
 * payload is dropped here, never rendered on this screen.
 *
 * A deliberate sibling of `profile/consent-actions.ts`'s
 * `fetchParentConsentAction` rather than a cross-route import: that action is
 * shaped for the consent toggles, and coupling two routes to one action would
 * make either screen's VM change ripple into the other.
 *
 * Returns stable `errorKey`s, never translated strings (i18n.md).
 */
export async function fetchParentChildrenAction(): Promise<ChildrenOverviewFetchResult> {
  // Children only: this screen drops the consent payload anyway, and a failing
  // consents read used to take the whole list down with it.
  const useCase = await makeGetLinkedStudentsUseCase();
  const result = await useCase.execute();
  return buildChildrenOverviewVM(
    result.ok
      ? { ok: true, value: { students: result.value, consentByStudentId: {} } }
      : result,
  );
}
