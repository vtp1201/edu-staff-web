import type { StudentAbsenceEntity } from "../../domain/entities/student-absence.entity";
import type { StudentAbsenceResponseDto } from "../dtos/student-absence-response.dto";

/**
 * DTO → entity (pure, 1:1).
 *
 * Unlike `staff-discipline`'s mapper this one does NOT resolve display names:
 * roster resolution happens at the PRESENTATION layer (`saStudentOf`), because
 * the join is a trivial `find()` over a small array already passed to the client
 * component and threading the roster through every mapper call would buy nothing
 * (plan.md §3 decision).
 *
 * The one normalisation: a blank `reason` becomes `undefined`, so "no reason" is
 * a single representable state instead of `""` vs `undefined` vs absent.
 */
export function toStudentAbsenceEntity(
  dto: StudentAbsenceResponseDto,
): StudentAbsenceEntity {
  const reason = dto.reason?.trim();
  return {
    classId: dto.classId,
    studentMemberId: dto.studentMemberId,
    date: dto.date,
    reason: reason && reason.length > 0 ? reason : undefined,
    excused: dto.excused,
    state: dto.state,
    recordedByMemberId: dto.recordedByMemberId,
    flaggedByMemberId: dto.flaggedByMemberId,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}
