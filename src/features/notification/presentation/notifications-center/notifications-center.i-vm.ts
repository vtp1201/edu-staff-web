import type {
  NotificationEntity,
  NotificationFilter,
} from "../../domain/entities/notification.entity";

/** ViewModel interface for NotificationsCenterScreen (US-E10.2). */
export interface NotificationsCenterVm {
  /** Flat list of all loaded notifications (accumulates across load-more pages). */
  items: NotificationEntity[];
  /** Total unread count (for header badge). */
  unreadCount: number;
  /** Currently active filter tab. */
  activeFilter: NotificationFilter;
  /** True while the first page is loading. */
  isLoading: boolean;
  /** Non-null when the primary fetch errored. */
  error: string | null;
  /** Whether more pages are available. */
  hasMore: boolean;
  /** True while a load-more fetch is in progress. */
  isFetchingMore: boolean;
  /** True while mark-read or mark-all-read mutation is in-flight. */
  isMutating: boolean;
}

/** Prop shapes for actions passed from RSC/page into the client component. */
export interface NotificationsCenterActions {
  onFilterChange: (filter: NotificationFilter) => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onLoadMore: () => void;
}
