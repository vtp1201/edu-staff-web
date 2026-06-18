import type {
  AnnouncementEntity,
  AnnouncementRecipient,
  AnnouncementStatus,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
} from "../entities/announcement.entity";

export type AnnouncementListFilter = AnnouncementStatus | "all";

/**
 * Repository interface for announcements (DIP — implemented by infra layer).
 * Throwing convention: methods reject with an {@link AnnouncementFailure}
 * (the use-case validates first; the repo maps transport/HTTP errors).
 */
export interface IAnnouncementRepository {
  listAnnouncements(
    filter: AnnouncementListFilter,
  ): Promise<AnnouncementEntity[]>;

  createAnnouncement(
    input: CreateAnnouncementInput,
  ): Promise<AnnouncementEntity>;

  updateAnnouncement(
    input: UpdateAnnouncementInput,
  ): Promise<AnnouncementEntity>;

  deleteAnnouncement(id: string): Promise<void>;

  getRecipients(id: string): Promise<AnnouncementRecipient[]>;

  sendReminder(id: string): Promise<{ unreadCount: number }>;
}
