import "server-only";
import type { AxiosInstance } from "axios";
import { CLASS_LOG_EP } from "@/bootstrap/endpoint/class-log.endpoint";
import {
  type ApiEnvelope,
  errorCodeOf,
  parseEnvelope,
  statusOf,
} from "@/bootstrap/lib/api-envelope";
import type { HomeroomEntry } from "../../domain/entities/homeroom-entry.entity";
import type { ClassLogFailure } from "../../domain/failures/class-log.failure";
import type {
  IClassLogRepository,
  ListEntriesParams,
  ListEntriesResult,
} from "../../domain/repositories/i-class-log.repository";
import type { HomeroomEntryListResponseDto } from "../dtos/homeroom-entry-list-response.dto";
import type { HomeroomEntryResponseDto } from "../dtos/homeroom-entry-response.dto";
import { ClassLogMapper } from "../mappers/class-log.mapper";

/**
 * Map a normalised ApiError to the class-log failure union (US-E13.3).
 * Branch on error.code (UPPER_SNAKE) / status, never on message.
 */
export function toFailure(err: unknown): ClassLogFailure {
  const code = errorCodeOf(err);
  const status = statusOf(err);

  if (code === "NETWORK_ERROR" || status === undefined || status === 0) {
    return { type: "network-error" };
  }
  if (code === "HOMEROOM_ENTRY_NOT_FOUND" || status === 404) {
    return { type: "not-found" };
  }
  if (code === "HOMEROOM_ENTRY_ALREADY_SUBMITTED") {
    return { type: "already-submitted" };
  }
  if (code === "HOMEROOM_ENTRY_NOT_SUBMITTED") {
    return { type: "not-submitted" };
  }
  if (code === "HOMEROOM_ENTRY_DUPLICATE_DATE") {
    return { type: "duplicate-date" };
  }
  if (code === "FORBIDDEN" || code === "UNAUTHORIZED" || status === 403) {
    return { type: "unauthorized" };
  }
  return { type: "unknown", message: code };
}

export class ClassLogRepository implements IClassLogRepository {
  constructor(private readonly http: AxiosInstance) {}

  async createEntry(
    classId: string,
    entryDate: string,
    summary: string,
    notableEvents?: string,
  ): Promise<HomeroomEntry> {
    try {
      const dto = (await this.http.post(CLASS_LOG_EP.entries(classId), {
        entryDate,
        summary,
        notableEvents,
      })) as unknown as HomeroomEntryResponseDto;
      return ClassLogMapper.toEntity(dto);
    } catch (err) {
      throw toFailure(err);
    }
  }

  async listEntries(params: ListEntriesParams): Promise<ListEntriesResult> {
    try {
      const { classId, fromDate, toDate, cursor, limit } = params;
      const envelope = (await this.http.get(CLASS_LOG_EP.entries(classId), {
        params: { fromDate, toDate, cursor, limit },
        raw: true,
      })) as unknown as ApiEnvelope<HomeroomEntryListResponseDto>;
      const { data, pagination } = parseEnvelope(envelope);
      return {
        entries: (data.entries ?? []).map(ClassLogMapper.toEntity),
        nextCursor: pagination?.nextCursor ?? undefined,
        hasMore: pagination?.hasMore ?? false,
      };
    } catch (err) {
      throw toFailure(err);
    }
  }

  async submitEntry(classId: string, entryId: string): Promise<HomeroomEntry> {
    try {
      const dto = (await this.http.post(
        CLASS_LOG_EP.submit(classId, entryId),
      )) as unknown as HomeroomEntryResponseDto;
      return ClassLogMapper.toEntity(dto);
    } catch (err) {
      throw toFailure(err);
    }
  }

  async approveEntry(classId: string, entryId: string): Promise<HomeroomEntry> {
    try {
      const dto = (await this.http.post(
        CLASS_LOG_EP.approve(classId, entryId),
      )) as unknown as HomeroomEntryResponseDto;
      return ClassLogMapper.toEntity(dto);
    } catch (err) {
      throw toFailure(err);
    }
  }

  async rejectEntry(
    classId: string,
    entryId: string,
    reason?: string,
  ): Promise<HomeroomEntry> {
    try {
      const dto = (await this.http.post(CLASS_LOG_EP.reject(classId, entryId), {
        reason,
      })) as unknown as HomeroomEntryResponseDto;
      return ClassLogMapper.toEntity(dto);
    } catch (err) {
      throw toFailure(err);
    }
  }
}
