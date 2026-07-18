/** `GET /core/api/v1/classes/{classId}/students` item shape (core
 *  EnrollmentResponse) — only the name-join fields are needed here. Same
 *  endpoint/precedent as `teacher-class.repository.ts`'s `getClassStudents`,
 *  duplicated locally (see `class-list-response.dto.ts` header comment). */
export interface ClassRosterItemDto {
  studentMemberId: string;
  /** Display name — BE may not return it yet; the mapper falls back to the id. */
  displayName?: string;
}

export type ClassRosterResponseDto = ClassRosterItemDto[];
