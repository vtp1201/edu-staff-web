import "server-only";
import type { AxiosInstance } from "axios";
import { CALENDAR_EP } from "@/bootstrap/endpoint/calendar.endpoint";
import type { AcademicYear } from "../../domain/entities/academic-year.entity";
import type { Term } from "../../domain/entities/term.entity";
import type { ICalendarRepository } from "../../domain/repositories/i-calendar.repository";
import type {
  AcademicYearDto,
  AcademicYearListResponseDto,
  TermDto,
} from "../dtos/academic-year-response.dto";
import { AcademicYearMapper, TermMapper } from "../mappers/calendar.mapper";

export class CalendarRepository implements ICalendarRepository {
  constructor(private readonly http: AxiosInstance) {}

  async listYears(): Promise<AcademicYear[]> {
    const dto = (await this.http.get(
      CALENDAR_EP.years,
    )) as unknown as AcademicYearListResponseDto;
    return dto.map(AcademicYearMapper.fromDto);
  }

  async createYear(input: {
    label: string;
    isActive: boolean;
  }): Promise<AcademicYear> {
    const dto = (await this.http.post(
      CALENDAR_EP.years,
      input,
    )) as unknown as AcademicYearDto;
    return AcademicYearMapper.fromDto(dto);
  }

  async patchYear(
    id: string,
    input: { isActive?: boolean },
  ): Promise<AcademicYear> {
    const dto = (await this.http.patch(
      CALENDAR_EP.year(id),
      input,
    )) as unknown as AcademicYearDto;
    return AcademicYearMapper.fromDto(dto);
  }

  async deleteYear(id: string): Promise<void> {
    await this.http.delete(CALENDAR_EP.year(id));
  }

  async createTerm(
    yearId: string,
    input: { name: string; startDate: string; endDate: string },
  ): Promise<Term> {
    const dto = (await this.http.post(
      CALENDAR_EP.terms(yearId),
      input,
    )) as unknown as TermDto;
    return TermMapper.fromDto(dto);
  }

  async patchTerm(
    yearId: string,
    termId: string,
    input: { name: string; startDate: string; endDate: string },
  ): Promise<Term> {
    const dto = (await this.http.patch(
      CALENDAR_EP.term(yearId, termId),
      input,
    )) as unknown as TermDto;
    return TermMapper.fromDto(dto);
  }

  async deleteTerm(yearId: string, termId: string): Promise<void> {
    await this.http.delete(CALENDAR_EP.term(yearId, termId));
  }
}
