import type { AttendanceDaySummary } from "../../domain/entities/attendance-day-summary.entity";
import type { AttendanceRecord } from "../../domain/entities/attendance-record.entity";
import type { AttendanceRoster } from "../../domain/entities/attendance-roster.entity";
import type { AttendanceStatus } from "../../domain/entities/attendance-status.entity";
import type {
  AttendanceRecordDto,
  ClassAttendanceRangeRecordDto,
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

/**
 * `enrolledMemberIds` (when given) is the row set: every enrolled student gets
 * a row, defaulting to `present`, with any saved record overlaid. Marking a
 * class is a full-roster edit — an unmarked day answers `records: []`, and
 * rendering that literally would show an empty screen with nothing to save.
 */
export function mapClassAttendance(
  dto: ClassAttendanceResponseDto,
  nameByMemberId: Map<string, string | undefined>,
  enrolledMemberIds?: string[],
): AttendanceRoster {
  const saved = new Map(dto.records.map((r) => [r.studentMemberId, r]));
  const ids = enrolledMemberIds ?? dto.records.map((r) => r.studentMemberId);
  return {
    classDate: { classId: dto.classId, date: dto.date },
    records: ids.map((id) => {
      const record = saved.get(id);
      return record
        ? mapAttendanceRecord(record, nameByMemberId)
        : {
            studentId: id,
            studentName: nameByMemberId.get(id)?.trim() || id,
            status: "present" as const,
          };
    }),
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
 * Aggregates the FLAT range response (`GET …/attendance?startDate&endDate`,
 * US-E18.47 / BE US-187) into one summary per requested day.
 *
 * Replaces the pre-US-E18.47 `aggregateDaySummaries(dates, allSettledResults)`,
 * which folded a ≤31-call-per-day fan-out. Output contract is unchanged:
 * - exactly one `AttendanceDaySummary` per date in `dates`, in that order;
 * - a day with NO record is a zero-count day. The old fan-out likewise reported
 *   both "day fetched, empty `records`" and "day rejected `ATTENDANCE_NOT_FOUND`"
 *   as zero counts, so no "never recorded" vs "recorded empty" distinction is
 *   lost — the wire never carried one (BE returns 200 + empty list, never 404);
 * - records dated outside `dates` are ignored rather than inventing a day.
 *
 * The one behavioural difference is a strict improvement: there is no longer a
 * per-day partial failure to swallow. One call either succeeds (every day is
 * reported) or throws (the caller maps it via `toAttendanceFailure`), so the
 * old "omit a flaky day / re-throw only if every day failed" branch is gone.
 */
export function aggregateRangeDaySummaries(
  dates: string[],
  records: ClassAttendanceRangeRecordDto[],
  totalStudents: number,
): AttendanceDaySummary[] {
  const countsByDate = new Map<string, Record<AttendanceStatus, number>>(
    dates.map((date) => [date, zeroCounts()]),
  );

  for (const record of records) {
    const counts = countsByDate.get(record.date);
    if (counts === undefined) continue; // outside the requested range
    counts[mapStatusFromWire(record.status)]++;
  }

  return dates.map((date) => ({
    date,
    // Non-null: every requested date was seeded above.
    counts: countsByDate.get(date) ?? zeroCounts(),
    totalStudents,
  }));
}
