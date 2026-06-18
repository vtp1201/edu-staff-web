import type { TeachingPlan } from "../../domain/entities/teaching-plan.entity";
import type { TeachingPlanVM } from "./teaching-plan-screen.i-vm";

export interface NameMaps {
  subjects: Record<string, string>;
  classes: Record<string, string>;
  teachers?: Record<string, string>;
}

/** Pure entity → VM mapper (testable; no IO). */
export function buildTeachingPlanVM(
  plan: TeachingPlan,
  names: NameMaps,
): TeachingPlanVM {
  return {
    id: plan.id,
    subjectId: plan.subjectId,
    subjectName: names.subjects[plan.subjectId] ?? plan.subjectId,
    classId: plan.classId,
    className: names.classes[plan.classId] ?? plan.classId,
    term: plan.term,
    status: plan.status,
    weeks: plan.weeks,
    periodsPerWeek: plan.periodsPerWeek,
    cells: plan.cells.map((c) => ({
      week: c.week,
      period: c.period,
      title: c.title,
      learningObjective: c.learningObjective,
      notes: c.notes,
    })),
    rejectionReason: plan.rejectionReason,
    teacherName: names.teachers?.[plan.teacherMemberId],
  };
}
