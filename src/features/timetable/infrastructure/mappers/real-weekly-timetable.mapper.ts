import { dayEnumToIndex } from "../../domain/day-enum";
import type { SubjectColorToken } from "../../domain/entities/timetable-slot.entity";
import type { WeeklyTimetable } from "../../domain/entities/weekly-timetable.entity";
import type { MemberTimetableResponseDto } from "../dtos/member-timetable-response.dto";
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
 * Class-scoped real-mode mapper (US-E18.11, signature unchanged in US-E18.26 —
 * the still-real `getByClass` path depends on it). BE US-153 added
 * `subjectName`/`room` to every slot response, so both are read when present;
 * `teacherName` still has no wire source (cross-repo ask #6/#7) and falls back
 * to the raw id, same precedent as US-E18.2's `memberName`. The top-level
 * `className` is supplied by the caller (which already resolved this classId);
 * the wire does not carry it.
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
      subjectName: slot.subjectName ?? slot.subjectId, // id fallback — ask #6/#7
      subjectColorToken: resolveColorToken(slot.subjectId),
      teacherName: slot.teacherMemberId, // no wire display name — ask #6/#7
      room: slot.room,
      className: undefined,
    };
  }
  return { classId: dto.classId, className, slots };
}

/**
 * By-member real-mode mapper (US-E18.26 / BE US-153). Distinct from
 * {@link mapRealWeeklyTimetable} because the by-member response's slots may
 * span SEVERAL classes: each slot carries its own `classId`, so the display
 * `className` is resolved per slot through the caller-supplied `classNameOf`
 * lookup (teacher: a `classId → name` map built from the one `GET /classes`
 * call; student: the single class from the enrollment call). An unresolved
 * classId leaves `className` undefined rather than leaking a raw UUID into the
 * grid.
 *
 * `subjectName` is now server-resolved (no subject-catalogue join needed on
 * the client) with the raw id kept as a defensive fallback; `room` is passed
 * through verbatim — it is echoed unsanitized by the BE and is rendered only
 * via plain JSX text interpolation (auto HTML-escaped; no
 * `dangerouslySetInnerHTML` on any timetable surface — verified US-E18.26).
 *
 * The returned grid's TOP-LEVEL `classId`/`className` are supplied by the
 * caller (`identity`) since the by-member response has neither.
 */
export function mapMemberWeeklyTimetable(
  dto: MemberTimetableResponseDto,
  classNameOf: (classId: string) => string | undefined,
  identity: { classId: string; className: string },
): WeeklyTimetable {
  const slots: WeeklyTimetable["slots"] = {};
  for (const slot of dto.slots) {
    const dayIndex = dayEnumToIndex(slot.day);
    slots[dayIndex] ??= {};
    slots[dayIndex][slot.period] = {
      subjectId: slot.subjectId,
      subjectName: slot.subjectName ?? slot.subjectId,
      subjectColorToken: resolveColorToken(slot.subjectId),
      teacherName: slot.teacherMemberId, // no wire display name — ask #6/#7
      room: slot.room,
      className: classNameOf(slot.classId),
    };
  }
  return { classId: identity.classId, className: identity.className, slots };
}
