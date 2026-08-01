export type ExamOptionId = "A" | "B" | "C" | "D";

export type ExamDifficulty = "easy" | "medium" | "hard";

export interface ExamBankOption {
  id: ExamOptionId;
  text: string;
}

/**
 * Question type as the exam-bank contract models it. The builder only authors
 * MCQ; the other kinds can arrive from the real wire and MUST round-trip
 * unchanged on edit (sending "MCQ" for an essay would corrupt it — US-E18.28).
 */
export type ExamQuestionType = "MCQ" | "ESSAY" | "SHORT_ANSWER" | "FILL_IN";

export interface ExamBankQuestion {
  id: string;
  index: number;
  content: string;
  options: ExamBankOption[];
  correctOptionId: string;
  difficulty: ExamDifficulty;
  subjectId: string;
  /** Absent on builder-authored questions → treated as MCQ on write. */
  questionType?: ExamQuestionType;
  /**
   * Per-question weight. Not authored in the UI (no input field — ADR 0056
   * Amendment 2), but carried through from the wire so an edit round-trip does
   * not silently reset the server's value. Absent → defaults to 1 on write.
   */
  marks?: number;
}
