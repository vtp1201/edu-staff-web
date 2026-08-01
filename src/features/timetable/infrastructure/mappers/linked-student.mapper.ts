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
 * Real-mode mapper for `GET /members/{parentId}/linked-students` (BE US-148).
 *
 * Three fields the picker needs are NOT on the wire and are derived here:
 * - `ordinal` — a 1-based position from a STABLE `linkId`-ascending sort. The
 *   response order is not guaranteed stable across refetches, so raw array
 *   position would make the "Con thứ N" fallback label jump between renders.
 * - `avatar` — no display name exists (ask #20 residual), so the ordinal digit
 *   is used instead of fake initials.
 * - `color` — cycled deterministically from the same stable index.
 *
 * `classId`/`className` are omitted TOGETHER by the BE and may arrive as
 * `null`; absent and null are equivalent by design (US-148 D5) and both
 * normalise to `undefined` → the picker shows its "chưa có lớp" fallback.
 */
export function toTimetableChildren(
  dtos: LinkedStudentItemDto[],
): TimetableChild[] {
  return [...dtos]
    .sort((a, b) => a.linkId.localeCompare(b.linkId))
    .map((dto, index) => ({
      childId: dto.studentMemberId,
      // name: intentionally absent — no endpoint a PARENT may call resolves a
      // student's display name (ask #20 residual). Never invent one.
      ordinal: index + 1,
      classId: dto.classId ?? undefined,
      className: dto.className ?? undefined,
      avatar: String(index + 1),
      color: CHILD_COLORS[index % CHILD_COLORS.length] ?? "primary",
    }));
}
