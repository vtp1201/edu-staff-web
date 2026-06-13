/**
 * core service — school config endpoints (mock-first until `core` exists, decision 0014/0017).
 * Routed through Kong gateway (ADR 0030 / US-E06.3): `/core/api/v1/...`
 * → Kong strips `/core` → core receives `/api/v1/...`.
 */
export const SCHOOL_SETUP_EP = {
  config: "/core/api/v1/config/school",
  setupStatus: "/core/api/v1/config/school/setup-status",
  gradeLevels: "/core/api/v1/config/school/grade-levels",
  operationalSettings: "/core/api/v1/config/school/operational-settings",
} as const;
