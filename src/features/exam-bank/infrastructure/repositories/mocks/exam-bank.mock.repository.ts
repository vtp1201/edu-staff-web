import "server-only";
import { mockDelay } from "@/bootstrap/lib/mock";
import type { ExamBankDetail } from "../../../domain/entities/exam-bank-detail.entity";
import type { ExamBankFilter } from "../../../domain/entities/exam-bank-filter.entity";
import type {
  CreateExamInput,
  UpdateExamInput,
} from "../../../domain/entities/exam-bank-input.entity";
import type { ExamBankSummary } from "../../../domain/entities/exam-bank-summary.entity";
import type { IExamBankRepository } from "../../../domain/repositories/i-exam-bank.repository";
import { MOCK_EXAM_BANK, MOCK_SUBJECTS, MOCK_TEACHERS } from "./fixtures";

// Module-level mutable store seeded from fixtures (mock-first wiring pattern).
const store = new Map<string, ExamBankDetail>(
  MOCK_EXAM_BANK.map((e) => [e.id, { ...e }]),
);
let idCounter = 100;

const MOCK_CURRENT_TEACHER = MOCK_TEACHERS[0];

function subjectNameOf(subjectId: string): string {
  return MOCK_SUBJECTS.find((s) => s.id === subjectId)?.name ?? "Môn học";
}

function toSummary(d: ExamBankDetail): ExamBankSummary {
  const { questions: _questions, ...summary } = d;
  return { ...summary, totalQuestions: d.questions.length };
}

export class MockExamBankRepository implements IExamBankRepository {
  async listExamBank(filter: ExamBankFilter): Promise<ExamBankSummary[]> {
    await mockDelay(200);
    let items = Array.from(store.values());

    if (filter.status) {
      items = items.filter((e) => e.status === filter.status);
    }
    if (filter.subjectId) {
      items = items.filter((e) => e.subjectId === filter.subjectId);
    }
    if (filter.teacherId) {
      items = items.filter((e) => e.teacherId === filter.teacherId);
    }
    if (filter.search) {
      const query = filter.search.toLowerCase();
      items = items.filter((e) => e.title.toLowerCase().includes(query));
    }

    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return items.map(toSummary);
  }

  async getExamDetail(id: string): Promise<ExamBankDetail> {
    await mockDelay(150);
    const found = store.get(id);
    if (!found) throw new Error("not-found");
    return structuredClone(found);
  }

  async createExam(input: CreateExamInput): Promise<ExamBankDetail> {
    await mockDelay(350);
    idCounter += 1;
    const id = `e-mock-${idCounter}`;
    const detail: ExamBankDetail = {
      id,
      title: input.title,
      subjectId: input.subjectId,
      subjectName: subjectNameOf(input.subjectId),
      teacherId: MOCK_CURRENT_TEACHER.id,
      teacherName: MOCK_CURRENT_TEACHER.name,
      totalQuestions: input.questions.length,
      durationMinutes: input.durationMinutes,
      maxAttempts: input.maxAttempts,
      status: "draft",
      createdAt: new Date().toISOString().slice(0, 10),
      questions: input.questions.map((q, i) => ({ ...q, index: i })),
    };
    store.set(id, detail);
    return structuredClone(detail);
  }

  async updateExam(
    id: string,
    input: UpdateExamInput,
  ): Promise<ExamBankDetail> {
    await mockDelay(300);
    const existing = store.get(id);
    if (!existing) throw new Error("not-found");
    const updated: ExamBankDetail = {
      ...existing,
      title: input.title,
      subjectId: input.subjectId,
      subjectName: subjectNameOf(input.subjectId),
      durationMinutes: input.durationMinutes,
      maxAttempts: input.maxAttempts,
      totalQuestions: input.questions.length,
      questions: input.questions.map((q, i) => ({ ...q, index: i })),
    };
    store.set(id, updated);
    return structuredClone(updated);
  }

  async publishExam(id: string): Promise<ExamBankSummary> {
    await mockDelay(250);
    const existing = store.get(id);
    if (!existing) throw new Error("not-found");
    const published: ExamBankDetail = { ...existing, status: "published" };
    store.set(id, published);
    return toSummary(published);
  }

  async deleteExam(id: string): Promise<void> {
    await mockDelay(200);
    const existing = store.get(id);
    if (!existing) throw new Error("not-found");
    if (existing.status === "published") {
      throw new Error("cannot-delete-published");
    }
    store.delete(id);
  }
}
