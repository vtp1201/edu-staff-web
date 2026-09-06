import type { AttendanceStatus } from "./entities/attendance-status.entity";
import type {
  AttendanceBand,
  ClassAttendanceSummary,
  StudentAttendanceSummary,
} from "./entities/student-attendance-summary.entity";

/** One attendance record of the range read, already mapped to the domain
 *  vocabulary by the repository (this module never sees a wire status). */
export interface ClassAttendanceRangeRecord {
  studentId: string;
  status: AttendanceStatus;
  /** ISO `YYYY-MM-DD`. Carried for traceability; counting is date-agnostic
   *  (core allows at most one record per student per day). */
  date: string;
}

/** A class roster row — the name is joined repository-side. */
export interface ClassRosterEntry {
  studentId: string;
  name: string;
}

/** Band boundaries are CLOSED at the lower end (design-spec thresholds card):
 *  95.0 → ok, 90.0 → watch, 89.9 → risk. */
const OK_THRESHOLD = 95;
const WATCH_THRESHOLD = 90;

/**
 * Roll the flat range records up per student (US-E24.14). Pure: same input,
 * same output, no clock, no locale, no framework, no i18n.
 *
 * The ROSTER — not the record list — is the row set, exactly as
 * `mapClassAttendance` seeds the daily table: a student nobody has marked all
 * term must still appear, as an unranked `—` row. Records for a student who is
 * not on the roster are ignored rather than inventing a nameless row; the
 * roster comes from the same class read as the records, so this only happens
 * for a student who has since left the class.
 */
export function summarizeClassAttendance(
  records: readonly ClassAttendanceRangeRecord[],
  roster: readonly ClassRosterEntry[],
): ClassAttendanceSummary {
  const byStudent = new Map<string, StudentAttendanceSummary>(
    roster.map((entry) => [
      entry.studentId,
      {
        studentId: entry.studentId,
        name: entry.name,
        present: 0,
        late: 0,
        excused: 0,
        absent: 0,
        recorded: 0,
        rate: null,
        band: null,
      },
    ]),
  );

  for (const record of records) {
    const student = byStudent.get(record.studentId);
    if (student === undefined) continue; // no longer on the roster
    student.recorded += 1;
    switch (record.status) {
      case "present":
        student.present += 1;
        break;
      case "late":
        student.late += 1;
        break;
      case "excusedAbsent":
        student.excused += 1;
        break;
      case "absent":
        student.absent += 1;
        break;
    }
  }

  const students = [...byStudent.values()];
  for (const student of students) {
    student.rate = rateOf(student.present, student.recorded);
    student.band = bandOf(student.rate);
  }

  const rates = students
    .map((s) => s.rate)
    .filter((rate): rate is number => rate !== null);

  return { students, meanRate: meanOf(rates) };
}

/** Percentage 0–100 to one decimal; `null` over an empty denominator. LATE is
 *  already excluded — it never lands in `present`. */
function rateOf(present: number, recorded: number): number | null {
  if (recorded <= 0) return null;
  return Math.round((present / recorded) * 1000) / 10;
}

function bandOf(rate: number | null): AttendanceBand | null {
  if (rate === null) return null;
  if (rate >= OK_THRESHOLD) return "ok";
  if (rate >= WATCH_THRESHOLD) return "watch";
  return "risk";
}

function meanOf(rates: readonly number[]): number | null {
  if (rates.length === 0) return null;
  const sum = rates.reduce((total, rate) => total + rate, 0);
  return Math.round((sum / rates.length) * 10) / 10;
}
