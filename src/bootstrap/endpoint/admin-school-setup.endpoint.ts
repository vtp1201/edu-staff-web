/** core service — school config endpoints (mock-first until `core` exists, decision 0014/0017). */
export const SCHOOL_SETUP_EP = {
  config: "/core/config/school",
  setupStatus: "/core/config/school/setup-status",
  gradeLevels: "/core/config/school/grade-levels",
  operationalSettings: "/core/config/school/operational-settings",
} as const;
