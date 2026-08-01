/**
 * Failure union for the IAM member directory (US-E18.23).
 *
 * IAM emits RAW LOWERCASE snake_case `error.code` values (the Go `apperror`
 * i18n keys), never UPPER_SNAKE like `core`/`social` — the US-E18.6 caveat is
 * still true here. Consumers translate this union into their OWN failure union
 * at the composition point, they never re-export it to presentation.
 */
export type IamDirectoryFailure =
  /** 403 `member_list_forbidden` — actor lacks directory-reader RBAC, or the token carries no active tenant. */
  | { type: "forbidden" }
  /**
   * 400 `too_many_member_ids` — >50 ids in one batch call. Defensive only:
   * `BatchResolveMembersUseCase` caps its own chunks at 50, so this is
   * unreachable unless a caller bypasses the use-case and hits the repository
   * directly. Kept so the mapping is proven rather than falling to `unknown`.
   */
  | { type: "too-many-ids" }
  | { type: "network-error" }
  | { type: "unknown" };
