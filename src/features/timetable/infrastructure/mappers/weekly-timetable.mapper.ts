import type { SubjectColorToken } from "../../domain/entities/timetable-slot.entity";
import type { WeeklyTimetable } from "../../domain/entities/weekly-timetable.entity";
import type { WeeklyTimetableResponseDto } from "../dtos/weekly-timetable-response.dto";

/**
 * subjectId → semantic color token. 9 of 10 subjects map cleanly onto existing
 * design tokens (see plan decision 4); `geo` (Địa lý, #946000 brown/gold) has no
 * equivalent token.
 * TODO: fast-follow ADR for a dedicated geo subject token — until then `geo`
 * renders on `--edu-text-secondary` (accessible placeholder, wired in
 * `presentation/timetable-view/subject-color-tokens.ts`), never a raw hex.
 */
const SUBJECT_COLOR_TABLE: Record<string, SubjectColorToken> = {
  math: "primary",
  lit: "purple",
  eng: "success",
  phys: "warning",
  chem: "error",
  bio: "teal",
  hist: "info",
  geo: "geo",
  civic: "muted",
  pe: "primary-dark",
};

function resolveColorToken(subjectId: string): SubjectColorToken {
  return SUBJECT_COLOR_TABLE[subjectId] ?? "muted";
}

export function mapWeeklyTimetable(
  dto: WeeklyTimetableResponseDto,
): WeeklyTimetable {
  const slots: WeeklyTimetable["slots"] = {};
  for (const [dayKey, periods] of Object.entries(dto.slots)) {
    const dayIndex = Number(dayKey);
    slots[dayIndex] = {};
    for (const [periodKey, slot] of Object.entries(periods)) {
      const periodNumber = Number(periodKey);
      slots[dayIndex][periodNumber] = slot
        ? {
            subjectId: slot.subjectId,
            subjectName: slot.subjectName,
            subjectColorToken: resolveColorToken(slot.subjectId),
            teacherName: slot.teacherName,
            room: slot.room,
            className: slot.className,
          }
        : null;
    }
  }
  return { classId: dto.classId, className: dto.className, slots };
}
