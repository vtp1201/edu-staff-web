"use server";

import {
  makeGetNotificationsUseCase,
  makeGetUnreadCountUseCase,
  makeMarkAllReadUseCase,
  makeMarkNotificationReadUseCase,
} from "@/bootstrap/di/notification.di";
import type {
  NotificationFilter,
  NotificationPage,
} from "@/features/notification/domain/entities/notification.entity";
import type { NotificationFailure } from "@/features/notification/domain/failures/notification.failure";

function failureKey(err: unknown): string {
  const f = err as NotificationFailure;
  if (f?.type) return f.type;
  return "unknown";
}

export async function fetchPageAction(params: {
  filter: NotificationFilter;
  cursor?: string;
}): Promise<NotificationPage | { errorKey: string }> {
  try {
    const uc = await makeGetNotificationsUseCase();
    return await uc.execute({
      filter: params.filter,
      cursor: params.cursor,
      limit: 8,
    });
  } catch (err) {
    return { errorKey: failureKey(err) };
  }
}

export async function fetchUnreadCountAction(): Promise<
  { count: number } | { errorKey: string }
> {
  try {
    const uc = await makeGetUnreadCountUseCase();
    return await uc.execute();
  } catch (err) {
    return { errorKey: failureKey(err) };
  }
}

export async function markReadAction(
  id: string,
): Promise<{ errorKey?: string }> {
  try {
    const uc = await makeMarkNotificationReadUseCase();
    await uc.execute(id);
    return {};
  } catch (err) {
    return { errorKey: failureKey(err) };
  }
}

export async function markAllReadAction(): Promise<{ errorKey?: string }> {
  try {
    const uc = await makeMarkAllReadUseCase();
    await uc.execute();
    return {};
  } catch (err) {
    return { errorKey: failureKey(err) };
  }
}
