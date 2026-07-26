/**
 * Feed endpoints (US-E19.1, `social` service). Same `/social/api/v1/...` prefix
 * convention as MODERATION_EP. Post moderate-delete is owned by MODERATION_EP.
 *
 * US-E18.20 ground-truth (`edu-api/services/social/docs/openapi.yaml`
 * `/api/v1/feeds/posts/{postId}/pin`, US-101): pin/unpin IS real —
 * `PUT` pins (200, NO request body), `DELETE` unpins (204, idempotent no-op).
 * INT-190-07's "no endpoint at all" premise was stale. It is only reachable
 * against a genuine BE `postId`, which the (force-mocked — see `feed.di.ts`)
 * feed read never produces, so the constant + its `FeedRepository` call are
 * kept correct-but-dead per this epic's precedent (US-E18.8/9/14).
 */
export const FEED_EP = {
  schoolFeed: "/social/api/v1/feeds/school",
  classFeed: (classId: string) =>
    `/social/api/v1/feeds/classes/${classId}` as const,
  reaction: (postId: string) =>
    `/social/api/v1/feeds/posts/${postId}/reaction` as const,
  comments: (postId: string) =>
    `/social/api/v1/feeds/posts/${postId}/comments` as const,
  /** US-101 — `PUT` pins, `DELETE` unpins. No request body on either verb. */
  pin: (postId: string) => `/social/api/v1/feeds/posts/${postId}/pin` as const,
} as const;
