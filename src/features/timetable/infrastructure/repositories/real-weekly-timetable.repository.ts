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
import type { TimetableViewFailure } from "../../domain/failures/timetable-view.failure";
import type { IWeeklyTimetableRepository } from "../../domain/repositories/i-weekly-timetable.repository";
import type { LinkedStudentsResponseDto } from "../dtos/linked-student-item.dto";
import type { MemberEnrollmentResponseDto } from "../dtos/member-enrollment-response.dto";
import type { MemberTimetableResponseDto } from "../dtos/member-timetable-response.dto";
import type {
  ClassSummaryDto,
  RealTimetableResponseDto,
} from "../dtos/real-timetable-response.dto";
import { toTimetableChildren } from "../mappers/linked-student.mapper";
import {
  mapMemberWeeklyTimetable,
  mapRealWeeklyTimetable,
} from "../mappers/real-weekly-timetable.mapper";

/** Resolves the mandatory `termId` from a date (default: today) — same
 *  contract as the admin builder's `TermIdResolver`; injected by DI. */
export type TermIdResolver = (date?: Date) => Promise<string>;

/**
 * Map a normalised `ApiError` (by UPPER_SNAKE `error.code`, never by message)
 * to this feature's three-member failure union.
 *
 * - `TIMETABLE_MEMBER_NOT_RESOLVABLE` (404, BE US-153) → `not-found`: the
 *   authorized caller's target has neither teaching slots nor an enrollment,
 *   which is exactly the view's "no published timetable" empty state.
 * - `TIMETABLE_FORBIDDEN` (403) → `not-found`: BE deliberately returns the same
 *   403 whether the target exists or not, so the client must not surface a
 *   distinguishable state either.
 * - `TIMETABLE_CHILD_AMBIGUOUS` (422, BE US-153) → `network-error`. Rationale
 *   (US-E18.26 engineer's call, confirming the planner's): this client NEVER
 *   calls the by-member endpoint with a parent's own memberId — the parent view
 *   always resolves a specific child's `studentMemberId` from `linked-students`
 *   first — so the code is defensively unreachable. Minting a dedicated
 *   `ambiguous-child` failure type would ripple through
 *   `TimetableErrorKey`'s exhaustive `Record<>`s in two screens plus i18n for a
 *   state that cannot render; the generic error banner is the honest surface.
 */
function toTimetableViewFailure(err: unknown): TimetableViewFailure {
  const code = errorCodeOf(err);
  if (
    code === "TIMETABLE_SLOT_NOT_FOUND" ||
    code === "TIMETABLE_FORBIDDEN" ||
    code === "TIMETABLE_MEMBER_NOT_RESOLVABLE"
  ) {
    return { type: "not-found" };
  }
  return { type: "network-error" };
}

/**
 * Real HTTP timetable-view repository (US-E18.11, un-mocked by US-E18.26).
 *
 * Every operation except `getByClass` is now genuinely wireable:
 * - `getByMember` → `GET /members/{memberId}/timetable?termId=` (BE US-153).
 * - `getMyTimetable` → the same call for the signed-in member, COMPOSED with
 *   `GET /members/{selfId}/enrollment` (BE US-148) purely for class display
 *   metadata; the enrollment call degrades independently and never fails the
 *   screen.
 * - `getByTeacher` → the same by-member call plus ONE `GET /classes` used only
 *   as a `classId → className` lookup (was a 1+N per-class fan-out).
 * - `getChildren` → `GET /members/{selfId}/linked-students` (BE US-148's
 *   class-enriched shape).
 *
 * `getByClass` is kept (contract-correct, still routed to mock by the hybrid)
 * although nothing in this feature calls it any more — same "kept for the day a
 * direct class-scoped use-case is added" posture as US-E18.11.
 */
export class RealWeeklyTimetableRepository
  implements IWeeklyTimetableRepository
{
  constructor(
    private readonly http: AxiosInstance,
    private readonly resolveTermId: TermIdResolver,
    private readonly currentUserId: string | null,
    /**
     * `memberId → displayName` resolver for the parent's children
     * (US-E18.33), injected by `bootstrap/di/timetable-view.di.ts` from
     * `iam-directory`'s `BatchResolveMembersUseCase` — the app's single
     * batch-lookup client. Cross-feature composition belongs in
     * `bootstrap/di`, never inside a feature's own layers (decision 0017).
     *
     * OPTIONAL so the ~30 existing wire-level tests can keep constructing this
     * repository with three arguments. Absent = every child keeps the ordinal
     * fallback, i.e. exactly the pre-US-E18.33 behaviour — a degraded display,
     * never an error.
     */
    private readonly resolveChildNames?: (
      memberIds: string[],
    ) => Promise<Map<string, string>>,
  ) {}

  async getByClass(
    classId: string,
    weekStart?: string,
  ): Promise<WeeklyTimetable> {
    try {
      const termId = await this.termFor(weekStart);
      const dto = (await this.http.get(
        TIMETABLE_VIEW_EP.classTimetable(classId),
        {
          params: { termId },
        },
      )) as unknown as RealTimetableResponseDto;
      return mapRealWeeklyTimetable(dto, classId);
    } catch (err) {
      throw toTimetableViewFailure(err);
    }
  }

  /**
   * By-member primitive (US-E18.26). Used directly by the parent flow with the
   * CHILD's memberId (never the parent's own — see the ambiguous-child note on
   * {@link toTimetableViewFailure}) and internally by the two self-scope
   * methods. No `classId → className` resolution here: callers that can
   * resolve names compose their own lookup (see `getByTeacher`/`getMyTimetable`).
   */
  async getByMember(
    memberId: string,
    weekStart?: string,
  ): Promise<WeeklyTimetable> {
    try {
      const dto = await this.fetchMemberTimetable(memberId, weekStart);
      return mapMemberWeeklyTimetable(dto, () => undefined, {
        classId: memberId,
        className: "",
      });
    } catch (err) {
      throw toTimetableViewFailure(err);
    }
  }

  /**
   * Student self-scope. Two INDEPENDENT calls: the by-member week (primary —
   * its failure propagates) and the member's enrollment (secondary — supplies
   * `className`/`classId` for the header only, and degrades to empty metadata
   * on ANY failure, including `ROSTER_ACCESS_FORBIDDEN` /
   * `ROSTER_STUDENT_NOT_ENROLLED`; a missing class caption must never blank out
   * a week the student can legitimately see).
   *
   * `gradeLevel` is also returned by the enrollment call but has no slot in
   * this feature's `WeeklyTimetable` entity or in any timetable screen today —
   * deliberately unused rather than inventing a UI for it (follow-up
   * recommendation, not built here).
   */
  async getMyTimetable(weekStart?: string): Promise<WeeklyTimetable> {
    // No verified member id (missing/unreadable token) — surface honestly
    // rather than silently returning an empty week grid (US-E18.11 posture).
    if (!this.currentUserId)
      throw { type: "not-found" } as TimetableViewFailure;
    const selfId = this.currentUserId;

    let dto: MemberTimetableResponseDto;
    try {
      dto = await this.fetchMemberTimetable(selfId, weekStart);
    } catch (err) {
      throw toTimetableViewFailure(err);
    }

    const enrollment = await this.tryFetchEnrollment(selfId);
    return mapMemberWeeklyTimetable(
      dto,
      (classId) =>
        classId === enrollment?.classId ? enrollment.className : undefined,
      {
        classId: enrollment?.classId ?? selfId,
        className: enrollment?.className ?? "",
      },
    );
  }

  /**
   * Teacher self-scope, simplified in US-E18.26: the BE now resolves the whole
   * personal week server-side from the `teacher_schedule` clone (slots may span
   * several classes, hence the per-slot `classId`), so the old 1-per-class
   * timetable fan-out is gone. `GET /classes` (TEACHER-auto-filtered to
   * "classes I'm assigned to") is KEPT purely as a `classId → className`
   * display lookup. Net: 2 HTTP calls total regardless of class count (was 1+N).
   */
  async getByTeacher(weekStart?: string): Promise<WeeklyTimetable> {
    if (!this.currentUserId)
      throw { type: "not-found" } as TimetableViewFailure;
    const teacherId = this.currentUserId;
    try {
      const [dto, classes] = await Promise.all([
        this.fetchMemberTimetable(teacherId, weekStart),
        this.fetchAllPages<ClassSummaryDto>(TIMETABLE_VIEW_EP.myClasses),
      ]);
      const classNames = new Map(classes.map((c) => [c.classId, c.name]));
      return mapMemberWeeklyTimetable(
        dto,
        (classId) => classNames.get(classId),
        { classId: teacherId, className: teacherId },
      );
    } catch (err) {
      throw toTimetableViewFailure(err);
    }
  }

  /**
   * Parent's roster. `GET /members/{selfId}/linked-students` returns a FLAT
   * `{ links: [...] }` object — NOT cursor-paginated (ground-truthed against
   * `LinkedStudentsResponse` in `services/core/docs/openapi.yaml`, 2026-08-01),
   * so no `raw: true` / `fetchAllPages` handling applies and no axios config is
   * sent at all.
   *
   * `PARENTLINK_FORBIDDEN` → `no-child`: the BE returns the same 403 for "not
   * this parent" as for a probe, so the honest client state is "no roster to
   * show" (which the view collapses to its empty state), not a distinguishable
   * permission error. An unidentifiable caller degrades the same way, without
   * touching the network.
   *
   * US-E18.33: display NAMES are then resolved in ONE secondary batch call
   * (IAM's tiered `GET /members?ids=`, ADR-0120) scoped to EXACTLY the ids this
   * roster returned. That call is best-effort — it never fails the roster; the
   * picker's ordinal label covers whatever it cannot resolve.
   */
  async getChildren(): Promise<TimetableChild[]> {
    if (!this.currentUserId) throw { type: "no-child" } as TimetableViewFailure;
    let links: LinkedStudentsResponseDto["links"];
    try {
      const dto = (await this.http.get(
        TIMETABLE_VIEW_EP.linkedStudents(this.currentUserId),
      )) as unknown as LinkedStudentsResponseDto;
      links = dto?.links ?? [];
    } catch (err) {
      if (errorCodeOf(err) === "PARENTLINK_FORBIDDEN") {
        throw { type: "no-child" } as TimetableViewFailure;
      }
      throw { type: "network-error" } as TimetableViewFailure;
    }
    return toTimetableChildren(links, await this.tryResolveChildNames(links));
  }

  /** Secondary, best-effort display-name read — never throws (see
   *  {@link getChildren}). Sends ONLY the ids the parent's own link list
   *  produced; this lookup is decoration, never an existence oracle. */
  private async tryResolveChildNames(
    links: LinkedStudentsResponseDto["links"],
  ): Promise<Map<string, string>> {
    const ids = [...links]
      .sort((a, b) => a.linkId.localeCompare(b.linkId))
      .map((l) => l.studentMemberId);
    if (!this.resolveChildNames || ids.length === 0) return new Map();
    try {
      return await this.resolveChildNames(ids);
    } catch {
      return new Map();
    }
  }

  private termFor(weekStart?: string): Promise<string> {
    return this.resolveTermId(weekStart ? new Date(weekStart) : undefined);
  }

  private async fetchMemberTimetable(
    memberId: string,
    weekStart?: string,
  ): Promise<MemberTimetableResponseDto> {
    const termId = await this.termFor(weekStart);
    return (await this.http.get(TIMETABLE_VIEW_EP.memberTimetable(memberId), {
      params: { termId },
    })) as unknown as MemberTimetableResponseDto;
  }

  /** Secondary, best-effort class-metadata read — never throws (see
   *  {@link getMyTimetable}). `yearLabel` is omitted, so the BE resolves the
   *  member's LATEST enrolled academic-year label (greatest lexicographic
   *  label, not necessarily the tenant's calendar-active year — documented
   *  BE caveat, US-148). */
  private async tryFetchEnrollment(
    memberId: string,
  ): Promise<MemberEnrollmentResponseDto | null> {
    try {
      return (await this.http.get(
        TIMETABLE_VIEW_EP.memberEnrollment(memberId),
      )) as unknown as MemberEnrollmentResponseDto;
    } catch {
      return null;
    }
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
 * Hybrid DI composite. US-E18.11 force-mocked three of four operations
 * (cross-repo ask #15); US-E18.26 un-mocked all of them — only `getByClass`
 * still routes to mock, and only because NOTHING calls it: the parent flow now
 * addresses the child's `memberId` directly. Keeping the composite (rather
 * than dropping to the bare real repo) documents that one remaining
 * asymmetry explicitly and keeps the seam for the day a direct class-scoped
 * use-case is added to this feature.
 */
export class HybridWeeklyTimetableRepository
  implements IWeeklyTimetableRepository
{
  constructor(
    private readonly real: IWeeklyTimetableRepository,
    private readonly mock: IWeeklyTimetableRepository,
  ) {}

  /** Force-mock — no caller in this feature; the real implementation is kept
   *  contract-correct but unexercised (US-E18.26). */
  getByClass(classId: string, weekStart?: string): Promise<WeeklyTimetable> {
    return this.mock.getByClass(classId, weekStart);
  }

  getByMember(memberId: string, weekStart?: string): Promise<WeeklyTimetable> {
    return this.real.getByMember(memberId, weekStart);
  }

  getByTeacher(weekStart?: string): Promise<WeeklyTimetable> {
    return this.real.getByTeacher(weekStart);
  }

  getMyTimetable(weekStart?: string): Promise<WeeklyTimetable> {
    return this.real.getMyTimetable(weekStart);
  }

  getChildren(): Promise<TimetableChild[]> {
    return this.real.getChildren();
  }
}
