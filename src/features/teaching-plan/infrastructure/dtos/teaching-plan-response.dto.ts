import type { TeachingPlanStatus } from "../../domain/entities/teaching-plan-status.entity";

/** Wire shape of one plan cell (camelCase per api-integration rule). */
export interface PlanCellResponseDto {
  week: number;
  period: number;
  title: string;
  learningObjective?: string;
  notes?: string;
}

/** Wire shape of a teaching plan returned by the core service. */
export interface TeachingPlanResponseDto {
  id: string;
  subjectId: string;
  classId: string;
  term: string;
  status: TeachingPlanStatus;
  teacherMemberId: string;
  rejectionReason?: string;
  weeks: number;
  periodsPerWeek: number;
  cells: PlanCellResponseDto[];
  createdAt: string;
  updatedAt: string;
}
