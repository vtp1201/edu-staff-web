/**
 * `social` service moderation endpoints (US-E19.2). Prefixed `/social/api/v1`
 * to match the existing MESSAGING_EP convention (same service, same prefix
 * rule). No magic strings in repositories.
 *
 * US-E18.20 ground-truth vs `edu-api/services/social/docs/openapi.yaml`:
 * - `reports` (`GET`/`POST /api/v1/reports`) and `resolveReport`
 *   (`POST /api/v1/reports/{reportId}/resolve`) paths are CORRECT.
 * - `moderateDeletePost` is CORRECT but is a bare `POST` with **no request
 *   body** (openapi `/api/v1/feeds/posts/{postId}/moderate-delete`, 204) — the
 *   repository previously issued `DELETE` + a body. Fixed.
 * - `reportById` has **no real endpoint** — there is no
 *   `GET /api/v1/reports/{reportId}` in the published contract at all. Kept
 *   only so `ModerationRepository.getReportDetail` still compiles; the detail
 *   sheet is served by the mock (see `moderation.di.ts` force-mock rationale).
 * - `moderationAuditLog` points at `/rooms/{roomId}/moderation-audit` (US-086),
 *   which is a ROOM capability/role-change audit — a DIFFERENT concept from
 *   this feature's dismiss/remove content-moderation trail. No real endpoint
 *   backs `AuditEntryEntity`.
 * - A comment-target moderate-delete endpoint does NOT exist (only the post
 *   variant above), so the former `moderateDeleteComment` constant was removed
 *   and the real repository now refuses `kind: "comment"` without any HTTP call.
 */
export const MODERATION_EP = {
  reports: "/social/api/v1/reports",
  reportById: (reportId: string) => `/social/api/v1/reports/${reportId}`,
  resolveReport: (reportId: string) =>
    `/social/api/v1/reports/${reportId}/resolve`,
  moderateDeletePost: (postId: string) =>
    `/social/api/v1/feeds/posts/${postId}/moderate-delete`,
  moderationAuditLog: (scopeId: string) =>
    `/social/api/v1/rooms/${scopeId}/moderation-audit`,
} as const;
