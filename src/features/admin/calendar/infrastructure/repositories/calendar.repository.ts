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
  AcademicYearResponseDto,
  TermResponseDto,
} from "../dtos/academic-year-response.dto";
import { AcademicYearMapper, TermMapper } from "../mappers/calendar.mapper";

/**
 * Map a normalised {@link ApiError} (via its UPPER_SNAKE `code`) to the
 * calendar failure union. Branch on `code`, never on the localised message.
 * Covers every `CALENDAR_*` code in `core/docs/ERROR_CODES.md`.
 */
function mapCalendarFailure(err: unknown): CalendarFailure {
  const code = errorCodeOf(err);
  switch (code) {
    // 400 — invalid input
    case "CALENDAR_INVALID_LABEL":
      return { type: "invalid-label", message: "Invalid year label" };
    case "CALENDAR_INVALID_TERM_NAME":
      return { type: "invalid-term-name", message: "Invalid term name" };
    case "CALENDAR_INVALID_DATE_RANGE":
      return { type: "date-order", message: "Invalid date range" };
    // 400 — malformed ids (defensive: ids come from prior API responses, not
    // user input, so these shouldn't occur — but must not fall through).
    case "CALENDAR_INVALID_TENANT_ID":
      return { type: "forbidden", message: "Invalid tenant" };
    case "CALENDAR_INVALID_YEAR_ID":
      return { type: "not-found-year", message: "Invalid year id" };
    case "CALENDAR_INVALID_TERM_ID":
      return { type: "not-found-term", message: "Invalid term id" };
    // 403
    case "CALENDAR_FORBIDDEN":
      return { type: "forbidden", message: "Forbidden" };
    // 404
    case "CALENDAR_YEAR_NOT_FOUND":
      return { type: "not-found-year", message: "Year not found" };
    case "CALENDAR_TERM_NOT_FOUND":
      return { type: "not-found-term", message: "Term not found" };
    // 409
    case "CALENDAR_YEAR_LABEL_EXISTS":
      return { type: "year-label-exists", message: "Label already exists" };
    case "CALENDAR_ACTIVE_YEAR_EXISTS":
      return {
        type: "active-year-exists",
        message: "An active year already exists",
      };
    case "CALENDAR_YEAR_ARCHIVED":
      return { type: "year-archived", message: "Year is archived" };
    case "CALENDAR_TERM_OVERLAP":
      return { type: "date-overlap", message: "Term dates overlap" };
    case "CALENDAR_TERM_IN_USE":
      return { type: "graded-term-delete", message: "Term has grades" };
    // transport
    case "NETWORK_ERROR":
      return { type: "network-error", message: "Network error" };
    default:
      return { type: "unknown", message: "Unexpected error" };
  }
}

export class CalendarRepository implements ICalendarRepository {
  constructor(private readonly http: AxiosInstance) {}

  /**
   * Fetch the flat term DTOs for a year (no failure mapping — callers that
   * fan out already sit inside a try/catch). Kept private so the fan-out and
   * the public `listTerms` share one path.
   */
  private async fetchTermDtos(yearId: string): Promise<TermResponseDto[]> {
    return (await this.http.get(
      CALENDAR_EP.terms(yearId),
    )) as unknown as TermResponseDto[];
  }

  /** Assemble the nested {@link AcademicYear} from a flat year DTO + its terms. */
  private async assembleYear(
    dto: AcademicYearResponseDto,
  ): Promise<AcademicYear> {
    const termDtos = await this.fetchTermDtos(dto.academicYearId);
    return AcademicYearMapper.fromDto(dto, termDtos);
  }

  async listYears(cursor?: string): Promise<YearsPage> {
    try {
      // List endpoint needs pagination → request the raw envelope and read
      // `meta.pagination` via parseEnvelope (api-integration rule).
      const env = (await this.http.get(CALENDAR_EP.years, {
        params: cursor ? { cursor } : undefined,
        raw: true,
      })) as unknown as ApiEnvelope<AcademicYearResponseDto[]>;
      const { data, pagination } = parseEnvelope(env);
      // BE keeps ARCHIVED years (it doesn't delete them like the mock did) —
      // filter them out to preserve the "archived year disappears" UX.
      const visible = data.filter((dto) => dto.status !== "ARCHIVED");
      // The wire year response is flat (no nested terms) — fan out per year to
      // reassemble the nested shape the domain/UI expect. Parallel per year.
      const years = await Promise.all(
        visible.map((dto) => this.assembleYear(dto)),
      );
      return {
        years,
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
    let dto: AcademicYearResponseDto;
    try {
      // BE's CreateAcademicYearRequest accepts `label` only — a new year is
      // always DRAFT with no terms; drop `isActive` from the wire body.
      dto = (await this.http.post(CALENDAR_EP.years, {
        label: input.label,
      })) as unknown as AcademicYearResponseDto;
    } catch (err) {
      throw mapCalendarFailure(err);
    }
    // Create-as-active is not atomic on the BE. If requested, chain a separate
    // activate call and return ITS result (activateYear maps its own errors —
    // called OUTSIDE the try so an already-mapped failure isn't re-mapped). A
    // conflict there (active-year-exists) is surfaced to the UI; the created
    // DRAFT year is NOT rolled back (BE has no delete-year endpoint) and stays
    // visible, inactive, in the list.
    if (input.isActive) {
      return this.activateYear(dto.academicYearId);
    }
    // Fresh DRAFT year — no terms yet, skip the fan-out.
    return AcademicYearMapper.fromDto(dto, []);
  }

  async getActiveYear(): Promise<AcademicYear | null> {
    try {
      const dto = (await this.http.get(
        CALENDAR_EP.activeYear,
      )) as unknown as AcademicYearResponseDto | null;
      return dto ? await this.assembleYear(dto) : null;
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
      )) as unknown as AcademicYearResponseDto;
      return await this.assembleYear(dto);
    } catch (err) {
      throw mapCalendarFailure(err);
    }
  }

  async activateYear(id: string): Promise<AcademicYear> {
    try {
      const dto = (await this.http.post(
        CALENDAR_EP.activateYear(id),
      )) as unknown as AcademicYearResponseDto;
      return await this.assembleYear(dto);
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
      )) as unknown as TermResponseDto;
      return TermMapper.fromDto(dto);
    } catch (err) {
      throw mapCalendarFailure(err);
    }
  }

  async listTerms(yearId: string): Promise<Term[]> {
    try {
      const dtos = await this.fetchTermDtos(yearId);
      return dtos.map(TermMapper.fromDto);
    } catch (err) {
      throw mapCalendarFailure(err);
    }
  }

  async getTerm(yearId: string, termId: string): Promise<Term> {
    try {
      const dto = (await this.http.get(
        CALENDAR_EP.term(yearId, termId),
      )) as unknown as TermResponseDto;
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
      )) as unknown as TermResponseDto;
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
