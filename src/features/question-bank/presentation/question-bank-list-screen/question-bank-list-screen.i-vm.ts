import type {
  Difficulty,
  QuestionEntity,
  QuestionStatus,
  QuestionType,
} from "../../domain/entities/question.entity";
import type { ListActionResult, SubjectOption } from "../shared.i-vm";

/**
 * Client-side + server-eligible filter state (FR-005 split — the screen, NOT
 * this VM, decides which fields become query-key params vs. a client
 * `.filter()`; see state-architecture.md §4).
 */
export interface QuestionBankFilterState {
  tag: string; // free-text; also the FR-002/003 gate-satisfier
  subjectId: string; // "" = all; ALSO a gate-satisfier in scope=search
  gradeLevel: string; // "" = all
  questionType: "" | QuestionType; // "" = all — ALWAYS client-side (FR-005)
  difficulty: "" | Difficulty; // "" = all
  status: "" | QuestionStatus; // "" = all; scope=mine only, ALWAYS client-side
}

/** Row-card view-model — the screen resolves all display strings/derivations. */
export interface QBQuestionCardVM {
  id: string;
  questionType: QuestionType;
  difficulty: Difficulty;
  status: QuestionStatus;
  subjectName: string;
  gradeLevel: string;
  bodyPreview: string; // pre-truncated to 140 chars by the screen (FR-004)
  tags: string[];
  /** scope==='mine' OR own question surfaced in search. Drives action label
   * + whether Edit is shown (authorId===currentTeacherId — UX nicety only). */
  isMine: boolean;
  /** ALWAYS `card.unknownAuthor` on search-scope cards (plan.md §0 decision #2);
   * undefined on scope=mine cards (never rendered). */
  authorLabel?: string;
  openPath: string;
}

/** Redirect notice surfaced on the list after a gated edit-route GET. */
export type QuestionBankListNotice =
  | "not-found"
  | "not-visible"
  | "forbidden-edit"
  | null;

export interface QuestionBankListScreenVM {
  /** First page — scope='mine' (default), seeded by the RSC. null = load failed. */
  initialMinePage: {
    items: QuestionEntity[];
    nextCursor?: string;
    hasMore: boolean;
  } | null;
  subjects: SubjectOption[];
  gradeOptions: string[];
  currentTeacherId: string;
  createPath: string;
  /** RSC-computed prefix; the client builds `${editPathPrefix}/${id}/edit`. */
  editPathPrefix: string;
  /** Route guard rejected a non-teacher (NFR-008/UC-907) — full-page
   * access-denied, no query ever runs. */
  forbidden?: boolean;
  /** Redirect notice from a gated edit-route GET (specific 403 sub-variant). */
  notice: QuestionBankListNotice;
  listMineAction: (cursor?: string) => Promise<ListActionResult>;
  searchAction: (
    params: {
      subjectId?: string;
      tag?: string;
      gradeLevel?: string;
      difficulty?: string;
    },
    cursor?: string,
  ) => Promise<ListActionResult>;
}

export type { SubjectOption };
