"use client";

import { useCallback, useState } from "react";
import type { ExamBankDetail } from "../../domain/entities/exam-bank-detail.entity";
import type {
  ExamBankOption,
  ExamBankQuestion,
} from "../../domain/entities/exam-bank-question.entity";

export interface ExamBuilderMeta {
  title: string;
  subjectId: string;
  durationMinutes: number;
  maxAttempts: number;
}

const BLANK_OPTIONS: ExamBankOption[] = [
  { id: "A", text: "" },
  { id: "B", text: "" },
  { id: "C", text: "" },
  { id: "D", text: "" },
];

function reindex(questions: ExamBankQuestion[]): ExamBankQuestion[] {
  return questions.map((q, i) => ({ ...q, index: i }));
}

export interface UseExamBuilder {
  meta: ExamBuilderMeta;
  questions: ExamBankQuestion[];
  selectedIdx: number | null;
  isDirty: boolean;
  updateExamMeta: (patch: Partial<ExamBuilderMeta>) => void;
  addQuestion: () => void;
  removeQuestion: (id: string) => void;
  updateQuestion: (id: string, patch: Partial<ExamBankQuestion>) => void;
  reorderQuestions: (fromIdx: number, toIdx: number) => void;
  selectQuestion: (idx: number | null) => void;
}

export function useExamBuilder(initial?: ExamBankDetail): UseExamBuilder {
  const [meta, setMeta] = useState<ExamBuilderMeta>({
    title: initial?.title ?? "",
    subjectId: initial?.subjectId ?? "",
    durationMinutes: initial?.durationMinutes ?? 45,
    maxAttempts: initial?.maxAttempts ?? 1,
  });
  const [questions, setQuestions] = useState<ExamBankQuestion[]>(
    initial ? reindex(initial.questions) : [],
  );
  const [selectedIdx, setSelectedIdx] = useState<number | null>(
    initial && initial.questions.length > 0 ? 0 : null,
  );
  const [isDirty, setIsDirty] = useState(false);

  const updateExamMeta = useCallback((patch: Partial<ExamBuilderMeta>) => {
    setMeta((prev) => ({ ...prev, ...patch }));
    setIsDirty(true);
  }, []);

  const addQuestion = useCallback(() => {
    setQuestions((prev) => {
      const next: ExamBankQuestion = {
        id: `q-${Date.now()}`,
        index: prev.length,
        content: "",
        options: BLANK_OPTIONS.map((o) => ({ ...o })),
        correctOptionId: "",
        difficulty: "medium",
        subjectId: meta.subjectId,
      };
      const updated = [...prev, next];
      setSelectedIdx(updated.length - 1);
      return updated;
    });
    setIsDirty(true);
  }, [meta.subjectId]);

  const removeQuestion = useCallback((id: string) => {
    setQuestions((prev) => {
      const updated = reindex(prev.filter((q) => q.id !== id));
      setSelectedIdx((cur) => {
        if (updated.length === 0) return null;
        if (cur === null) return null;
        return Math.min(cur, updated.length - 1);
      });
      return updated;
    });
    setIsDirty(true);
  }, []);

  const updateQuestion = useCallback(
    (id: string, patch: Partial<ExamBankQuestion>) => {
      setQuestions((prev) =>
        prev.map((q) => (q.id === id ? { ...q, ...patch } : q)),
      );
      setIsDirty(true);
    },
    [],
  );

  const reorderQuestions = useCallback((fromIdx: number, toIdx: number) => {
    setQuestions((prev) => {
      if (
        fromIdx < 0 ||
        toIdx < 0 ||
        fromIdx >= prev.length ||
        toIdx >= prev.length
      ) {
        return prev;
      }
      const copy = [...prev];
      const [moved] = copy.splice(fromIdx, 1);
      copy.splice(toIdx, 0, moved);
      setSelectedIdx(toIdx);
      return reindex(copy);
    });
    setIsDirty(true);
  }, []);

  const selectQuestion = useCallback((idx: number | null) => {
    setSelectedIdx(idx);
  }, []);

  return {
    meta,
    questions,
    selectedIdx,
    isDirty,
    updateExamMeta,
    addQuestion,
    removeQuestion,
    updateQuestion,
    reorderQuestions,
    selectQuestion,
  };
}
