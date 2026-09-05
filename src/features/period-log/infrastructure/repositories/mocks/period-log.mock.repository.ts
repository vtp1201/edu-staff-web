import "server-only";

import { mockDelay } from "@/bootstrap/lib/mock";
import type {
  PeriodLog,
  SavePeriodLogInput,
} from "../../../domain/entities/period-log.entity";
import type {
  PeriodPrep,
  SavePeriodPrepInput,
} from "../../../domain/entities/period-prep.entity";
import type {
  IPeriodLogRepository,
  PeriodTermContext,
} from "../../../domain/repositories/i-period-log.repository";
import { seedPeriodLogs, seedPeriodPreps } from "./fixtures";

/** `${classId}#${date}#${periodNumber}` — the store key, same tuple the BE's
 *  own primary key uses (termId is deliberately NOT part of it). */
function keyOf(classId: string, date: string, periodNumber: number): string {
  return `${classId}#${date}#${periodNumber}`;
}

const DAY_OF_WEEK = ["MON", "TUE", "WED", "THU", "FRI"] as const;

/** Weekday derived from the date, mirroring the BE's own denormalisation.
 *  A weekend date can never reach a real slot, so it falls back to MON here. */
function dayOfWeekOf(date: string): PeriodLog["dayOfWeek"] {
  const index = (new Date(`${date}T00:00:00`).getDay() + 6) % 7;
  return DAY_OF_WEEK[index] ?? "MON";
}

/**
 * Module-level mutable stores (decision 0014 mock convention): writes persist
 * across requests within one dev server so a saved log survives the RSC
 * re-render that follows `revalidatePath`.
 *
 * This mock is a DUMB STORE: it does NOT re-check slot ownership. That guard is
 * the use-case's (`ownsSlot`, decision 0063) and the BE's — duplicating it here
 * would let a passing mock test hide a missing use-case guard.
 */
const logs = new Map<string, PeriodLog>(
  seedPeriodLogs().map((l) => [keyOf(l.classId, l.date, l.periodNumber), l]),
);
const preps = new Map<string, PeriodPrep>(
  seedPeriodPreps().map((p) => [keyOf(p.classId, p.date, p.periodNumber), p]),
);

export class MockPeriodLogRepository implements IPeriodLogRepository {
  async listPeriodLogs(
    classId: string,
    from: string,
    to: string,
  ): Promise<PeriodLog[]> {
    await mockDelay(120);
    return [...logs.values()]
      .filter((l) => l.classId === classId && l.date >= from && l.date <= to)
      .sort((a, b) =>
        a.date === b.date
          ? a.periodNumber - b.periodNumber
          : a.date.localeCompare(b.date),
      );
  }

  async savePeriodLog(
    classId: string,
    date: string,
    periodNumber: number,
    ctx: PeriodTermContext,
    input: SavePeriodLogInput,
  ): Promise<PeriodLog> {
    await mockDelay(150);
    const key = keyOf(classId, date, periodNumber);
    const existing = logs.get(key);
    const now = new Date().toISOString();
    const saved: PeriodLog = {
      classId,
      date,
      periodNumber,
      termId: ctx.termId,
      dayOfWeek: dayOfWeekOf(date),
      subjectId: existing?.subjectId ?? "math",
      teacherMemberId: existing?.teacherMemberId ?? "t1",
      lessonTitle: input.lessonTitle,
      remark: input.remark ?? "",
      grade: input.grade,
      absentCount: input.absentCount,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    logs.set(key, saved);
    return saved;
  }

  /** `_ctx` is unused: term containment + slot re-authorization are the BE's
   *  job, and this mock is a dumb store. The parameter stays for interface
   *  parity so a caller cannot silently drop it. */
  async deletePeriodLog(
    classId: string,
    date: string,
    periodNumber: number,
    _ctx: PeriodTermContext,
  ): Promise<void> {
    await mockDelay(120);
    logs.delete(keyOf(classId, date, periodNumber));
  }

  async listPeriodPreps(
    classId: string,
    from: string,
    to: string,
  ): Promise<PeriodPrep[]> {
    await mockDelay(120);
    return [...preps.values()]
      .filter((p) => p.classId === classId && p.date >= from && p.date <= to)
      .sort((a, b) =>
        a.date === b.date
          ? a.periodNumber - b.periodNumber
          : a.date.localeCompare(b.date),
      );
  }

  async savePeriodPrep(
    classId: string,
    date: string,
    periodNumber: number,
    ctx: PeriodTermContext,
    input: SavePeriodPrepInput,
  ): Promise<PeriodPrep> {
    await mockDelay(150);
    const key = keyOf(classId, date, periodNumber);
    const existing = preps.get(key);
    const now = new Date().toISOString();
    const saved: PeriodPrep = {
      classId,
      date,
      periodNumber,
      termId: ctx.termId,
      dayOfWeek: dayOfWeekOf(date),
      subjectId: existing?.subjectId ?? "math",
      teacherMemberId: existing?.teacherMemberId ?? "t1",
      note: input.note ?? "",
      lessonPlanId: input.lessonPlanId ?? null,
      // Full replace, not a merge — mirrors the PUT's own semantics.
      materials: input.materials.map((m) => ({ ...m })),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    preps.set(key, saved);
    return saved;
  }

  async deletePeriodPrep(
    classId: string,
    date: string,
    periodNumber: number,
    _ctx: PeriodTermContext,
  ): Promise<void> {
    await mockDelay(120);
    preps.delete(keyOf(classId, date, periodNumber));
  }
}
