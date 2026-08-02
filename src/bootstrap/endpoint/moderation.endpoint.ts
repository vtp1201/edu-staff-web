/**
 * `social` service moderation endpoints. Prefixed `/social/api/v1` to match the
 * existing MESSAGING_EP convention (same service, same prefix rule). No magic
 * strings in repositories.
 *
 * Ground-truthed against `edu-api/services/social/docs/openapi.yaml`
 * (US-E18.20 → re-verified US-E18.32 after BE US-172/US-166):
 * - `reports` — `POST` (file a report, targets MESSAGE|POST|**COMMENT**) and
 *   `GET` (ADMIN inbox; `status`/`cursor`/`limit`/`contentType`/`search`).
 * - `reportStats` — NEW (US-172). Tenant-wide `{pending, resolved}` counters,
 *   explicitly unaffected by the list's filters.
 * - `reportById` — NEW (US-166). Requires `filedAt` (REQUIRED) + `status`
 *   query params: `reportId` is a clustering column, not a partition key, so
 *   this URL is **not standalone-shareable** — never build a bare deep link.
 * - `resolveReport` — CAS write; body needs the echoed `filedAt`. `DELETE` is
 *   wired for MESSAGE, POST *and* COMMENT targets, which makes it the ONLY
 *   removal path usable from the queue for a comment (see the repository).
 * - `moderateDeletePost` / `moderateDeleteComment` — the DIRECT (not
 *   report-driven) removal routes; bare `POST`, no body, 204. The comment route
 *   needs the parent `postId` as routing context, and its delete is
 *   IRREVERSIBLE (no soft-delete column, hence no 409 already-deleted).
 *
 * No `moderationAuditLog` constant: `GET /rooms/{roomId}/moderation-audit`
 * (US-086) is a ROOM role/mute/capability audit — a DIFFERENT concept from this
 * feature's dismiss/remove content-moderation trail. Nothing backs
 * `AuditEntryEntity`, so the real repository degrades that read with zero HTTP
 * rather than pointing it at an unrelated endpoint.
 */
export const MODERATION_EP = {
  reports: "/social/api/v1/reports",
  reportStats: "/social/api/v1/reports/stats",
  reportById: (reportId: string) => `/social/api/v1/reports/${reportId}`,
  resolveReport: (reportId: string) =>
    `/social/api/v1/reports/${reportId}/resolve`,
  moderateDeletePost: (postId: string) =>
    `/social/api/v1/feeds/posts/${postId}/moderate-delete`,
  moderateDeleteComment: (postId: string, commentId: string) =>
    `/social/api/v1/feeds/posts/${postId}/comments/${commentId}/moderate-delete`,
} as const;
