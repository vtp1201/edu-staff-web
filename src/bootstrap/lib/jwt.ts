/**
 * Pure JWT helpers (no `server-only`) — readable from server flow AND testable
 * in node. We only decode the `exp` claim; signature verification is BE's job.
 * Token is httpOnly cookie → exp is checked SERVER-side only (decision `0018`).
 */

function base64UrlDecode(segment: string): string {
  const padded = segment.replace(/-/g, "+").replace(/_/g, "/");
  const pad =
    padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const b64 = padded + pad;
  // Edge-safe: middleware runs in the edge runtime where `Buffer` is absent but
  // `atob` exists; fall back to `Buffer` for the node/test runtime.
  if (typeof atob === "function") return atob(b64);
  return Buffer.from(b64, "base64").toString("utf8");
}

/** Decode the JWT payload claims, or `null` if unreadable. */
export function decodeJwtClaims(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const claims = JSON.parse(base64UrlDecode(parts[1]));
    return typeof claims === "object" && claims !== null ? claims : null;
  } catch {
    return null;
  }
}

/** Returns the `exp` claim (seconds since epoch) or `null` if unreadable. */
export function decodeJwtExp(token: string): number | null {
  const exp = decodeJwtClaims(token)?.exp;
  return typeof exp === "number" ? exp : null;
}

/** Returns the tenant-scoped `tenantId` claim (after switch-tenant) or `null`. */
export function decodeTenantId(token: string): string | null {
  const tenantId = decodeJwtClaims(token)?.tenantId;
  return typeof tenantId === "string" ? tenantId : null;
}

/**
 * Access token is (about to be) expired. `skewSec` proactively refreshes before
 * real expiry to avoid a wasted 401 round-trip. Inject `nowMs` for determinism.
 */
export function isAccessExpired(
  exp: number | null,
  skewSec = 30,
  nowMs: number = Date.now(),
): boolean {
  if (exp === null) return true;
  return exp * 1000 <= nowMs + skewSec * 1000;
}
