/**
 * Typed failure union for the tenant feature (US-E23.1, fe-lead Path A decision
 * 2026-07-18). The switch flow (`POST /members/switch-tenant`) must classify a
 * BE rejection distinctly: 403 (target membership non-member/suspended/inactive)
 * is card-inline + non-retryable (FR-008), everything else (network/5xx/timeout,
 * and today's 401 per the AC-9 descope) is a retryable toast (FR-009).
 *
 * Repo/use-case/action return a stable key — presentation translates, they do
 * NOT (`.claude/rules/i18n.md` §Nơi dịch).
 */
export type TenantFailure =
  | { type: "forbidden" }
  | { type: "network" }
  | { type: "unknown" };
