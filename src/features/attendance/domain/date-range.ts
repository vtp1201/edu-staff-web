/** Pure date-range helpers shared by the history use-case's bounded clamp
 *  (domain) and the repository's fan-out (infrastructure may import domain).
 *  ISO `YYYY-MM-DD` strings only, UTC-anchored so day-math is deterministic. */

export function daysInclusive(from: string, to: string): number {
  const fromMs = Date.parse(`${from}T00:00:00Z`);
  const toMs = Date.parse(`${to}T00:00:00Z`);
  return Math.round((toMs - fromMs) / 86_400_000) + 1;
}

export function enumerateDates(from: string, to: string): string[] {
  const fromMs = Date.parse(`${from}T00:00:00Z`);
  const toMs = Date.parse(`${to}T00:00:00Z`);
  const dates: string[] = [];
  for (let t = fromMs; t <= toMs; t += 86_400_000) {
    dates.push(new Date(t).toISOString().slice(0, 10));
  }
  return dates;
}
