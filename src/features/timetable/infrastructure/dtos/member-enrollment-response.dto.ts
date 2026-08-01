/**
 * `GET /members/{memberId}/enrollment` (BE US-148). `yearLabel` is omitted by
 * this feature → BE resolves the student's LATEST enrolled academic-year label
 * (greatest lexicographic `academicYearLabel`), which for the conventional
 * `YYYY-YYYY` label equals the current year but is NOT guaranteed to be the
 * tenant's calendar-active year for a free-form label. Documented caveat, not
 * a silent assumption.
 */
export interface MemberEnrollmentResponseDto {
  classId: string;
  className: string;
  gradeLevel: number;
  academicYearLabel: string;
  enrolledAt: string;
}
