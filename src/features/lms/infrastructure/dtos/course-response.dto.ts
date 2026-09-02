/** `services/lms` `Course` / `CourseSummary` — camelCase, 1:1 with openapi.yaml. */

export type CourseStatusDto = "DRAFT" | "PUBLISHED";

/** `GET /courses/{courseId}` payload (envelope already unwrapped). */
export interface CourseResponseDto {
  id: string;
  classId: string;
  subjectId: string;
  title: string;
  description: string;
  status: CourseStatusDto;
  isDefault: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

/** `GET /courses?classId=` row — NO `description`, NO `createdAt` (by-class table). */
export interface CourseSummaryResponseDto {
  id: string;
  classId: string;
  subjectId: string;
  title: string;
  status: CourseStatusDto;
  isDefault: boolean;
  createdBy: string;
  updatedAt: string;
  publishedAt: string | null;
}
