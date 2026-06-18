import "server-only";
import type {
  AnnouncementAudience,
  AnnouncementEntity,
  AnnouncementPriority,
  AnnouncementRecipient,
  AnnouncementStatus,
} from "../../domain/entities/announcement.entity";
import type {
  AnnouncementRecipientDto,
  AnnouncementResponseDto,
} from "../dtos/announcement-response.dto";

const PRIORITIES: ReadonlySet<AnnouncementPriority> = new Set([
  "normal",
  "important",
  "urgent",
]);
const STATUSES: ReadonlySet<AnnouncementStatus> = new Set([
  "draft",
  "scheduled",
  "sent",
]);
const AUDIENCES: ReadonlySet<AnnouncementAudience> = new Set([
  "all",
  "teachers",
  "parents",
  "students",
]);

function toPriority(raw: string): AnnouncementPriority {
  return PRIORITIES.has(raw as AnnouncementPriority)
    ? (raw as AnnouncementPriority)
    : "normal";
}

function toStatus(raw: string): AnnouncementStatus {
  return STATUSES.has(raw as AnnouncementStatus)
    ? (raw as AnnouncementStatus)
    : "draft";
}

function toAudience(raw: string[]): AnnouncementAudience[] {
  return raw.filter((a): a is AnnouncementAudience =>
    AUDIENCES.has(a as AnnouncementAudience),
  );
}

/** Deterministic date format (YYYY-MM-DD HH:mm, UTC) — locale-stable for tests. */
function fmtDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const date = d.toISOString().slice(0, 10);
  const time = d.toISOString().slice(11, 16);
  return `${date} ${time}`;
}

export function mapAnnouncement(
  dto: AnnouncementResponseDto,
): AnnouncementEntity {
  return {
    id: dto.id,
    title: dto.title,
    body: dto.body,
    priority: toPriority(dto.priority),
    status: toStatus(dto.status),
    audience: toAudience(dto.audience),
    gradeFilter: dto.gradeFilter ?? [],
    recipientCount: dto.recipientCount ?? 0,
    readCount: dto.readCount ?? 0,
    scheduledAt: dto.scheduledAt,
    sentAt: fmtDate(dto.sentAt),
    createdAt: fmtDate(dto.createdAt) ?? dto.createdAt,
    authorName: dto.authorName,
  };
}

export function mapRecipient(
  dto: AnnouncementRecipientDto,
): AnnouncementRecipient {
  return {
    id: dto.id,
    name: dto.name,
    role: dto.role,
    readAt: fmtDate(dto.readAt),
  };
}
