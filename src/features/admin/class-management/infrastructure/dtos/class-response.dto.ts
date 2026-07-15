/**
 * Real wire shape — `core` `ClassResponse` (US-E18.4). No `studentCount` and
 * no homeroom fields on the wire; those are derived separately (see
 * `class-management.repository.ts`). `id`→`classId`, `academicYear`→
 * `academicYearLabel` vs the mock-first guess (US-E06.3).
 */
export interface ClassResponseDto {
  classId: string;
  tenantId: string;
  name: string;
  gradeLevel: number;
  academicYearLabel: string;
  status: "ACTIVE" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
}

export interface CreateClassRequestDto {
  name: string;
  gradeLevel: number;
  academicYearLabel: string;
}

export interface UpdateClassRequestDto {
  name: string;
  gradeLevel: number;
}
