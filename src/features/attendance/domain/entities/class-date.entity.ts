/** A homeroom class' daily roll-call key — no period/subject axis on the real
 *  wire (ADR `0058`). `className` is intentionally NOT carried here: the real
 *  `GET .../attendance` response has no class-name field, and the screen
 *  already has the full class list (`ClassSummary[]`) to resolve a display
 *  name from `classId` — duplicating it here would risk a stale/second value. */
export interface ClassDate {
  classId: string;
  date: string; // YYYY-MM-DD
}
