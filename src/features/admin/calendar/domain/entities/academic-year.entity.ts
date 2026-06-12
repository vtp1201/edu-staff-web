import type { Term } from "./term.entity";

export interface AcademicYear {
  id: string;
  /** Display label, e.g. `2025–2026`. */
  label: string;
  /** Exactly one year is the current/active year. */
  isActive: boolean;
  terms: Term[];
}
