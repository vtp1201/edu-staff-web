import type { IAnnouncementRepository } from "../repositories/i-announcement.repository";

/** Deletes an announcement; rethrows the repo's {@link AnnouncementFailure}. */
export class DeleteAnnouncementUseCase {
  constructor(private readonly repo: IAnnouncementRepository) {}

  async execute(id: string): Promise<void> {
    return this.repo.deleteAnnouncement(id);
  }
}
