/** Enrollment/progress status of a course, derived from done/total lessons. */
export type CourseStatus = "not-started" | "in-progress" | "completed";

/** Semantic design-system tone a course is displayed with. Never a raw hex. */
export type CourseTone =
  | "primary"
  | "success"
  | "warning"
  | "purple"
  | "teal"
  | "error";

/** Progress of a course — computed by `calculateCourseProgress` (single source). */
export interface CourseProgress {
  done: number;
  total: number;
  /** 0-100, rounded. */
  pct: number;
  status: CourseStatus;
}

/** List-view shape of a course the student is enrolled in. */
export interface CourseSummary {
  id: string;
  name: string;
  teacherName: string;
  tone: CourseTone;
  gradeAvg: number | null;
  progress: CourseProgress;
}

/** Minimal course header carried alongside the lesson hierarchy. */
export interface CourseHeader {
  id: string;
  name: string;
  tone: CourseTone;
}
