export interface SubjectScoreDto {
  subjectId: string;
  subjectName: string;
  tx1: number | null;
  tx2: number | null;
  giuaKy: number | null;
  cuoiKy: number | null;
}

export interface TermRecordDto {
  termId: "HK1" | "HK2";
  status: "PENDING" | "SEALED" | "UNSEALED";
  classId: string | null;
  conductGrade: string | null; // "Tot"|"Kha"|"TrungBinh"|"Yeu"
  sealedAt: string | null;
  sealedBy: string | null;
  unsealedAt: string | null;
  unsealReason: string | null;
  subjects: SubjectScoreDto[];
}

export interface AcademicYearDto {
  yearId: string;
  yearLabel: string;
  classId: string | null;
  grade: number | null;
  isCurrent: boolean;
  terms: TermRecordDto[];
}

export interface AcademicRecordResponseDto {
  studentId: string;
  studentName: string;
  studentCode: string;
  dateOfBirth: string | null;
  currentClassId: string | null;
  currentSchoolYear: string | null;
  years: AcademicYearDto[];
  sealed: boolean;
  sealedAt: string | null;
  sealedBy: string | null;
}
