/**
 * core service — parent-facing consent endpoints (US-E20.2).
 * Routed through Kong gateway (ADR 0030): `/core/api/v1/...`.
 *
 * NOTE (US-E20.2): `core` is NOT built yet — this section is entirely
 * mock-first (decision 0014; no `core` openapi.yaml in this repo), mirror of
 * the discipline/academic-records/audit-log precedent. Paths are best-effort
 * per DR-014 + INT-001/002/003. The real `ParentConsentRepository` is kept
 * structurally ready but the DI factory serves the mock under
 * `NEXT_PUBLIC_USE_MOCK`.
 *
 * These are the PARENT-facing consents endpoints (own linked children + the
 * parent's own consent toggles), distinct from the ADMIN link-management
 * endpoints in `parent-student-link.endpoint.ts` (US-E20.1) — kept in a
 * separate constants file so the two independent modules don't couple.
 *
 * INT-001's `{memberId}` is resolved SERVER-SIDE from the authenticated
 * session (Bearer token), never taken from a client-supplied value
 * (FR-004/NFR-007) — `me` is the self-scoped alias.
 */
export const PARENT_CONSENT_EP = {
  /** GET own linked students (INT-001). Server resolves the caller's memberId. */
  linkedStudents: (memberId: string) =>
    `/core/api/v1/members/${memberId}/linked-students`,
  /** GET (INT-002) + PUT one toggle (INT-003) — parent's own consent rows. */
  consents: "/core/api/v1/parent-student-links/consents",
} as const;

/** Self-scoped alias — the server derives the real memberId from the token. */
export const SELF_MEMBER_ID = "me";
