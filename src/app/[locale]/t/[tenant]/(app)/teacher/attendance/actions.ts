"use server";

import { revalidatePath } from "next/cache";
import {
  makeGetAttendanceHistoryUseCase,
  makeSaveAttendanceUseCase,
  makeSummarizeClassAttendanceUseCase,
  toAttendanceFailure,
} from "@/bootstrap/di/attendance.di";
import { makeListYearsUseCase } from "@/bootstrap/di/calendar.di";
import type { AttendanceDaySummary } from "@/features/attendance/domain/entities/attendance-day-summary.entity";
import type { AttendanceRecord } from "@/features/attendance/domain/entities/attendance-record.entity";
import type { ClassAttendanceSummary } from "@/features/attendance/domain/entities/student-attendance-summary.entity";
import type { AttendanceFailure } from "@/features/attendance/domain/failures/attendance.failure";
import type { SummaryYear } from "@/features/attendance/domain/resolve-summary-range";

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; errorKey: AttendanceFailure["type"] };

export async function saveAttendanceAction(
  classId: string,
  date: string,
  records: AttendanceRecord[],
): Promise<{ ok: true } | Err> {
  try {
    const useCase = await makeSaveAttendanceUseCase();
    await useCase.execute(classId, date, records);
    // Tenant-scoped route (US-E05.1); revalidate the attendance page template.
    revalidatePath("/[locale]/t/[tenant]/(app)/teacher/attendance", "page");
    return { ok: true };
  } catch (err) {
    return { ok: false, errorKey: toAttendanceFailure(err).type };
  }
}

export async function getAttendanceHistoryAction(
  classId: string,
  from: string,
  to: string,
): Promise<Ok<AttendanceDaySummary[]> | Err> {
  try {
    const useCase = await makeGetAttendanceHistoryUseCase();
    return { ok: true, data: await useCase.execute(classId, from, to) };
  } catch (err) {
    return { ok: false, errorKey: toAttendanceFailure(err).type };
  }
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Per-student rollup for the summary tab (US-E24.14).
 *
 * The bounds are re-validated HERE, at the trust boundary: `from`/`to` reach
 * this action from URL params via a client container, so "the UI resolved them"
 * is not a guarantee. A malformed day is refused before the use-case, and the
 * ≤366-day span is refused by the use-case itself. No translation happens here
 * — the caller gets a stable failure key.
 */
export async function getAttendanceSummaryAction(
  classId: string,
  from: string,
  to: string,
): Promise<Ok<ClassAttendanceSummary> | Err> {
  if (!classId.trim() || !ISO_DAY.test(from) || !ISO_DAY.test(to)) {
    return { ok: false, errorKey: "invalid-request" };
  }
  try {
    const useCase = await makeSummarizeClassAttendanceUseCase();
    return { ok: true, data: await useCase.execute(classId, from, to) };
  } catch (err) {
    return { ok: false, errorKey: toAttendanceFailure(err).type };
  }
}

/**
 * The academic calendar behind the term/year segments.
 *
 * `GET /academic-years` is an ADMIN-shaped read and a TEACHER may well be
 * refused it (packet Q1). ANY failure — 403, network, an unreadable payload —
 * degrades to `null`, and the tab then offers the month range only with a
 * visible notice. Exactly the posture `resolveTermRange()` takes on
 * `/student/attendance`.
 *
 * Only the fields the range resolver reads are returned: the admin calendar's
 * own entity (grade flags, labels) is none of this screen's business.
 */
export async function getAttendanceTermsAction(): Promise<
  SummaryYear[] | null
> {
  try {
    const years = await (await makeListYearsUseCase()).execute();
    return years.map((year) => ({
      isActive: year.isActive,
      terms: year.terms.map((term) => ({
        id: term.id,
        name: term.name,
        startDate: term.startDate,
        endDate: term.endDate,
      })),
    }));
  } catch {
    return null;
  }
}
