import "server-only";
import type { AxiosInstance } from "axios";
import { ANNOUNCEMENTS_EP } from "@/bootstrap/endpoint/noti.endpoint";
import { errorCodeOf, statusOf } from "@/bootstrap/lib/api-envelope";
import type {
  AnnouncementEntity,
  AnnouncementRecipient,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
} from "../../domain/entities/announcement.entity";
import type { AnnouncementFailure } from "../../domain/failures/announcement.failure";
import type {
  AnnouncementListFilter,
  IAnnouncementRepository,
} from "../../domain/repositories/i-announcement.repository";
import type {
  AnnouncementRecipientDto,
  AnnouncementResponseDto,
} from "../dtos/announcement-response.dto";
import { mapAnnouncement, mapRecipient } from "../mappers/announcement.mapper";

/**
 * Map a normalised ApiError to the announcement failure union.
 * Branch on error.code (UPPER_SNAKE) / status — never on message.
 */
export function toFailure(err: unknown): AnnouncementFailure {
  const code = errorCodeOf(err);
  const status = statusOf(err);

  if (code === "NETWORK_ERROR" || status === undefined || status === 0) {
    return { type: "network-error" };
  }
  if (status === 401 || status === 403 || code === "UNAUTHORIZED") {
    return { type: "unauthorized" };
  }
  if (status === 404 || code === "ANNOUNCEMENT_NOT_FOUND") {
    return { type: "not-found" };
  }
  return { type: "unknown" };
}

export class AnnouncementRepository implements IAnnouncementRepository {
  constructor(private readonly http: AxiosInstance) {}

  async listAnnouncements(
    filter: AnnouncementListFilter,
  ): Promise<AnnouncementEntity[]> {
    try {
      const params: Record<string, unknown> = {};
      if (filter !== "all") params.status = filter;
      const dtos = (await this.http.get(ANNOUNCEMENTS_EP.list, {
        params,
      })) as unknown as AnnouncementResponseDto[];
      return (dtos ?? []).map(mapAnnouncement);
    } catch (err) {
      throw toFailure(err);
    }
  }

  async createAnnouncement(
    input: CreateAnnouncementInput,
  ): Promise<AnnouncementEntity> {
    try {
      const dto = (await this.http.post(
        ANNOUNCEMENTS_EP.create,
        input,
      )) as unknown as AnnouncementResponseDto;
      return mapAnnouncement(dto);
    } catch (err) {
      throw toFailure(err);
    }
  }

  async updateAnnouncement(
    input: UpdateAnnouncementInput,
  ): Promise<AnnouncementEntity> {
    try {
      const { id, ...body } = input;
      const dto = (await this.http.put(
        ANNOUNCEMENTS_EP.update(id),
        body,
      )) as unknown as AnnouncementResponseDto;
      return mapAnnouncement(dto);
    } catch (err) {
      throw toFailure(err);
    }
  }

  async deleteAnnouncement(id: string): Promise<void> {
    try {
      await this.http.delete(ANNOUNCEMENTS_EP.delete(id));
    } catch (err) {
      throw toFailure(err);
    }
  }

  async getRecipients(id: string): Promise<AnnouncementRecipient[]> {
    try {
      const dtos = (await this.http.get(
        ANNOUNCEMENTS_EP.recipients(id),
      )) as unknown as AnnouncementRecipientDto[];
      return (dtos ?? []).map(mapRecipient);
    } catch (err) {
      throw toFailure(err);
    }
  }

  async sendReminder(id: string): Promise<{ unreadCount: number }> {
    try {
      const dto = (await this.http.post(
        ANNOUNCEMENTS_EP.remind(id),
      )) as unknown as { unreadCount: number };
      return { unreadCount: dto?.unreadCount ?? 0 };
    } catch (err) {
      throw toFailure(err);
    }
  }
}
