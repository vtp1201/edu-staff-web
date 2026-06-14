/** `GET /core/api/v1/classes` item shape (core ClassResponse). camelCase wire.
 *  Note: no student-count field — counts come from the per-class roster. */
export interface TeacherClassResponseDto {
  classId: string;
  tenantId: string;
  name: string;
  gradeLevel: number;
  academicYearLabel: string;
  status: string;
  /** Homeroom teacher (GVCN) member id. May be absent in early BE wire format
   *  (mock-first): when omitted, the mapper treats the class as non-homeroom. */
  homeroomTeacherId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type TeacherClassesResponseDto = TeacherClassResponseDto[];
