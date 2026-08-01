import "server-only";
import { ensureFreshSession } from "@/bootstrap/di/auth.di";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { INotificationRepository } from "@/features/notification/domain/repositories/i-notification.repository";
import { GetNotificationsUseCase } from "@/features/notification/domain/use-cases/get-notifications.use-case";
import { GetUnreadCountUseCase } from "@/features/notification/domain/use-cases/get-unread-count.use-case";
import { MarkAllReadUseCase } from "@/features/notification/domain/use-cases/mark-all-read.use-case";
import { MarkNotificationReadUseCase } from "@/features/notification/domain/use-cases/mark-notification-read.use-case";
import { MockNotificationRepository } from "@/features/notification/infrastructure/repositories/mocks/notification.mock.repository";
import { NotificationRepository } from "@/features/notification/infrastructure/repositories/notification.repository";

/**
 * US-E18.25 (ADR 0066) — BE US-146 shipped real backing for ALL FOUR
 * repository methods, so US-E18.18's partial-real `HybridNotificationRepository`
 * was retired and this reverts to the plain `USE_MOCK ? Mock : Real` gate
 * (decision 0014). No locale is read here any more: the mapper no longer
 * renders text (title/body are i18n keys translated at presentation).
 */
async function makeRepo(): Promise<INotificationRepository> {
  if (USE_MOCK) return new MockNotificationRepository();
  // decision 0018 — proactive refresh BEFORE the shared http client is created.
  await ensureFreshSession();
  return new NotificationRepository(await createServerHttpClient());
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
