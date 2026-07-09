/**
 * A child in the parent's roster, used by the parent timetable child-picker.
 * Feature-local (no cross-feature import of grades' ChildSummary, per plan
 * decision 6 — the two features resolve "my children" independently until BE
 * `core`/`iam` expose a shared endpoint).
 */
export interface TimetableChild {
  childId: string;
  name: string;
  /** Stable class identifier used to fetch the timetable (may differ from the
   * human-readable className once BE `core` ships). */
  classId: string;
  className: string;
  /** 2-char initials for the avatar fallback. */
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
