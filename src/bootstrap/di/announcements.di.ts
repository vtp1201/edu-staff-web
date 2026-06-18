import "server-only";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { IAnnouncementRepository } from "@/features/announcements/domain/repositories/i-announcement.repository";
import { CreateAnnouncementUseCase } from "@/features/announcements/domain/use-cases/create-announcement.use-case";
import { DeleteAnnouncementUseCase } from "@/features/announcements/domain/use-cases/delete-announcement.use-case";
import { GetAnnouncementsUseCase } from "@/features/announcements/domain/use-cases/get-announcements.use-case";
import { AnnouncementRepository } from "@/features/announcements/infrastructure/repositories/announcement.repository";
import { MockAnnouncementRepository } from "@/features/announcements/infrastructure/repositories/mocks/announcement.mock.repository";

async function makeRepo(): Promise<IAnnouncementRepository> {
  if (USE_MOCK) return new MockAnnouncementRepository();
  return new AnnouncementRepository(await createServerHttpClient());
}

export async function makeGetAnnouncementsUseCase() {
  return new GetAnnouncementsUseCase(await makeRepo());
}

export async function makeCreateAnnouncementUseCase() {
  return new CreateAnnouncementUseCase(await makeRepo());
}

export async function makeDeleteAnnouncementUseCase() {
  return new DeleteAnnouncementUseCase(await makeRepo());
}

/** Exposed for the detail sheet (recipients + reminder) — shares the repo. */
export async function makeAnnouncementRepository(): Promise<IAnnouncementRepository> {
  return makeRepo();
}
