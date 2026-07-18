import { errorCodeOf } from "@/bootstrap/lib/api-envelope";
import type { AttendanceDaySummary } from "../../domain/entities/attendance-day-summary.entity";
import type { AttendanceRecord } from "../../domain/entities/attendance-record.entity";
import type { AttendanceRoster } from "../../domain/entities/attendance-roster.entity";
import type { AttendanceStatus } from "../../domain/entities/attendance-status.entity";
import type {
  AttendanceRecordDto,
  ClassAttendanceResponseDto,
  WireAttendanceStatus,
} from "../dtos/class-attendance-response.dto";

const WIRE_TO_DOMAIN: Record<WireAttendanceStatus, AttendanceStatus> = {
  PRESENT: "present",
  ABSENT: "absent",
  LATE: "late",
  EXCUSED_ABSENT: "excusedAbsent",
};

const DOMAIN_TO_WIRE: Record<AttendanceStatus, WireAttendanceStatus> = {
  present: "PRESENT",
  absent: "ABSENT",
  late: "LATE",
  excusedAbsent: "EXCUSED_ABSENT",
};

export function mapStatusFromWire(
  status: WireAttendanceStatus,
): AttendanceStatus {
  return WIRE_TO_DOMAIN[status];
}

export function mapStatusToWire(
  status: AttendanceStatus,
): WireAttendanceStatus {
  return DOMAIN_TO_WIRE[status];
}

/** `studentName` has no wire source — joined client-side against the class
 *  roster (`nameByMemberId`), same graceful fallback as `teacher-class.mapper.ts`
 *  (`displayName?.trim() || studentMemberId`). */
export function mapAttendanceRecord(
  dto: AttendanceRecordDto,
  nameByMemberId: Map<string, string | undefined>,
): AttendanceRecord {
  return {
    studentId: dto.studentMemberId,
    studentName:
      nameByMemberId.get(dto.studentMemberId)?.trim() || dto.studentMemberId,
    status: mapStatusFromWire(dto.status),
  };
}

export function mapClassAttendance(
  dto: ClassAttendanceResponseDto,
  nameByMemberId: Map<string, string | undefined>,
): AttendanceRoster {
  return {
    classDate: { classId: dto.classId, date: dto.date },
    records: dto.records.map((r) => mapAttendanceRecord(r, nameByMemberId)),
  };
}

export function zeroCounts(): Record<AttendanceStatus, number> {
  return { present: 0, absent: 0, late: 0, excusedAbsent: 0 };
}

export function countStatuses(
  statuses: AttendanceStatus[],
): Record<AttendanceStatus, number> {
  const counts = zeroCounts();
  for (const s of statuses) counts[s]++;
  return counts;
}

/**
 * Aggregates the bounded per-day fan-out (`Promise.allSettled` results) into
 * day summaries (ADR `0058` §5, ground rules from `state-architecture.md` §3):
 * - a fulfilled day → its status counts.
 * - a rejected day with `ATTENDANCE_NOT_FOUND` → a legitimate zero-count day
 *   (no attendance recorded yet), NOT an error.
 * - a rejected day with any OTHER code → omitted from the result UNLESS every
 *   single day failed, in which case the first such error is re-thrown so the
 *   caller surfaces an aggregate failure (a single flaky day must not blank
 *   the whole history tab, but a fully-unreachable range must not report an
 *   empty "0 records" summary either — that would be a lying-green result).
 */
export function aggregateDaySummaries(
  dates: string[],
  results: PromiseSettledResult<ClassAttendanceResponseDto>[],
  totalStudents: number,
): AttendanceDaySummary[] {
  const summaries: AttendanceDaySummary[] = [];
  let anySucceeded = false;
  let firstOtherError: unknown;

  results.forEach((result, i) => {
    const date = dates[i];
    if (result.status === "fulfilled") {
      anySucceeded = true;
      summaries.push({
        date,
        counts: countStatuses(
          result.value.records.map((r) => mapStatusFromWire(r.status)),
        ),
        totalStudents,
      });
      return;
    }

    if (errorCodeOf(result.reason) === "ATTENDANCE_NOT_FOUND") {
      anySucceeded = true;
      summaries.push({ date, counts: zeroCounts(), totalStudents });
      return;
    }

    firstOtherError ??= result.reason;
  });

  if (!anySucceeded && firstOtherError !== undefined) {
    throw firstOtherError;
  }

  return summaries;
}
