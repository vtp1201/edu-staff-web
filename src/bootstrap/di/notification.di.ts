import "server-only";
import { cookies } from "next/headers";
import { ensureFreshSession } from "@/bootstrap/di/auth.di";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { INotificationRepository } from "@/features/notification/domain/repositories/i-notification.repository";
import { GetNotificationsUseCase } from "@/features/notification/domain/use-cases/get-notifications.use-case";
import { GetUnreadCountUseCase } from "@/features/notification/domain/use-cases/get-unread-count.use-case";
import { MarkAllReadUseCase } from "@/features/notification/domain/use-cases/mark-all-read.use-case";
import { MarkNotificationReadUseCase } from "@/features/notification/domain/use-cases/mark-notification-read.use-case";
import { HybridNotificationRepository } from "@/features/notification/infrastructure/repositories/hybrid-notification.repository";
import { MockNotificationRepository } from "@/features/notification/infrastructure/repositories/mocks/notification.mock.repository";
import { NotificationRepository } from "@/features/notification/infrastructure/repositories/notification.repository";

async function makeRepo(): Promise<INotificationRepository> {
  if (USE_MOCK) return new MockNotificationRepository();
  // decision 0018 — proactive refresh BEFORE the shared http client is created.
  await ensureFreshSession();
  // Locale from accept-language or next-intl cookie for mapper localisation
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value ?? "vi";
  // US-E18.18 partial-real facade: only getUnreadCount has a real endpoint;
  // list/markRead/markAllRead are force-mocked (no real contract).
  return new HybridNotificationRepository(
    new NotificationRepository(await createServerHttpClient(), locale),
    new MockNotificationRepository(),
  );
}

export async function makeGetNotificationsUseCase() {
  return new GetNotificationsUseCase(await makeRepo());
}

export async function makeGetUnreadCountUseCase() {
  return new GetUnreadCountUseCase(await makeRepo());
}

export async function makeMarkNotificationReadUseCase() {
  return new MarkNotificationReadUseCase(await makeRepo());
}

export async function makeMarkAllReadUseCase() {
  return new MarkAllReadUseCase(await makeRepo());
}
