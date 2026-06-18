/**
 * Typed failure union for the teaching-plan feature (US-E11.4).
 * The `type` doubles as a stable i18n key under `teachingPlan.errors` —
 * presentation translates; domain/use-cases/repos throw these, never strings.
 */
export type TeachingPlanFailure =
  | { type: "not-found" }
  | { type: "not-draft" }
  | { type: "not-submitted" }
  | { type: "insufficient-cells" }
  | { type: "invalid-rejection-reason" }
  | { type: "unauthorized" }
  | { type: "network-error" }
  | { type: "unknown"; message?: string };
