import type {
  CourseStatus,
  CourseTone,
} from "@/features/lms/domain/entities/course.entity";

export interface CourseCardVm {
  id: string;
  name: string;
  teacherName: string;
  /** Pre-resolved semantic tone — RSC maps course color → design-system tone. */
  tone: CourseTone;
  lessonsDone: number;
  lessonsTotal: number;
  /** 0-100, pre-computed (done/total) — client never divides. */
  progressPct: number;
  /** null renders as "—". */
  gradeAvg: number | null;
  status: CourseStatus;
  /** RSC pre-computes the route — client never concatenates strings. */
  href: string;
}

export interface StudentCoursesScreenVm {
  courses: CourseCardVm[];
  errorKey: "forbidden" | "unknown" | null;
}

export type CourseTab = "all" | "in-progress" | "completed";
