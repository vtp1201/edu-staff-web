import { dayEnumToIndex } from "../../domain/day-enum";
import type { SubjectColorToken } from "../../domain/entities/timetable-slot.entity";
import type { WeeklyTimetable } from "../../domain/entities/weekly-timetable.entity";
import type { RealTimetableResponseDto } from "../dtos/real-timetable-response.dto";

/**
 * subjectId → semantic color token, mirrors
 * `weekly-timetable.mapper.ts`'s mock-fixture table. Real wire `subjectId`s are
 * UUIDs (not the mock's short slugs like `"math"`) so this table will not match
 * in practice today — every real slot falls back to `"muted"` until the
 * subject-catalogue (US-E18.3, already real) is joined in a follow-up. Kept for
 * parity/documentation, not removed, since a future join can reuse it verbatim.
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

/**
 * Real-mode mapper (US-E18.11). The wire carries only ids — no
 * `subjectName`/`teacherName`/`room` (cross-repo ask #6/#7, no display-name
 * source anywhere on the public API) — names fall back to the raw id, same
 * precedent as US-E18.2's `memberName` fallback. `className` is supplied by
 * the caller (already known — the caller resolved/picked this classId), not
 * read from this response (the wire doesn't carry it either).
 */
export function mapRealWeeklyTimetable(
  dto: RealTimetableResponseDto,
  className: string,
): WeeklyTimetable {
  const slots: WeeklyTimetable["slots"] = {};
  for (const slot of dto.slots) {
    const dayIndex = dayEnumToIndex(slot.day);
    slots[dayIndex] ??= {};
    slots[dayIndex][slot.period] = {
      subjectId: slot.subjectId,
      subjectName: slot.subjectId, // no wire display name — ask #6/#7
      subjectColorToken: resolveColorToken(slot.subjectId),
      teacherName: slot.teacherMemberId, // no wire display name — ask #6/#7
      room: undefined, // no wire field at all
      className: undefined,
    };
  }
  return { classId: dto.classId, className, slots };
}
