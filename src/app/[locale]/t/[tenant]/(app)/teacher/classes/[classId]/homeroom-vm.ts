import "server-only";

import { makeGetClassAttendanceUseCase } from "@/bootstrap/di/attendance.di";
import {
  makeGetLeaveRequestsUseCase,
  makeGetViolationsUseCase,
} from "@/bootstrap/di/discipline.di";
import type { AttendanceRoster } from "@/features/attendance/domain/entities/attendance-roster.entity";
import type { LeaveRequestEntity } from "@/features/discipline/domain/entities/leave-request.entity";
import type { ViolationEntity } from "@/features/discipline/domain/entities/violation.entity";
import { isoDateOf } from "@/features/teacher/domain/iso-week";
import type {
  AttendanceTodayCardVm,
  HomeroomCardResult,
  HomeroomTabVm,
  OpenViolationsCardVm,
  PendingLeaveCardVm,
} from "@/features/teacher/presentation/class-hub/homeroom-tab/homeroom-tab.i-vm";

export interface BuildHomeroomTabVmInput {
  classId: string;
  locale: string;
  tenant: string;
  /** Injected so "hôm nay" stays deterministic in tests (tdd.md clock rule). */
  now?: Date;
}

/** ISO `YYYY-MM-DD` → `DD/MM/YYYY`; unparseable input passes through. */
function toDisplayDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

/** `PromiseSettledResult` → the card cell. A rejection carries NO error key:
 *  every card shows the same "thử lại" surface, because the teacher's only
 *  recourse is identical whichever way the read failed. */
function cell<T>(
  result: PromiseSettledResult<T>,
  retryHref: string,
): HomeroomCardResult<T> {
  return result.status === "fulfilled"
    ? { ok: true, data: result.value }
    : { ok: false, retryHref };
}

function toAttendanceVm(
  roster: AttendanceRoster,
  attendanceHref: string,
): AttendanceTodayCardVm {
  // `late` is deliberately NOT folded into any tile: the design shows exactly
  // three buckets, and silently counting a late student as absent (or present)
  // would misreport the roll. It stays visible in the attendance sheet itself.
  let present = 0;
  let excused = 0;
  let absent = 0;
  for (const r of roster.records) {
    if (r.status === "present") present += 1;
    else if (r.status === "excusedAbsent") excused += 1;
    else if (r.status === "absent") absent += 1;
  }
  // Counts are reported even when the day is untaken (they are all seeded
  // `present` then) — the CARD renders "—" off `taken`, never off a zero, so a
  // genuinely absence-free rolled day still reads as a real 0.
  return roster.taken
    ? { taken: true, present, excused, absent, attendanceHref }
    : { taken: false, present: 0, excused: 0, absent: 0, attendanceHref };
}

function toViolationsVm(
  violations: ViolationEntity[],
  classId: string,
  disciplineHref: string,
): OpenViolationsCardVm {
  // STILL MOCK-SOURCED (US-E18.14 force-mock survives US-E24.11): the real
  // `StudentViolationResponse.state` workflow (DRAFT/SUBMITTED/APPROVED/
  // REJECTED) has no relation to this entity's `recorded|notified|
  // parent_confirmed` axis, and the real DTO carries no display fields at all.
  // `recorded` is the mock's "chưa xử lý"; when the real read lands, only this
  // predicate changes.
  const items = violations
    .filter((v) => v.classId === classId && v.status === "recorded")
    .map((v) => ({
      id: v.id,
      studentName: v.studentName,
      description: v.description,
      dateLabel: toDisplayDate(v.date),
    }));
  return { items, count: items.length, disciplineHref };
}

function toLeaveVm(requests: LeaveRequestEntity[]): PendingLeaveCardVm {
  // The real endpoint already server-filters a GVCN's `?classId=` inbox to
  // SUBMITTED; the mock repository does not, so the pending filter is applied
  // here for BOTH — filtering an already-filtered list is a no-op, while
  // trusting the mock would show decided rows with live Duyệt/Từ chối buttons.
  return { requests: requests.filter((r) => r.status === "pending") };
}

/**
 * Assemble the "Chủ nhiệm" tab's ViewModel (US-E24.11).
 *
 * Three INDEPENDENT reads: attendance (real), open violations (still mock —
 * see `toViolationsVm`) and the GVCN leave inbox (real since US-E24.11). They
 * run concurrently and settle independently — one dead source costs exactly one
 * card, never the tab, because a blank homeroom tab would read as "nothing to
 * do today", which is a materially different (and wrong) statement.
 */
export async function buildHomeroomTabVm({
  classId,
  locale,
  tenant,
  now = new Date(),
}: BuildHomeroomTabVmInput): Promise<HomeroomTabVm> {
  const today = isoDateOf(now);
  const base = `/${locale}/t/${tenant}`;
  const retryHref = `${base}/teacher/classes/${encodeURIComponent(classId)}?tab=homeroom`;

  const [attendance, violations, leave] = await Promise.allSettled([
    (await makeGetClassAttendanceUseCase()).execute(classId, today),
    (await makeGetViolationsUseCase()).execute({ classId }),
    (await makeGetLeaveRequestsUseCase()).execute({ classId }),
  ]);

  return {
    classId,
    attendance: cell(
      attendance.status === "fulfilled"
        ? {
            status: "fulfilled",
            value: toAttendanceVm(
              attendance.value,
              `${base}/teacher/attendance?classId=${encodeURIComponent(classId)}&date=${today}`,
            ),
          }
        : attendance,
      retryHref,
    ),
    violations: cell(
      violations.status === "fulfilled"
        ? {
            status: "fulfilled",
            value: toViolationsVm(
              violations.value,
              classId,
              `${base}/teacher/discipline?classId=${encodeURIComponent(classId)}`,
            ),
          }
        : violations,
      retryHref,
    ),
    leave: cell(
      leave.status === "fulfilled"
        ? { status: "fulfilled", value: toLeaveVm(leave.value) }
        : leave,
      retryHref,
    ),
  };
}
