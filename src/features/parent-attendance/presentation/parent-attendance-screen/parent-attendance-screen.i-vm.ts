import type { ChildSwitcherChild } from "@/components/shared/child-switcher";
import type { LeaveRequestEntity } from "@/features/discipline/domain/entities/leave-request.entity";
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
  /**
   * The active child's leave requests (US-E24.6). APPROVED ones name the reason
   * behind an excused day; SUBMITTED ones become the "Chờ duyệt" rows at the top
   * of the history. Read NON-BLOCKINGLY: an empty array may mean "none" or "the
   * read failed", and either way the attendance table still renders.
   */
  leaveRequests: LeaveRequestEntity[];
  /**
   * The active child's class, read off the most recent attendance row
   * (US-E24.6, packet Q3 — there is no endpoint a PARENT may call to discover
   * it). `null` when the applied range recorded no day at all: the leave-request
   * button is then disabled with a VISIBLE reason, never silently broken.
   */
  childClassId: string | null;
  /**
   * Server-resolved local date, ISO `YYYY-MM-DD`. Passed down rather than
   * computed in the client so the date picker's `min` is identical on both
   * sides of hydration.
   */
  today: string;
  error: ParentAttendanceFailure["type"] | null;
}
