"use server";

import { revalidatePath } from "next/cache";
import {
  makeAnnouncementRepository,
  makeCreateAnnouncementUseCase,
  makeDeleteAnnouncementUseCase,
  makeGetAnnouncementsUseCase,
} from "@/bootstrap/di/announcements.di";
import type {
  AnnouncementEntity,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
} from "@/features/announcements/domain/entities/announcement.entity";
import type { AnnouncementFailure } from "@/features/announcements/domain/failures/announcement.failure";
import type {
  AnnouncementActionOutcome,
  AnnouncementFilter,
  RecipientsOutcome,
  SendReminderOutcome,
} from "@/features/announcements/presentation/announcements-screen/announcements-screen.i-vm";

const ROUTE = "/[locale]/t/[tenant]/(app)/admin/announcements";

function errorKeyOf(err: unknown): AnnouncementFailure["type"] {
  if (
    typeof err === "object" &&
    err !== null &&
    "type" in err &&
    typeof (err as { type: unknown }).type === "string"
  ) {
    return (err as AnnouncementFailure).type;
  }
  return "unknown";
}

export async function fetchAnnouncementsAction(
  filter: AnnouncementFilter,
): Promise<AnnouncementEntity[]> {
  const useCase = await makeGetAnnouncementsUseCase();
  return useCase.execute(filter);
}

export async function createAnnouncementAction(
  input: CreateAnnouncementInput,
): Promise<AnnouncementActionOutcome> {
  try {
    const useCase = await makeCreateAnnouncementUseCase();
    await useCase.execute(input);
    revalidatePath(ROUTE, "page");
    return { ok: true };
  } catch (err) {
    return { ok: false, errorKey: errorKeyOf(err) };
  }
}

export async function updateAnnouncementAction(
  input: UpdateAnnouncementInput,
): Promise<AnnouncementActionOutcome> {
  try {
    const useCase = await makeCreateAnnouncementUseCase();
    await useCase.saveDraft(input);
    revalidatePath(ROUTE, "page");
    return { ok: true };
  } catch (err) {
    return { ok: false, errorKey: errorKeyOf(err) };
  }
}

export async function deleteAnnouncementAction(
  id: string,
): Promise<AnnouncementActionOutcome> {
  try {
    const useCase = await makeDeleteAnnouncementUseCase();
    await useCase.execute(id);
    revalidatePath(ROUTE, "page");
    return { ok: true };
  } catch (err) {
    return { ok: false, errorKey: errorKeyOf(err) };
  }
}

export async function getRecipientsAction(
  id: string,
): Promise<RecipientsOutcome> {
  try {
    const repo = await makeAnnouncementRepository();
    const recipients = await repo.getRecipients(id);
    return { ok: true, recipients };
  } catch (err) {
    return { ok: false, errorKey: errorKeyOf(err) };
  }
}

export async function sendReminderAction(
  id: string,
): Promise<SendReminderOutcome> {
  try {
    const repo = await makeAnnouncementRepository();
    const { unreadCount } = await repo.sendReminder(id);
    return { ok: true, unreadCount };
  } catch (err) {
    return { ok: false, errorKey: errorKeyOf(err) };
  }
}
