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

export function mapTimetableChild(dto: TimetableChildDto): TimetableChild {
  return {
    childId: dto.childId,
    name: dto.name,
    classId: dto.classId,
    className: dto.className,
    avatar: dto.avatar,
    color: toChildColor(dto.color),
  };
}
