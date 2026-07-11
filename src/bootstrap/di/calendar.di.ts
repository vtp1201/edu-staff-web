import "server-only";

import { ensureFreshSession } from "@/bootstrap/di/auth.di";
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
  // Proactive refresh (decision 0018) — rotate the access token server-side
  // BEFORE the protected core call if it's about to expire, avoiding a wasted
  // 401. US-E18.0 found this was documented but never called by any protected
  // feature's DI factory; wiring it here closes the gap for the calendar
  // cluster (EPIC-OVERVIEW.md playbook step 6, mirrors admin-school-setup.di.ts).
  await ensureFreshSession();
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
