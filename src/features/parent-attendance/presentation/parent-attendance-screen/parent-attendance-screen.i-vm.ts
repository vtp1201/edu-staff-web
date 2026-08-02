import type { ChildSwitcherChild } from "@/components/shared/child-switcher";
import type { AttendanceDateRange } from "../../domain/entities/attendance-date-range.entity";
import type { ChildAttendanceRecord } from "../../domain/entities/child-attendance-record.entity";
import type { ParentAttendanceFailure } from "../../domain/failures/parent-attendance.failure";

export interface ParentAttendanceScreenVM {
  /** Linked children; empty = the "no linked child" empty state. */
  childList: ChildSwitcherChild[];
  /** `null` only when `childList` is empty. */
  activeChildId: string | null;
  /** Applied (server-resolved) range — the date inputs render from this. */
  range: AttendanceDateRange;
  records: ChildAttendanceRecord[];
  error: ParentAttendanceFailure["type"] | null;
}
