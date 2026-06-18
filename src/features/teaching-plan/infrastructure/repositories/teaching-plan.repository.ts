import "server-only";
import type { AxiosInstance } from "axios";
import { TEACHING_PLAN_EP } from "@/bootstrap/endpoint/teaching-plan.endpoint";
import { errorCodeOf, statusOf } from "@/bootstrap/lib/api-envelope";
import type { PlanCell } from "../../domain/entities/plan-cell.entity";
import type { TeachingPlan } from "../../domain/entities/teaching-plan.entity";
import type { TeachingPlanFailure } from "../../domain/failures/teaching-plan.failure";
import type {
  ITeachingPlanRepository,
  PendingPlansFilter,
} from "../../domain/repositories/i-teaching-plan.repository";
import type { TeachingPlanResponseDto } from "../dtos/teaching-plan-response.dto";
import { mapToTeachingPlan } from "../mappers/teaching-plan.mapper";

/**
 * Map a normalised ApiError to the teaching-plan failure union (US-E11.4).
 * Branch on error.code (UPPER_SNAKE) / status, never on message.
 */
export function toFailure(err: unknown): TeachingPlanFailure {
  const code = errorCodeOf(err);
  const status = statusOf(err);

  if (code === "NETWORK_ERROR" || status === undefined || status === 0) {
    return { type: "network-error" };
  }
  if (code === "TEACHING_PLAN_NOT_FOUND" || status === 404) {
    return { type: "not-found" };
  }
  if (code === "TEACHING_PLAN_NOT_DRAFT") {
    return { type: "not-draft" };
  }
  if (code === "TEACHING_PLAN_NOT_SUBMITTED") {
    return { type: "not-submitted" };
  }
  if (code === "TEACHING_PLAN_INSUFFICIENT_CELLS") {
    return { type: "insufficient-cells" };
  }
  if (code === "TEACHING_PLAN_INVALID_REJECTION_REASON") {
    return { type: "invalid-rejection-reason" };
  }
  if (code === "FORBIDDEN" || code === "UNAUTHORIZED" || status === 403) {
    return { type: "unauthorized" };
  }
  return { type: "unknown", message: code };
}

/**
 * Real HTTP repository (core service). Wired behind USE_MOCK in the DI factory
 * until the `core` teaching-plans endpoints exist (mock-first, decision 0014).
 */
export class TeachingPlanRepository implements ITeachingPlanRepository {
  constructor(private readonly http: AxiosInstance) {}

  async getTeachingPlan(
    subjectId: string,
    classId: string,
    term: string,
  ): Promise<TeachingPlan | null> {
    try {
      const list = (await this.http.get(TEACHING_PLAN_EP.list, {
        params: { subjectId, classId, term },
      })) as unknown as TeachingPlanResponseDto[];
      const dto = list[0];
      return dto ? mapToTeachingPlan(dto) : null;
    } catch (err) {
      const failure = toFailure(err);
      if (failure.type === "not-found") return null;
      throw failure;
    }
  }

  async savePlanCell(planId: string, cell: PlanCell): Promise<TeachingPlan> {
    try {
      const dto = (await this.http.post(
        TEACHING_PLAN_EP.cells(planId),
        cell,
      )) as unknown as TeachingPlanResponseDto;
      return mapToTeachingPlan(dto);
    } catch (err) {
      throw toFailure(err);
    }
  }

  async submitPlan(planId: string): Promise<TeachingPlan> {
    try {
      const dto = (await this.http.post(
        TEACHING_PLAN_EP.submit(planId),
        {},
      )) as unknown as TeachingPlanResponseDto;
      return mapToTeachingPlan(dto);
    } catch (err) {
      throw toFailure(err);
    }
  }

  async approvePlan(planId: string): Promise<TeachingPlan> {
    try {
      const dto = (await this.http.post(
        TEACHING_PLAN_EP.approve(planId),
        {},
      )) as unknown as TeachingPlanResponseDto;
      return mapToTeachingPlan(dto);
    } catch (err) {
      throw toFailure(err);
    }
  }

  async rejectPlan(planId: string, reason: string): Promise<TeachingPlan> {
    try {
      const dto = (await this.http.post(TEACHING_PLAN_EP.reject(planId), {
        reason,
      })) as unknown as TeachingPlanResponseDto;
      return mapToTeachingPlan(dto);
    } catch (err) {
      throw toFailure(err);
    }
  }

  async listPendingPlans(filter: PendingPlansFilter): Promise<TeachingPlan[]> {
    try {
      const list = (await this.http.get(TEACHING_PLAN_EP.list, {
        params: { status: "SUBMITTED", ...filter },
      })) as unknown as TeachingPlanResponseDto[];
      return list.map(mapToTeachingPlan);
    } catch (err) {
      throw toFailure(err);
    }
  }
}
