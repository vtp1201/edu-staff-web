export interface SchoolConfigResponseDto {
  gradeLevelRange: { minGrade: number; maxGrade: number } | null;
  operationalSettings: { gradePublishMode: string };
  activeClassCount: number;
}

export interface SetupStatusResponseDto {
  gradeLevels: boolean;
  academicCalendar: boolean;
  subjects: boolean;
  assessmentScheme: boolean;
  classes: boolean;
}
