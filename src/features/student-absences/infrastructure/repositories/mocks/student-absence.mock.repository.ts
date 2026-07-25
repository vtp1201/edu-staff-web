import "server-only";
import { mockDelay } from "@/bootstrap/lib/mock";
import {
  type EditStudentAbsenceInput,
  type RecordStudentAbsenceInput,
  STUDENT_ABSENCE_REASON_MAX_LENGTH,
  type StudentAbsenceEntity,
  type StudentAbsenceKey,
} from "../../../domain/entities/student-absence.entity";
import type { StudentAbsenceAuthContext } from "../../../domain/entities/student-absence-auth-context.entity";
import { studentAbsenceFailure } from "../../../domain/failures/student-absence.failure";
import type {
  IStudentAbsenceRepository,
  ListStudentAbsencesParams,
} from "../../../domain/repositories/i-student-absence.repository";
import {
  isBareCalendarDate,
  isFutureDate,
} from "../../../domain/use-cases/is-future-date";
import type { StudentAbsenceResponseDto } from "../../dtos/student-absence-response.dto";
import { toStudentAbsenceEntity } from "../../mappers/student-absence.mapper";
import { SA_STUDENT_ROSTER, SA_TODAY, seedStudentAbsences } from "./fixtures";

/**
 * In-memory `IStudentAbsenceRepository` (US-E09.6) — and, while this feature is
 * permanently mock-first (roster-UUID gap), **the authorization boundary itself**
 * (spec.md §"High-Risk-Grade Security Enforcement" pt. 5).
 *
 * The `StudentAbsenceAuthContext` is CONSTRUCTOR-injected (assembled server-side
 * from the httpOnly token in `student-absence.di.ts`), so no caller can pass a
 * different acting role/homeroom per call. Hard rules implemented here, each with
 * a dedicated test in `student-absence.mock.repository.security.test.ts`:
 *
 *  - **FR-008/NFR-008 pt.1** — `recordAbsence`/`editAbsence` require
 *    `role === "teacher"` AND `input.classId === authCtx.classId`, checked BEFORE
 *    any state read or write. A GVCN of class A forging class B's id gets
 *    `forbidden` (403), never `not-found` (no existence leak) and never a
 *    partial mutation.
 *  - **FR-009/NFR-008 pt.2** — `flagAbsence` requires `role === "principal"`,
 *    checked before any state read. A non-principal gets `forbidden`, and no
 *    state transition occurs.
 *  - **FR-005/FR-006** — the flag transition is ONE-WAY: re-flagging an already
 *    `FLAGGED_UNEXCUSED` row throws `invalid-state` (400 backstop). There is NO
 *    `unflag`-shaped method on this class at all.
 *  - **FR-008 (list scope)** — a `teacher` list call is FORCED to their own
 *    `authCtx.classId`, ignoring any client-supplied `classId`; a `principal`
 *    reads schoolwide with an optional class filter; any other role is denied.
 *  - **FR-002/FR-003/NFR-009** — future dates throw `invalid-date`, duplicate
 *    natural keys throw `duplicate-date`, independently of any client pre-check.
 *
 * State lives at MODULE scope (mirrors `MockDisciplineRepository`, the other
 * force-mocked feature) so a recorded/edited/flagged row survives across
 * per-request DI factory instances and the screen behaves realistically in dev.
 * Tests call `resetStudentAbsenceMockStore()` in `beforeEach` to stay
 * deterministic and order-independent.
 */
let _absences: StudentAbsenceResponseDto[] = seedStudentAbsences();

/** Test/dev hook — restore the deterministic seed. */
export function resetStudentAbsenceMockStore(): void {
  _absences = seedStudentAbsences();
}

export class MockStudentAbsenceRepository implements IStudentAbsenceRepository {
  private readonly authCtx: StudentAbsenceAuthContext;
  /** Injected "today" — never `Date.now()` (NFR-009, deterministic tests). */
  private readonly today: string;
  /** Simulated latency; tests pass 0 so the suite stays fast. */
  private readonly delayMs: number;

  constructor(
    authCtx: StudentAbsenceAuthContext,
    options: { today?: string; delayMs?: number } = {},
  ) {
    this.authCtx = authCtx;
    this.today = options.today ?? SA_TODAY;
    this.delayMs = options.delayMs ?? 300;
  }

  // --- Authorization boundary (NFR-008) -------------------------------------

  /**
   * Record/edit gate: teacher-only, own homeroom only. Throws BEFORE any state
   * read, so a forged `classId` can neither mutate nor learn whether a record
   * exists (forbidden always wins over not-found).
   */
  private assertCanWriteClass(classId: string): void {
    if (this.authCtx.role !== "teacher") {
      throw studentAbsenceFailure({ type: "forbidden" });
    }
    // A deny-by-default context has classId "" — which no real id equals.
    if (this.authCtx.classId === "" || classId !== this.authCtx.classId) {
      throw studentAbsenceFailure({ type: "forbidden" });
    }
  }

  /** Flag gate: principal-tier only (FR-009). Throws before any state read. */
  private assertCanFlag(): void {
    if (this.authCtx.role !== "principal") {
      throw studentAbsenceFailure({ type: "forbidden" });
    }
  }

  /**
   * Read gate + server-forced scope. `principal` sees everything (optionally
   * class-filtered); `teacher` is pinned to their OWN class whatever the client
   * asked for; any other role is denied outright.
   */
  private resolveReadScope(requested: string | undefined): string | undefined {
    if (this.authCtx.role === "principal") return requested;
    if (this.authCtx.role === "teacher") return this.authCtx.classId;
    throw studentAbsenceFailure({ type: "forbidden" });
  }

  // --- INT-002 list ---------------------------------------------------------

  async listAbsences(
    params: ListStudentAbsencesParams,
  ): Promise<StudentAbsenceEntity[]> {
    const scope = this.resolveReadScope(params.classId);
    await mockDelay(this.delayMs);
    return _absences
      .filter((a) => (scope ? a.classId === scope : true))
      .filter((a) => (params.from ? a.date >= params.from : true))
      .filter((a) => (params.to ? a.date <= params.to : true))
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(toStudentAbsenceEntity);
  }

  // --- INT-001 record -------------------------------------------------------

  async recordAbsence(
    input: RecordStudentAbsenceInput,
  ): Promise<StudentAbsenceEntity> {
    this.assertCanWriteClass(input.classId);

    if (!isBareCalendarDate(input.date)) {
      throw studentAbsenceFailure({ type: "invalid-input" });
    }
    if (isFutureDate(input.date, this.today)) {
      throw studentAbsenceFailure({ type: "invalid-date" });
    }
    if (
      input.reason !== undefined &&
      input.reason.length > STUDENT_ABSENCE_REASON_MAX_LENGTH
    ) {
      throw studentAbsenceFailure({ type: "invalid-input" });
    }
    const inClass = SA_STUDENT_ROSTER.some(
      (s) =>
        s.studentMemberId === input.studentMemberId &&
        s.className === input.classId,
    );
    if (!inClass) {
      // ABSENCE_INVALID_ID — unknown student, or a student of another class.
      throw studentAbsenceFailure({ type: "invalid-id" });
    }
    if (this.find(input) !== undefined) {
      throw studentAbsenceFailure({ type: "duplicate-date" });
    }

    const reason = input.reason?.trim();
    const now = nowIso();
    const dto: StudentAbsenceResponseDto = {
      classId: input.classId,
      studentMemberId: input.studentMemberId,
      date: input.date,
      reason: reason && reason.length > 0 ? reason : undefined,
      excused: input.excused,
      state: "RECORDED",
      recordedByMemberId: this.authCtx.memberId,
      createdAt: now,
      updatedAt: now,
    };
    _absences = [dto, ..._absences];
    return toStudentAbsenceEntity(dto);
  }

  // --- INT-003 edit (reason/excused ONLY) -----------------------------------

  async editAbsence(
    input: EditStudentAbsenceInput,
  ): Promise<StudentAbsenceEntity> {
    this.assertCanWriteClass(input.classId);

    const patchesReason = input.reason !== undefined;
    const patchesExcused = input.excused !== undefined;
    if (!patchesReason && !patchesExcused) {
      throw studentAbsenceFailure({ type: "invalid-input" });
    }
    if (
      patchesReason &&
      (input.reason as string).length > STUDENT_ABSENCE_REASON_MAX_LENGTH
    ) {
      throw studentAbsenceFailure({ type: "invalid-input" });
    }

    const dto = this.findOrThrow(input);
    // Only these two fields are ever writable — the natural key is identity.
    if (patchesExcused) dto.excused = input.excused as boolean;
    if (patchesReason) {
      const reason = (input.reason as string).trim();
      dto.reason = reason.length > 0 ? reason : undefined;
    }
    dto.updatedAt = nowIso();
    return toStudentAbsenceEntity(dto);
  }

  // --- INT-004 flag (one-way, terminal) -------------------------------------

  async flagAbsence(key: StudentAbsenceKey): Promise<StudentAbsenceEntity> {
    this.assertCanFlag();

    const dto = this.findOrThrow(key);
    if (dto.state !== "RECORDED") {
      // ABSENCE_INVALID_STATE — already terminal, no reverse transition exists.
      throw studentAbsenceFailure({ type: "invalid-state" });
    }

    dto.state = "FLAGGED_UNEXCUSED";
    dto.flaggedByMemberId = this.authCtx.memberId;
    dto.updatedAt = nowIso();
    return toStudentAbsenceEntity(dto);
  }

  // NOTE: there is intentionally NO `unflagAbsence` here (FR-006/FR-013).

  // --- Lookups --------------------------------------------------------------

  private find(key: StudentAbsenceKey): StudentAbsenceResponseDto | undefined {
    return _absences.find(
      (a) =>
        a.classId === key.classId &&
        a.studentMemberId === key.studentMemberId &&
        a.date === key.date,
    );
  }

  private findOrThrow(key: StudentAbsenceKey): StudentAbsenceResponseDto {
    const dto = this.find(key);
    if (!dto) throw studentAbsenceFailure({ type: "not-found" });
    return dto;
  }
}

function nowIso(): string {
  return new Date().toISOString();
}
