import type { PlanCell } from "../entities/plan-cell.entity";
import type { TeachingPlan } from "../entities/teaching-plan.entity";

/** Filter for the principal "pending plans" queue. */
export interface PendingPlansFilter {
  teacherMemberId?: string;
  subjectId?: string;
  classId?: string;
}

/**
 * Persistence boundary for teaching plans (DIP).
 * Implementations throw a {@link TeachingPlanFailure} on error.
 */
export interface ITeachingPlanRepository {
  getTeachingPlan(
    subjectId: string,
    classId: string,
    term: string,
  ): Promise<TeachingPlan | null>;
  savePlanCell(planId: string, cell: PlanCell): Promise<TeachingPlan>;
  submitPlan(planId: string): Promise<TeachingPlan>;
  approvePlan(planId: string): Promise<TeachingPlan>;
  rejectPlan(planId: string, reason: string): Promise<TeachingPlan>;
  listPendingPlans(filter: PendingPlansFilter): Promise<TeachingPlan[]>;
}
