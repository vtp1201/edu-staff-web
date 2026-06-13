import type { SubjectStatus } from "../../domain/entities/subject.entity";

export interface SubjectResponseDto {
  id: string;
  parentId: string;
  name: string;
  code: string | null;
  gradeLevel: number;
  status: SubjectStatus;
  inUse: boolean;
  periodCount: number | null;
  requiredAssessmentCount: number | null;
  outcomeTargets: string;
  masterSyllabus: string;
  exerciseBankRef: string;
  examBankRef: string;
}
