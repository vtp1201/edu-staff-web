import type { ExamBankSummary } from "../../domain/entities/exam-bank-summary.entity";
import type { ExamBankFailure } from "../../domain/failures/exam-bank.failure";

export interface SubjectOption {
  id: string;
  name: string;
}

export interface TeacherOption {
  id: string;
  name: string;
}

export type ActionResult =
  | { ok: true }
  | { ok: false; errorKey: ExamBankFailure["type"] };

export interface ExamCardVM {
  id: string;
  title: string;
  subjectName: string;
  totalQuestions: number;
  status: "draft" | "published";
  createdAtDisplay: string;
  canEdit: boolean;
  canDelete: boolean;
  canPublish: boolean;
  editPath: string;
}

export interface ExamBankScreenVM {
  exams: ExamBankSummary[];
  subjects: SubjectOption[];
  teachers: TeacherOption[];
  viewerRole: "teacher" | "admin";
  currentTeacherId: string;
  createPath: string;
  editPathOf: (id: string) => string;
  publishAction(id: string): Promise<ActionResult>;
  deleteAction(id: string): Promise<ActionResult>;
}
