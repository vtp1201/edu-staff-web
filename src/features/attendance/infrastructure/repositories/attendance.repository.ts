import "server-only";
import type { AxiosInstance } from "axios";
import { ATTENDANCE_EP } from "@/bootstrap/endpoint/attendance.endpoint";
import { type ApiEnvelope, parseEnvelope } from "@/bootstrap/lib/api-envelope";
import { enumerateDates } from "../../domain/date-range";
import type { AttendanceDaySummary } from "../../domain/entities/attendance-day-summary.entity";
import type { AttendanceRecord } from "../../domain/entities/attendance-record.entity";
import type { AttendanceRoster } from "../../domain/entities/attendance-roster.entity";
import type {
  ClassSummary,
  IAttendanceRepository,
} from "../../domain/repositories/i-attendance.repository";
import type { ClassAttendanceResponseDto } from "../dtos/class-attendance-response.dto";
import type { ClassSummaryDto } from "../dtos/class-list-response.dto";
import type { ClassRosterItemDto } from "../dtos/class-roster-response.dto";
import {
  aggregateDaySummaries,
  mapClassAttendance,
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
  /** `currentUserId` (JWT `sub`) drives the homeroom (GVCN) filter. */
  constructor(
    private readonly http: AxiosInstance,
    private readonly currentUserId: string | null,
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
    const nameByMemberId = new Map(
      roster.map((s) => [s.studentMemberId, s.displayName]),
    );
    return mapClassAttendance(dayDto, nameByMemberId);
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

  /** Bounded fan-out (clamp enforced upstream by the use-case) — ONE roster
   *  fetch (for `totalStudents`), then one `GetAttendanceByDate` per date,
   *  fired concurrently and aggregated via `Promise.allSettled` (ADR `0058` §5). */
  async getAttendanceHistory(
    classId: string,
    from: string,
    to: string,
  ): Promise<AttendanceDaySummary[]> {
    const dates = enumerateDates(from, to);
    const roster = await this.fetchAllPages<ClassRosterItemDto>(
      ATTENDANCE_EP.classStudents(classId),
    );
    const results = await Promise.allSettled(
      dates.map(
        (date) =>
          this.http.get(ATTENDANCE_EP.classAttendance(classId), {
            params: { date },
          }) as Promise<ClassAttendanceResponseDto>,
      ),
    );
    return aggregateDaySummaries(dates, results, roster.length);
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
