import type { TimetableChildColor } from "@/features/timetable/domain/entities/timetable-child.entity";
import type { SubjectColorToken } from "@/features/timetable/domain/entities/timetable-slot.entity";

/**
 * SubjectColorToken → literal Tailwind classes (full strings so the Tailwind v4
 * scanner detects them; no interpolation). Every class maps to an existing token
 * in `src/app/tokens.css`.
 *
 * `text` intentionally uses the AA-safe `-text` / `-accessible` variant of each
 * hue (ADR 0049/0050) — the plain brand hue fails ≥4.5:1 as literal text on the
 * light tint (see `features/lms/presentation/tone.ts` precedent). `bg`/`border`
 * keep the brand hue at low alpha (tint only, decorative — no contrast floor).
 *   - info has no dedicated `-text` token → its accessible in-family blue is
 *     `--edu-primary-accessible` (#4468e0, 4.88:1).
 *   - muted (GDCD) text uses `--edu-text-secondary` (#5A6A85, 5.48:1), NOT
 *     `--edu-text-muted` (#8898A9, 2.95:1) which is decorative-only per ADR 0049.
 *   - geo is a documented placeholder on `--edu-text-secondary` pending a
 *     dedicated geo subject-color token ADR (fast-follow).
 */
export interface SubjectClasses {
  /** Soft tint background (~15% alpha). */
  bg: string;
  /** 1px surrounding border (~30% alpha). */
  border: string;
  /** Solid 3px left accent (a UI element — passes ≥3:1 against the light tint). */
  accent: string;
  /** Solid dot/swatch background for the legend. */
  dot: string;
  /** AA-safe text color (≥4.5:1 on the tint). */
  text: string;
}

export const SUBJECT_COLOR_CLASSES: Record<SubjectColorToken, SubjectClasses> =
  {
    primary: {
      bg: "bg-edu-primary/15",
      border: "border-edu-primary/30",
      accent: "border-l-edu-primary",
      dot: "bg-edu-primary",
      text: "text-edu-primary-accessible",
    },
    "primary-dark": {
      bg: "bg-edu-primary-dark/15",
      border: "border-edu-primary-dark/30",
      accent: "border-l-edu-primary-dark",
      dot: "bg-edu-primary-dark",
      text: "text-edu-primary-accessible",
    },
    purple: {
      bg: "bg-edu-purple/15",
      border: "border-edu-purple/30",
      accent: "border-l-edu-purple",
      dot: "bg-edu-purple",
      text: "text-edu-purple-text",
    },
    success: {
      bg: "bg-edu-success/15",
      border: "border-edu-success/30",
      accent: "border-l-edu-success",
      dot: "bg-edu-success",
      text: "text-edu-success-text",
    },
    warning: {
      bg: "bg-edu-warning/15",
      border: "border-edu-warning/30",
      accent: "border-l-edu-warning",
      dot: "bg-edu-warning",
      // warning-text is only AA at ≥14px bold; cell (12px) + legend (11.5px) are
      // small/non-bold → warning-foreground (11.42:1) per design-system.md (ADR 0049).
      text: "text-edu-warning-foreground",
    },
    error: {
      bg: "bg-edu-error/15",
      border: "border-edu-error/30",
      accent: "border-l-edu-error",
      dot: "bg-edu-error",
      text: "text-edu-error-text",
    },
    teal: {
      bg: "bg-edu-teal/15",
      border: "border-edu-teal/30",
      accent: "border-l-edu-teal",
      dot: "bg-edu-teal",
      text: "text-edu-teal-text",
    },
    info: {
      bg: "bg-edu-info/15",
      border: "border-edu-info/30",
      accent: "border-l-edu-info",
      dot: "bg-edu-info",
      // info has no accessible -text token; primary-accessible is the in-family AA blue.
      text: "text-edu-primary-accessible",
    },
    muted: {
      bg: "bg-edu-text-muted/15",
      border: "border-edu-text-muted/30",
      accent: "border-l-edu-text-muted",
      dot: "bg-edu-text-muted",
      // meaningful legend text must be ≥4.5:1 → secondary, not muted (ADR 0049).
      text: "text-edu-text-secondary",
    },
    // TODO: fast-follow ADR for a dedicated geo subject-color token (#946000).
    // Placeholder on the accessible secondary token — never a raw hex.
    geo: {
      bg: "bg-edu-text-secondary/15",
      border: "border-edu-text-secondary/30",
      accent: "border-l-edu-text-secondary",
      dot: "bg-edu-text-secondary",
      text: "text-edu-text-secondary",
    },
  };

/** Child-picker accent color → literal classes (border + soft tint + avatar bg). */
export interface ChildColorClasses {
  border: string;
  tint: string;
  avatarBg: string;
}

export const CHILD_COLOR_CLASSES: Record<
  TimetableChildColor,
  ChildColorClasses
> = {
  primary: {
    border: "border-edu-primary",
    tint: "bg-edu-primary/10",
    avatarBg: "bg-edu-primary",
  },
  success: {
    border: "border-edu-success",
    tint: "bg-edu-success/10",
    avatarBg: "bg-edu-success",
  },
  warning: {
    border: "border-edu-warning",
    tint: "bg-edu-warning/10",
    avatarBg: "bg-edu-warning",
  },
  error: {
    border: "border-edu-error",
    tint: "bg-edu-error/10",
    avatarBg: "bg-edu-error",
  },
  purple: {
    border: "border-edu-purple",
    tint: "bg-edu-purple/10",
    avatarBg: "bg-edu-purple",
  },
  teal: {
    border: "border-edu-teal",
    tint: "bg-edu-teal/10",
    avatarBg: "bg-edu-teal",
  },
};
