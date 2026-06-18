import type { TeachingPlanStatus } from "../../domain/entities/teaching-plan-status.entity";

export interface PlanCellVM {
  week: number;
  period: number;
  title: string;
  learningObjective?: string;
  notes?: string;
}

export interface TeachingPlanVM {
  id: string;
  subjectId: string;
  subjectName: string;
  classId: string;
  className: string;
  term: string;
  status: TeachingPlanStatus;
  weeks: number;
  periodsPerWeek: number;
  cells: PlanCellVM[];
  rejectionReason?: string;
  /** Present in the principal review view. */
  teacherName?: string;
}

export interface SelectorOptionVM {
  id: string;
  name: string;
}

export interface SelectorVM {
  subjects: SelectorOptionVM[];
  classes: SelectorOptionVM[];
  terms: string[];
  selectedSubjectId: string;
  selectedClassId: string;
  selectedTerm: string;
}

export interface TeachingPlanScreenVM {
  plan: TeachingPlanVM | null;
  selector: SelectorVM;
  isPrincipal: boolean;
  /** Principal only — pending approval queue. */
  pendingPlans?: TeachingPlanVM[];
}
