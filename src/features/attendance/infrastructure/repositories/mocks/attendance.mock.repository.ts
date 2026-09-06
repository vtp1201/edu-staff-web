import "server-only";
import { mockDelay } from "@/bootstrap/lib/mock";
import { enumerateDates } from "../../../domain/date-range";
import type { AttendanceDaySummary } from "../../../domain/entities/attendance-day-summary.entity";
import type { AttendanceRecord } from "../../../domain/entities/attendance-record.entity";
import type { AttendanceRoster } from "../../../domain/entities/attendance-roster.entity";
import type { AttendanceStatus } from "../../../domain/entities/attendance-status.entity";
import type { AttendanceFailure } from "../../../domain/failures/attendance.failure";
import type {
  ClassAttendanceRangeResult,
  ClassSummary,
  IAttendanceRepository,
} from "../../../domain/repositories/i-attendance.repository";
import type { ClassAttendanceRangeRecord } from "../../../domain/summarize-class-attendance";
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
 * Per-student absence cadence for the summary tab's mock range (US-E24.14):
 * every Nth school day is an absence. The three cadences deliberately land one
 * student in each threshold band (~80% risk / ~93% watch / ~98% ok) over any
 * range of a month or more, and student #0 is never marked at all (the
 * "transferred in late" row that must render `—` with no chip). Without this
 * spread the mock would show one flat band and the tab's alerts panel,
 * thresholds card and chip tones would all be untested in dev.
 */
const ABSENCE_CADENCE = [5, 12, 60] as const;
/** Rare enough to stay a garnish; LATE counts as a recorded, non-present day. */
const LATE_CADENCE = 30;

function isSchoolDay(isoDate: string): boolean {
  const weekday = new Date(`${isoDate}T00:00:00Z`).getUTCDay();
  return weekday !== 0 && weekday !== 6;
}

/** `null` = this student has no record for this day. */
function rangeStatusFor(
  studentIndex: number,
  dayIndex: number,
): AttendanceStatus | null {
  // One student is never marked in the whole range — see ABSENCE_CADENCE.
  if (studentIndex === 0) return null;
  const cadence = ABSENCE_CADENCE[studentIndex % ABSENCE_CADENCE.length] ?? 60;
  if (dayIndex % cadence === cadence - 1) {
    return studentIndex % 2 === 0 ? "excusedAbsent" : "absent";
  }
  if (dayIndex % LATE_CADENCE === LATE_CADENCE - 1) return "late";
  return "present";
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
    // The mock always produces a rolled day — it seeds real per-student
    // statuses, not the "assume present" fallback the real mapper uses.
    return { classDate: { classId, date }, records, taken: true };
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

  /**
   * Un-capped range read for the summary tab (US-E24.14). Records are emitted
   * per SCHOOL DAY (weekends are never marked, like core) and per student, so
   * the mock exercises the same "roster is the row set, records are sparse"
   * contract the real repository answers.
   */
  async getClassAttendanceRange(
    classId: string,
    from: string,
    to: string,
  ): Promise<ClassAttendanceRangeResult> {
    await mockDelay(250);
    const students = MOCK_STUDENTS_BY_CLASS[classId];
    if (!students) return { roster: [], records: [] };

    const schoolDays = enumerateDates(from, to).filter(isSchoolDay);
    const records: ClassAttendanceRangeRecord[] = [];
    schoolDays.forEach((date, dayIndex) => {
      students.forEach((student, studentIndex) => {
        const status = rangeStatusFor(studentIndex, dayIndex);
        if (status === null) return;
        records.push({ studentId: student.studentId, status, date });
      });
    });

    return {
      roster: students.map((s) => ({
        studentId: s.studentId,
        name: s.studentName,
      })),
      records,
    };
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
