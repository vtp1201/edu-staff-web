/** `GET /core/api/v1/classes/{classId}/students` item shape (core
 *  EnrollmentResponse). Only the count is needed for the dashboard total. */
export interface ClassRosterItemDto {
  enrollmentId: string;
  classId: string;
  studentMemberId: string;
  academicYearLabel: string;
  enrolledAt: string;
}

export type ClassRosterResponseDto = ClassRosterItemDto[];
