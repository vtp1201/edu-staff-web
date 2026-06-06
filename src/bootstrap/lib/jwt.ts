/**
 * Pure JWT helpers (no `server-only`) — readable from server flow AND testable
 * in node. We only decode the `exp` claim; signature verification is BE's job.
 * Token is httpOnly cookie → exp is checked SERVER-side only (decision `0018`).
 */

function base64UrlDecode(segment: string): string {
  const padded = segment.replace(/-/g, "+").replace(/_/g, "/");
  const pad =
    padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, "base64").toString("utf8");
}

/** Returns the `exp` claim (seconds since epoch) or `null` if unreadable. */
export function decodeJwtExp(token: string): number | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(base64UrlDecode(parts[1])) as { exp?: unknown };
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
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
