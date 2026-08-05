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
export type ReasonValidity = "ok" | "required" | "too-long";

export function validateReason(
  reason: string,
  maxLength: number,
): ReasonValidity {
  const trimmed = reason.trim();
  if (trimmed.length === 0) return "required";
  if (trimmed.length > maxLength) return "too-long";
  return "ok";
}
