export type SubjectStatus = "ACTIVE" | "ARCHIVED";

export interface Subject {
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

export interface CreateSubjectInput {
  parentId: string;
  name: string;
  code: string | null;
  gradeLevel: number;
}

export type PatchSubjectInput = Partial<
  Pick<
    Subject,
    | "name"
    | "code"
    | "periodCount"
    | "requiredAssessmentCount"
    | "outcomeTargets"
    | "masterSyllabus"
    | "exerciseBankRef"
    | "examBankRef"
  >
>;
