/**
 * Wire DTOs for the `core` `exercisebank` sub-domain (post-envelope-unwrap,
 * camelCase). Ground-truthed against the Go `QuestionResponse` this session.
 *
 * `expectedAnswer` is `*string`/`omitempty` — the key may be ABSENT, `null`, or
 * a string; the mapper normalizes absent/empty to `null`. `publishedAt` is
 * `omitempty` — ABSENT for a DRAFT (not `""`, not `null`).
 */
export type WireQuestionType = "ESSAY" | "SHORT_ANSWER" | "FILL_IN";
export type WireDifficulty = "EASY" | "MEDIUM" | "HARD";
export type WireQuestionStatus = "DRAFT" | "PUBLISHED";

export interface QuestionResponseDto {
  id: string;
  tenantId: string;
  authorId: string;
  questionType: WireQuestionType;
  subjectId: string;
  gradeLevel: string;
  difficulty: WireDifficulty;
  body: string;
  expectedAnswer?: string | null;
  status: WireQuestionStatus;
  tags: string[];
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** List endpoints wrap the item array (INT-201 / INT-202). */
export interface ListQuestionsResponseDto {
  items: QuestionResponseDto[];
}
