/**
 * Lesson-plan domain entity — mirrors the `core` service `LessonPlanResponse`
 * (US-E11.8 spec §6, ground-truthed `core/internal/lms/lessonplan/adapter/http/
 * dto/response.go`). Pure TS, zero framework deps.
 *
 * `publishedAt` is OPTIONAL: the wire omits the key (`omitempty`) for a DRAFT,
 * so the mapper leaves it `undefined` — "not published" is the absence of the
 * key, never an error/empty-string case.
 */
export type LessonPlanStatus = "DRAFT" | "PUBLISHED";

export interface LessonPlanEntity {
  planId: string;
  teacherId: string;
  /** Immutable after create (Update DTO omits it). */
  subjectId: string;
  gradeLevel: string;
  title: string;
  objectives: string;
  contentOutline: string;
  activities: string;
  assessmentMethod: string;
  status: LessonPlanStatus;
  /** `[]`, never `null` (server normalizes). */
  tags: string[];
  /** RFC3339; absent for DRAFT. */
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** The 4 named document sections — exactly these, no richer/nested schema. */
export type DocumentSectionKey =
  | "objectives"
  | "contentOutline"
  | "activities"
  | "assessmentMethod";

export const DOCUMENT_SECTION_KEYS: readonly DocumentSectionKey[] = [
  "objectives",
  "contentOutline",
  "activities",
  "assessmentMethod",
] as const;

/** POST body (create) — `subjectId` present; 4 sections optional at create time. */
export interface CreateLessonPlanInput {
  subjectId: string;
  gradeLevel: string;
  title: string;
  objectives?: string;
  contentOutline?: string;
  activities?: string;
  assessmentMethod?: string;
  tags?: string[];
}

/** PUT body (update) — NO `subjectId` (immutable post-create, FR-002/AC-002.8). */
export interface UpdateLessonPlanInput {
  gradeLevel: string;
  title: string;
  objectives?: string;
  contentOutline?: string;
  activities?: string;
  assessmentMethod?: string;
  tags?: string[];
}

/** A single cursor-paginated page of plans (INT-118-02 / INT-118-03). */
export interface LessonPlanPage {
  items: LessonPlanEntity[];
  nextCursor?: string;
  hasMore: boolean;
}

export interface ListMyLessonPlansParams {
  cursor?: string;
  limit?: number;
}

export interface ListLessonPlansBySubjectParams {
  subjectId: string;
  /** The ONE real server-side filter beyond cursor/limit (INT-118-03). */
  tag?: string;
  cursor?: string;
  limit?: number;
}

/** Max tags per plan / max chars per tag (ground-truthed request.go validate tags). */
export const MAX_TAGS = 10;
export const MAX_TAG_LENGTH = 50;
export const MAX_TITLE_LENGTH = 200;
/** Client-side publish-readiness min title length (FR-003; BE only enforces required). */
export const MIN_TITLE_LENGTH = 4;

/**
 * Per-section max content length (FR-002 AC-002.3, integration.md request-field
 * table): objectives/assessmentMethod ≤ 5000, contentOutline/activities ≤ 20000.
 * The BE has NO error code for section length, so this is a CLIENT-ONLY guard
 * (enforced in presentation like the FR-003 publish gate) — never a
 * `LessonPlanFailure` variant.
 */
export const SECTION_MAX_LENGTH: Record<DocumentSectionKey, number> = {
  objectives: 5000,
  contentOutline: 20000,
  activities: 20000,
  assessmentMethod: 5000,
};
