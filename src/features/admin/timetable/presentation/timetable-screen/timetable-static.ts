/**
 * Static reference data for the timetable builder (mock-only for US-E12.5; not
 * fetched from BE in this story). Names are seed data, not UI copy, so they are
 * intentionally not in i18n. Subject colours come from `design_src/edu/timetable.jsx`.
 *
 * Pure client-safe TypeScript — consumed by the page VM builder, the screen, and
 * Storybook. The day/period structural labels (Thứ 2…, Tiết…) ARE translated at
 * presentation; these constants hold only the stable indices/short tokens.
 */

export interface TimetableSubjectRef {
  id: string;
  name: string;
  nameEn: string;
  short: string;
  color: string;
}

export interface TimetableTeacherRef {
  id: string;
  name: string;
  subjectId: string;
  classIds: string[];
}

export interface TimetableClassRef {
  id: string;
  name: string;
  gradeLevel: number;
}

export interface TimetableYearRef {
  id: string;
  label: string;
}

export type TimetablePeriodRef =
  | { n: number; start: string; end: string }
  | { recess: true };

export const TT_YEARS: TimetableYearRef[] = [
  { id: "2024-2025", label: "2024–2025" },
  { id: "2025-2026", label: "2025–2026" },
];

export const TT_CLASSES: TimetableClassRef[] = [
  { id: "cls-10a1", name: "10A1", gradeLevel: 10 },
  { id: "cls-10a2", name: "10A2", gradeLevel: 10 },
  { id: "cls-11a1", name: "11A1", gradeLevel: 11 },
  { id: "cls-11b2", name: "11B2", gradeLevel: 11 },
  { id: "cls-12c1", name: "12C1", gradeLevel: 12 },
];

export const TT_SUBJECTS: TimetableSubjectRef[] = [
  {
    id: "sub-math",
    name: "Toán",
    nameEn: "Math",
    short: "Toán",
    color: "#5D87FF",
  },
  {
    id: "sub-lit",
    name: "Ngữ Văn",
    nameEn: "Literature",
    short: "Văn",
    color: "#7B5EA7",
  },
  {
    id: "sub-eng",
    name: "Tiếng Anh",
    nameEn: "English",
    short: "Anh",
    color: "#13DEB9",
  },
  {
    id: "sub-phys",
    name: "Vật Lý",
    nameEn: "Physics",
    short: "Lý",
    color: "#FFAE1F",
  },
  {
    id: "sub-chem",
    name: "Hoá Học",
    nameEn: "Chemistry",
    short: "Hoá",
    color: "#FA896B",
  },
  {
    id: "sub-bio",
    name: "Sinh Học",
    nameEn: "Biology",
    short: "Sinh",
    color: "#00B8A9",
  },
  {
    id: "sub-hist",
    name: "Lịch Sử",
    nameEn: "History",
    short: "Sử",
    color: "#539BFF",
  },
  {
    id: "sub-geo",
    name: "Địa Lý",
    nameEn: "Geography",
    short: "Địa",
    color: "#946000",
  },
  {
    id: "sub-civic",
    name: "GDCD",
    nameEn: "Civics",
    short: "GDCD",
    color: "#8898A9",
  },
  {
    id: "sub-pe",
    name: "Thể Dục",
    nameEn: "PE",
    short: "TD",
    color: "#4570EA",
  },
];

// TeachingAssignment (ADR 0029): teacher → subject → eligible classes.
export const TT_TEACHERS: TimetableTeacherRef[] = [
  {
    id: "tch-1",
    name: "Nguyễn Thị Hương",
    subjectId: "sub-math",
    classIds: ["cls-10a1", "cls-10a2", "cls-11b2"],
  },
  {
    id: "tch-2",
    name: "Trần Văn Minh",
    subjectId: "sub-phys",
    classIds: ["cls-10a1", "cls-11b2", "cls-12c1"],
  },
  {
    id: "tch-3",
    name: "Lê Thị Hoa",
    subjectId: "sub-chem",
    classIds: ["cls-10a1", "cls-11a1", "cls-12c1"],
  },
  {
    id: "tch-4",
    name: "Phạm Quốc Bảo",
    subjectId: "sub-lit",
    classIds: ["cls-10a1", "cls-10a2", "cls-12c1"],
  },
  {
    id: "tch-5",
    name: "Đỗ Thị Mai",
    subjectId: "sub-eng",
    classIds: ["cls-10a1", "cls-11a1", "cls-11b2"],
  },
  {
    id: "tch-6",
    name: "Vũ Văn Tài",
    subjectId: "sub-hist",
    classIds: ["cls-10a1", "cls-10a2", "cls-11a1"],
  },
  {
    id: "tch-7",
    name: "Nguyễn Văn Long",
    subjectId: "sub-bio",
    classIds: ["cls-10a1", "cls-11a1", "cls-12c1"],
  },
  {
    id: "tch-8",
    name: "Mai Thị Trang",
    subjectId: "sub-geo",
    classIds: ["cls-10a1", "cls-11a1", "cls-11b2"],
  },
  {
    id: "tch-9",
    name: "Hoàng Văn Khôi",
    subjectId: "sub-civic",
    classIds: ["cls-10a1", "cls-10a2", "cls-11b2"],
  },
  {
    id: "tch-10",
    name: "Lê Văn Sơn",
    subjectId: "sub-pe",
    classIds: ["cls-10a1", "cls-10a2", "cls-11b2", "cls-12c1"],
  },
  {
    id: "tch-11",
    name: "Phan Thị Lan",
    subjectId: "sub-math",
    classIds: ["cls-10a2", "cls-11a1", "cls-12c1"],
  },
];

// Days Mon..Sat (index 0..5). vi/en are translated at presentation via i18n keys;
// these literals are the fallback labels used by the VM builder.
export const TT_DAYS = [
  { vi: "Thứ 2", en: "Mon" },
  { vi: "Thứ 3", en: "Tue" },
  { vi: "Thứ 4", en: "Wed" },
  { vi: "Thứ 5", en: "Thu" },
  { vi: "Thứ 6", en: "Fri" },
  { vi: "Thứ 7", en: "Sat" },
] as const;

// Periods 1..10 with a lunch recess between periods 5 and 6.
export const TT_PERIODS: TimetablePeriodRef[] = [
  { n: 1, start: "07:00", end: "07:45" },
  { n: 2, start: "07:50", end: "08:35" },
  { n: 3, start: "08:45", end: "09:30" },
  { n: 4, start: "09:35", end: "10:20" },
  { n: 5, start: "10:25", end: "11:10" },
  { recess: true },
  { n: 6, start: "13:30", end: "14:15" },
  { n: 7, start: "14:20", end: "15:05" },
  { n: 8, start: "15:15", end: "16:00" },
  { n: 9, start: "16:05", end: "16:50" },
  { n: 10, start: "16:55", end: "17:40" },
];

export const findSubject = (id: string): TimetableSubjectRef | undefined =>
  TT_SUBJECTS.find((s) => s.id === id);
export const findTeacher = (id: string): TimetableTeacherRef | undefined =>
  TT_TEACHERS.find((t) => t.id === id);
export const findClass = (id: string): TimetableClassRef | undefined =>
  TT_CLASSES.find((c) => c.id === id);
