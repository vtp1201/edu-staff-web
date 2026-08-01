import type { InvitationFailure } from "../../domain/failures/invitation.failure";

/**
 * The failure shape the screen's `queryFn` throws. `retryable` is decided
 * server-side (in the Server Action, off the domain failure) and threaded as a
 * plain boolean so this predicate never re-derives policy from the key.
 */
export interface ThrownListFailure {
  type: InvitationFailure["type"];
  retryable?: boolean;
}

/** At most 2 attempts after the first (state-architecture.md §3). */
export const MAX_LIST_RETRIES = 2;

/**
 * `retry` predicate for the invitations list query.
 *
 * Without it the query inherits the provider's global `retry: 1`, so a
 * 403/400/409-class failure — none of which can change on retry — still burns
 * one extra request and delays the error state. An unrecognised throw (a real
 * `Error`, or a failure with no flag) is treated as NOT retryable: only an
 * explicitly-retryable failure earns another attempt.
 */
export function shouldRetryList(failureCount: number, error: unknown): boolean {
  const failure = error as ThrownListFailure | undefined;
  return failure?.retryable === true && failureCount < MAX_LIST_RETRIES;
}
