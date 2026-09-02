/** `GET /core/api/v1/subjects` item — only the two fields the class card needs
 *  to turn `ClassResponse.teachingSubjectIds[]` into readable subject names.
 *  Read straight through the shared endpoint constant; the ADMIN-scoped
 *  `features/admin/subject-catalogue` feature is NOT imported (its DTO models
 *  the full catalogue record and belongs to an admin-gated screen). */
export interface SubjectNameResponseDto {
  subjectId: string;
  name: string;
}

export type SubjectNamesResponseDto = SubjectNameResponseDto[];
