/**
 * Question-bank failure union (US-E11.9 spec §6.4 / integration.md §7).
 *
 * Server taxonomy ground-truthed against the `core` `exercisebank` sub-domain
 * this session (2026-07-17). The HTTP boundary emits the wire `code` via
 * `codeFromKey = strings.ToUpper(key)`, so each snake_case domain key becomes
 * the exact UPPER_SNAKE code the infra mapper branches on.
 *
 * ── MANDATORY disambiguation rule (spec §6.4, highest-risk correctness detail) ──
 * `forbidden-browse` and `forbidden-edit` share the IDENTICAL wire code
 * (`403 FORBIDDEN_ACTION`) for two semantically distinct BE denials:
 *   - the role gate (`canBrowseBank`) on search / list-mine / create, and
 *   - the ownership check (`IsOwnedBy`) on update / publish.
 * The code alone CANNOT disambiguate. The infra mapper
 * (`map-question-bank-error.ts`) MUST branch by the CALL-SITE that produced the
 * error (`callSite: "browse" | "edit"`), NEVER by inspecting the error code:
 *   - 403 from INT-201/INT-202/INT-203 → `forbidden-browse`.
 *   - 403 from INT-205/INT-206         → `forbidden-edit`.
 * `not-visible` (403 `QUESTION_NOT_VISIBLE`) is a THIRD, genuinely distinct
 * wire code, only ever returned by INT-204 (single-GET) — never conflate it
 * with either forbidden variant.
 *
 * The real repo throws the returned key as an `Error.message` (throwing-repo
 * idiom, same as lesson-plan); the domain `mapRepoError` rebuilds the typed
 * failure.
 */
export type QuestionBankFailure =
  | { type: "not-found" } // 404 QUESTION_NOT_FOUND / 400 QUESTION_INVALID_ID
  | { type: "not-visible" } // 403 QUESTION_NOT_VISIBLE — single-GET visibility gate only
  | { type: "forbidden-browse" } // 403 FORBIDDEN_ACTION from search/list-mine/create (call-site)
  | { type: "forbidden-edit" } // 403 FORBIDDEN_ACTION from update/publish ownership (call-site)
  | { type: "already-published" } // 422 QUESTION_ALREADY_PUBLISHED
  | { type: "type-not-supported" } // 422 QUESTION_TYPE_NOT_SUPPORTED
  | { type: "search-filter-required" } // 422 QUESTION_SEARCH_FILTER_REQUIRED
  | { type: "body-required" } // 400 QUESTION_BODY_REQUIRED
  | { type: "body-too-long" } // 400 QUESTION_BODY_TOO_LONG
  | { type: "tag-limit-exceeded" } // 422 QUESTION_TAG_LIMIT_EXCEEDED
  | { type: "tag-too-long" } // 400 QUESTION_TAG_TOO_LONG
  | { type: "invalid-difficulty" } // 400 QUESTION_INVALID_DIFFICULTY
  | { type: "subject-not-found" } // 404 SUBJECT_NOT_FOUND (create only)
  | { type: "invalid-cursor" } // 400 QUESTION_INVALID_CURSOR
  | { type: "network-error" }
  | { type: "unknown"; message?: string };

export type QuestionBankFailureType = QuestionBankFailure["type"];
