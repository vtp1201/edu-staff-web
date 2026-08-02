/** `GET /core/api/v1/classes` item shape (core ClassResponse). camelCase wire. */
export interface TeacherClassResponseDto {
  classId: string;
  tenantId: string;
  name: string;
  gradeLevel: number;
  academicYearLabel: string;
  status: string;
  /** Server-computed enrollment count, enriched on the list endpoint for the
   *  TEACHER branch too (BE US-173) — no roster fan-out needed (US-E18.30). */
  studentCount: number;
  /** Homeroom teacher (GVCN) member id. May be absent in early BE wire format
   *  (mock-first): when omitted, the mapper treats the class as non-homeroom. */
  homeroomTeacherId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type TeacherClassesResponseDto = TeacherClassResponseDto[];
