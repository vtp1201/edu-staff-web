import "server-only";

import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { ICalendarRepository } from "@/features/admin/calendar/domain/repositories/i-calendar.repository";
import { ActivateYearUseCase } from "@/features/admin/calendar/domain/use-cases/activate-year.use-case";
import { ArchiveYearUseCase } from "@/features/admin/calendar/domain/use-cases/archive-year.use-case";
import { CreateTermUseCase } from "@/features/admin/calendar/domain/use-cases/create-term.use-case";
import { CreateYearUseCase } from "@/features/admin/calendar/domain/use-cases/create-year.use-case";
import { DeleteTermUseCase } from "@/features/admin/calendar/domain/use-cases/delete-term.use-case";
import { ListYearsUseCase } from "@/features/admin/calendar/domain/use-cases/list-years.use-case";
import { UpdateTermUseCase } from "@/features/admin/calendar/domain/use-cases/update-term.use-case";
import { CalendarRepository } from "@/features/admin/calendar/infrastructure/repositories/calendar.repository";
import { MockCalendarRepository } from "@/features/admin/calendar/infrastructure/repositories/mocks/calendar.mock.repository";

async function makeRepo(): Promise<ICalendarRepository> {
  if (USE_MOCK) return new MockCalendarRepository();
  return new CalendarRepository(await createServerHttpClient());
}

export async function makeListYearsUseCase() {
  return new ListYearsUseCase(await makeRepo());
}

export async function makeCreateYearUseCase() {
  return new CreateYearUseCase(await makeRepo());
}

export async function makeCreateTermUseCase() {
  return new CreateTermUseCase(await makeRepo());
}

export async function makeUpdateTermUseCase() {
  return new UpdateTermUseCase(await makeRepo());
}

export async function makeDeleteTermUseCase() {
  return new DeleteTermUseCase(await makeRepo());
}

export async function makeActivateYearUseCase() {
  return new ActivateYearUseCase(await makeRepo());
}

export async function makeArchiveYearUseCase() {
  return new ArchiveYearUseCase(await makeRepo());
}
