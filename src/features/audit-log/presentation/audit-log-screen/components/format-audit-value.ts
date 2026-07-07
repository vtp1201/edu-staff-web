/**
 * Format an opaque before/after audit value for display (US-E12.12).
 * `null`/`undefined` → "—"; objects → compact JSON; primitives → String().
 * Pure, no i18n (values are numbers / codes / JSON — locale-agnostic here).
 */
export function formatAuditValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
