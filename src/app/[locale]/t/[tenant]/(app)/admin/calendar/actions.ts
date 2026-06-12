"use server";

import { revalidatePath } from "next/cache";
import {
  makeCreateTermUseCase,
  makeCreateYearUseCase,
  makeDeleteTermUseCase,
  makeListYearsUseCase,
  makeUpdateTermUseCase,
} from "@/bootstrap/di/calendar.di";
import type { AcademicYear } from "@/features/admin/calendar/domain/entities/academic-year.entity";
import type { Term } from "@/features/admin/calendar/domain/entities/term.entity";
import type { CalendarErrorKey } from "@/features/admin/calendar/presentation/calendar-screen/calendar-screen.i-vm";

const CALENDAR_ROUTE = "/[locale]/t/[tenant]/(app)/admin/calendar";

function toErrorKey(err: unknown): CalendarErrorKey {
  // Repository normalizes transport errors to ApiError; treat any thrown error
  // as a network-level failure (validation failures arrive via the Result type).
  if (err instanceof Error && err.message === "network-error") {
    return "network-error";
  }
  return "unknown";
}

export async function createYearAction(
  label: string,
  isActive: boolean,
): Promise<
  { ok: true; year: AcademicYear } | { ok: false; errorKey: CalendarErrorKey }
> {
  try {
    const useCase = await makeCreateYearUseCase();
    const result = await useCase.execute({ label, isActive });
    if (!result.ok) return { ok: false, errorKey: result.failure.type };
    revalidatePath(CALENDAR_ROUTE, "page");
    return { ok: true, year: result.value };
  } catch (err) {
    return { ok: false, errorKey: toErrorKey(err) };
  }
}

async function fetchExistingTerms(yearId: string): Promise<Term[]> {
  const listUseCase = await makeListYearsUseCase();
  const years = await listUseCase.execute();
  return years.find((y) => y.id === yearId)?.terms ?? [];
}

export async function createTermAction(
  yearId: string,
  name: string,
  startDate: string,
  endDate: string,
): Promise<
  { ok: true; term: Term } | { ok: false; errorKey: CalendarErrorKey }
> {
  try {
    const existingTerms = await fetchExistingTerms(yearId);
    const useCase = await makeCreateTermUseCase();
    const result = await useCase.execute({
      yearId,
      name,
      startDate,
      endDate,
      existingTerms,
    });
    if (!result.ok) return { ok: false, errorKey: result.failure.type };
    revalidatePath(CALENDAR_ROUTE, "page");
    return { ok: true, term: result.value };
  } catch (err) {
    return { ok: false, errorKey: toErrorKey(err) };
  }
}

export async function updateTermAction(
  yearId: string,
  termId: string,
  name: string,
  startDate: string,
  endDate: string,
): Promise<
  { ok: true; term: Term } | { ok: false; errorKey: CalendarErrorKey }
> {
  try {
    const existingTerms = await fetchExistingTerms(yearId);
    const useCase = await makeUpdateTermUseCase();
    const result = await useCase.execute({
      yearId,
      termId,
      name,
      startDate,
      endDate,
      existingTerms,
    });
    if (!result.ok) return { ok: false, errorKey: result.failure.type };
    revalidatePath(CALENDAR_ROUTE, "page");
    return { ok: true, term: result.value };
  } catch (err) {
    return { ok: false, errorKey: toErrorKey(err) };
  }
}

export async function deleteTermAction(
  yearId: string,
  termId: string,
  hasGrades: boolean,
): Promise<{ ok: true } | { ok: false; errorKey: CalendarErrorKey }> {
  try {
    const useCase = await makeDeleteTermUseCase();
    const result = await useCase.execute(yearId, termId, hasGrades);
    if (!result.ok) return { ok: false, errorKey: result.failure.type };
    revalidatePath(CALENDAR_ROUTE, "page");
    return { ok: true };
  } catch (err) {
    return { ok: false, errorKey: toErrorKey(err) };
  }
}
