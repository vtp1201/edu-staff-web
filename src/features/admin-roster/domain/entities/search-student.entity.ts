/** A candidate student for the Add panel (not in the current class). */
export interface SearchStudent {
  id: string;
  name: string;
  /** The class this student is currently enrolled in; null when unassigned. */
  currentClassId: string | null;
  /** Display name of the current class; null when unassigned. */
  currentClassName: string | null;
}
