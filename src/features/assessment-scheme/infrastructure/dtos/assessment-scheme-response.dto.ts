export interface GradeScaleResponseDto {
  type: string;
  maxScore: number;
  bands: Array<{
    id: string;
    label: string;
    minThreshold: number;
    colorToken: string;
  }>;
}

export interface AssessmentSchemeResponseDto {
  subjectId: string;
  yearLabel: string;
  columns: Array<{
    id: string;
    type: string;
    label: string;
    count: number;
    weight: number;
  }>;
}

export interface SubjectForGradeDto {
  id: string;
  name: string;
  gradeLevel: number;
  requiredAssessmentCount: number | null;
}
