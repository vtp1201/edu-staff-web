import type { WeeklyTimetable } from "../../domain/entities/weekly-timetable.entity";
import { assignSubjectColors } from "../../domain/subject-color";
import type { WeeklyTimetableResponseDto } from "../dtos/weekly-timetable-response.dto";

/**
 * Mock-fixture mapper. Colours are assigned per WEEK by
 * `domain/subject-color.ts`, exactly as in the real mapper.
 */
export function mapWeeklyTimetable(
  dto: WeeklyTimetableResponseDto,
): WeeklyTimetable {
  const slots: WeeklyTimetable["slots"] = {};
  const colors = assignSubjectColors(
    Object.values(dto.slots).flatMap((periods) =>
      Object.values(periods).map((slot) => slot?.subjectId ?? ""),
    ),
  );
  for (const [dayKey, periods] of Object.entries(dto.slots)) {
    const dayIndex = Number(dayKey);
    slots[dayIndex] = {};
    for (const [periodKey, slot] of Object.entries(periods)) {
      const periodNumber = Number(periodKey);
      slots[dayIndex][periodNumber] = slot
        ? {
            subjectId: slot.subjectId,
            subjectName: slot.subjectName,
            subjectColorToken: colors.get(slot.subjectId) ?? "muted",
            teacherName: slot.teacherName,
            room: slot.room,
            className: slot.className,
            teacherMemberId: slot.teacherMemberId,
            startTime: slot.startTime,
            endTime: slot.endTime,
          }
        : null;
    }
  }
  return { classId: dto.classId, className: dto.className, slots };
}
