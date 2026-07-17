import type {
  ExamBankStatus,
  ExamBankSummary,
} from "../../domain/entities/exam-bank-summary.entity";
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
  status: ExamBankStatus;
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
  /** Path prefix for edit routes; client builds `${editPathPrefix}/${id}/edit`.
   *  A string (not a function) so it serializes across the RSC→client boundary. */
  editPathPrefix: string;
  /** Whether paper authoring (create/edit/delete) is supported in this
   *  environment. False in real mode: the core contract has no create-with-
   *  questions / metadata-update / delete endpoint (US-E18.15/ADR 0056), so the
   *  builder + delete affordance are hidden. Publish stays enabled (it IS wired). */
  authoringEnabled: boolean;
  publishAction(id: string): Promise<ActionResult>;
  deleteAction(id: string): Promise<ActionResult>;
}
