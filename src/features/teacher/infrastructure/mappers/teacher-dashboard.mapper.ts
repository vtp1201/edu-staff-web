import type { TeacherClass } from "../../domain/entities/teacher-class.entity";
import type { TeacherClassResponseDto } from "../dtos/teacher-class-response.dto";

/** Maps a class DTO + its computed enrollment count to the TeacherClass entity.
 *  `currentUserId` (from JWT `sub`) drives the GVCN flag; null → non-homeroom. */
export function toTeacherClass(
  dto: TeacherClassResponseDto,
  studentCount: number,
  currentUserId: string | null,
): TeacherClass {
  return {
    id: dto.classId,
    name: dto.name,
    gradeLevel: dto.gradeLevel,
    studentCount,
    isHomeroom:
      currentUserId != null &&
      dto.homeroomTeacherId != null &&
      dto.homeroomTeacherId === currentUserId,
    academicYearLabel: dto.academicYearLabel,
  };
}

/** Schedule status → presentation StatusBadge tone key (pure, unit-tested). */
export function mapScheduleStatusTone(
  status: "done" | "live" | "upcoming",
): "muted" | "success" | "warning" {
  switch (status) {
    case "done":
      return "muted";
    case "live":
      return "success";
    case "upcoming":
      return "warning";
  }
}

/** Periods 1–5 are morning, 6+ are afternoon (school-day convention). */
export function periodSessionKey(period: number): "morning" | "afternoon" {
  return period <= 5 ? "morning" : "afternoon";
}
