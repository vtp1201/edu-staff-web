# US-E10.2 Notifications Center — Implementation Plan

## Lane: normal

## Phases

### Phase 1 — Domain (TDD red → green)
- `notification.entity.ts`: NotificationEntity, NotificationPage, NotificationFilter, UnreadCount
- `notification.failure.ts`: typed failure union (not-found / unauthorized / network-error / unknown)
- `i-notification.repository.ts`: INotificationRepository interface + PAGE_SIZE=8
- Use-cases (each with tests first):
  - `get-notifications.use-case.ts`
  - `get-unread-count.use-case.ts`
  - `mark-notification-read.use-case.ts` (guards empty id)
  - `mark-all-read.use-case.ts`
- Unit test: `notification.use-cases.test.ts`

### Phase 2 — Infrastructure (mock-first — noti service not shipped)
- `notification-response.dto.ts`: wire shape with titleVi/titleEn/bodyVi/bodyEn
- `notification.mapper.ts` + `notification.mapper.test.ts`: locale-aware DTO→Entity, unknown type coercion
- `fixtures.ts`: 10 mock DTOs covering all 5 types, mix of read/unread
- `notification.mock.repository.ts`: mutable in-memory state, cursor pagination, mark-read, mark-all
- `notification.repository.ts`: real HTTP repo using parseEnvelope for pagination, `{ raw: true }` list call
- `notification.repository.test.ts`: integration tests for toFailure + all methods

### Phase 3 — Bootstrap wiring
- `notification.endpoint.ts`: NOTIFICATION_EP (list, unreadCount, markRead, markAllRead)
- `notification.di.ts`: USE_MOCK gate, locale from cookie for mapper
- Export from `endpoint/index.ts` and `di/index.ts`

### Phase 4 — SSE extension (decision 0009)
- `event.ts`: add `notification.new` event type with enriched payload
- `event-invalidation.ts`: notification.new → 4 query keys (list/all, list/unread, list/<type>, unread-count)
- `use-notification-new-event.ts`: screen-local hook for prepend + Sonner toast (AC-7)
- Extend `event.test.ts` with notification.new parse + invalidation tests

### Phase 5 — Presentation
- `notifications-center.i-vm.ts`: NotificationsCenterVm + NotificationsCenterActions interfaces
- `notifications-center.tsx`: pure presentational component (loading/empty/error/list/load-more/filter pills)
- `notifications-center-container.tsx`: TanStack Query infinite + unread count + mutations + SSE hook
- `notifications-center.stories.tsx`: 10 stories covering all ACs

### Phase 6 — App wiring
- `actions.ts`: 4 Server Actions (fetchPageAction, fetchUnreadCountAction, markReadAction, markAllReadAction)
- `page.tsx`: RSC page at `(shared)/notifications/page.tsx`

### Phase 7 — i18n
- `vi.json` + `en.json`: `notifications` namespace (34 keys, exact parity)

## Key decisions
- Mock-first: NEXT_PUBLIC_USE_MOCK=true; MockNotificationRepository in-memory
- Cursor pagination: `{ raw: true }` + parseEnvelope to read meta.pagination
- SSE dual subscription: global useRealtimeEvents for query invalidation + screen-local hook for prepend+toast
- Locale injection: DI factory reads NEXT_LOCALE cookie so mapper produces correct language
