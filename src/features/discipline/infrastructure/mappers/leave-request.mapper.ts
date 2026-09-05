import type {
  LeaveRequestEntity,
  LeaveStatus,
} from "../../domain/entities/leave-request.entity";
import type { StudentLeaveRequestResponseDto } from "../dtos/student-leave-request-response.dto";
import { initialsOf } from "./discipline.mapper";

/** Wire `state` → the entity's `status` axis. Unlike violations (whose mock
 *  status axis is a different concept entirely), leave maps 1:1. */
const STATE_TO_STATUS: Record<
  StudentLeaveRequestResponseDto["state"],
  LeaveStatus
> = {
  SUBMITTED: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

/** Avatar tones the discipline screens understand (`DisciplineAvatar`). */
const AVATAR_TONES = [
  "primary",
  "success",
  "warning",
  "purple",
  "teal",
  "error",
] as const;

/**
 * Deterministic avatar tone. The wire carries no such field — it is a purely
 * visual attribute — but `LeaveRequestEntity` (a mock-era shape shared with the
 * legacy discipline dashboards) requires one. Hashing the student id keeps the
 * same person the same colour across renders and pages instead of flickering.
 */
export function leaveAvatarToneFor(studentMemberId: string): string {
  let hash = 0;
  for (let i = 0; i < studentMemberId.length; i += 1) {
    hash = (hash * 31 + studentMemberId.charCodeAt(i)) % 100000;
  }
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

/** ISO `YYYY-MM-DD` → `DD/MM/YYYY`; unparseable input passes through. */
function toDisplayDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

/**
 * Inclusive day span, floored at 1. Core rejects an inverted range
 * (`400 LEAVE_REQUEST_INVALID_DATE_RANGE`) and there is no such thing as a
 * zero-day leave, so an unparseable or inverted pair degrades to "1 ngày"
 * rather than rendering `0`/`NaN` next to a request that plainly exists.
 */
export function countLeaveDays(startDate: string, endDate: string): number {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return 1;
  const days = Math.floor((end - start) / 86_400_000) + 1;
  return days < 1 ? 1 : days;
}

/**
 * Real `StudentLeaveRequestResponse` → `LeaveRequestEntity`.
 *
 * Three entity fields have NO wire source and are documented inventions:
 * - `type`: core has no student leave-type concept at all → always `"other"`.
 *   Guessing a category from free text would fabricate a fact.
 * - `submittedBy`: inferred from whether the submitter IS the student. Core
 *   only allows the student themself or a linked PARENT to submit, so the
 *   two-valued inference is exhaustive.
 * - `avatarTone`: deterministic hash (see {@link leaveAvatarToneFor}).
 *
 * `className` is NOT resolved here via a second lookup: the caller already
 * knows the class it asked about, and re-deriving it would risk a stale second
 * value (same reasoning `ClassDate` documents in attendance).
 */
export function toLeaveRequestEntity(
  dto: StudentLeaveRequestResponseDto,
  nameByMemberId: Map<string, string>,
  className = "",
): LeaveRequestEntity {
  const nameOf = (memberId: string) =>
    nameByMemberId.get(memberId)?.trim() || memberId;
  const studentName = nameOf(dto.studentMemberId);
  const status = STATE_TO_STATUS[dto.state];
  // The STATE is the authority on whether a decision happened — an approver id
  // echoed on a still-SUBMITTED row must not read as "already decided".
  const decidedBy =
    status === "pending" || !dto.approverMemberId
      ? null
      : nameOf(dto.approverMemberId);

  return {
    id: dto.requestId,
    studentId: dto.studentMemberId,
    studentName,
    initials: initialsOf(studentName),
    avatarTone: leaveAvatarToneFor(dto.studentMemberId),
    classId: dto.classId,
    className,
    submittedBy:
      dto.submittedByMemberId === dto.studentMemberId ? "student" : "parent",
    submitterName: nameOf(dto.submittedByMemberId),
    reason: dto.reason,
    startDate: toDisplayDate(dto.startDate),
    endDate: toDisplayDate(dto.endDate),
    dayCount: countLeaveDays(dto.startDate, dto.endDate),
    type: "other",
    status,
    submittedAt: dto.createdAt,
    approvedBy: status === "approved" ? decidedBy : null,
    rejectedBy: status === "rejected" ? decidedBy : null,
    rejectionReason: dto.rejectionReason ?? null,
  };
}
