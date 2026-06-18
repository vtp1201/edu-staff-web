/**
 * Domain entities for the announcements feature (US-E10.3).
 * Pure TypeScript — no framework/lib deps. Wire fields are camelCase.
 */

export type AnnouncementPriority = "normal" | "important" | "urgent";
export type AnnouncementStatus = "draft" | "scheduled" | "sent";
export type AnnouncementAudience = "all" | "teachers" | "parents" | "students";

export interface AnnouncementEntity {
  id: string;
  title: string;
  body: string;
  priority: AnnouncementPriority;
  status: AnnouncementStatus;
  audience: AnnouncementAudience[];
  /** e.g. ["10", "11", "12"] or [] for no grade filter. */
  gradeFilter: string[];
  recipientCount: number;
  readCount: number;
  /** ISO string. */
  scheduledAt: string | null;
  /** ISO string (formatted by mapper). */
  sentAt: string | null;
  /** Formatted by mapper. */
  createdAt: string;
  authorName: string;
}

export interface AnnouncementRecipient {
  id: string;
  name: string;
  role: string;
  /** null = unread. */
  readAt: string | null;
}

export interface CreateAnnouncementInput {
  /** 5–200 chars. */
  title: string;
  /** 10–2000 chars. */
  body: string;
  priority: AnnouncementPriority;
  audience: AnnouncementAudience[];
  gradeFilter: string[];
  /** "now" | "scheduled". */
  sendMode: "now" | "scheduled";
  /** ISO datetime string when sendMode = "scheduled", else null. */
  scheduledAt: string | null;
}

export interface UpdateAnnouncementInput extends CreateAnnouncementInput {
  id: string;
}
