import type { PlanCell } from "../../../domain/entities/plan-cell.entity";
import type { TeachingPlan } from "../../../domain/entities/teaching-plan.entity";

/**
 * Generate `count` filled cells laid out row-major across the grid
 * (week-by-week, period-by-period). Mock/seed data — NOT i18n.
 */
function fillCells(
  count: number,
  periodsPerWeek: number,
  titlePrefix: string,
): PlanCell[] {
  const cells: PlanCell[] = [];
  for (let i = 0; i < count; i++) {
    const week = Math.floor(i / periodsPerWeek) + 1;
    const period = (i % periodsPerWeek) + 1;
    cells.push({
      week,
      period,
      title: `${titlePrefix} ${i + 1}`,
      learningObjective: `Mục tiêu bài ${i + 1}`,
    });
  }
  return cells;
}

export const MOCK_TEACHING_PLANS: TeachingPlan[] = [
  {
    id: "plan-1",
    subjectId: "sub-toan",
    classId: "cls-10a",
    term: "HKI",
    status: "DRAFT",
    teacherMemberId: "m-teacher-1",
    weeks: 35,
    periodsPerWeek: 3,
    // 40 of 105 cells (≈38%) — intentionally below 50% to exercise the
    // insufficient-cells rule on submit.
    cells: fillCells(40, 3, "Bài Toán"),
    createdAt: "2026-01-05T01:00:00Z",
    updatedAt: "2026-01-20T08:00:00Z",
  },
  {
    id: "plan-2",
    subjectId: "sub-van",
    classId: "cls-10b",
    term: "HKI",
    status: "SUBMITTED",
    teacherMemberId: "m-teacher-2",
    weeks: 35,
    periodsPerWeek: 4,
    // 100 of 140 cells (≈71%) — above 50%.
    cells: fillCells(100, 4, "Bài Văn"),
    createdAt: "2026-01-03T01:00:00Z",
    updatedAt: "2026-01-22T08:00:00Z",
  },
  {
    id: "plan-3",
    subjectId: "sub-anh",
    classId: "cls-11a",
    term: "HKII",
    status: "REJECTED",
    teacherMemberId: "m-teacher-1",
    rejectionReason: "Chưa đủ nội dung phân phối chương trình",
    weeks: 35,
    periodsPerWeek: 2,
    cells: fillCells(30, 2, "Unit"),
    createdAt: "2026-02-01T01:00:00Z",
    updatedAt: "2026-02-15T08:00:00Z",
  },
];

/** Selector option seed data (mock — NOT i18n). */
export const MOCK_SUBJECTS = [
  { id: "sub-toan", name: "Toán" },
  { id: "sub-van", name: "Ngữ văn" },
  { id: "sub-anh", name: "Tiếng Anh" },
];

export const MOCK_CLASSES = [
  { id: "cls-10a", name: "10A" },
  { id: "cls-10b", name: "10B" },
  { id: "cls-11a", name: "11A" },
];

export const MOCK_TERMS = ["HKI", "HKII"];

/** Teacher member-id → display name (mock — NOT i18n). */
export const MOCK_TEACHER_NAMES: Record<string, string> = {
  "m-teacher-1": "Cô Nguyễn Thị Lan",
  "m-teacher-2": "Thầy Trần Văn Minh",
};
