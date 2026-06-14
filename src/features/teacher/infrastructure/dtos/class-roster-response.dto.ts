/** `GET /core/api/v1/classes/{classId}/students` item shape (core
 *  EnrollmentResponse). Only the count is needed for the dashboard total. */
export interface ClassRosterItemDto {
  enrollmentId: string;
  classId: string;
  studentMemberId: string;
  /** Display name — BE may not return it yet; the mapper falls back to the id. */
  displayName?: string;
  academicYearLabel: string;
  enrolledAt: string;
  /** Enrollment status; absent → treated as "active". */
  status?: string;
}

export type ClassRosterResponseDto = ClassRosterItemDto[];
