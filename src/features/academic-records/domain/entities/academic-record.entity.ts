export type TermStatus = "PENDING" | "SEALED" | "UNSEALED";
export type ConductGrade = "Tot" | "Kha" | "TrungBinh" | "Yeu";

export interface SubjectScore {
  subjectId: string;
  subjectName: string; // already localized from API
  tx1: number | null;
  tx2: number | null;
  giuaKy: number | null;
  cuoiKy: number | null;
  termAvg: number | null; // computed by mapper: weighted (×1,×1,×2,×3) / 7
  rankBand: string | null; // use getRankBand on termAvg
}

export interface TermRecord {
  termId: "HK1" | "HK2";
  status: TermStatus;
  classId: string | null;
  conductGrade: ConductGrade | null;
  sealedAt: string | null; // ISO date string
  sealedBy: string | null;
  unsealedAt: string | null;
  unsealReason: string | null;
  subjects: SubjectScore[];
  gpa: number | null; // avg of all termAvg values
}

export interface AcademicYear {
  yearId: string; // e.g. "2025-2026"
  yearLabel: string; // e.g. "2025 — 2026"
  classId: string | null;
  grade: number | null;
  isCurrent: boolean;
  sealStatus: "all_sealed" | "partial" | "none" | "unsealed_in_year";
  terms: TermRecord[];
}

export interface AcademicRecord {
  studentId: string;
  studentName: string;
  studentCode: string;
  dateOfBirth: string | null;
  currentClassId: string | null;
  currentSchoolYear: string | null;
  years: AcademicYear[];
  sealed: boolean; // true if ALL years/terms are SEALED
  sealedAt: string | null;
  sealedBy: string | null;
}
