/**
 * Feed endpoints (US-E19.1, `social` service). Same `/social/api/v1/...` prefix
 * convention as MODERATION_EP. INT-190-01..05 only — moderate-delete
 * (INT-190-06) is owned by MODERATION_EP, and pin/unpin (INT-190-07) has NO
 * endpoint at all (mock-first), so neither appears here.
 */
export const FEED_EP = {
  schoolFeed: "/social/api/v1/feeds/school",
  classFeed: (classId: string) =>
    `/social/api/v1/feeds/classes/${classId}` as const,
  reaction: (postId: string) =>
    `/social/api/v1/feeds/posts/${postId}/reaction` as const,
  comments: (postId: string) =>
    `/social/api/v1/feeds/posts/${postId}/comments` as const,
} as const;
