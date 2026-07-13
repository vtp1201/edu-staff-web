/**
 * `social` service moderation endpoints (US-E19.2). Prefixed `/social/api/v1`
 * to match the existing MESSAGING_EP convention (same service, same prefix
 * rule) — NOT integration.md's abbreviated `/api/v1/...` paths. No published
 * openapi.yaml yet → mock-first (decision 0014); DI selects the mock while
 * NEXT_PUBLIC_USE_MOCK=true. No magic strings in repositories.
 */
export const MODERATION_EP = {
  reports: "/social/api/v1/reports",
  reportById: (reportId: string) => `/social/api/v1/reports/${reportId}`,
  resolveReport: (reportId: string) =>
    `/social/api/v1/reports/${reportId}/resolve`,
  moderateDeletePost: (postId: string) =>
    `/social/api/v1/feeds/posts/${postId}/moderate-delete`,
  moderateDeleteComment: (postId: string, commentId: string) =>
    `/social/api/v1/feeds/posts/${postId}/comments/${commentId}/moderate-delete`,
  moderationAuditLog: (scopeId: string) =>
    `/social/api/v1/rooms/${scopeId}/moderation-audit`,
} as const;
