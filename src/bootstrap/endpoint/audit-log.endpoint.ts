/**
 * Audit-log endpoint constants (US-E12.12, `core` service — mock-first).
 * No magic strings in repositories. Cursor-paginated list, admin read-only.
 */
export const AUDIT_LOG_EP = {
  list: "/core/api/v1/audit-log",
} as const;
