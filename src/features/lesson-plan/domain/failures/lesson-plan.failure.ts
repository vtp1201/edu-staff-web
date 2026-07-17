/**
 * Lesson-plan failure union (US-E11.8 spec §6 / integration.md §7).
 *
 * Server taxonomy ground-truthed against
 * `core/internal/lms/lessonplan/core/domain/error/lesson_plan.go` +
 * `.../valueobject/ids.go` this session (2026-07-17). The HTTP boundary emits
 * the wire `code` via `codeFromKey = strings.ToUpper(key)`
 * (`pkg/kit/response/error.go:108`) — verified directly — so each snake_case
 * domain key becomes the exact UPPER_SNAKE code the mapper branches on.
 *
 * `map-lesson-plan-error.ts` branches on `error.code` (never message,
 * `.claude/rules/api-integration.md`); the real repo throws the returned key as
 * an `Error.message`, the domain `mapRepoError` rebuilds the typed failure
 * (throwing-repo idiom, same as exam-bank).
 */
export type LessonPlanFailure =
  | { type: "not-found" } // LESSON_PLAN_NOT_FOUND
  | { type: "not-visible" } // LESSON_PLAN_NOT_VISIBLE
  | { type: "already-published" } // LESSON_PLAN_ALREADY_PUBLISHED
  | { type: "tag-limit-exceeded" } // LESSON_PLAN_TAG_LIMIT_EXCEEDED
  | { type: "title-required" } // LESSON_PLAN_TITLE_REQUIRED
  | { type: "title-too-long" } // LESSON_PLAN_TITLE_TOO_LONG
  | { type: "tag-too-long" } // LESSON_PLAN_TAG_TOO_LONG
  | { type: "subject-not-found" } // SUBJECT_NOT_FOUND
  | { type: "invalid-id" } // LESSON_PLAN_INVALID_ID / _TENANT_ID / _SUBJECT_ID / _MEMBER_ID
  | { type: "invalid-cursor" } // LESSON_PLAN_INVALID_CURSOR
  | { type: "forbidden" } // FORBIDDEN_ACTION
  | { type: "network-error" }
  | { type: "unknown"; message?: string };

export type LessonPlanFailureType = LessonPlanFailure["type"];
