import "server-only";
import type { AxiosInstance } from "axios";
import { CALENDAR_EP } from "@/bootstrap/endpoint/calendar.endpoint";
import {
  type ApiEnvelope,
  errorCodeOf,
  parseEnvelope,
} from "@/bootstrap/lib/api-envelope";
import type { AcademicYear } from "../../domain/entities/academic-year.entity";
import type { Term } from "../../domain/entities/term.entity";
import type { CalendarFailure } from "../../domain/failures/calendar.failure";
import type {
  ICalendarRepository,
  YearsPage,
} from "../../domain/repositories/i-calendar.repository";
import type {
  AcademicYearDto,
  TermDto,
} from "../dtos/academic-year-response.dto";
import { AcademicYearMapper, TermMapper } from "../mappers/calendar.mapper";

/**
 * Map a normalised {@link ApiError} (via its UPPER_SNAKE `code`) to the
 * calendar failure union. Branch on `code`, never on the localised message.
 */
function mapCalendarFailure(err: unknown): CalendarFailure {
  const code = errorCodeOf(err);
  switch (code) {
    case "CALENDAR_YEAR_NOT_FOUND":
      return { type: "not-found-year", message: "Year not found" };
    case "CALENDAR_YEAR_LABEL_EXISTS":
      return { type: "year-label-exists", message: "Label already exists" };
    case "CALENDAR_ACTIVE_YEAR_EXISTS":
      return {
        type: "active-year-exists",
        message: "An active year already exists",
      };
    case "CALENDAR_YEAR_ARCHIVED":
      return { type: "year-archived", message: "Year is archived" };
    case "CALENDAR_INVALID_DATE_RANGE":
      return { type: "date-order", message: "Invalid date range" };
    case "CALENDAR_TERM_OVERLAP":
      return { type: "date-overlap", message: "Term dates overlap" };
    case "CALENDAR_TERM_NOT_FOUND":
      return { type: "not-found-term", message: "Term not found" };
    case "CALENDAR_TERM_IN_USE":
      return { type: "graded-term-delete", message: "Term has grades" };
    case "CALENDAR_FORBIDDEN":
      return { type: "network-error", message: "Forbidden" };
    case "NETWORK_ERROR":
      return { type: "network-error", message: "Network error" };
    default:
      return { type: "unknown", message: "Unexpected error" };
  }
}

export class CalendarRepository implements ICalendarRepository {
  constructor(private readonly http: AxiosInstance) {}

  async listYears(cursor?: string): Promise<YearsPage> {
    try {
      // List endpoint needs pagination → request the raw envelope and read
      // `meta.pagination` via parseEnvelope (api-integration rule).
      const env = (await this.http.get(CALENDAR_EP.years, {
        params: cursor ? { cursor } : undefined,
        raw: true,
      })) as unknown as ApiEnvelope<AcademicYearDto[]>;
      const { data, pagination } = parseEnvelope(env);
      return {
        years: data.map(AcademicYearMapper.fromDto),
        hasMore: pagination?.hasMore ?? false,
        nextCursor: pagination?.nextCursor ?? null,
      };
    } catch (err) {
      throw mapCalendarFailure(err);
    }
  }

  async createYear(input: {
    label: string;
    isActive: boolean;
  }): Promise<AcademicYear> {
    try {
      const dto = (await this.http.post(
        CALENDAR_EP.years,
        input,
      )) as unknown as AcademicYearDto;
      return AcademicYearMapper.fromDto(dto);
    } catch (err) {
      throw mapCalendarFailure(err);
    }
  }

  async getActiveYear(): Promise<AcademicYear | null> {
    try {
      const dto = (await this.http.get(
        CALENDAR_EP.activeYear,
      )) as unknown as AcademicYearDto | null;
      return dto ? AcademicYearMapper.fromDto(dto) : null;
    } catch (err) {
      const failure = mapCalendarFailure(err);
      // No active year yet is an expected empty state, not an error.
      if (failure.type === "not-found-year") return null;
      throw failure;
    }
  }

  async getYear(id: string): Promise<AcademicYear> {
    try {
      const dto = (await this.http.get(
        CALENDAR_EP.year(id),
      )) as unknown as AcademicYearDto;
      return AcademicYearMapper.fromDto(dto);
    } catch (err) {
      throw mapCalendarFailure(err);
    }
  }

  async activateYear(id: string): Promise<AcademicYear> {
    try {
      const dto = (await this.http.post(
        CALENDAR_EP.activateYear(id),
      )) as unknown as AcademicYearDto;
      return AcademicYearMapper.fromDto(dto);
    } catch (err) {
      throw mapCalendarFailure(err);
    }
  }

  async archiveYear(id: string): Promise<void> {
    try {
      await this.http.post(CALENDAR_EP.archiveYear(id));
    } catch (err) {
      throw mapCalendarFailure(err);
    }
  }

  async createTerm(
    yearId: string,
    input: { name: string; startDate: string; endDate: string },
  ): Promise<Term> {
    try {
      const dto = (await this.http.post(
        CALENDAR_EP.terms(yearId),
        input,
      )) as unknown as TermDto;
      return TermMapper.fromDto(dto);
    } catch (err) {
      throw mapCalendarFailure(err);
    }
  }

  async listTerms(yearId: string): Promise<Term[]> {
    try {
      const dtos = (await this.http.get(
        CALENDAR_EP.terms(yearId),
      )) as unknown as TermDto[];
      return dtos.map(TermMapper.fromDto);
    } catch (err) {
      throw mapCalendarFailure(err);
    }
  }

  async getTerm(yearId: string, termId: string): Promise<Term> {
    try {
      const dto = (await this.http.get(
        CALENDAR_EP.term(yearId, termId),
      )) as unknown as TermDto;
      return TermMapper.fromDto(dto);
    } catch (err) {
      throw mapCalendarFailure(err);
    }
  }

  async updateTerm(
    yearId: string,
    termId: string,
    input: { name?: string; startDate?: string; endDate?: string },
  ): Promise<Term> {
    try {
      const dto = (await this.http.patch(
        CALENDAR_EP.term(yearId, termId),
        input,
      )) as unknown as TermDto;
      return TermMapper.fromDto(dto);
    } catch (err) {
      throw mapCalendarFailure(err);
    }
  }

  async archiveTerm(yearId: string, termId: string): Promise<void> {
    try {
      await this.http.post(CALENDAR_EP.archiveTerm(yearId, termId));
    } catch (err) {
      throw mapCalendarFailure(err);
    }
  }
}
