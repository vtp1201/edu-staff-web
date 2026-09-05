import { dayEnumToIndex } from "../../domain/day-enum";
import type { WeeklyTimetable } from "../../domain/entities/weekly-timetable.entity";
import { assignSubjectColors } from "../../domain/subject-color";
import type { MemberTimetableResponseDto } from "../dtos/member-timetable-response.dto";
import type { RealTimetableResponseDto } from "../dtos/real-timetable-response.dto";

/**
 * Class-scoped real-mode mapper (US-E18.11, signature unchanged in US-E18.26 —
 * the still-real `getByClass` path depends on it). BE US-153 added
 * `subjectName`/`room` to every slot response, so both are read when present;
 * `teacherName` now has a wire source (BE US-234) and falls back to the raw
 * id when core could not resolve it, same precedent as US-E18.2's `memberName`.
 * US-E24.9 additionally keeps the raw `teacherMemberId` AND the
 * bell-schedule `startTime`/`endTime` (BE US-244 — LIVE on `SlotResponse`,
 * optional per slot) on the slot. The top-level
 * `className` is supplied by the caller (which already resolved this classId);
 * the wire does not carry it.
 */
export function mapRealWeeklyTimetable(
  dto: RealTimetableResponseDto,
  className: string,
): WeeklyTimetable {
  const slots: WeeklyTimetable["slots"] = {};
  const colors = assignSubjectColors(dto.slots.map((s) => s.subjectId));
  for (const slot of dto.slots) {
    const dayIndex = dayEnumToIndex(slot.day);
    slots[dayIndex] ??= {};
    slots[dayIndex][slot.period] = {
      subjectId: slot.subjectId,
      subjectName: slot.subjectName ?? slot.subjectId, // id fallback — ask #6/#7
      subjectColorToken: colors.get(slot.subjectId) ?? "muted",
      teacherName: slot.teacherName ?? slot.teacherMemberId, // id fallback
      // Kept alongside the resolved name (US-E24.9): the class hub's own-slot
      // highlight and every period-log/prep write are keyed on the ID, and it
      // must survive a display-name lookup miss.
      teacherMemberId: slot.teacherMemberId,
      room: slot.room,
      // Bell-schedule window (BE US-244): passed through verbatim, undefined
      // when the tenant published none. The class hub's "Đang diễn ra" badge
      // and its upcoming-period pick BOTH read these — dropping them here
      // silently disabled all of it in real mode (US-E24.9 review fix).
      startTime: slot.startTime,
      endTime: slot.endTime,
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
  /** memberId → display name (IAM batch lookup); unresolved keeps the id. */
  teacherNameOf: (memberId: string) => string | undefined = () => undefined,
): WeeklyTimetable {
  const slots: WeeklyTimetable["slots"] = {};
  const colors = assignSubjectColors(dto.slots.map((s) => s.subjectId));
  for (const slot of dto.slots) {
    const dayIndex = dayEnumToIndex(slot.day);
    slots[dayIndex] ??= {};
    slots[dayIndex][slot.period] = {
      subjectId: slot.subjectId,
      subjectName: slot.subjectName ?? slot.subjectId,
      subjectColorToken: colors.get(slot.subjectId) ?? "muted",
      teacherName: teacherNameOf(slot.teacherMemberId) ?? slot.teacherMemberId,
      room: slot.room,
      className: classNameOf(slot.classId),
      // Kept alongside the resolved name (US-E24.8): the class-hub deep link
      // needs the id, and it must survive a className lookup miss.
      classId: slot.classId,
    };
  }
  return { classId: identity.classId, className: identity.className, slots };
}
