/** API response shapes for announcements (noti service). All camelCase. */
export interface AnnouncementResponseDto {
  id: string;
  title: string;
  body: string;
  priority: string;
  status: string;
  audience: string[];
  gradeFilter: string[];
  recipientCount: number;
  readCount: number;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
  authorName: string;
}

export interface AnnouncementRecipientDto {
  id: string;
  name: string;
  role: string;
  readAt: string | null;
}
