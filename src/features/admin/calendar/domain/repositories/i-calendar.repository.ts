import type { AcademicYear } from "../entities/academic-year.entity";
import type { Term } from "../entities/term.entity";

/** Cursor-paginated page of academic years (only years are cursor-paginated). */
export interface YearsPage {
  years: AcademicYear[];
  hasMore: boolean;
  nextCursor: string | null;
}

export interface ICalendarRepository {
  listYears(cursor?: string): Promise<YearsPage>;
  createYear(input: {
    label: string;
    isActive: boolean;
  }): Promise<AcademicYear>;
  getActiveYear(): Promise<AcademicYear | null>;
  getYear(id: string): Promise<AcademicYear>;
  activateYear(id: string): Promise<AcademicYear>;
  archiveYear(id: string): Promise<void>;
  createTerm(
    yearId: string,
    input: { name: string; startDate: string; endDate: string },
  ): Promise<Term>;
  listTerms(yearId: string): Promise<Term[]>;
  getTerm(yearId: string, termId: string): Promise<Term>;
  updateTerm(
    yearId: string,
    termId: string,
    input: { name?: string; startDate?: string; endDate?: string },
  ): Promise<Term>;
  archiveTerm(yearId: string, termId: string): Promise<void>;
}
