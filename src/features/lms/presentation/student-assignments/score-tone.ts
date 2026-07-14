import type { StatusTone } from "@/components/shared/status-badge";

/**
 * Score → design-system tone (normalized to a 10-point scale): ≥8 success,
 * <5 error, else primary (text-primary). `null` (ungraded) → muted. A tiny
 * local helper — NOT imported cross-feature from `exam` (YAGNI, plan §1).
 */
export function scoreTone(
  score: number | null,
  max: number | null,
): StatusTone {
  if (score === null || max === null || max <= 0) return "muted";
  const norm = (score / max) * 10;
  if (norm >= 8) return "success";
  if (norm < 5) return "error";
  return "primary";
}
