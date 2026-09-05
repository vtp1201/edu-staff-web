import type { PeriodLog } from "../../../domain/entities/period-log.entity";
import type { PeriodPrep } from "../../../domain/entities/period-prep.entity";

/**
 * Mock seed for the class-hub timetable tab. Vietnamese strings here are DATA
 * (lesson titles, remarks), not UI copy — they stay out of i18n per
 * `.claude/rules/i18n.md`.
 *
 * Rows are seeded RELATIVE to "today" so the demo always has an already-logged
 * period in the currently rendered week, whatever day the app is opened.
 */
export const MOCK_PERIOD_CLASS_ID = "11A2";
export const MOCK_PERIOD_TEACHER_ID = "t1";

/** Monday (local) of the week containing `date`. */
export function mondayOf(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const shift = (d.getDay() + 6) % 7; // Sun(0) → 6, Mon(1) → 0
  d.setDate(d.getDate() - shift);
  return d;
}

export function isoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

const MONDAY = mondayOf(new Date());
const MON = isoDate(MONDAY);
const TUE = isoDate(addDays(MONDAY, 1));

export function seedPeriodLogs(): PeriodLog[] {
  return [
    {
      classId: MOCK_PERIOD_CLASS_ID,
      date: MON,
      periodNumber: 1,
      termId: "term-mock",
      dayOfWeek: "MON",
      subjectId: "math",
      teacherMemberId: MOCK_PERIOD_TEACHER_ID,
      lessonTitle: "Quy tắc tính đạo hàm (tiết 2)",
      remark: "Lớp hiểu bài, còn 5 phút chữa bài tập về nhà.",
      grade: "A",
      absentCount: 1,
      createdAt: `${MON}T01:00:00Z`,
      updatedAt: `${MON}T01:00:00Z`,
    },
    {
      classId: MOCK_PERIOD_CLASS_ID,
      date: MON,
      periodNumber: 5,
      termId: "term-mock",
      dayOfWeek: "MON",
      subjectId: "phys",
      // Another teacher's row — drives the GVCN read-only strip.
      teacherMemberId: "t-other",
      lessonTitle: "Điện từ trường (tiết 2)",
      remark: "Một số em chưa mang SGK.",
      grade: "B",
      absentCount: 2,
      createdAt: `${MON}T02:00:00Z`,
      updatedAt: `${MON}T02:00:00Z`,
    },
  ];
}

export function seedPeriodPreps(): PeriodPrep[] {
  return [
    {
      classId: MOCK_PERIOD_CLASS_ID,
      date: TUE,
      periodNumber: 5,
      termId: "term-mock",
      dayOfWeek: "TUE",
      subjectId: "math",
      teacherMemberId: MOCK_PERIOD_TEACHER_ID,
      note: "Ôn lại quy tắc chuỗi trước khi vào bài mới.",
      lessonPlanId: null,
      materials: [
        { title: "GeoGebra tiếp tuyến", url: "https://geogebra.org/m/abc" },
      ],
      createdAt: `${TUE}T01:00:00Z`,
      updatedAt: `${TUE}T01:00:00Z`,
    },
  ];
}
