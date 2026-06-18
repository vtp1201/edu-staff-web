import type { PlanCell } from "../../domain/entities/plan-cell.entity";
import type { TeachingPlan } from "../../domain/entities/teaching-plan.entity";
import type {
  PlanCellResponseDto,
  TeachingPlanResponseDto,
} from "../dtos/teaching-plan-response.dto";

function mapCell(dto: PlanCellResponseDto): PlanCell {
  return {
    week: dto.week,
    period: dto.period,
    title: dto.title,
    learningObjective: dto.learningObjective,
    notes: dto.notes,
  };
}

/** DTO → entity. Plain function (not a static class method). */
export function mapToTeachingPlan(dto: TeachingPlanResponseDto): TeachingPlan {
  return {
    id: dto.id,
    subjectId: dto.subjectId,
    classId: dto.classId,
    term: dto.term,
    status: dto.status,
    teacherMemberId: dto.teacherMemberId,
    rejectionReason: dto.rejectionReason,
    weeks: dto.weeks,
    periodsPerWeek: dto.periodsPerWeek,
    cells: (dto.cells ?? []).map(mapCell),
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}
