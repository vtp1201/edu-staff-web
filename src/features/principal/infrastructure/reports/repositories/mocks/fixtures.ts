import type { AttendanceTrendPointEntity } from "@/features/principal/domain/reports/entities/attendance-trend-point.entity";
import type { ReportListItemEntity } from "@/features/principal/domain/reports/entities/report-list-item.entity";
import type {
  ReportsSummaryEntity,
  Term,
} from "@/features/principal/domain/reports/entities/reports-summary.entity";
import type { SubjectAverageEntity } from "@/features/principal/domain/reports/entities/subject-average.entity";

// Mock/seed data — subject names, report titles, week labels are DATA, not UI
// copy (i18n.md): they stay here, never in messages/*.

export const SUMMARY_BY_TERM: Record<Term, ReportsSummaryEntity> = {
  HK1: {
    totalStudents: 1248,
    totalStudentsTrend: 2.1,
    schoolAverage: 7.35,
    schoolAverageTrend: null, // first term — no prior baseline
    attendanceRate: 96.9,
    attendanceRateTrend: null,
    incidentCount: 27,
    incidentCountTrend: null,
  },
  HK2: {
    totalStudents: 1248,
    totalStudentsTrend: 2.1,
    schoolAverage: 7.42,
    schoolAverageTrend: 0.8,
    attendanceRate: 96.4,
    attendanceRateTrend: -0.5,
    incidentCount: 23,
    incidentCountTrend: -12,
  },
  FULL_YEAR: {
    totalStudents: 1248,
    totalStudentsTrend: 2.1,
    schoolAverage: 7.39,
    schoolAverageTrend: 0.3,
    attendanceRate: 96.6,
    attendanceRateTrend: 0.2,
    incidentCount: 50,
    incidentCountTrend: -8,
  },
};

const SUBJECTS_HK1: SubjectAverageEntity[] = [
  { subjectId: "s-math", subjectName: "Toán", average: 7.6 },
  { subjectId: "s-lit", subjectName: "Ngữ văn", average: 7.0 },
  { subjectId: "s-eng", subjectName: "T. Anh", average: 6.7 },
  { subjectId: "s-phy", subjectName: "Vật lý", average: 7.2 },
  { subjectId: "s-che", subjectName: "Hoá học", average: 6.9 },
  { subjectId: "s-bio", subjectName: "Sinh học", average: 7.4 },
  { subjectId: "s-his", subjectName: "Lịch sử", average: 8.0 },
  { subjectId: "s-geo", subjectName: "Địa lý", average: 7.7 },
];

const SUBJECTS_HK2: SubjectAverageEntity[] = [
  { subjectId: "s-math", subjectName: "Toán", average: 7.8 },
  { subjectId: "s-lit", subjectName: "Ngữ văn", average: 7.1 },
  { subjectId: "s-eng", subjectName: "T. Anh", average: 6.9 },
  { subjectId: "s-phy", subjectName: "Vật lý", average: 7.4 },
  { subjectId: "s-che", subjectName: "Hoá học", average: 7.0 },
  { subjectId: "s-bio", subjectName: "Sinh học", average: 7.6 },
  { subjectId: "s-his", subjectName: "Lịch sử", average: 8.1 },
  { subjectId: "s-geo", subjectName: "Địa lý", average: 7.9 },
];

export const SUBJECTS_BY_TERM: Record<Term, SubjectAverageEntity[]> = {
  HK1: SUBJECTS_HK1,
  HK2: SUBJECTS_HK2,
  FULL_YEAR: SUBJECTS_HK2.map((s, i) => ({
    ...s,
    average: Math.round(((s.average + SUBJECTS_HK1[i].average) / 2) * 10) / 10,
  })),
};

const WEEKS_HK1: AttendanceTrendPointEntity[] = [
  { weekLabel: "T1", rate: 97.0 },
  { weekLabel: "T2", rate: 96.5 },
  { weekLabel: "T3", rate: 95.4 },
  { weekLabel: "T4", rate: 97.1 },
  { weekLabel: "T5", rate: 96.8 },
  { weekLabel: "T6", rate: 96.6 },
];

const WEEKS_HK2: AttendanceTrendPointEntity[] = [
  { weekLabel: "T1", rate: 97.2 },
  { weekLabel: "T2", rate: 96.8 },
  { weekLabel: "T3", rate: 95.1 },
  { weekLabel: "T4", rate: 96.9 },
  { weekLabel: "T5", rate: 97.6 },
  { weekLabel: "T6", rate: 96.4 },
];

export const WEEKS_BY_TERM: Record<Term, AttendanceTrendPointEntity[]> = {
  HK1: WEEKS_HK1,
  HK2: WEEKS_HK2,
  FULL_YEAR: WEEKS_HK2,
};

export const REPORTS_BY_TERM: Record<Term, ReportListItemEntity[]> = {
  HK1: [
    {
      id: "r1",
      name: "Báo cáo sơ kết Học kỳ I",
      term: "HK1",
      createdAt: "2026-01-10T02:00:00.000Z",
      status: "ready",
    },
  ],
  HK2: [
    {
      id: "r2",
      name: "Thống kê điểm giữa kỳ II",
      term: "HK2",
      createdAt: "2026-03-20T02:00:00.000Z",
      status: "ready",
    },
    {
      id: "r3",
      name: "Báo cáo chuyên cần tháng 6",
      term: "HK2",
      createdAt: "2026-07-01T02:00:00.000Z",
      status: "ready",
    },
  ],
  // Empty by default → exercises the periodic-reports empty state (FR-007).
  FULL_YEAR: [],
};
