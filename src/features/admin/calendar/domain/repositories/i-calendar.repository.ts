import type { AcademicYear } from "../entities/academic-year.entity";
import type { Term } from "../entities/term.entity";

export interface ICalendarRepository {
  listYears(): Promise<AcademicYear[]>;
  createYear(input: {
    label: string;
    isActive: boolean;
  }): Promise<AcademicYear>;
  patchYear(id: string, input: { isActive?: boolean }): Promise<AcademicYear>;
  deleteYear(id: string): Promise<void>;
  createTerm(
    yearId: string,
    input: { name: string; startDate: string; endDate: string },
  ): Promise<Term>;
  patchTerm(
    yearId: string,
    termId: string,
    input: { name: string; startDate: string; endDate: string },
  ): Promise<Term>;
  deleteTerm(yearId: string, termId: string): Promise<void>;
}
