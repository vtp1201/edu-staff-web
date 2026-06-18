# US-E10.2 Component Architecture

## Component tree

```
NotificationsPage (RSC, app/[locale]/t/[tenant]/(app)/(shared)/notifications/page.tsx)
└── NotificationsCenterContainer (client, features/notification/presentation/…)
    │   useInfiniteQuery(notificationKeys.list(filter))
    │   useQuery(notificationKeys.unreadCount())
    │   useMutation(markRead / markAllRead)
    │   useNotificationNewEvent(tenantId, locale, onNew)
    └── NotificationsCenterScreen (presentational, "use client")
        ├── <header>  ← page title + "Mark all read" button
        ├── FilterPills (inline — role="tablist", role="tab" per pill)
        ├── <div role="log" aria-live="polite">  ← notification list card
        │   ├── SkeletonRows  (isLoading=true, 4×shimmer rows)
        │   ├── ErrorState    (error ≠ null, role="alert")
        │   ├── EmptyState    (items.length=0, variant="unread"|"all")
        │   └── NotificationRow* (button, aria-label, unread left-border)
        └── LoadMoreFooter  (hasMore → "Xem thêm" button; else "Đã hiển thị tất cả")
```

## Component placement (rule: component-organization.md)

| Component | Location | Rationale |
|---|---|---|
| NotificationsCenterScreen | `features/notification/presentation/notifications-center/` | single-feature presentational; promote to `shared/` if a second screen reuses it |
| NotificationsCenterContainer | same folder | container-pattern companion; not a shared primitive |
| SkeletonRows, EmptyState, NotificationRow | inline in `notifications-center.tsx` | single-screen sub-components; no current cross-feature use |
| Skeleton primitive | `components/ui/skeleton/` (existing) | reused as-is |
| Tabs/TabsTrigger | NOT used — filter pills are plain `<button role="tab">` for overflow-x scroll flexibility | |

## ViewModel interface

```ts
// notifications-center.i-vm.ts
interface NotificationsCenterVm {
  items: NotificationEntity[];
  unreadCount: number;
  activeFilter: NotificationFilter;
  isLoading: boolean;
  error: string | null;          // i18n key or null
  hasMore: boolean;
  isFetchingMore: boolean;
  isMutating: boolean;
}

interface NotificationsCenterActions {
  onFilterChange: (filter: NotificationFilter) => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onLoadMore: () => void;
}
```

## Prop flow (server → client boundary)

```
RSC page
  → passes 4 server-action refs as props to Container
Container (client)
  → derives NotificationsCenterVm from queries + mutations
  → passes vm + actions as flat props to Screen
Screen (client)
  → pure render — no queries, no mutations, no server actions
```

Server Actions are passed by reference from the RSC page; they never run on the
client bundle (server-only guarantee from 'use server').
