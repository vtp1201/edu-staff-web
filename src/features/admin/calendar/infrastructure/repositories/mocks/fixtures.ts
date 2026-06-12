import type { AcademicYear } from "../../../domain/entities/academic-year.entity";

/** Seed data from `design_src/edu/calendar.jsx` (CAL_SEED_YEARS). */
export const CAL_SEED_YEARS: AcademicYear[] = [
  {
    id: "ay2025",
    label: "2025–2026",
    isActive: true,
    terms: [
      {
        id: "t1",
        name: "Học kỳ 1",
        startDate: "2025-09-05",
        endDate: "2026-01-15",
        hasGrades: true,
      },
      {
        id: "t2",
        name: "Học kỳ 2",
        startDate: "2026-01-20",
        endDate: "2026-05-31",
        hasGrades: false,
      },
    ],
  },
  {
    id: "ay2024",
    label: "2024–2025",
    isActive: false,
    terms: [
      {
        id: "t3",
        name: "Học kỳ 1",
        startDate: "2024-09-04",
        endDate: "2025-01-12",
        hasGrades: true,
      },
      {
        id: "t4",
        name: "Học kỳ 2",
        startDate: "2025-01-17",
        endDate: "2025-05-30",
        hasGrades: true,
      },
    ],
  },
];
