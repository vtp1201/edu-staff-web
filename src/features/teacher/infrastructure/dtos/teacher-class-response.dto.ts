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
  /** Distinct subject ids the CALLER holds a SUBJECT teaching assignment for in
   *  this class (BE US-234, shipped 2026-09-02). Present ONLY on the TEACHER
   *  branch of `GET /classes`; omitted entirely for a homeroom-only row. */
  teachingSubjectIds?: string[];
  /** draft US-255 (`ClassResponseTeacherOverlayDraft`, core `openapi.draft.yaml`)
   *  — NOT deployed. Stays `undefined` on the real wire until BE ships it; the
   *  mapper then leaves the KPI unset and the card hides the tile (ADR 0076). */
  absentToday?: number;
  /** draft US-255 — see `absentToday`. */
  pendingGrading?: number;
  createdAt: string;
  updatedAt: string;
}

export type TeacherClassesResponseDto = TeacherClassResponseDto[];
