import "server-only";
import type { AxiosInstance } from "axios";
import { ATTENDANCE_EP } from "@/bootstrap/endpoint/attendance.endpoint";
import { type ApiEnvelope, parseEnvelope } from "@/bootstrap/lib/api-envelope";
import { enumerateDates } from "../../domain/date-range";
import type { AttendanceDaySummary } from "../../domain/entities/attendance-day-summary.entity";
import type { AttendanceRecord } from "../../domain/entities/attendance-record.entity";
import type { AttendanceRoster } from "../../domain/entities/attendance-roster.entity";
import type {
  ClassAttendanceRangeResult,
  ClassSummary,
  IAttendanceRepository,
} from "../../domain/repositories/i-attendance.repository";
import type {
  ClassAttendanceRangeResponseDto,
  ClassAttendanceResponseDto,
} from "../dtos/class-attendance-response.dto";
import type { ClassSummaryDto } from "../dtos/class-list-response.dto";
import type { ClassRosterItemDto } from "../dtos/class-roster-response.dto";
import {
  aggregateRangeDaySummaries,
  mapClassAttendance,
  mapStatusFromWire,
  mapStatusToWire,
} from "../mappers/attendance.mapper";

/**
 * Real attendance repository (US-E13.2, ADR `0058`). Reuses the SAME endpoints
 * as `teacher-class.repository.ts` for class listing + name-resolution, but
 * duplicates the HTTP calls inline with its own local DTOs rather than
 * importing `TeacherClassRepository`/`ITeacherClassRepository` — the
 * established precedent in this codebase for "another feature already wired
 * the same shared BE endpoint" (see
 * `real-weekly-timetable.repository.ts#fetchAllPages<ClassSummaryDto>`), not
 * cross-feature composition/injection.
 */
export class AttendanceRepository implements IAttendanceRepository {
  /** `currentUserId` (the token's `memberId`) drives the homeroom (GVCN) filter. */
  constructor(
    private readonly http: AxiosInstance,
    private readonly currentUserId: string | null,
    /** Batched IAM display-name lookup — core's enrollment rows carry none. */
    private readonly resolveNames?: (
      memberIds: string[],
    ) => Promise<Map<string, string>>,
  ) {}

  async getMyHomeroomClasses(): Promise<ClassSummary[]> {
    const classes = await this.fetchAllPages<ClassSummaryDto>(
      ATTENDANCE_EP.myClasses,
    );
    return classes
      .filter(
        (c) =>
          this.currentUserId != null &&
          c.homeroomTeacherId != null &&
          c.homeroomTeacherId === this.currentUserId,
      )
      .map((c) => ({ id: c.classId, name: c.name }));
  }

  async getClassAttendance(
    classId: string,
    date: string,
  ): Promise<AttendanceRoster> {
    const [dayDto, roster] = await Promise.all([
      this.http.get(ATTENDANCE_EP.classAttendance(classId), {
        params: { date },
      }) as Promise<ClassAttendanceResponseDto>,
      this.fetchAllPages<ClassRosterItemDto>(
        ATTENDANCE_EP.classStudents(classId),
      ),
    ]);
    const nameByMemberId = new Map<string, string | undefined>(
      roster.map((s) => [s.studentMemberId, s.displayName]),
    );
    const missing = roster
      .filter((s) => !s.displayName?.trim())
      .map((s) => s.studentMemberId);
    if (this.resolveNames && missing.length > 0) {
      for (const [id, name] of await this.resolveNames(missing)) {
        nameByMemberId.set(id, name);
      }
    }
    // The roster — not the saved records — is the source of rows: a day nobody
    // has marked yet answers `records: []`, which would otherwise render an
    // empty screen instead of the class waiting to be marked.
    return mapClassAttendance(
      dayDto,
      nameByMemberId,
      roster.map((s) => s.studentMemberId),
    );
  }

  async saveClassAttendance(
    classId: string,
    date: string,
    records: AttendanceRecord[],
  ): Promise<void> {
    await this.http.post(ATTENDANCE_EP.classAttendance(classId), {
      date,
      records: records.map((r) => ({
        studentMemberId: r.studentId,
        status: mapStatusToWire(r.status),
      })),
    });
  }

  /**
   * ONE range call + the roster drain (for `totalStudents`), in parallel.
   *
   * US-E18.47 / BE US-187: the same route now accepts `startDate`+`endDate`
   * instead of `date` and answers every record in the range in a single shot
   * (no pagination), replacing the ≤31-call-per-day `Promise.allSettled`
   * fan-out ADR `0058` §5 described. `date` MUST NOT be sent alongside the
   * bounds — the two modes are mutually exclusive (`400
   * ATTENDANCE_INVALID_DATE`). The ≤31-day clamp stays enforced upstream by
   * `ListAttendanceHistoryUseCase`, well under the BE's 366-day ceiling.
   */
  async getAttendanceHistory(
    classId: string,
    from: string,
    to: string,
  ): Promise<AttendanceDaySummary[]> {
    const [range, roster] = await Promise.all([
      this.http.get(ATTENDANCE_EP.classAttendance(classId), {
        params: { startDate: from, endDate: to },
      }) as Promise<ClassAttendanceRangeResponseDto>,
      this.fetchAllPages<ClassRosterItemDto>(
        ATTENDANCE_EP.classStudents(classId),
      ),
    ]);
    return aggregateRangeDaySummaries(
      enumerateDates(from, to),
      range.records,
      roster.length,
    );
  }

  /**
   * The SAME single range call `getAttendanceHistory` makes (US-E18.47 / BE
   * US-187), projected per STUDENT instead of per day (US-E24.14): the summary
   * tab spans a term or a school year, which `getAttendanceHistory`'s 31-day
   * cap (ADR `0058` §5) exists to forbid. The ≤366-day bound this read does
   * respect is enforced upstream by `SummarizeClassAttendanceUseCase`, before
   * the request is made.
   *
   * The roster drain runs in parallel and IS part of the answer, not a
   * by-product: it is the row set (a student with no record in the range still
   * gets a row) and the source of display names, which core's attendance
   * records do not carry.
   */
  async getClassAttendanceRange(
    classId: string,
    from: string,
    to: string,
  ): Promise<ClassAttendanceRangeResult> {
    const [range, rosterDto] = await Promise.all([
      this.http.get(ATTENDANCE_EP.classAttendance(classId), {
        params: { startDate: from, endDate: to },
      }) as Promise<ClassAttendanceRangeResponseDto>,
      this.fetchAllPages<ClassRosterItemDto>(
        ATTENDANCE_EP.classStudents(classId),
      ),
    ]);

    const nameByMemberId = new Map<string, string | undefined>(
      rosterDto.map((s) => [s.studentMemberId, s.displayName]),
    );
    const missing = rosterDto
      .filter((s) => !s.displayName?.trim())
      .map((s) => s.studentMemberId);
    if (this.resolveNames && missing.length > 0) {
      for (const [id, name] of await this.resolveNames(missing)) {
        nameByMemberId.set(id, name);
      }
    }

    return {
      roster: rosterDto.map((s, index) => ({
        studentId: s.studentMemberId,
        // Ordinal, never the raw member uuid: "HS #7" reads as "we do not have
        // this name", a uuid reads as data (same posture as the parent-child
        // mapper's avatar fallback). It is a data placeholder, not UI copy.
        name:
          nameByMemberId.get(s.studentMemberId)?.trim() || `HS #${index + 1}`,
      })),
      records: range.records.map((r) => ({
        studentId: r.studentMemberId,
        status: mapStatusFromWire(r.status),
        date: r.date,
      })),
    };
  }

  /** Drain a cursor-paginated list endpoint into a single array. `raw: true`
   *  MUST stay a top-level axios-config sibling of `params` (recurring bug
   *  class, `EPIC-OVERVIEW.md`). */
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
