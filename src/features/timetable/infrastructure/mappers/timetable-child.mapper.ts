import type {
  TimetableChild,
  TimetableChildColor,
} from "../../domain/entities/timetable-child.entity";
import type { TimetableChildDto } from "../dtos/weekly-timetable-response.dto";

const CHILD_COLORS: readonly TimetableChildColor[] = [
  "primary",
  "success",
  "warning",
  "error",
  "purple",
  "teal",
];

function toChildColor(color: string): TimetableChildColor {
  return (CHILD_COLORS as readonly string[]).includes(color)
    ? (color as TimetableChildColor)
    : "primary";
}

/**
 * Mock-fixture mapper. `ordinal` is supplied by the CALLER (1-based roster
 * position) because the fixture DTO has no such field — the real-mode
 * equivalent derives it from a stable `linkId` sort (see
 * `linked-student.mapper.ts`). Mock fixtures always carry a name/class, so the
 * picker's real-mode fallbacks are never exercised in mock mode.
 */
export function mapTimetableChild(
  dto: TimetableChildDto,
  ordinal: number,
): TimetableChild {
  return {
    childId: dto.childId,
    name: dto.name,
    ordinal,
    classId: dto.classId,
    className: dto.className,
    avatar: dto.avatar,
    color: toChildColor(dto.color),
  };
}
