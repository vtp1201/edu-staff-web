import type { ConductGrade } from "../entities/academic-record.entity";

/**
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
