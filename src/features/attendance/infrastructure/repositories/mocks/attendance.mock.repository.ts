import "server-only";
import { mockDelay } from "@/bootstrap/lib/mock";
import { enumerateDates } from "../../../domain/date-range";
import type { AttendanceDaySummary } from "../../../domain/entities/attendance-day-summary.entity";
import type { AttendanceRecord } from "../../../domain/entities/attendance-record.entity";
import type { AttendanceRoster } from "../../../domain/entities/attendance-roster.entity";
import type { AttendanceStatus } from "../../../domain/entities/attendance-status.entity";
import type { AttendanceFailure } from "../../../domain/failures/attendance.failure";
import type {
  ClassSummary,
  IAttendanceRepository,
} from "../../../domain/repositories/i-attendance.repository";
import { countStatuses } from "../../mappers/attendance.mapper";
import { MOCK_CLASSES, MOCK_STUDENTS_BY_CLASS } from "./fixtures";

/** Same shape as `deterministicStatus`'s old 3-state bias, extended to the
 *  real 4-state contract (~70% present, one late, one excusedAbsent, one absent). */
function deterministicStatus(seed: number): AttendanceStatus {
  const m = seed % 10;
  if (m < 7) return "present";
  if (m === 7) return "late";
  if (m === 8) return "excusedAbsent";
  return "absent";
}

function dateSeed(date: string): number {
  return date.split("-").reduce((a, b) => a + Number(b), 0);
}

/**
 * Mock repository (US-E13.2, ADR `0058`) — models the SAME contract as the
 * real one: class+date keyed, 4-state, bounded history aggregate, no
 * lying-green shortcuts (AC-1). All 3 fixture classes are homeroom classes.
 */
export class MockAttendanceRepository implements IAttendanceRepository {
  async getMyHomeroomClasses(): Promise<ClassSummary[]> {
    await mockDelay(150);
    return MOCK_CLASSES.map((c) => ({ id: c.id, name: c.name }));
  }

  async getClassAttendance(
    classId: string,
    date: string,
  ): Promise<AttendanceRoster> {
    await mockDelay(250);
    const students = MOCK_STUDENTS_BY_CLASS[classId];
    if (!students) throw { type: "not-found" } satisfies AttendanceFailure;
    const records: AttendanceRecord[] = students.map((s, idx) => ({
      studentId: s.studentId,
      studentName: s.studentName,
      status: deterministicStatus(idx + dateSeed(date)),
    }));
    return { classDate: { classId, date }, records };
  }

  async saveClassAttendance(
    classId: string,
    date: string,
    records: AttendanceRecord[],
  ): Promise<void> {
    await mockDelay(300);
    if (process.env.NODE_ENV !== "production") {
      console.info(
        `[mock] saveClassAttendance ${classId}/${date} count=${records.length} present=${records.filter((r) => r.status === "present").length}`,
      );
    }
  }

  async getAttendanceHistory(
    classId: string,
    from: string,
    to: string,
  ): Promise<AttendanceDaySummary[]> {
    await mockDelay(200);
    const students = MOCK_STUDENTS_BY_CLASS[classId];
    if (!students) return [];
    const dates = enumerateDates(from, to);
    return dates.map((date) => {
      const statuses = students.map((_, idx) =>
        deterministicStatus(idx + dateSeed(date)),
      );
      return {
        date,
        counts: countStatuses(statuses),
        totalStudents: students.length,
      };
    });
  }
}
