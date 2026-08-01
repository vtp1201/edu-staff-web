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
  /** Whether creating a NEW paper is supported in this environment. False in
   *  real mode: `POST /exam-papers` is metadata-only, so the builder cannot
   *  round-trip a from-scratch paper's questions (ADR 0056 Amendment 2). Only
   *  the Create affordance + its explanatory note hang off this. */
  authoringEnabled: boolean;
  /** Whether editing/deleting an existing paper is supported. True in real mode
   *  too since core US-152 (US-E18.28) — the per-paper PATCH/DELETE and the
   *  question-level routes are wired. False for the read-only admin view. */
  editingEnabled: boolean;
  publishAction(id: string): Promise<ActionResult>;
  deleteAction(id: string): Promise<ActionResult>;
}
