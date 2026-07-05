/**
 * US-E17.12 (DR-011 §UX-06) — contextual "violation recorded" toast.
 *
 * Pure helper kept outside `ViolationsTab` so the fallback/contextual branch
 * is unit-testable without mounting the component (Vitest `node` env here).
 */

export interface ViolationToastParams {
  key: "successContext" | "success";
  values?: { studentName: string };
  duration: number;
}

export function resolveViolationToastParams(
  studentName: string | undefined,
): ViolationToastParams {
  const trimmed = studentName?.trim();
  if (trimmed) {
    return {
      key: "successContext",
      values: { studentName: trimmed },
      duration: 4000,
    };
  }
  return { key: "success", duration: 2000 };
}
