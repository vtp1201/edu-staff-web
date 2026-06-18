import "server-only";
import { cookies } from "next/headers";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { INotificationRepository } from "@/features/notification/domain/repositories/i-notification.repository";
import { GetNotificationsUseCase } from "@/features/notification/domain/use-cases/get-notifications.use-case";
import { GetUnreadCountUseCase } from "@/features/notification/domain/use-cases/get-unread-count.use-case";
import { MarkAllReadUseCase } from "@/features/notification/domain/use-cases/mark-all-read.use-case";
import { MarkNotificationReadUseCase } from "@/features/notification/domain/use-cases/mark-notification-read.use-case";
import { MockNotificationRepository } from "@/features/notification/infrastructure/repositories/mocks/notification.mock.repository";
import { NotificationRepository } from "@/features/notification/infrastructure/repositories/notification.repository";

async function makeRepo(): Promise<INotificationRepository> {
  if (USE_MOCK) return new MockNotificationRepository();
  // Locale from accept-language or next-intl cookie for mapper localisation
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value ?? "vi";
  return new NotificationRepository(await createServerHttpClient(), locale);
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
