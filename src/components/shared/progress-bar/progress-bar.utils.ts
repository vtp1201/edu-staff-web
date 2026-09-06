/**
 * Pure percent derivation for {@link ProgressBar} (US-E24.6), extracted so the
 * repo's node-env Vitest can prove the edge cases without a DOM.
 *
 * A progress bar is fed by CLIENT-COMPUTED rollups (an attendance month with
 * zero recorded days, a rate over a total of 0), so `value/max` can legitimately
 * be `0/0`. Without this clamp that becomes `NaN%` in the inline width and an
 * `aria-valuenow="NaN"` — both invalid, the second an a11y defect.
 */
export function clampPercent(value: number, max = 100): number {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0;
  const pct = Math.round((value / max) * 100);
  if (pct < 0) return 0;
  return pct > 100 ? 100 : pct;
}
