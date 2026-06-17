"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { parseEvent, shouldHandle } from "@/bootstrap/realtime/event";
import type {
  NotificationEntity,
  NotificationType,
} from "../../domain/entities/notification.entity";

const VALID_TYPES: ReadonlySet<NotificationType> = new Set([
  "grade",
  "attendance",
  "discipline",
  "announcement",
  "system",
]);

function safeType(raw: string): NotificationType {
  return VALID_TYPES.has(raw as NotificationType)
    ? (raw as NotificationType)
    : "system";
}

interface Options {
  tenantId: string;
  locale: string;
  /** Called when a notification.new SSE event is received. */
  onNew: (item: NotificationEntity) => void;
  /** Translated label for the toast close button. */
  toastCloseLabel: string;
  /** Whether the SSE hook is active. */
  enabled?: boolean;
}

/**
 * Subscribes directly to the SSE stream for `notification.new` events in the
 * Notifications Center screen (US-E10.2, AC-7).
 *
 * Responsibility split:
 * - `useRealtimeEvents` (global, in AppShell) does query invalidation via the
 *   event-invalidation map → ensures list + unread-count queries refetch.
 * - THIS hook (screen-local) receives the same event, converts the payload into
 *   a `NotificationEntity`, calls `onNew` so the container can prepend the item
 *   without waiting for the refetch, and shows a Sonner toast.
 *
 * The two hooks share the same `EventSource` URL; the browser deduplicates
 * the underlying connection.
 */
export function useNotificationNewEvent({
  tenantId,
  locale,
  onNew,
  toastCloseLabel,
  enabled = true,
}: Options): void {
  useEffect(() => {
    if (!enabled) return;

    // Mirror the URL from useRealtimeEvents (locale is the first path segment).
    const url = `/${locale}/api/stream?tenant=${encodeURIComponent(tenantId)}`;
    const source = new EventSource(url, { withCredentials: true });

    const handleFrame = (e: MessageEvent) => {
      const event = parseEvent(e.data as string);
      if (event?.type !== "notification.new") return;
      if (!shouldHandle(event, tenantId)) return;

      const { payload } = event;
      const title = locale === "vi" ? payload.titleVi : payload.titleEn;
      const body = locale === "vi" ? payload.bodyVi : payload.bodyEn;

      const entity: NotificationEntity = {
        id: payload.notificationId,
        type: safeType(payload.type),
        title: title || payload.titleVi,
        body: body || payload.bodyVi,
        ts: payload.ts,
        read: false,
      };

      onNew(entity);

      toast(title || payload.titleVi, {
        description: body || payload.bodyVi,
        duration: 4500,
        closeButton: true,
        cancel: { label: toastCloseLabel, onClick: () => {} },
      });
    };

    source.addEventListener("notification.new", handleFrame as EventListener);

    return () => source.close();
  }, [enabled, tenantId, locale, onNew, toastCloseLabel]);
}
