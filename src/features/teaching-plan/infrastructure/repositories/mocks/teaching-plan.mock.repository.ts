import "server-only";
import { mockDelay } from "@/bootstrap/lib/mock";
import type { PlanCell } from "../../../domain/entities/plan-cell.entity";
import type { TeachingPlan } from "../../../domain/entities/teaching-plan.entity";
import type { TeachingPlanFailure } from "../../../domain/failures/teaching-plan.failure";
import type {
  ITeachingPlanRepository,
  PendingPlansFilter,
} from "../../../domain/repositories/i-teaching-plan.repository";
import { MOCK_TEACHING_PLANS } from "./fixtures";

const MIN_FILL_RATIO = 0.5;

// Module-level mutable in-memory state (reset on each `new` for determinism).
let _plans: TeachingPlan[] = structuredClone(MOCK_TEACHING_PLANS);

function nowIso(): string {
  return new Date().toISOString();
}

export class MockTeachingPlanRepository implements ITeachingPlanRepository {
  constructor() {
    _plans = structuredClone(MOCK_TEACHING_PLANS);
  }

  private findById(planId: string): TeachingPlan {
    const plan = _plans.find((p) => p.id === planId);
    if (!plan) {
      const failure: TeachingPlanFailure = { type: "not-found" };
      throw failure;
    }
    return plan;
  }

  async getTeachingPlan(
    subjectId: string,
    classId: string,
    term: string,
  ): Promise<TeachingPlan | null> {
    await mockDelay();
    const plan = _plans.find(
      (p) =>
        p.subjectId === subjectId && p.classId === classId && p.term === term,
    );
    return plan ? structuredClone(plan) : null;
  }

  async savePlanCell(planId: string, cell: PlanCell): Promise<TeachingPlan> {
    await mockDelay();
    const plan = this.findById(planId);
    if (plan.status !== "DRAFT" && plan.status !== "REJECTED") {
      const failure: TeachingPlanFailure = { type: "not-draft" };
      throw failure;
    }
    const existing = plan.cells.findIndex(
      (c) => c.week === cell.week && c.period === cell.period,
    );
    if (existing >= 0) {
      plan.cells[existing] = cell;
    } else {
      plan.cells.push(cell);
    }
    plan.updatedAt = nowIso();
    return structuredClone(plan);
  }

  async submitPlan(planId: string): Promise<TeachingPlan> {
    await mockDelay();
    const plan = this.findById(planId);
    if (plan.status !== "DRAFT" && plan.status !== "REJECTED") {
      const failure: TeachingPlanFailure = { type: "not-draft" };
      throw failure;
    }
    const required = Math.ceil(
      plan.weeks * plan.periodsPerWeek * MIN_FILL_RATIO,
    );
    if (plan.cells.length < required) {
      const failure: TeachingPlanFailure = { type: "insufficient-cells" };
      throw failure;
    }
    plan.status = "SUBMITTED";
    plan.rejectionReason = undefined;
    plan.updatedAt = nowIso();
    return structuredClone(plan);
  }

  async approvePlan(planId: string): Promise<TeachingPlan> {
    await mockDelay();
    const plan = this.findById(planId);
    if (plan.status !== "SUBMITTED") {
      const failure: TeachingPlanFailure = { type: "not-submitted" };
      throw failure;
    }
    plan.status = "APPROVED";
    plan.updatedAt = nowIso();
    return structuredClone(plan);
  }

  async rejectPlan(planId: string, reason: string): Promise<TeachingPlan> {
    await mockDelay();
    const plan = this.findById(planId);
    if (plan.status !== "SUBMITTED") {
      const failure: TeachingPlanFailure = { type: "not-submitted" };
      throw failure;
    }
    plan.status = "REJECTED";
    plan.rejectionReason = reason;
    plan.updatedAt = nowIso();
    return structuredClone(plan);
  }

  async listPendingPlans(filter: PendingPlansFilter): Promise<TeachingPlan[]> {
    await mockDelay();
    return _plans
      .filter((p) => p.status === "SUBMITTED")
      .filter((p) =>
        filter.teacherMemberId
          ? p.teacherMemberId === filter.teacherMemberId
          : true,
      )
      .filter((p) =>
        filter.subjectId ? p.subjectId === filter.subjectId : true,
      )
      .filter((p) => (filter.classId ? p.classId === filter.classId : true))
      .map((p) => structuredClone(p));
  }
}
