/**
 * Relative + absolute time from an ISO timestamp (spec.md [ASSUMPTION]:
 * relative-time is computed client-side via Intl, NOT an i18n key). Pure and
 * clock-injectable so it is deterministic in tests/stories.
 */
export function formatRelativeTime(
  iso: string,
  locale: string,
  now: number = Date.now(),
): string {
  const then = new Date(iso).getTime();
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const diffSec = Math.round((then - now) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(Math.round(diffSec), "second");
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 2592000) return rtf.format(Math.round(diffSec / 86400), "day");
  return rtf.format(Math.round(diffSec / 2592000), "month");
}

export function formatAbsoluteTime(iso: string, locale: string): string {
  return new Date(iso).toLocaleString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
