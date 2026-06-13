import "server-only";
import { mockDelay } from "@/bootstrap/lib/mock";
import type { AcademicYear } from "../../../domain/entities/academic-year.entity";
import type { Term } from "../../../domain/entities/term.entity";
import type {
  ICalendarRepository,
  YearsPage,
} from "../../../domain/repositories/i-calendar.repository";
import { CAL_SEED_YEARS } from "./fixtures";

function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

// Module-level mutable copy so mutations survive within a server process.
let years: AcademicYear[] = structuredClone(CAL_SEED_YEARS);

export class MockCalendarRepository implements ICalendarRepository {
  async listYears(_cursor?: string): Promise<YearsPage> {
    await mockDelay(200);
    // Mock dataset is small → single page, no cursor.
    return { years: structuredClone(years), hasMore: false, nextCursor: null };
  }

  async createYear(input: {
    label: string;
    isActive: boolean;
  }): Promise<AcademicYear> {
    await mockDelay(300);
    const year: AcademicYear = {
      id: newId("ay"),
      label: input.label,
      isActive: input.isActive,
      terms: [],
    };
    if (input.isActive) {
      years = years.map((y) => ({ ...y, isActive: false }));
    }
    years = [year, ...years];
    return structuredClone(year);
  }

  async getActiveYear(): Promise<AcademicYear | null> {
    await mockDelay(150);
    const found = years.find((y) => y.isActive);
    return found ? structuredClone(found) : null;
  }

  async getYear(id: string): Promise<AcademicYear> {
    await mockDelay(150);
    const found = years.find((y) => y.id === id);
    if (!found) throw new Error("year-not-found");
    return structuredClone(found);
  }

  async activateYear(id: string): Promise<AcademicYear> {
    await mockDelay(250);
    years = years.map((y) => ({ ...y, isActive: y.id === id }));
    const found = years.find((y) => y.id === id);
    if (!found) throw new Error("year-not-found");
    return structuredClone(found);
  }

  async archiveYear(id: string): Promise<void> {
    await mockDelay(250);
    years = years.filter((y) => y.id !== id);
  }

  async createTerm(
    yearId: string,
    input: { name: string; startDate: string; endDate: string },
  ): Promise<Term> {
    await mockDelay(300);
    const term: Term = {
      id: newId("tm"),
      name: input.name,
      startDate: input.startDate,
      endDate: input.endDate,
      hasGrades: false,
    };
    years = years.map((y) =>
      y.id !== yearId ? y : { ...y, terms: [...y.terms, term] },
    );
    return structuredClone(term);
  }

  async listTerms(yearId: string): Promise<Term[]> {
    await mockDelay(150);
    const found = years.find((y) => y.id === yearId);
    return structuredClone(found?.terms ?? []);
  }

  async getTerm(yearId: string, termId: string): Promise<Term> {
    await mockDelay(150);
    const term = years
      .find((y) => y.id === yearId)
      ?.terms.find((t) => t.id === termId);
    if (!term) throw new Error("term-not-found");
    return structuredClone(term);
  }

  async updateTerm(
    yearId: string,
    termId: string,
    input: { name?: string; startDate?: string; endDate?: string },
  ): Promise<Term> {
    await mockDelay(250);
    let patched: Term | undefined;
    years = years.map((y) =>
      y.id !== yearId
        ? y
        : {
            ...y,
            terms: y.terms.map((tm) => {
              if (tm.id !== termId) return tm;
              patched = { ...tm, ...input };
              return patched;
            }),
          },
    );
    if (!patched) throw new Error("term-not-found");
    return structuredClone(patched);
  }

  async archiveTerm(yearId: string, termId: string): Promise<void> {
    await mockDelay(250);
    years = years.map((y) =>
      y.id !== yearId
        ? y
        : { ...y, terms: y.terms.filter((tm) => tm.id !== termId) },
    );
  }
}
