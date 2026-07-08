import type { CourseTone } from "@/features/lms/domain/entities/course.entity";

/**
 * Course-tone → literal Tailwind class lookups. Full class strings (not
 * `bg-edu-${tone}`) so the Tailwind v4 scanner detects them at build time.
 * All classes map to existing tokens in `src/app/tokens.css`.
 */
export const TONE_TEXT: Record<CourseTone, string> = {
  primary: "text-edu-primary",
  success: "text-edu-success",
  warning: "text-edu-warning",
  purple: "text-edu-purple",
  teal: "text-edu-teal",
  error: "text-edu-error",
};

/**
 * Tone → AA-safe TEXT color. The base `TONE_TEXT` map above uses the full brand
 * hues (bright), which FAIL WCAG AA contrast as literal text on white/bg-edu-bg
 * (5 of 6 tones). Use THIS map wherever a tone drives readable text/number/icon
 * color. Each entry maps to an existing accessible-text token in `tokens.css`:
 *   primary → --edu-primary-accessible (#4468e0, 4.88:1 on white)
 *   success → --edu-success-text       (#007a6e, 5.24:1)
 *   warning → --edu-warning-text       (#9a6a0f, 4.73:1 on white; ADR 0046)
 *   error   → --edu-error-text         (#c0392b, 5.44:1; ADR 0049)
 *   purple  → --edu-purple-text        (#5b3d8a, 8.47:1)
 *   teal    → --edu-teal-text          (#00695c, 6.61:1)
 */
export const TONE_TEXT_ACCESSIBLE: Record<CourseTone, string> = {
  primary: "text-edu-primary-accessible",
  success: "text-edu-success-text",
  warning: "text-edu-warning-text",
  purple: "text-edu-purple-text",
  teal: "text-edu-teal-text",
  error: "text-edu-error-text",
};

export const TONE_BG: Record<CourseTone, string> = {
  primary: "bg-edu-primary",
  success: "bg-edu-success",
  warning: "bg-edu-warning",
  purple: "bg-edu-purple",
  teal: "bg-edu-teal",
  error: "bg-edu-error",
};

/** Soft tint background (≈15% alpha) for icon boxes / active highlights. */
export const TONE_TINT: Record<CourseTone, string> = {
  primary: "bg-edu-primary/15",
  success: "bg-edu-success/15",
  warning: "bg-edu-warning/15",
  purple: "bg-edu-purple/15",
  teal: "bg-edu-teal/15",
  error: "bg-edu-error/15",
};

export const TONE_BORDER: Record<CourseTone, string> = {
  primary: "border-edu-primary",
  success: "border-edu-success",
  warning: "border-edu-warning",
  purple: "border-edu-purple",
  teal: "border-edu-teal",
  error: "border-edu-error",
};
