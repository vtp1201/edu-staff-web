/**
 * Search-result candidate for the create-link comboboxes (US-E20.1,
 * INT-005/INT-006). Domain-agnostic shape covering both the student variant
 * (`className`) and the parent variant (`phone`). Server-scoped to the admin's
 * own tenant + role (parent-role only for the parent search, NFR-008).
 */
export interface LinkCandidate {
  memberId: string;
  fullName: string;
  avatarUrl?: string;
  /** Present for student candidates (INT-005). */
  className?: string;
  /** Present for parent candidates (INT-006). */
  phone?: string;
}
