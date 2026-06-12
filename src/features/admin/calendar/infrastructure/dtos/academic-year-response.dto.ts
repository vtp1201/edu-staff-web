export interface TermDto {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  hasGrades: boolean;
}

export interface AcademicYearDto {
  id: string;
  label: string;
  isActive: boolean;
  terms: TermDto[];
}

export type AcademicYearListResponseDto = AcademicYearDto[];
