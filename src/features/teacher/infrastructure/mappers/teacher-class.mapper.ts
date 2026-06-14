import type { TeacherRosterStudent } from "../../domain/entities/teacher-roster-student.entity";
import type { ClassRosterItemDto } from "../dtos/class-roster-response.dto";

/** Maps a class-roster enrollment DTO to the read-only TeacherRosterStudent.
 *  `displayName` falls back to the member id when BE omits it (mock-first);
 *  `status` normalizes to the entity union, defaulting to "active". */
export function toTeacherRosterStudent(
  dto: ClassRosterItemDto,
): TeacherRosterStudent {
  return {
    enrollmentId: dto.enrollmentId,
    studentMemberId: dto.studentMemberId,
    displayName: dto.displayName?.trim() || dto.studentMemberId,
    academicYearLabel: dto.academicYearLabel,
    enrolledAt: dto.enrolledAt,
    status: dto.status === "transferred" ? "transferred" : "active",
  };
}
