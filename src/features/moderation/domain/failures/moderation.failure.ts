/**
 * Typed failure union for the moderation feature (US-E19.2). The `type` keys
 * double as i18n keys under `moderation.errors.*` — presentation translates;
 * the domain/repo/action never does. `forbidden` gets DISTINCT copy from
 * `network-error`, never merged (NFR-101 / AC-1928.6).
 */
export type ModerationValidationField = { field: string; message: string };

export type ModerationFailure =
  | { type: "validation"; fields?: ModerationValidationField[] }
  | { type: "already-reported" }
  | { type: "not-found" }
  | { type: "already-resolved" }
  | { type: "forbidden" }
  | { type: "network-error" };

/**
 * Only transient/network failures are retryable (429/502/503/504 mapped to
 * `network-error`). forbidden/not-found/already-resolved/already-reported/
 * validation are terminal — retrying re-runs the exact same rejected call.
 */
export function isRetryableFailure(failure: ModerationFailure): boolean {
  return failure.type === "network-error";
}
