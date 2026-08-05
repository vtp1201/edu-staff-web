/**
 * Pure validation for a required free-text reason (US-E18.44). Extracted from
 * {@link ReasonConfirmDialog} so the repo's node-env Vitest can prove the rules
 * without a DOM (Radix portal content does not render in static markup) — the
 * dialog's wiring is proven in Storybook.
 *
 * Mirrors `RejectColumnEntryUseCase`'s domain rules exactly: trim first, empty
 * is `required`, over the cap is `too-long`. Client-side validation is defense
 * in depth — the server re-validates and 422s regardless.
 */
export type ReasonValidity = "ok" | "required" | "too-short" | "too-long";

/**
 * @param minLength opt-in floor for a reason that must be ACTIONABLE (e.g. the
 *   grade-revision note that tells a teacher what to fix). Omitted ⇒ any
 *   non-empty reason passes, which is what the per-cell grade reject wants.
 *   An EMPTY reason is always `required`, never `too-short`: "you must say
 *   something" and "say more than that" are different messages.
 */
export function validateReason(
  reason: string,
  /** server-enforced cap; `undefined` when the field has no documented maximum */
  maxLength: number | undefined,
  minLength?: number,
): ReasonValidity {
  const trimmed = reason.trim();
  if (trimmed.length === 0) return "required";
  if (minLength !== undefined && trimmed.length < minLength) return "too-short";
  if (maxLength !== undefined && trimmed.length > maxLength) return "too-long";
  return "ok";
}
