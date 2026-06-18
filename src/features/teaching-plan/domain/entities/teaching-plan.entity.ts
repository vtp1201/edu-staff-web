import type { PlanCell } from "./plan-cell.entity";
import type { TeachingPlanStatus } from "./teaching-plan-status.entity";

/**
 * A weekly teaching plan (Phân phối chương trình — PPCT) for a
 * subject × class × term, composed by a teacher and approved by a principal.
 */
export interface TeachingPlan {
  id: string;
  subjectId: string;
  classId: string;
  term: string;
  status: TeachingPlanStatus;
  teacherMemberId: string;
  rejectionReason?: string;
  weeks: number;
  periodsPerWeek: number;
  cells: PlanCell[];
  createdAt: string;
  updatedAt: string;
}
