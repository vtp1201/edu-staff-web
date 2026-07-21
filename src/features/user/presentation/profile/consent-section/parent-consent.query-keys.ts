/**
 * Single flat query key for the parent-consent section (US-E20.2). No
 * list/detail/paginated factory — exactly one query shape, one combined
 * snapshot (state-architecture §4). The `["parent-consent"]` namespace has zero
 * overlap with any other feature's key (no cross-invalidation).
 */
export const PARENT_CONSENT_QUERY_KEY = ["parent-consent"] as const;
