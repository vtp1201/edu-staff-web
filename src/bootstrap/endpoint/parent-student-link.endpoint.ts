/**
 * core service — parent-student-link endpoints (US-E20.1).
 * Routed through Kong gateway (ADR 0030 / US-E06.3): `/core/api/v1/...`
 * → Kong strips `/core` → core receives `/api/v1/...`.
 *
 * NOTE (US-E20.1): the `core` service is NOT built yet — this ENTIRE screen is
 * mock-first (decision 0014; no `openapi.yaml` for `core` in this repo), mirror
 * of the `discipline`/`academic-records`/`audit-log`/`admin-roster` endpoint
 * precedent. The paths below are best-effort per DR-014 + sibling features; the
 * real `ParentStudentLinkRepository` is kept structurally ready but the DI
 * factory serves `MockParentStudentLinkRepository` under `NEXT_PUBLIC_USE_MOCK`.
 *
 * INT-005 (student search) and INT-006 (parent search) have NO confirmed real
 * endpoint (student search: no core route exists at all — same posture as
 * `ROSTER_EP.searchPool`; parent search: `IAM_MEMBER_EP.members(tenantId)` has
 * no `q`/`role`-filter contract yet). Both are documented here only as the
 * missing-endpoint anchors; both are mock-first for this story.
 */
export const PARENT_STUDENT_LINKS_EP = {
  /** GET (list, q/classId/cursor/limit) + POST (create). */
  base: "/core/api/v1/parent-student-links",
  /** DELETE one link (HIGH-RISK). Build with byId(). */
  byId: (linkId: string) => `/core/api/v1/parent-student-links/${linkId}`,
  /** GET consent detail (linkId or studentId+parentId), detail-dialog lazy fetch. */
  consents: "/core/api/v1/parent-student-links/consents",
  /** Student typeahead — NO real core endpoint exists (mock-first, INT-005). */
  studentSearch: "/core/api/v1/parent-student-links/student-candidates",
  /** Parent typeahead — NO real q/role-filter contract yet (mock-first, INT-006). */
  parentSearch: "/core/api/v1/parent-student-links/parent-candidates",
} as const;
