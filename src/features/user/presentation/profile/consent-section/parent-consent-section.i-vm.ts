import type { UpdateConsentInput } from "@/features/parent-links/domain/repositories/i-parent-consent.repository";

/** One linked child + its per-category consent, as the section renders it. */
export interface ParentConsentChildVM {
  studentId: string;
  fullName: string;
  avatarUrl?: string;
  /**
   * `null` = consents not yet resolved for this child — pending sub-state
   * (AC-001.3). NEVER a guessed default. Renders a disabled Switch + Skeleton.
   */
  consent: { discipline: boolean; absence: boolean; grades: boolean } | null;
}

/** Section fetch result — stable `errorKey`, never a translated string (i18n.md). */
export type ParentConsentFetchResult =
  | { success: true; children: ParentConsentChildVM[] }
  | { success: false; errorKey: "forbidden" | "network-error" };

/**
 * Toggle result — a successful toggle always echoes a concrete consent object
 * (never `null`), so the call site needs no null-check on success.
 */
export type ParentConsentToggleResult =
  | {
      success: true;
      consent: NonNullable<ParentConsentChildVM["consent"]>;
    }
  | { success: false; errorKey: "forbidden" | "network-error" | "validation" };

export type { UpdateConsentInput };
