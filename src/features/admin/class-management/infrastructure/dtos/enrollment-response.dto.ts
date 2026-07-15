/**
 * Real wire shape — `core` `EnrollmentResponse` (US-E18.4). Only used to
 * count a class's roster (`studentCount` is not on `ClassResponse` — derived
 * by paginating this endpoint to completion and counting items); no field
 * beyond `enrollmentId` is currently consumed.
 */
export interface EnrollmentResponseDto {
  enrollmentId: string;
  classId: string;
  studentMemberId: string;
  academicYearLabel: string;
  enrolledAt: string;
}
