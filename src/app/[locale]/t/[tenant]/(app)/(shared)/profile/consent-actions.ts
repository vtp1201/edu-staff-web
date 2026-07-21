"use server";

import {
  makeGetLinkedStudentsWithConsentsUseCase,
  makeUpdateConsentUseCase,
} from "@/bootstrap/di/parent-consent.di";
import type { ParentStudentConsent } from "@/features/parent-links/domain/entities/parent-student-consent.entity";
import type { UpdateConsentInput } from "@/features/parent-links/domain/repositories/i-parent-consent.repository";
import type { LinkedStudentsWithConsents } from "@/features/parent-links/domain/use-cases/get-linked-students-with-consents.use-case";
import type {
  ParentConsentChildVM,
  ParentConsentFetchResult,
  ParentConsentToggleResult,
} from "@/features/user/presentation/profile/consent-section/parent-consent-section.i-vm";

/** Entity consent → the flat VM shape the toggles render. */
function toConsentShape(
  c: ParentStudentConsent,
): NonNullable<ParentConsentChildVM["consent"]> {
  return {
    discipline: c.disciplineAlerts,
    absence: c.absenceAlerts,
    grades: c.gradeAlerts,
  };
}

/** Combined use-case output → child VMs; missing consent → `null` (pending). */
function toChildVMs(data: LinkedStudentsWithConsents): ParentConsentChildVM[] {
  return data.students.map((s) => {
    const consent = data.consentByStudentId[s.studentId];
    return {
      studentId: s.studentId,
      fullName: s.fullName,
      avatarUrl: s.avatarUrl,
      consent: consent ? toConsentShape(consent) : null,
    };
  });
}

/**
 * Load the parent's own linked children + consents (INT-001 + INT-002).
 * Returns stable `errorKey`s, never translated strings (i18n.md) — the section
 * translates. `forbidden` is surfaced distinctly (AC-002.2), never a fake empty.
 */
export async function fetchParentConsentAction(): Promise<ParentConsentFetchResult> {
  const useCase = await makeGetLinkedStudentsWithConsentsUseCase();
  const result = await useCase.execute();
  if (!result.ok) {
    return {
      success: false,
      errorKey:
        result.failure.type === "forbidden" ? "forbidden" : "network-error",
    };
  }
  return { success: true, children: toChildVMs(result.value) };
}

/** Persist one toggle (INT-003). Echoes the server-confirmed consent on success. */
export async function updateParentConsentAction(
  input: UpdateConsentInput,
): Promise<ParentConsentToggleResult> {
  const useCase = await makeUpdateConsentUseCase();
  const result = await useCase.execute(input);
  if (!result.ok) {
    return { success: false, errorKey: result.failure.type };
  }
  return { success: true, consent: toConsentShape(result.value) };
}
