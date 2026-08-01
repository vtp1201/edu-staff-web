/**
 * A child in the parent's roster, used by the parent timetable child-picker.
 * Feature-local (no cross-feature import of grades' ChildSummary, per plan
 * decision 6 — the two features resolve "my children" independently until BE
 * `core`/`iam` expose a shared endpoint).
 */
export interface TimetableChild {
  childId: string;
  /**
   * Display name — UNAVAILABLE in real mode (ask #20 residual gap: no
   * directory/IAM endpoint any PARENT can call resolves a student's name;
   * ground-truthed against US-E18.23, not a client-side bug). Mock fixtures
   * always supply this (no mock-mode UI change). Presentation MUST fall back
   * to an ordinal label when absent — never render `undefined`/blank.
   */
  name?: string;
  /**
   * 1-based position in the parent's roster, assigned by a STABLE sort (wire
   * `linkId` ascending) — NEVER raw array/response order, which the wire does
   * not guarantee stable across refetches. Always present (mock and real).
   * Drives the "Con thứ N" / "Child N" fallback label AND (via the mapper, not
   * the component) the avatar-digit fallback.
   */
  ordinal: number;
  /**
   * Stable class identifier. Omitted together with `className` — BE cannot
   * distinguish "no current enrollment" from a transient enrichment-read
   * failure, so both are treated as equivalent "no class yet" states
   * (US-148 D5). NOT used to fetch the timetable any more: the by-member
   * endpoint is keyed by `childId` (US-E18.26).
   */
  classId?: string;
  className?: string;
  /**
   * Required — the mapper ALWAYS computes a value: 2-char initials of `name`
   * when present, else the ordinal digit as a string (e.g. `"1"`). Keeps the
   * picker's avatar render (`{child.avatar}`) unchanged in shape.
   */
  avatar: string;
  /** Semantic color-identity key → presentation maps to a design token. */
  color: TimetableChildColor;
}

export type TimetableChildColor =
  | "primary"
  | "success"
  | "warning"
  | "error"
  | "purple"
  | "teal";
