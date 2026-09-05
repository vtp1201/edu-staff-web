import type { LeaveRequestEntity } from "@/features/discipline/domain/entities/leave-request.entity";
import type { DisciplineFailure } from "@/features/discipline/domain/failures/discipline.failure";

/**
 * ViewModel contract for the class-hub "Chủ nhiệm" tab (US-E24.11).
 *
 * Three cards load INDEPENDENTLY and fail independently: the route's
 * `Promise.allSettled` collapses each source into a `HomeroomCardResult`, so
 * one dead read never blanks the other two.
 */

/** One "chưa xử lý" violation row — only what the card displays. Sourced from
 *  the still-mocked `ViolationEntity` (its status axis has no relation to the
 *  real BE workflow, US-E24.11 PLAN §0.1), so the VM stays deliberately narrow:
 *  when the real read lands, only the builder changes. */
export interface OpenViolationItemVm {
  id: string;
  studentName: string;
  description: string;
  /** Pre-formatted `DD/MM/YYYY` — the component does zero date maths. */
  dateLabel: string;
}

export interface AttendanceTodayCardVm {
  /** False ⇒ the day has not been rolled; the three tiles render "—", NOT 0. */
  taken: boolean;
  present: number;
  excused: number;
  absent: number;
  /** Pre-built `/teacher/attendance?classId=&date=` deep link. */
  attendanceHref: string;
}

export interface OpenViolationsCardVm {
  items: OpenViolationItemVm[];
  count: number;
  /** Pre-built `/teacher/discipline?classId=` deep link. */
  disciplineHref: string;
}

export interface PendingLeaveCardVm {
  requests: LeaveRequestEntity[];
}

export type HomeroomActionResult =
  | { ok: true }
  | { ok: false; errorKey: DisciplineFailure["type"] };

/**
 * Server Action refs, bound once by the route and threaded down as ONE prop.
 * `classId` is passed at call time rather than pre-bound: the action re-derives
 * the caller's homeroom scope server-side and checks it against this very
 * `classId` (decision `0063`), so it must arrive as an argument the action can
 * validate, not as a value baked into a closure the client could not have
 * influenced anyway.
 */
export interface HomeroomLeaveActions {
  approveLeave: (
    id: string,
    studentMemberId: string,
    classId: string,
  ) => Promise<HomeroomActionResult>;
  rejectLeave: (
    id: string,
    studentMemberId: string,
    classId: string,
    reason: string,
  ) => Promise<HomeroomActionResult>;
}

/**
 * One discriminated cell per card. `homeroom-tab.tsx` is the ONLY place this
 * union is inspected — every card component takes a success-shaped VM and never
 * learns that an error state exists.
 */
export type HomeroomCardResult<T> =
  | { ok: true; data: T }
  | { ok: false; retryHref: string };

export interface HomeroomTabVm {
  classId: string;
  attendance: HomeroomCardResult<AttendanceTodayCardVm>;
  violations: HomeroomCardResult<OpenViolationsCardVm>;
  leave: HomeroomCardResult<PendingLeaveCardVm>;
}
