/**
 * Client-side mirrors of the two window/url invariants BE enforces
 * (`422 LMS_ITEM_INVALID_WINDOW`, `422 LMS_ITEM_URL_INVALID`).
 *
 * These are a courtesy, NOT the gate: BE re-validates everything. They exist so
 * an obviously-wrong form does not cost a round trip and so the error lands on
 * the offending FIELD instead of as a generic banner.
 */

/**
 * `dueAt` must be STRICTLY after `startAt` when both are given — a zero-length
 * window is rejected by BE too (an item visible and closed in the same
 * instant). Either half blank means "no constraint", which is the
 * "Để trống = không giới hạn" contract on the inline editor.
 */
export function isDueAfterStart(
  startAt: string | null,
  dueAt: string | null,
): boolean {
  if (!startAt || !dueAt) return true;
  const start = Date.parse(startAt);
  const due = Date.parse(dueAt);
  if (Number.isNaN(start) || Number.isNaN(due)) return true; // BE decides
  return due > start;
}

/**
 * BE's scheme rule is a POSITIVE allowlist: absolute `https://` with a host and
 * NO embedded userinfo (`https://user:pass@host/` is rejected — the credentials
 * would be stored in plaintext and the userinfo can disguise the real host).
 * `http:`, `javascript:`, `data:` and `file:` all fail.
 */
export function isHttpsUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return false;
  }
  return (
    parsed.protocol === "https:" &&
    parsed.hostname.length > 0 &&
    parsed.username === "" &&
    parsed.password === ""
  );
}

/**
 * `<input type="datetime-local">` value → the RFC3339 instant the wire wants.
 *
 * A blank field is `null` (= clear / no limit), which is a REAL value on the
 * three-state PATCH body, not "unchanged". An unparseable value also degrades
 * to `null` rather than producing an `Invalid Date` ISO throw at the boundary.
 */
export function toIsoInstant(localValue: string | null): string | null {
  if (!localValue || localValue.trim() === "") return null;
  const ms = Date.parse(localValue);
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toISOString();
}

/**
 * The inverse: an ISO instant → the LOCAL `datetime-local` value that renders
 * the same wall-clock time the row displays. Built field by field because
 * `toISOString()` would shift a non-UTC user back to UTC and silently move the
 * time they are about to edit.
 */
export function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return "";
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
