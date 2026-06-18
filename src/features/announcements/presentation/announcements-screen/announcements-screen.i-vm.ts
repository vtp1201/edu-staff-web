import type {
  AnnouncementEntity,
  AnnouncementRecipient,
  AnnouncementStatus,
} from "../../domain/entities/announcement.entity";
import type { AnnouncementFailure } from "../../domain/failures/announcement.failure";

export type AnnouncementFilter = AnnouncementStatus | "all";

export interface AnnouncementsScreenVm {
  items: AnnouncementEntity[];
  filter: AnnouncementFilter;
  isLoading: boolean;
  error: string | null;
}

export interface CreateDrawerVm {
  isOpen: boolean;
  /** null = create, string = edit draft. */
  editingId: string | null;
  isSubmitting: boolean;
  error: string | null;
}

export interface DetailSheetVm {
  isOpen: boolean;
  announcementId: string | null;
  recipients: AnnouncementRecipient[];
  isLoading: boolean;
  recipientFilter: "all" | "read" | "unread";
}

export interface AnnouncementActionOutcome {
  ok: boolean;
  errorKey?: AnnouncementFailure["type"];
}

export interface SendReminderOutcome {
  ok: boolean;
  unreadCount?: number;
  errorKey?: AnnouncementFailure["type"];
}

export interface RecipientsOutcome {
  ok: boolean;
  recipients?: AnnouncementRecipient[];
  errorKey?: AnnouncementFailure["type"];
}
