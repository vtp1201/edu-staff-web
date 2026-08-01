import type { InvitationsStatusFilter } from "./invitations-screen.i-vm";

/**
 * Query-key factory for the admin invitation list.
 *
 * `status` is IN the key (US-E18.29): it became a real `GET .../invitations
 * ?status=` server param, so each tab is its own independently-paginated
 * `useInfiniteQuery` entry — a distinct key is an empty cache entry by
 * construction, which is what stops `fetchNextPage` from ever appending pages
 * across a tab change (no manual `resetQueries` needed).
 *
 * `lists(tenantId)` is the invalidation target for resend/send/revoke: those
 * mutations can move a row ACROSS status partitions (`expired` → `pending`), so
 * the whole partitioned subtree is busted rather than one tab.
 */
export const invitationKeys = {
  all: () => ["admin-invitations"] as const,
  tenant: (tenantId: string) => ["admin-invitations", tenantId] as const,
  lists: (tenantId: string) => ["admin-invitations", tenantId, "list"] as const,
  list: (tenantId: string, status: InvitationsStatusFilter) =>
    ["admin-invitations", tenantId, "list", status] as const,
};
