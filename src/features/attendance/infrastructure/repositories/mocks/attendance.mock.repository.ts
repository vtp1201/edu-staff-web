import "server-only";
import { mockDelay } from "@/bootstrap/lib/mock";
import type { AttendanceRecord } from "../../../domain/entities/attendance-record.entity";
import type { AttendanceRoster } from "../../../domain/entities/attendance-roster.entity";
import type { AttendanceStatus } from "../../../domain/entities/attendance-status.entity";
import type { ClassPeriod } from "../../../domain/entities/class-period.entity";
import type {
  ClassSummary,
  IAttendanceRepository,
} from "../../../domain/repositories/i-attendance.repository";
import {
  MOCK_CLASSES,
  MOCK_STUDENTS_BY_CLASS,
  SUBJECTS_BY_CLASS,
} from "./fixtures";

const STATUSES: AttendanceStatus[] = ["present", "excused", "absent"];

function deterministicStatus(seed: number): AttendanceStatus {
  // Bias toward 'present' (~80%)
  const m = seed % 10;
  if (m < 8) return "present";
  if (m === 8) return "excused";
  return "absent";
}

function periodId(classId: string, date: string, period: number) {
  return `${classId}-${date}-P${period}`;
}

export class MockAttendanceRepository implements IAttendanceRepository {
  async listMyClasses(): Promise<ClassSummary[]> {
    await mockDelay(150);
    return MOCK_CLASSES.map((c) => ({ id: c.id, name: c.name }));
  }

  async getRoster(
    classId: string,
    date: string,
    period: number,
  ): Promise<AttendanceRoster> {
    await mockDelay(250);
    const students = MOCK_STUDENTS_BY_CLASS[classId];
    if (!students) throw new Error("period-not-found");
    const records: AttendanceRecord[] = students.map((s, idx) => ({
      studentId: s.studentId,
      studentName: s.studentName,
      studentCode: s.studentCode,
      status: deterministicStatus(
        idx + period + date.split("-").reduce((a, b) => a + Number(b), 0),
      ),
    }));
    const classPeriod: ClassPeriod = {
      id: periodId(classId, date, period),
      classId,
      className: classId,
      subject: SUBJECTS_BY_CLASS[classId] ?? "Môn học",
      date,
      period,
    };
    return { period: classPeriod, records };
  }

  async saveAttendance(
    periodId: string,
    records: AttendanceRecord[],
  ): Promise<void> {
    await mockDelay(300);
    if (process.env.NODE_ENV !== "production") {
      console.info(
        `[mock] saveAttendance ${periodId} count=${records.length} present=${records.filter((r) => r.status === "present").length}`,
      );
    }
  }

  async listHistory(
    classId: string,
    _from: string,
    _to: string,
  ): Promise<ClassPeriod[]> {
    await mockDelay(200);
    if (!MOCK_STUDENTS_BY_CLASS[classId]) return [];
    const today = new Date();
    const items: ClassPeriod[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const date = d.toISOString().slice(0, 10);
      const period = ((i % 5) + 1) as number;
      items.push({
        id: periodId(classId, date, period),
        classId,
        className: classId,
        subject: SUBJECTS_BY_CLASS[classId] ?? "Môn học",
        date,
        period,
      });
    }
    return items;
  }
}

// satisfy unused-var lint (referenced for possible future use)
void STATUSES;
