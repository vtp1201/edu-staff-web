import type { PeriodLog } from "../../domain/entities/period-log.entity";
import type { PeriodPrep } from "../../domain/entities/period-prep.entity";
import type { PeriodLogResponseDto } from "../dtos/period-log-response.dto";
import type { PeriodPrepResponseDto } from "../dtos/period-prep-response.dto";

/**
 * Wire → entity. Both shapes are already 1:1 with their entity (no display
 * transform, no id→name join, no invented field): the mappers exist so the
 * entity stays free of the DTO type and a future contract drift has ONE place
 * to absorb it. `materials` is copied (not aliased) so a mutation on the entity
 * can never write back into a cached DTO.
 */
export function toPeriodLog(dto: PeriodLogResponseDto): PeriodLog {
  return {
    classId: dto.classId,
    date: dto.date,
    periodNumber: dto.periodNumber,
    termId: dto.termId,
    dayOfWeek: dto.dayOfWeek,
    subjectId: dto.subjectId,
    teacherMemberId: dto.teacherMemberId,
    lessonTitle: dto.lessonTitle,
    remark: dto.remark ?? "",
    grade: dto.grade,
    absentCount: dto.absentCount,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function toPeriodPrep(dto: PeriodPrepResponseDto): PeriodPrep {
  return {
    classId: dto.classId,
    date: dto.date,
    periodNumber: dto.periodNumber,
    termId: dto.termId,
    dayOfWeek: dto.dayOfWeek,
    subjectId: dto.subjectId,
    teacherMemberId: dto.teacherMemberId,
    note: dto.note ?? "",
    lessonPlanId: dto.lessonPlanId ?? null,
    materials: (dto.materials ?? []).map((m) => ({
      title: m.title,
      url: m.url,
    })),
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}
