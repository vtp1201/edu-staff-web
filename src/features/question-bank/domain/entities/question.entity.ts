/**
 * Question-bank domain entity — mirrors the `core` service `exercisebank`
 * sub-domain `QuestionResponse` (US-E11.9 spec §6.3, ground-truthed against the
 * Go source this session). Pure TS, zero framework deps.
 *
 * `expectedAnswer` is `string | null`: the wire tags it `*string` /
 * `omitempty`, so the mapper normalizes an absent/empty key to `null`
 * ("no reference answer"), never to `""`. It is OPTIONAL for ALL 3 question
 * types on create AND update, and NEVER gates publish (FR-007).
 *
 * `publishedAt` is OPTIONAL: the wire omits the key (`omitempty`) for a DRAFT,
 * so the mapper leaves it `undefined` — "not published" is the absence of the
 * key, never an error/empty-string case (mirrors lesson-plan).
 */
export type QuestionType = "ESSAY" | "SHORT_ANSWER" | "FILL_IN";
export type Difficulty = "EASY" | "MEDIUM" | "HARD";
export type QuestionStatus = "DRAFT" | "PUBLISHED";

/** All 14 fields per spec §6.3 (authoritative over §10's "12 fields" typo). */
export interface QuestionEntity {
  id: string;
  tenantId: string;
  authorId: string;
  /** Immutable after create (Update DTO omits it, FR-009). */
  questionType: QuestionType;
  /** Immutable after create (FR-009). */
  subjectId: string;
  /** Immutable after create (FR-009). */
  gradeLevel: string;
  /** Immutable after create (FR-009). */
  difficulty: Difficulty;
  body: string;
  /** `null` when no reference answer (never `""`). */
  expectedAnswer: string | null;
  status: QuestionStatus;
  /** `[]`, never `null` (server normalizes; mapper defends). */
  tags: string[];
  /** RFC3339; absent for DRAFT. */
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** POST body (create) — all 4 immutable fields settable here only. */
export interface CreateQuestionInput {
  questionType: QuestionType;
  subjectId: string;
  gradeLevel: string;
  difficulty: Difficulty;
  body: string;
  expectedAnswer?: string;
  tags?: string[];
}

/**
 * PUT body (update) — ONLY `body`/`expectedAnswer`/`tags` (FR-009 corrected:
 * questionType/subjectId/gradeLevel/difficulty are ALL immutable post-create
 * and ABSENT from the update DTO).
 */
export interface UpdateQuestionInput {
  body: string;
  expectedAnswer?: string;
  tags?: string[];
}

/** A single cursor-paginated page of questions (INT-201 / INT-202). */
export interface QuestionPage {
  items: QuestionEntity[];
  nextCursor?: string;
  hasMore: boolean;
}

/** INT-202 — own list. No server filter params at all beyond cursor/limit. */
export interface ListMyQuestionsParams {
  cursor?: string;
  limit?: number;
}

/**
 * INT-201 — cross-teacher PUBLISHED search. `subjectId`/`tag` are the mandatory
 * gate satisfiers; `gradeLevel`/`difficulty` narrow results ONLY in
 * subject-mode (ignored server-side in tag-only mode, FR-005 split table).
 */
export interface SearchQuestionsParams {
  subjectId?: string;
  tag?: string;
  gradeLevel?: string;
  difficulty?: string;
  cursor?: string;
  limit?: number;
}

/** Max tags per question / max chars per tag (ground-truthed request validate). */
export const MAX_TAGS = 10;
export const MAX_TAG_LENGTH = 50;
export const MAX_BODY_LENGTH = 5000;
/** Client-side UX floor only (BE enforces "required" + max 5000, no minimum). */
export const MIN_BODY_LENGTH = 4;
export const MAX_EXPECTED_ANSWER_LENGTH = 5000;
