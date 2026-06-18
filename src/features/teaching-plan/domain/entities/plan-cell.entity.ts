/**
 * One cell of a teaching plan grid (a lesson scheduled at week × period).
 * `week` and `period` are 1-based and together identify the cell uniquely.
 */
export interface PlanCell {
  week: number;
  period: number;
  title: string;
  learningObjective?: string;
  notes?: string;
}
