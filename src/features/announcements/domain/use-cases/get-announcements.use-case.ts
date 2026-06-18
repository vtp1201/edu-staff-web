import type { AnnouncementEntity } from "../entities/announcement.entity";
import type {
  AnnouncementListFilter,
  IAnnouncementRepository,
} from "../repositories/i-announcement.repository";

/** Lists announcements filtered by status (or "all"). No validation needed. */
export class GetAnnouncementsUseCase {
  constructor(private readonly repo: IAnnouncementRepository) {}

  async execute(filter: AnnouncementListFilter): Promise<AnnouncementEntity[]> {
    return this.repo.listAnnouncements(filter);
  }
}
