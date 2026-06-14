/** `GET /core/api/v1/classes` item shape (core ClassResponse). camelCase wire.
 *  Note: no student-count field — counts come from the per-class roster. */
export interface TeacherClassResponseDto {
  classId: string;
  tenantId: string;
  name: string;
  gradeLevel: number;
  academicYearLabel: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export type TeacherClassesResponseDto = TeacherClassResponseDto[];
