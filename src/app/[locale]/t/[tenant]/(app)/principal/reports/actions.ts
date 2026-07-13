"use server";

import {
  makeGenerateReportUseCase,
  makeGetAttendanceTrendUseCase,
  makeGetPeriodicReportsUseCase,
  makeGetReportsSummaryUseCase,
  makeGetSubjectAveragesUseCase,
} from "@/bootstrap/di/principal-reports.di";
import type { AttendanceTrendPointEntity } from "@/features/principal/domain/reports/entities/attendance-trend-point.entity";
import type { ReportListItemEntity } from "@/features/principal/domain/reports/entities/report-list-item.entity";
import type {
  ReportsSummaryEntity,
  Term,
} from "@/features/principal/domain/reports/entities/reports-summary.entity";
import type { SubjectAverageEntity } from "@/features/principal/domain/reports/entities/subject-average.entity";
import type { PrincipalReportsFailure } from "@/features/principal/domain/reports/failures/principal-reports.failure";
import type { ActionResult } from "@/features/principal/presentation/reports/reports-screen.i-vm";

/** Failures are thrown by the repos as `{ type }` objects; surface the key
 *  (never a translated string — i18n.md boundary). */
function toErrorKey(err: unknown): PrincipalReportsFailure["type"] {
  if (err && typeof err === "object" && "type" in err) {
    return (err as PrincipalReportsFailure).type;
  }
  return "network-error";
}

export async function getReportsSummaryAction(
  termId: Term,
): Promise<ActionResult<ReportsSummaryEntity>> {
  try {
    const data = await (await makeGetReportsSummaryUseCase()).execute(termId);
    return { ok: true, data };
  } catch (err) {
    return { ok: false, errorKey: toErrorKey(err) };
  }
}

export async function getSubjectAveragesAction(
  termId: Term,
): Promise<ActionResult<SubjectAverageEntity[]>> {
  try {
    const data = await (await makeGetSubjectAveragesUseCase()).execute(termId);
    return { ok: true, data };
  } catch (err) {
    return { ok: false, errorKey: toErrorKey(err) };
  }
}

export async function getAttendanceTrendAction(
  termId: Term,
): Promise<ActionResult<AttendanceTrendPointEntity[]>> {
  try {
    const data = await (await makeGetAttendanceTrendUseCase()).execute(termId);
    return { ok: true, data };
  } catch (err) {
    return { ok: false, errorKey: toErrorKey(err) };
  }
}

export async function getPeriodicReportsAction(
  termId: Term,
): Promise<ActionResult<ReportListItemEntity[]>> {
  try {
    const page = await (await makeGetPeriodicReportsUseCase()).execute(termId);
    return { ok: true, data: page.items };
  } catch (err) {
    return { ok: false, errorKey: toErrorKey(err) };
  }
}

export async function generateReportAction(
  termId: Term,
): Promise<ActionResult<ReportListItemEntity>> {
  try {
    const data = await (await makeGenerateReportUseCase()).execute(termId);
    return { ok: true, data };
  } catch (err) {
    return { ok: false, errorKey: toErrorKey(err) };
  }
}
