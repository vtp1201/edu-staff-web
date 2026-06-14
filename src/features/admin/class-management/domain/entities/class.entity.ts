export type ClassStatus = "ACTIVE" | "ARCHIVED";

export interface Class {
  id: string;
  name: string;
  gradeLevel: number;
  status: ClassStatus;
  academicYear: string; // e.g. "2025-2026"
  studentCount: number;
  homeroomTeacherId: string | null;
  homeroomTeacherName: string | null;
}

export interface CreateClassInput {
  name: string;
  gradeLevel: number;
  academicYear: string;
}

export interface RenameClassInput {
  name?: string;
  gradeLevel?: number;
}
