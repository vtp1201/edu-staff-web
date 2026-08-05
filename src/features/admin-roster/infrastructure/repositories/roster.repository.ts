import "server-only";
import type { AxiosInstance } from "axios";
import {
  classStudentsPath,
  ROSTER_EP,
  unenrollPath,
} from "@/bootstrap/endpoint/admin-roster.endpoint";
import { type ApiEnvelope, parseEnvelope } from "@/bootstrap/lib/api-envelope";
import type { IamDirectoryFailure } from "@/features/iam-directory/domain/failures/iam-directory.failure";
import type { ClassSummary } from "../../domain/entities/class-summary.entity";
import type { RosterStudent } from "../../domain/entities/roster-student.entity";
import type { SearchStudent } from "../../domain/entities/search-student.entity";
import type { RosterFailure } from "../../domain/failures/roster.failure";
import type {
  IRosterRepository,
  Result,
  VoidResult,
} from "../../domain/repositories/i-roster.repository";
import type { ClassesResponseDto } from "../dtos/classes-response.dto";
import type { EnrolledStudentIdsResponseDto } from "../dtos/enrolled-student-ids-response.dto";
import type { EnrollmentListResponseDto } from "../dtos/enrollment-response.dto";
import type { RosterStudentDetail } from "../mappers/roster.mapper";
import {
  toClassSummary,
  toRosterStudentFromEnrollment,
} from "../mappers/roster.mapper";
import { toRosterFailure } from "../mappers/roster-failure.mapper";

/**
 * `memberId → display detail` resolver, injected by
 * `bootstrap/di/admin-roster.di.ts` from `iam-directory`'s
 * `BatchResolveMembersUseCase` (the ONE batch-lookup client in this app — do
 * not add a second). Composing across services belongs in `bootstrap/di`
 * (decision 0017), so this repository sees a plain function and never spans
 * `core` and `iam` itself.
 *
 * Contractually never reports per-id: ids it cannot resolve are simply absent
 * from the returned map.
 */
export type ResolveStudentDetails = (
  memberIds: string[],
) => Promise<Map<string, RosterStudentDetail>>;

/**
 * The two collaborators the FE-composed search pool needs (US-E18.41, BE US-182
 * / `edu-api` ADR 0125), injected together by
 * `bootstrap/di/admin-roster.di.ts` because both cross a feature boundary this
 * repository may not cross itself (decision 0017):
 *
 * - `searchStudentDirectory` — `iam-directory`'s `SearchMembersUseCase` with
 *   `role: "STUDENT"` and the token-derived tenant id already pinned. It drains
 *   EVERY directory page itself (the app's ONE directory client — do not add a
 *   second draining loop here). Returns iam-directory's own `Result`, so its
 *   failure union is translated ONCE, below.
 * - `resolveAcademicYear` — the active year's label (e.g. `"2025-2026"`), the
 *   mandatory query param of the enrolled-ids read. Lazy on purpose: it costs a
 *   calendar round trip, and only `getSearchPool` needs it.
 */
export interface SearchPoolSources {
  searchStudentDirectory: () => Promise<
    | { ok: true; value: readonly { memberId: string; displayName: string }[] }
    | { ok: false; failure: IamDirectoryFailure }
  >;
  resolveAcademicYear: () => Promise<string>;
}

/**
 * `IamDirectoryFailure` → `RosterFailure`. Same shape of translation
 * `class-management.repository.ts` does for its teacher picker: the directory's
 * union never leaks to presentation, which only knows `adminRoster.errors.*`.
 */
function fromDirectoryFailure(failure: IamDirectoryFailure): RosterFailure {
  switch (failure.type) {
    case "forbidden":
      return { type: "forbidden" };
    case "network-error":
      return { type: "network-error" };
    // >50 ids in one batch is an IAM-internal guard the batch use-case already
    // prevents; a roster operator can do nothing with it.
    default:
      return { type: "unknown" };
  }
}

/** BE caps `limit` at 100 (`listMaxLimit`, core `list_classes.go`). */
const ROSTER_PAGE_SIZE = 100;
/**
 * Safety stop for cursor following. 10 × 100 = 1000 students in one class,
 * far beyond any real roster — a higher count means a paging bug, and looping
 * forever server-side would be the worse failure.
 */
const ROSTER_MAX_PAGES = 10;

export class RosterRepository implements IRosterRepository {
  constructor(
    private readonly http: AxiosInstance,
    /**
     * Optional so the wire-level tests (and any caller that only needs the
     * class list or the write paths) can construct the repository with just an
     * http client. Absent = rows carry no name/dob/gender, which presentation
     * renders as placeholders — a degraded display, never an error (same
     * convention as `parent-child-list.repository.ts`).
     */
    private readonly resolveStudentDetails?: ResolveStudentDetails,
    /**
     * Optional for the same reason: absent = `getSearchPool` fails closed
     * (`unknown`) rather than inventing an empty pool. See
     * {@link SearchPoolSources}.
     */
    private readonly searchPoolSources?: SearchPoolSources,
  ) {}

  async getClasses(params: {
    academicYear?: string;
  }): Promise<Result<ClassSummary[]>> {
    try {
      // cursor-paginated list: { raw: true } + parseEnvelope (TR-031). No
      // gradeLevel client-side filter here (unlike class-management) — the
      // roster class picker shows every class on the page. One HTTP call total:
      // the homeroom teacher's id AND display name ride on each row since BE
      // US-173 (US-E18.30 removed the per-row `.../homeroom-teacher` fan-out,
      // which also fixed the picker rendering a raw member uuid as the GVCN).
      const envelope = (await this.http.get(ROSTER_EP.classes, {
        params: {
          ...(params.academicYear ? { academicYear: params.academicYear } : {}),
        },
        raw: true,
      })) as unknown as ApiEnvelope<ClassesResponseDto>;
      const { data } = parseEnvelope(envelope);
      return { ok: true, data: data.map((dto) => toClassSummary(dto)) };
    } catch (err) {
      return { ok: false, error: toRosterFailure(err) };
    }
  }

  /**
   * REAL since US-E18.35 — un-mocks the US-E18.5 "permanent" mock.
   *
   * That force-mock had one stated cause: `EnrollmentResponse` carries no
   * display fields and "IAM has no batch/by-id profile lookup". IAM US-144 +
   * ADR-0120 + US-169 removed exactly that blocker, so the roster is now a
   * genuine two-source composition:
   *
   * 1. core `GET /classes/{id}/students` — the AUTHORITY for WHICH students are
   *    enrolled (cursor-paginated; every page is followed so a large class is
   *    not silently truncated).
   * 2. IAM `GET /members?ids=` via the injected resolver — DECORATION ONLY, for
   *    exactly the ids step 1 returned. It is never an existence oracle and must
   *    never be handed an id core did not produce. NOT necessarily one call:
   *    `BatchResolveMembersUseCase` chunks at 50 ids, so a class of 51+ students
   *    costs `ceil(n / 50)` sequential calls.
   *
   * The decoration is best-effort: a failure degrades rows to
   * name/dob/gender-less (placeholders) rather than failing the screen. Note the
   * blast radius of that degrade is the WHOLE roster, not one chunk — the
   * use-case returns on the first failing chunk (US-E18.29/US-E18.33 behaviour,
   * unchanged here), so nothing already resolved survives. The enrollment read
   * is NOT best-effort — without it there is no roster.
   */
  async getClassRoster(classId: string): Promise<Result<RosterStudent[]>> {
    try {
      const enrollments = await this.listEnrollments(classId);
      const details = await this.studentDetailMap(
        enrollments.map((e) => e.studentMemberId),
      );
      return {
        ok: true,
        data: enrollments.map((e) =>
          toRosterStudentFromEnrollment(e, details.get(e.studentMemberId)),
        ),
      };
    } catch (err) {
      return { ok: false, error: toRosterFailure(err) };
    }
  }

  /** Every enrollment page for the class ({ raw: true } + parseEnvelope, TR-031). */
  private async listEnrollments(classId: string) {
    const rows: EnrollmentListResponseDto = [];
    let cursor: string | undefined;

    for (let page = 0; page < ROSTER_MAX_PAGES; page++) {
      const envelope = (await this.http.get(classStudentsPath(classId), {
        params: {
          limit: ROSTER_PAGE_SIZE,
          ...(cursor ? { cursor } : {}),
        },
        // Top level, sibling of `params` — `isRawCall` reads `config.raw`.
        raw: true,
      })) as unknown as ApiEnvelope<EnrollmentListResponseDto>;
      const { data, pagination } = parseEnvelope(envelope);
      rows.push(...data);
      if (!pagination?.hasMore || !pagination.nextCursor) break;
      cursor = pagination.nextCursor;
    }
    return rows;
  }

  /**
   * Names/dob/gender for EXACTLY the ids the enrollment list returned, in one
   * batched call. Never throws: a lookup error degrades to an empty map and
   * the rows render with placeholders.
   */
  private async studentDetailMap(
    memberIds: string[],
  ): Promise<Map<string, RosterStudentDetail>> {
    if (!this.resolveStudentDetails || memberIds.length === 0) return new Map();
    try {
      return await this.resolveStudentDetails(memberIds);
    } catch {
      return new Map();
    }
  }

  /**
   * REAL since US-E18.41 — retires the US-E18.5 "permanent" mock (cross-repo
   * ask #9, second and last half). BE's answer (US-182 / `edu-api` ADR 0125) is
   * that "students not yet enrolled in any class" will NEVER be one endpoint:
   * the enrolled set lives in `core`, the student identities live in `iam`, so
   * the POOL IS A SET DIFFERENCE THE FE COMPOSES:
   *
   * 1. IAM STUDENT directory (drained by `SearchMembersUseCase`) — the
   *    CANDIDATE universe, and the only source of display names;
   * 2. core `GET /enrollments/student-ids?academicYear=` — the ids to SUBTRACT
   *    (every class of the year, deduplicated, ids-only, unpaginated).
   *
   * Neither side is best-effort: a failure of either means the operator cannot
   * be shown a trustworthy candidate list, and a partial pool would silently
   * hide enrollable students, so both surface as a failure.
   *
   * `_classId` is deliberately UNUSED here (see the interface): the subtracted
   * set is tenant-wide, so students already in the target class are excluded by
   * the subtraction itself, and everyone remaining is unassigned in EVERY class
   * — hence `currentClassId`/`currentClassName` are structurally `null` and no
   * second lookup is made. Only `MockRosterRepository` still reads the param
   * (its seed also offers transfer candidates from other classes).
   *
   * Accepted BE caveat (do not "fix" client-side): students of an ARCHIVED
   * class still hold enrollments, so they stay subtracted and do not re-appear.
   */
  async getSearchPool(_classId: string): Promise<Result<SearchStudent[]>> {
    const sources = this.searchPoolSources;
    if (!sources) return { ok: false, error: { type: "unknown" } };

    try {
      // Sequential on purpose: the year label is a required param of the
      // enrolled-ids read, so there is nothing to parallelise before it.
      const academicYear = await sources.resolveAcademicYear();
      const [directory, enrolledIds] = await Promise.all([
        sources.searchStudentDirectory(),
        this.listEnrolledStudentIds(academicYear),
      ]);
      if (!directory.ok) {
        return { ok: false, error: fromDirectoryFailure(directory.failure) };
      }

      const enrolled = new Set(enrolledIds);
      return {
        ok: true,
        data: directory.value
          .filter((member) => !enrolled.has(member.memberId))
          .map((member) => ({
            // The enroll write posts `studentMemberId`, and on the directory
            // wire `memberId === userId` — so the pool's id IS the member id.
            id: member.memberId,
            name: member.displayName,
            currentClassId: null,
            currentClassName: null,
          })),
      };
    } catch (err) {
      // `resolveAcademicYear` throws a TYPED `{ type: "invalid-term" }` when the
      // tenant has no academic year configured. That is not an HTTP error, and
      // `toRosterFailure` would mislabel it `network-error` (i.e. "retry"), so
      // map it explicitly — retrying will never help.
      if ((err as { type?: string } | null)?.type === "invalid-term") {
        return { ok: false, error: { type: "unknown" } };
      }
      return { ok: false, error: toRosterFailure(err) };
    }
  }

  /**
   * The year's enrolled ids. UNPAGINATED and ids-only, so unlike every other
   * list read here it is a plain unwrapped GET — no `raw: true`, no
   * `parseEnvelope`, no cursor loop. `studentMemberIds` is `[]`, never null.
   */
  private async listEnrolledStudentIds(
    academicYear: string,
  ): Promise<string[]> {
    const payload = (await this.http.get(ROSTER_EP.enrolledStudentIds, {
      params: { academicYear },
    })) as unknown as EnrolledStudentIdsResponseDto;
    return payload.studentMemberIds ?? [];
  }

  async enrollStudent(classId: string, studentId: string): Promise<VoidResult> {
    try {
      await this.http.post(classStudentsPath(classId), {
        studentMemberId: studentId,
      });
      return { ok: true, data: undefined };
    } catch (err) {
      return { ok: false, error: toRosterFailure(err) };
    }
  }

  async unenrollStudent(
    classId: string,
    studentId: string,
  ): Promise<VoidResult> {
    try {
      await this.http.delete(unenrollPath(classId, studentId));
      return { ok: true, data: undefined };
    } catch (err) {
      const failure = toRosterFailure(err);
      // TR-034: ROSTER_STUDENT_NOT_ENROLLED (404) on delete → silent success
      // (student already removed — idempotent unenroll)
      if (failure.type === "not-found") {
        return { ok: true, data: undefined };
      }
      return { ok: false, error: failure };
    }
  }

  async unenrollStudents(
    classId: string,
    studentIds: string[],
  ): Promise<VoidResult> {
    try {
      await Promise.all(
        studentIds.map((id) => this.http.delete(unenrollPath(classId, id))),
      );
      return { ok: true, data: undefined };
    } catch (err) {
      const failure = toRosterFailure(err);
      // TR-034: 404 on individual deletes is idempotent — treat as success
      if (failure.type === "not-found") {
        return { ok: true, data: undefined };
      }
      return { ok: false, error: failure };
    }
  }

  /**
   * Two-step transfer: unenroll from source class, then enroll in target class.
   * No dedicated transfer endpoint exists in the core service (TR-032, US-E06.7).
   * The `ROSTER_STUDENT_ALREADY_ENROLLED` (409) from enroll step surfaces as
   * `already-enrolled` failure — used for transfer-warning UX.
   */
  async transferStudent(
    studentId: string,
    fromClassId: string,
    toClassId: string,
  ): Promise<VoidResult> {
    // Step 1: unenroll from source (404 = already gone = ok)
    const unenrollResult = await this.unenrollStudent(fromClassId, studentId);
    if (!unenrollResult.ok) return unenrollResult;

    // Step 2: enroll in target
    return this.enrollStudent(toClassId, studentId);
  }
}
