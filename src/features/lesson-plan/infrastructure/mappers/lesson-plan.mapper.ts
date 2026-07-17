import type { LessonPlanEntity } from "../../domain/entities/lesson-plan.entity";
import type { LessonPlanResponseDto } from "../dtos/lesson-plan-response.dto";

/**
 * DTO → entity. 1:1 field map (wire is already camelCase). `publishedAt` stays
 * `undefined` when the wire omits the key (DRAFT) — treated as "not published",
 * never coerced to `""`. `tags` is normalized to `[]` defensively (the server
 * already sends `[]` not null, but a missing key must never crash a `.map`).
 */
export function mapLessonPlan(dto: LessonPlanResponseDto): LessonPlanEntity {
  return {
    planId: dto.planId,
    teacherId: dto.teacherId,
    subjectId: dto.subjectId,
    gradeLevel: dto.gradeLevel,
    title: dto.title,
    objectives: dto.objectives ?? "",
    contentOutline: dto.contentOutline ?? "",
    activities: dto.activities ?? "",
    assessmentMethod: dto.assessmentMethod ?? "",
    status: dto.status,
    tags: dto.tags ?? [],
    // Key-absence → undefined (not "not published as empty string").
    publishedAt: dto.publishedAt ? dto.publishedAt : undefined,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}
