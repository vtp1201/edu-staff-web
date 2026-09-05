import type { DisciplineFailure } from "../failures/discipline.failure";
import {
  canDecideLeave,
  type LeaveDecisionAuthContext,
} from "./leave-decision-auth-context.entity";

export type LeaveStatus = "pending" | "approved" | "rejected";

export type LeaveType = "medical" | "personal" | "event" | "other";

export interface LeaveRequestEntity {
  id: string;
  studentId: string;
  studentName: string;
  initials: string;
  avatarTone: string;
  classId: string;
  className: string;
  submittedBy: "student" | "parent";
  submitterName: string;
  reason: string;
  /** Pre-formatted "DD/MM/YYYY" by the mapper. */
  startDate: string;
  endDate: string;
  dayCount: number;
  type: LeaveType;
  status: LeaveStatus;
  submittedAt: string;
  approvedBy: string | null;
  rejectedBy: string | null;
  rejectionReason: string | null;
}

/**
 * Input for submitting a leave request (US-E09.2). Student or parent supplies
 * ISO dates; the use-case validates date/reason before delegating to the repo.
 */
export interface SubmitLeaveRequestInput {
  studentId: string;
  /** ISO "YYYY-MM-DD". */
  startDate: string;
  /** ISO "YYYY-MM-DD". */
  endDate: string;
  type: LeaveType;
  reason: string;
  submittedBy: "student" | "parent";
}

/**
 * Input for a parent submitting a leave request on behalf of a child (US-E09.4).
 * The childId is passed separately to the repo/use-case; `parentId`/`submittedBy`
 * are NEVER part of the wire body (derived server-side from the session).
 */
export interface SubmitChildLeaveRequestInput {
  /** ISO "YYYY-MM-DD". */
  startDate: string;
  /** ISO "YYYY-MM-DD". */
  endDate: string;
  type: LeaveType;
  reason: string;
}

/**
 * Addressing + authorization for a leave DECISION (approve / reject).
 *
 * `studentMemberId` is not redundant with `id`: core partitions leave requests
 * on `(tenantId, studentMemberId)`, so the by-id routes require BOTH
 * (`LeaveRequestStudentMemberId`, a REQUIRED query param). `classId` is the
 * scope key the GVCN check runs against. Every caller already holds the whole
 * `LeaveRequestEntity` of the row it is acting on, so all three are a
 * plumb-through, never a lookup.
 */
export interface DecideLeaveInput {
  id: string;
  studentMemberId: string;
  classId: string;
  /**
   * Server-derived GVCN scope (decision `0063`). Present on every surface that
   * can resolve the caller's homeroom classes — i.e. the class-scoped homeroom
   * tab. Absent ONLY on the legacy multi-class discipline dashboards
   * (`/teacher/discipline`, `/principal/discipline`), which have no `classId`
   * scope of their own to derive it from; those screens are mock-only anyway
   * (their list call cannot be formed on the real API — backlog: the
   * `getLeaveRequests({})` gap), so no real mutation ever skips the check.
   */
  authCtx?: LeaveDecisionAuthContext;
}

/**
 * Repository-boundary guard for a leave decision (decision `0063`).
 *
 * Called as the FIRST statement of `approveLeave`/`rejectLeave` in BOTH
 * repository implementations — the mock one is the durable boundary while the
 * feature is mock-first, and the real one must never reach the wire with a
 * forged scope. Throws the same `forbidden` key core's own
 * `403 LEAVE_REQUEST_FORBIDDEN` maps to, so the UI copy is identical whichever
 * side denied.
 */
export function assertCanDecideLeave(input: DecideLeaveInput): void {
  if (input.authCtx === undefined) return;
  if (!canDecideLeave(input.authCtx, input.classId)) {
    throw { type: "forbidden" } satisfies DisciplineFailure;
  }
}
