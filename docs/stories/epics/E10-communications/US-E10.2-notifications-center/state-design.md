# US-E10.2 State Design

## State inventory

| State | Where | How |
|---|---|---|
| Active filter tab | Client local — `useState<NotificationFilter>` in Container | URL param would be ideal for deep-link; deferred to follow-up (no story req) |
| Notification list (paginated) | TanStack Query infinite cache | `useInfiniteQuery` keyed by filter |
| Unread count | TanStack Query cache | `useQuery` |
| Mark-read mutation | TanStack Query mutation | invalidates `notificationKeys.all` on success |
| Mark-all-read mutation | TanStack Query mutation | invalidates `notificationKeys.all` on success; shows toast |
| SSE-prepended items | Optimistic TanStack Query cache write | `queryClient.setQueryData` in `useNotificationNewEvent` callback |

## Query key taxonomy

```
["notifications"]                         ← notificationKeys.all  (for full invalidation)
["notifications", "list", filter]         ← notificationKeys.list(filter)
["notifications", "unread-count"]         ← notificationKeys.unreadCount()
```

`filter` is one of: `"all" | "unread" | "grade" | "attendance" | "discipline" | "announcement"`

## Infinite query pagination

- `initialPageParam`: `undefined` (first page, no cursor)
- `getNextPageParam`: returns `lastPage.nextCursor` when `lastPage.hasMore`, else `undefined`
- Load-more calls `fetchNextPage()` — TanStack appends to `data.pages[]`
- Container flattens: `data.pages.flatMap(p => p.items)`
- Page size: 8 (PAGE_SIZE constant in repository interface)
- List endpoint uses `{ raw: true }` to access `meta.pagination` from the envelope

## SSE → cache interaction (AC-7)

```
EventSource frame: "notification.new"
  ├── useRealtimeEvents (global, AppShell)
  │   └── queryKeysFor(event) → invalidateQueries (list/all, list/unread, list/<type>, unread-count)
  │       → triggers background refetch on next focus / stale
  └── useNotificationNewEvent (screen-local, Container)
      ├── entity = NotificationMapper.toEntity(payload, locale)
      ├── setQueryData(list/all) → prepend to page[0].items
      ├── setQueryData(list/unread) → prepend to page[0].items
      ├── setQueryData(unread-count) → count + 1
      └── toast(title, { duration: 4500, closeButton: true })
```

The dual-subscription pattern is intentional:
- Global hook: ensures correctness for all cache consumers (header badge, other screens)
- Local hook: gives instant visual feedback without waiting for the refetch round-trip

## Cache invalidation after mutations

- `markRead(id)` success → `invalidateQueries({ queryKey: notificationKeys.all })`
  - Refetches both list variants and unread-count; BE is the source of truth post-mutation
- `markAllRead()` success → same full invalidation + Sonner toast

## RSC ↔ client boundary

```
RSC page.tsx                        Client boundary
  fetchPageAction ─────────────────► Container (useInfiniteQuery queryFn)
  fetchUnreadCountAction ──────────►   (useQuery queryFn)
  markReadAction ──────────────────►   (useMutation mutationFn)
  markAllReadAction ───────────────►   (useMutation mutationFn)
```

All four are `"use server"` functions; they never land in the client bundle.
The Container only holds references to them and calls them as async functions.
