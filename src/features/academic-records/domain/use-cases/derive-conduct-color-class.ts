import type { ConductGrade } from "../entities/academic-record.entity";

/**
 * Utility that maps a conduct grade to a Tailwind color class.
 *
 * NOTE: The screen renderer (academic-record-table.tsx) uses StatusBadge
 * with CONDUCT_TONE for accessible conduct display (icon + text + color).
 * This function is kept as a utility for non-badge rendering contexts
 * such as PDF/print export. Do not use it as a substitute for StatusBadge
 * in interactive screens.
 *
 * Maps a conduct grade to a semantic text-color token. Null (no grade yet)
 * reads as muted. TrungBinh uses the warning foreground token (the warning
 * text token does not exist; warning-foreground is the a11y-safe pairing).
 */
export function deriveConductColorClass(grade: ConductGrade | null): string {
  switch (grade) {
    case "Tot":
      return "text-edu-success-text";
    case "Kha":
      return "text-primary";
    case "TrungBinh":
      return "text-edu-warning-foreground";
    case "Yeu":
      return "text-edu-error-text";
    default:
      return "text-muted-foreground";
  }
}
