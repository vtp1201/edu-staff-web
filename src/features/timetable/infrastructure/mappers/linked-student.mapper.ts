import type {
  TimetableChild,
  TimetableChildColor,
} from "../../domain/entities/timetable-child.entity";
import type { LinkedStudentItemDto } from "../dtos/linked-student-item.dto";

/** Palette cycled by roster position — the wire carries no color (US-E18.26). */
const CHILD_COLORS: readonly TimetableChildColor[] = [
  "primary",
  "success",
  "warning",
  "error",
  "purple",
  "teal",
];

/**
 * 2-char avatar initials — first + last word of a Vietnamese display name
 * ("Nguyễn Minh Khoa" → "NK"). A one-word name yields one letter.
 */
function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const first = words[0]?.[0] ?? "";
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

/**
 * Real-mode mapper for `GET /members/{parentId}/linked-students` (BE US-148).
 *
 * Four fields the picker needs are NOT on this endpoint's wire row:
 * - `ordinal` — a 1-based position from a STABLE `linkId`-ascending sort. The
 *   response order is not guaranteed stable across refetches, so raw array
 *   position would make the "Con thứ N" fallback label jump between renders.
 * - `name` — US-E18.33: resolved from IAM's TIERED batch lookup
 *   (`GET /members?ids=`, ADR-0120, now callable by a PARENT) and passed in as
 *   a `memberId → displayName` map. Closes ask #20's residual half. The map is
 *   keyed by memberId, never by roster position. An id the lookup omitted
 *   (unknown / other-tenant / lookup failed) stays NAMELESS — never a
 *   fabricated or blank name — so the picker's ordinal label remains a live
 *   defensive path.
 * - `avatar` — real initials once a name resolves, else the ordinal digit
 *   (never fake initials off a uuid).
 * - `color` — cycled deterministically from the same stable index.
 *
 * `classId`/`className` are omitted TOGETHER by the BE and may arrive as
 * `null`; absent and null are equivalent by design (US-148 D5) and both
 * normalise to `undefined` → the picker shows its "chưa có lớp" fallback.
 */
export function toTimetableChildren(
  dtos: LinkedStudentItemDto[],
  names: Map<string, string> = new Map(),
): TimetableChild[] {
  return [...dtos]
    .sort((a, b) => a.linkId.localeCompare(b.linkId))
    .map((dto, index) => {
      const resolved = names.get(dto.studentMemberId);
      return {
        childId: dto.studentMemberId,
        ...(resolved ? { name: resolved } : {}),
        ordinal: index + 1,
        classId: dto.classId ?? undefined,
        className: dto.className ?? undefined,
        avatar: resolved ? initialsOf(resolved) : String(index + 1),
        color: CHILD_COLORS[index % CHILD_COLORS.length] ?? "primary",
      };
    });
}
