import "server-only";

import type { AxiosInstance } from "axios";
import { TIMETABLE_VIEW_EP } from "@/bootstrap/endpoint/timetable-view.endpoint";
import {
  type ApiEnvelope,
  errorCodeOf,
  parseEnvelope,
} from "@/bootstrap/lib/api-envelope";
import type { TimetableChild } from "../../domain/entities/timetable-child.entity";
import type { WeeklyTimetable } from "../../domain/entities/weekly-timetable.entity";
import type { IWeeklyTimetableRepository } from "../../domain/repositories/i-weekly-timetable.repository";
import type {
  ClassSummaryDto,
  RealTimetableResponseDto,
} from "../dtos/real-timetable-response.dto";
import { mapRealWeeklyTimetable } from "../mappers/real-weekly-timetable.mapper";

/** Resolves the mandatory `termId` from a date (default: today) — same
 *  contract as the admin builder's `TermIdResolver`; injected by DI. */
export type TermIdResolver = (date?: Date) => Promise<string>;

function toNotFoundOrNetworkError(err: unknown): {
  type: "not-found" | "network-error";
} {
  const code = errorCodeOf(err);
  if (code === "TIMETABLE_SLOT_NOT_FOUND" || code === "TIMETABLE_FORBIDDEN") {
    return { type: "not-found" };
  }
  return { type: "network-error" };
}

/**
 * Real HTTP timetable-view repository (US-E18.11). Only `getByClass` and
 * `getByTeacher` are wireable — ground-truthed against the real `core`
 * contract, there is NO `/me`/`/teacher/me`/`/my-children` self-scope endpoint
 * (cross-repo ask #15): `GET /classes` returns 403 `TIMETABLE_FORBIDDEN`-style
 * `ErrClassForbidden` for any STUDENT/PARENT actor (only ADMIN/TEACHER may call
 * it), and `GET /members/{id}/linked-students` carries no classId at all.
 * `getMyTimetable`/`getChildren` therefore throw unconditionally — the DI
 * factory must route those two operations to the mock repository regardless
 * of `NEXT_PUBLIC_USE_MOCK` (same "force-mock half of one repository" pattern
 * as US-E18.8/US-E18.9's fully-blocked stubs, but partial here).
 */
export class RealWeeklyTimetableRepository
  implements IWeeklyTimetableRepository
{
  constructor(
    private readonly http: AxiosInstance,
    private readonly resolveTermId: TermIdResolver,
    private readonly currentUserId: string | null,
  ) {}

  async getByClass(
    classId: string,
    weekStart?: string,
  ): Promise<WeeklyTimetable> {
    try {
      const termId = await this.resolveTermId(
        weekStart ? new Date(weekStart) : undefined,
      );
      const dto = (await this.http.get(
        TIMETABLE_VIEW_EP.classTimetable(classId),
        {
          params: { termId },
        },
      )) as unknown as RealTimetableResponseDto;
      return mapRealWeeklyTimetable(dto, classId);
    } catch (err) {
      throw toNotFoundOrNetworkError(err);
    }
  }

  /**
   * Fan-out: `GET /classes` is TEACHER-role auto-filtered server-side to
   * "classes I'm assigned to" (ground-truthed in
   * `list_classes.go`'s `listForTeacher`, same endpoint/precedent as
   * `teacher-class.repository.ts`'s `listMyClasses`). For each class, fetch
   * the class timetable and keep only the slots this teacher (`currentUserId`
   * — JWT `sub`, confirmed to equal `memberId`) actually teaches, tagging
   * `className` from the class list. Merged into one composite week grid.
   *
   * The filter compares against the RAW wire `teacherMemberId` (not the
   * mapped slot's `teacherName` display field) — deliberately, so this stays
   * correct the day a real teacher-name join replaces the current id-as-name
   * fallback in `mapRealWeeklyTimetable` (tech-lead review finding, US-E18.11).
   */
  async getByTeacher(weekStart?: string): Promise<WeeklyTimetable> {
    try {
      // No verified member id (missing/unreadable token) — surface honestly
      // rather than silently returning an empty week grid (tech-lead review
      // CONSIDER finding, US-E18.11).
      if (!this.currentUserId) throw { type: "not-found" };

      const classes = await this.fetchAllPages<ClassSummaryDto>(
        TIMETABLE_VIEW_EP.myClasses,
      );
      if (classes.length === 0) throw { type: "not-found" };

      const termId = await this.resolveTermId(
        weekStart ? new Date(weekStart) : undefined,
      );
      const slots: WeeklyTimetable["slots"] = {};
      for (const cls of classes) {
        const dto = (await this.http.get(
          TIMETABLE_VIEW_EP.classTimetable(cls.classId),
          { params: { termId } },
        )) as unknown as RealTimetableResponseDto;
        const myRawSlots: RealTimetableResponseDto = {
          ...dto,
          slots: dto.slots.filter(
            (s) => s.teacherMemberId === this.currentUserId,
          ),
        };
        const mapped = mapRealWeeklyTimetable(myRawSlots, cls.name);
        for (const [dayKey, periods] of Object.entries(mapped.slots)) {
          for (const [periodKey, slot] of Object.entries(periods)) {
            if (!slot) continue;
            const dayIndex = Number(dayKey);
            const periodNumber = Number(periodKey);
            slots[dayIndex] ??= {};
            slots[dayIndex][periodNumber] = { ...slot, className: cls.name };
          }
        }
      }
      return {
        classId: this.currentUserId ?? "me",
        className: this.currentUserId ?? "",
        slots,
      };
    } catch (err) {
      if (err && typeof err === "object" && "type" in err) throw err;
      throw toNotFoundOrNetworkError(err);
    }
  }

  /** Force-blocked — no self-scope discovery endpoint exists (ask #15). */
  async getMyTimetable(): Promise<WeeklyTimetable> {
    throw new Error(
      "RealWeeklyTimetableRepository.getMyTimetable is unreachable — no BE " +
        "self-scope endpoint exists (ask #15); the DI factory must route " +
        "student self-view to MockWeeklyTimetableRepository unconditionally.",
    );
  }

  /** Force-blocked — no classId/display-name resolution for a parent's linked
   *  students exists (ask #15). */
  async getChildren(): Promise<TimetableChild[]> {
    throw new Error(
      "RealWeeklyTimetableRepository.getChildren is unreachable — no BE " +
        "endpoint resolves a linked student's classId/name (ask #15); the DI " +
        "factory must route the parent view to MockWeeklyTimetableRepository " +
        "unconditionally.",
    );
  }

  /** Drain a cursor-paginated list endpoint into a single array. `raw: true`
   *  MUST stay a top-level axios-config sibling of `params` (epic-wide
   *  recurring bug, US-E18.19). */
  private async fetchAllPages<T>(url: string): Promise<T[]> {
    const all: T[] = [];
    let cursor: string | null = null;
    do {
      const params: Record<string, unknown> = { limit: 100 };
      if (cursor) params.cursor = cursor;
      const env = (await this.http.get(url, {
        params,
        raw: true,
      })) as unknown as ApiEnvelope<T[]>;
      const { data: page, pagination } = parseEnvelope(env);
      all.push(...(page ?? []));
      cursor = pagination?.nextCursor ?? null;
    } while (cursor);
    return all;
  }
}

/**
 * Hybrid DI composite (US-E18.11) — the pattern already used by
 * `admin-roster.di.ts`/`class-management.di.ts`: real for the one genuinely
 * wireable operation (`getByTeacher`), explicit force-mock for the rest.
 *
 * **Implementation-time correction to the story packet's scope table**: this
 * feature's `getByClass` is called ONLY by `GetChildTimetableUseCase` (the
 * parent flow) — there is no separate direct class-scoped view use-case in
 * `features/timetable` (that already exists, wired real, in the ADMIN builder
 * feature — `features/admin/timetable` — this US). Since `getChildren` is
 * permanently mock (ask #15) and returns mock-fixture classIds (e.g. `"11A2"`),
 * a real `getByClass` fed one of those ids would always 404/403 against the
 * real BE — routing `getByClass` real here would BREAK the parent flow, not
 * wire it. `getByClass` therefore also routes to mock in this composite (the
 * `RealWeeklyTimetableRepository.getByClass` implementation is kept — it is
 * contract-correct and reusable the day a direct class-scoped use-case is
 * added to this feature — but nothing in production calls it yet).
 */
export class HybridWeeklyTimetableRepository
  implements IWeeklyTimetableRepository
{
  constructor(
    private readonly real: IWeeklyTimetableRepository,
    private readonly mock: IWeeklyTimetableRepository,
  ) {}

  /** Force-mock — `getChildren` (its only caller) is mock, so a real class-
   *  scoped fetch would always fail on the mock roster's fixture ids. */
  getByClass(classId: string, weekStart?: string): Promise<WeeklyTimetable> {
    return this.mock.getByClass(classId, weekStart);
  }

  getByTeacher(weekStart?: string): Promise<WeeklyTimetable> {
    return this.real.getByTeacher(weekStart);
  }

  /** Force-mock — no BE self-scope endpoint exists (ask #15). */
  getMyTimetable(weekStart?: string): Promise<WeeklyTimetable> {
    return this.mock.getMyTimetable(weekStart);
  }

  /** Force-mock — no BE classId/name resolution for linked students (ask #15). */
  getChildren(): Promise<TimetableChild[]> {
    return this.mock.getChildren();
  }
}
