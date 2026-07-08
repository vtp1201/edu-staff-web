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
