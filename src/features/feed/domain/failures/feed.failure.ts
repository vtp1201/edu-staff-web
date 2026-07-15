/**
 * Typed failure union for the feed feature (US-E19.1). The `type` keys double
 * as i18n keys under `feed.errors.*`; presentation translates, the
 * domain/repo/action never does (i18n.md). Mirrors moderation.failure's shape.
 *
 * - `fetch-failed` / `network-error` — transient, retryable.
 * - `forbidden` — tenant/scope authorization reject; DISTINCT copy, no retry.
 * - `scope-not-found` — class scope 404; distinct copy, no retry.
 * - `validation` — 422 on create-post/add-comment (field errors optional).
 * - `post-not-found` — concurrent removal (UC-1903.5/UC-1904.7); silent, no copy.
 */
export type FeedValidationField = { field: string; message: string };

export type FeedFailure =
  | { type: "fetch-failed" }
  | { type: "forbidden" }
  | { type: "scope-not-found" }
  | { type: "validation"; fields?: FeedValidationField[] }
  | { type: "network-error" }
  | { type: "post-not-found" };

/** Only transient/network failures are retryable (429/502/503/504 + no-response). */
export function isRetryableFailure(failure: FeedFailure): boolean {
  return failure.type === "fetch-failed" || failure.type === "network-error";
}
