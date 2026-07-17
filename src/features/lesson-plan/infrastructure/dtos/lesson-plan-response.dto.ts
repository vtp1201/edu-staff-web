/**
 * Wire DTOs for the `core` lessonplan sub-domain (post-envelope-unwrap,
 * camelCase). Ground-truthed against
 * `core/internal/lms/lessonplan/adapter/http/dto/response.go` this session.
 *
 * `publishedAt` is optional: the Go struct tags it `omitempty`, so the key is
 * ABSENT for a DRAFT (not `""`, not `null`).
 */
export type WireLessonPlanStatus = "DRAFT" | "PUBLISHED";

export interface LessonPlanResponseDto {
  planId: string;
  teacherId: string;
  subjectId: string;
  gradeLevel: string;
  title: string;
  objectives: string;
  contentOutline: string;
  activities: string;
  assessmentMethod: string;
  status: WireLessonPlanStatus;
  tags: string[];
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** List endpoints wrap the item array (INT-118-02 / INT-118-03). */
export interface ListLessonPlansResponseDto {
  items: LessonPlanResponseDto[];
}
